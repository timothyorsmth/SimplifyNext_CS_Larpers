'''

add some comments about what this bot does

'''
# import files
import agents.ai_common as ai_common

# import libraries
import json
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, Literal

# formats
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

# load the long ass system prompt from a text file
def getChatBotSystemPrompt() -> str:
    prompt_path = Path(__file__).parent / "prompts" / "chatAgent.txt"
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

def main() -> None:
    userInput = input("Please ask a question: ")
    chatPrompt(userInput)

if __name__ == "__main__":
    main()
