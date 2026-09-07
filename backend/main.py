from html import unescape
from html.parser import HTMLParser
from urllib.parse import parse_qs, quote_plus, unquote, urlparse
from urllib.request import Request, urlopen
from xml.etree import ElementTree
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from agents.chatBot import (
    AgentMessage,
    ChatResponse,
    runChatAgent,
    runTaskAgent,
    TaskAgentResponse,
)  # wraps the Bedrock call

# This variable name must match the 'app' in your terminal command
app = FastAPI()

# NOTE: this must match wherever the Vite dev server actually serves the
# frontend from — check your terminal output when you run `npm run dev` /
# `vite`. Vite's default is 5173 (127.0.0.1:5173), NOT 8000 — the previous
# origins list only allowed 8000, which silently blocks every request from
# a default Vite setup with a CORS error in the browser console.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
]

# Configure CORS for Vite frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# For chat bot :) -- now takes the full conversation (not just the latest
# message) so the agent can hold a real back-and-forth, e.g. asking "what
# time?" and understanding the caregiver's next reply in context. Also
# takes patientContext — the caregiver's full care-recipient record — so
# the agent can actually answer questions about the patient instead of
# only seeing raw conversation text. See _formatPatientContext in
# chatBot.py for how this gets used.
class ChatRequest(BaseModel):
    messages: list[AgentMessage]
    today: str
    patientContext: dict | None = None

@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest):
    try:
        return runChatAgent(
            [m.model_dump() for m in payload.messages],
            payload.today,
            payload.patientContext,
        )
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# For "Create with AI" on the Tasks page — structured, possibly multi-turn.
class TaskAgentRequest(BaseModel):
    messages: list[AgentMessage]
    assignablePeople: list[str] = []
    today: str

