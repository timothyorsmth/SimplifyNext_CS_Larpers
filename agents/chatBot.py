'''
Chat bot backend for the care-coordination app.

This module wraps a Claude model (via AWS Bedrock) so the frontend can turn
plain-English messages from a caregiver into either:
  - a plain conversational reply (the general chat widget, via `chatPrompt`
    + `getChatBotSystemPrompt`), or
  - a structured task (the "Create with AI" flow on the Tasks page, via
    `runTaskAgent` + `getTaskAgentSystemPrompt`).

Both paths share the same low-level Bedrock call (`chatPrompt`), just with
different system prompts loaded from prompts/*.txt. The task-agent path
additionally asks Claude to reply in strict JSON and parses/validates that
JSON into `TaskAgentClarify` / `TaskAgentDone` before returning it, so the
frontend never has to deal with raw model text.

`main()` is a quick manual smoke test — type a question in the terminal and
see what Claude says, without going through the frontend or a server.
'''
# import files
import agents.ai_common as ai_common

# import libraries
import json
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, Literal, Union

# formats — general chat widget
class ChatAction(BaseModel):
    id: str
    label: str
    type: Literal["create_task", "create_schedule_item", "generate_report", "confirm_generic"]
    # optional payload the frontend echoes back on approval, so you don't
    # have to re-derive "what was this button for" from the label text
    payload: Optional[dict] = None

class ChatResponse(BaseModel):
    text: str
    actions: Optional[list[ChatAction]] = None

# formats — "Create with AI" task agent
class TaskAgentClarify(BaseModel):
    status: Literal["clarify"]
    question: str

class ParsedTask(BaseModel):
    name: str
    icon: str
    finishDate: str   # "YYYY-MM-DD"
    finishBefore: str  # "HH:MM"
    repeat: Literal["never", "daily", "weekly"]
    assignedTo: str

class TaskAgentDone(BaseModel):
    status: Literal["done"]
    task: ParsedTask

TaskAgentResponse = Union[TaskAgentClarify, TaskAgentDone]

# load the long ass system prompt from a text file
def getChatBotSystemPrompt() -> str:
    prompt_path = Path(__file__).parent / "prompts" / "chatAgent.txt"
    return prompt_path.read_text(encoding="utf-8")

# same idea, but the prompt for the structured task-creation agent
def getTaskAgentSystemPrompt() -> str:
    prompt_path = Path(__file__).parent / "prompts" / "taskAgent.txt"
    return prompt_path.read_text(encoding="utf-8")

# sends a chat prompt to bedrock to do its chat prompt things
def chatPrompt(userPrompt: str, systemPrompt: str = "", debug: bool = False):
    client = ai_common.bedrock_runtime()

    body_dict = {
        # 1. A fixed Bedrock literal. NOT your model's version, and not
        #    optional. Every Anthropic-on-Bedrock request carries it.
        "anthropic_version": ai_common.ANTHROPIC_VERSION,

        # 2. The conversation. Roles must alternate user/assistant.
        "messages": [{"role": "user", "content": userPrompt}],

        # 3. Required on Bedrock, unlike Anthropic's first-party API.
        #    Caps OUTPUT only — it is not a budget for the whole call.
        "max_tokens": ai_common.MAX_TOKENS,

        # 4. System prompt! This gives it more information on how it's 
        #    supposed to behave :) 
        #    Also prevents prompt injection!!
        "system": systemPrompt,

        # 4. idk what this does im so fr.
        "temperature": 0,
    }

    body = json.dumps(body_dict)

    response = client.invoke_model(
        modelId=ai_common.MODEL_ID,
        body=body,                       # a JSON *string*, not a dict
        contentType="application/json",
        accept="application/json",
    )

    # The response body is a STREAMING object. .read() it before json.loads,
    # or you get "Object of type StreamingBody is not JSON serializable".
    envelope = json.loads(response["body"].read())

    if debug:
        print(f"  keys:        {list(envelope)}")
        # `content` is a LIST of typed blocks — never a plain string. That is
        # also how images and tool calls arrive, which is why it looks
        # over-built for a one-line answer.
        print(f"  content:     {envelope['content']}")
        print(f"  text:        {envelope['content'][0]['text'].strip()}")
        print(f"  stop_reason: {envelope['stop_reason']}")

    return envelope['content'][0]['text'].strip()

# --- Task agent (structured, multi-turn task creation) ---
#
# chatPrompt only sends ONE user turn to Bedrock (see the "messages" list
# above — it's hardcoded to a single entry). To support a back-and-forth
# clarifying conversation without changing that low-level call, we flatten
# the whole conversation-so-far plus the task context into one big user
# turn, and instruct the model (via taskAgent.txt) to reply with JSON only.

def _buildTaskAgentTranscript(
    messages: list[dict],
    assignablePeople: list[str],
    today: str,
) -> str:
    lines = [
        f"TODAY'S DATE: {today}",
        f"ASSIGNABLE PEOPLE: {', '.join(assignablePeople) if assignablePeople else '(none given)'}",
        "",
        "CONVERSATION SO FAR:",
    ]
    for m in messages:
        speaker = "Caregiver" if m["role"] == "user" else "Assistant"
        lines.append(f"{speaker}: {m['content']}")
    return "\n".join(lines)

def _parseTaskAgentJson(raw: str) -> dict:
    # Claude is instructed to return raw JSON, but strip code fences just in
    # case it wraps the response anyway.
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    return json.loads(cleaned)

def runTaskAgent(
    messages: list[dict],
    assignablePeople: list[str],
    today: str,
) -> dict:
    """
    Runs one turn of the task-creation agent and returns a plain dict
    shaped like TaskAgentClarify or TaskAgentDone (validated). Raises
    ValueError if Claude's reply can't be parsed/validated — callers should
    turn that into a 500 rather than pass raw model text to the frontend.
    """
    transcript = _buildTaskAgentTranscript(messages, assignablePeople, today)
    raw = chatPrompt(transcript, getTaskAgentSystemPrompt())

    try:
        data = _parseTaskAgentJson(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Task agent returned non-JSON output: {raw!r}") from e

    status = data.get("status")
    if status == "clarify":
        return TaskAgentClarify(**data).model_dump()
    if status == "done":
        return TaskAgentDone(**data).model_dump()
    raise ValueError(f"Task agent returned unknown status: {data!r}")

def main() -> None:
    userInput = input("Please ask a question: ")
    chatPrompt(userInput)

if __name__ == "__main__":
    main()