@app.post("/api/tasks/agent", response_model=TaskAgentResponse)
def task_agent(payload: TaskAgentRequest):
    try:
        return runTaskAgent(
            [m.model_dump() for m in payload.messages],
            payload.assignablePeople,
            payload.today,
        )
    except ValueError as e:
        # Claude didn't return parseable/valid JSON — surface as a 502
        # (bad response from an upstream we don't fully control) rather
        # than a generic 500.
        print(f"ERROR (task agent parse): {e}")
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class _DuckDuckGoResultParser(HTMLParser):
    """Extracts the title, link, and snippet from DuckDuckGo's HTML results."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.results: list[dict[str, str]] = []
        self.current: dict[str, str] | None = None
        self.capture_field: str | None = None
        self.capture_depth = 0

    def _save_current(self):
        if self.current and self.current.get("title") and self.current.get("url"):
            self.results.append(self.current)
        self.current = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        attributes = dict(attrs)
        classes = set((attributes.get("class") or "").split())

        if tag == "a" and "result__a" in classes:
            self._save_current()
            self.current = {
                "title": "",
                "url": attributes.get("href") or "",
                "summary": "",
            }
            self.capture_field = "title"
            self.capture_depth = 1
            return

        if self.current and "result__snippet" in classes:
            self.capture_field = "summary"
            self.capture_depth = 1
            return

        if self.capture_field:
            self.capture_depth += 1

    def handle_endtag(self, tag: str):
        if not self.capture_field:
            return

        self.capture_depth -= 1
        if self.capture_depth <= 0:
            self.capture_field = None
            self.capture_depth = 0

    def handle_data(self, data: str):
        if self.current and self.capture_field:
            self.current[self.capture_field] += data

    def close(self):
        super().close()
        self._save_current()


def _decode_search_url(raw_url: str) -> str:
    """Turn DuckDuckGo redirect links into the original article URL."""
    url = unescape(raw_url.strip())
    if url.startswith("//"):
        url = f"https:{url}"

    parsed = urlparse(url)
    if parsed.hostname and parsed.hostname.endswith("duckduckgo.com") and parsed.path == "/l/":
        target = parse_qs(parsed.query).get("uddg", [""])[0]
        return unquote(target)

    return url


def _fetch_search_page(search_query: str) -> str | None:
    request = Request(
        f"https://html.duckduckgo.com/html/?q={quote_plus(search_query)}",
        headers={"User-Agent": "Mozilla/5.0 SimplifyNext/1.0"},
    )
    try:
        with urlopen(request, timeout=6) as response:
            return response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Article search source skipped: {e}")
        return None


def _search_web_articles(query: str, max_results: int = 12) -> list[dict[str, str]]:
    """Search useful public-health sources without exposing search keys to React."""
    search_terms = " ".join(query.split())
    search_queries = [
        f'{search_terms} support benefits eligibility funding site:healthhub.sg OR site:moh.gov.sg OR site:gov.sg',
        f'{search_terms} support benefits eligibility funding site:nhs.uk OR site:cdc.gov OR site:who.int',
        f'{search_terms} health support benefits funding',
    ]
    seen_urls: set[str] = set()
    articles: list[dict[str, str]] = []

    # Run all 3 DuckDuckGo queries in parallel instead of one after another —
    # previously a slow/blocked query delayed every query queued behind it,
    # producing several stacked timeout messages in a row.
    with ThreadPoolExecutor(max_workers=len(search_queries)) as executor:
        futures = [executor.submit(_fetch_search_page, q) for q in search_queries]
        for future in as_completed(futures):
            html = future.result()
            if html is None:
                continue

            parser = _DuckDuckGoResultParser()
            parser.feed(html)
            parser.close()

            for result in parser.results:
                url = _decode_search_url(result["url"])
                parsed_url = urlparse(url)
                hostname = (parsed_url.hostname or "").lower().removeprefix("www.")

                if parsed_url.scheme not in {"http", "https"} or not hostname:
                    continue
                if hostname.endswith("duckduckgo.com") or url in seen_urls:
                    continue

                seen_urls.add(url)
                articles.append(
                    {
                        "title": " ".join(unescape(result["title"]).split()),
                        "url": url,
                        "summary": " ".join(unescape(result["summary"]).split()),
                        "source": hostname,
                    }
                )

    if len(articles) >= 4:
        return articles[:max_results]

    # DuckDuckGo occasionally returns an anti-bot page to local development
    # servers. Bing's RSS response is a lightweight fallback that does not
    # require an API key and still gives the frontend real article links.
    try:
        request = Request(
            f"https://www.bing.com/search?format=rss&q={quote_plus(search_queries[-1])}",
            headers={"User-Agent": "Mozilla/5.0 SimplifyNext/1.0"},
        )
        with urlopen(request, timeout=6) as response:
            rss = response.read()

        root = ElementTree.fromstring(rss)
        for item in root.findall("./channel/item"):
            title = (item.findtext("title") or "").strip()
            url = (item.findtext("link") or "").strip()
            summary = (item.findtext("description") or "").strip()
            parsed_url = urlparse(url)
            hostname = (parsed_url.hostname or "").lower().removeprefix("www.")

            if not title or parsed_url.scheme not in {"http", "https"} or not hostname or url in seen_urls:
                continue

            seen_urls.add(url)
            articles.append({
                "title": " ".join(unescape(title).split()),
                "url": url,
                "summary": " ".join(unescape(summary).split()),
                "source": hostname,
            })

            if len(articles) >= max_results:
                break
    except Exception as e:
        print(f"Fallback article search source skipped: {e}")

    return articles[:max_results]


@app.get("/api/schemes/search")
def search_schemes(q: str = ""):
    query = q.strip()
    if not query:
        return []

    try:
        return _search_web_articles(query)
    except Exception as e:
        print(f"ERROR (article search): {e}")
        raise HTTPException(status_code=502, detail="The web article search is currently unavailable.") from e


# Test server get function, does not actually do anything
@app.get("/")
def read_root():
    return {"Hello": "World"}