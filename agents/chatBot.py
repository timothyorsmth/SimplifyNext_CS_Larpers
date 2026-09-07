'''
Chat bot backend for the care-coordination app.

This module wraps a Claude model (via AWS Bedrock) so the frontend can turn
plain-English messages from a caregiver into either:
  - a conversational reply that can optionally propose a structured action
    button (e.g. scheduling an appointment, creating a task, or updating
    patient info) — the general chat widget, via `runChatAgent` +
    `getChatBotSystemPrompt`, or
  - a structured task (the "Create with AI" flow on the Tasks page, via
    `runTaskAgent` + `getTaskAgentSystemPrompt`).

Both paths share the same low-level Bedrock call (`chatPrompt`), just with
different system prompts loaded from prompts/*.txt, and both flatten the
whole conversation-so-far into one big user turn (see the comment above
`_buildTaskAgentTranscript` for why). The task-agent path asks for strict
JSON the whole way through; the general chat path asks for plain text, plus
an optional trailing `ACTION_JSON:` line when — and only when — the
caregiver is asking to schedule something, create a task, or update the
patient's personal info, which `_extractChatAction` peels off before the
text reaches the frontend.

The general chat path also receives the caregiver's full patient record
(personal info, medical history, medications, appointments) as part of the
prompt on every turn — see `_formatPatientContext` — so the model can
actually answer questions about the patient instead of only ever seeing
raw conversation text.

`main()` is a quick manual smoke test — type a question in the terminal and
see what Claude says, without going through the frontend or a server.
'''
# import files
import agents.ai_common as ai_common

# import libraries
import json
import uuid
from pathlib import Path
from pydantic import BaseModel, ValidationError
from typing import Optional, Literal, Union

class AgentMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

# formats — general chat widget
class ChatAction(BaseModel):
    id: str
    label: str
    type: Literal[
        "create_task",
        "create_schedule_item",
        "generate_report",
        "confirm_generic",
        "update_patient_info",
    ]
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

        # 5. idk what this does im so fr.
        "temperature": 0,

        # 6. Stops generation the moment the model tries to hallucinate a
        #    new turn in the transcript format used by _buildChatTranscript /
        #    _buildTaskAgentTranscript. Without this, the model can keep
        #    inventing "Caregiver: ..." messages and replying to itself
        #    instead of stopping after its real answer.
        "stop_sequences": ["\nCaregiver:", "\nAssistant:", "\nHuman:"],
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

# --- General chat agent (conversation + optional scheduling/task/update actions) ---
#
# chatAgent.txt defines the assistant's normal persona/behaviour. We don't
# touch that file here -- instead we layer on a second, separate set of
# instructions (below) purely about *when and how* to propose a structured
# action, and append it to the base prompt. This keeps the two concerns
# separate: chatAgent.txt owns "how the assistant should talk", this file
# owns "how the assistant hands data back to the UI".

CHAT_ACTION_INSTRUCTIONS = (
    "\nYou have access to the caregiver's actual PATIENT RECORD above this "
    "conversation. Always answer questions about the patient (medications, "
    "conditions, appointments, allergies, etc.) using that record. If "
    "something the caregiver asks about is not present in the record, say "
    "so plainly rather than guessing or inventing details.\n"
    "\nAdditionally, if -- and only if -- the caregiver is asking you to "
    "schedule, book, or add a medical appointment (not a daily task like a "
    "medication reminder; that's a separate feature), do both of the "
    "following:\n\n"
    "1. Reply normally, in one or two sentences, confirming what you "
    "understood.\n"
    "2. On its own new line, at the very end of your reply, output exactly "
    "this (no markdown fences, no extra text after it):\n"
    'ACTION_JSON: {"label": "<a short, specific button label describing '
    'THIS appointment -- e.g. \'Add cardiology visit\' or \'Schedule KKH '
    'checkup\'. Never use the generic word \'appointment\' or \'task\' '
    'alone.>", '
    '"type": "create_schedule_item", "payload": {"type": "<appointment '
    'title>", "date": "<YYYY-MM-DDTHH:MM:00>", "provider": "<provider name, '
    'or empty string if not given>", "location": "<location, or empty '
    'string if not given>", "notes": null}}\n\n'
    "If you don't yet have enough information to fill that in (most "
    "importantly: a date and time), ask a short clarifying question in "
    "plain text instead, and do NOT output an ACTION_JSON line that turn.\n\n"
    "\nSeparately, if -- and only if -- the caregiver is asking you to "
    "create a recurring or one-off daily task (e.g. a medication reminder, "
    "a chore, a check-in -- NOT a medical appointment, which is handled "
    "above), do both of the following:\n\n"
    "1. Reply normally, in one or two sentences, confirming what you "
    "understood.\n"
    "2. On its own new line, at the very end of your reply, output exactly "
    "this (no markdown fences, no extra text after it):\n"
    'ACTION_JSON: {"label": "<a short, specific button label describing '
    'THIS task -- e.g. \'Add medication reminder\' or \'Schedule KKH trip\'. '
    'Never use the generic word \'task\' alone.>", '
    '"type": "create_task", "payload": {"name": "<task name>", '
    '"icon": "<one of: pill, hospital, car>", '
    '"finishDate": "<YYYY-MM-DD>", "finishBefore": "<HH:MM>", '
    '"repeat": "<never|daily|weekly>", "assignedTo": "<caregiver name>"}}\n\n'
    "If you don't have enough information (most importantly: what the task "
    "is and what time it's due), ask a short clarifying question in plain "
    "text instead, and do NOT output an ACTION_JSON line that turn.\n\n"
    "\nSeparately, if -- and only if -- the caregiver explicitly states "
    "new or corrected personal information about the care recipient "
    "themselves (their name, sex, date of birth, blood type, allergies, or "
    "primary physician -- NOT a new symptom, condition, or medication, "
    "which are medical history and are out of scope for this action), do "
    "both of the following:\n\n"
    "1. Reply normally, in one sentence, confirming exactly what you "
    "understood is changing.\n"
    "2. On its own new line, at the very end of your reply, output exactly "
    "this (no markdown fences, no extra text after it):\n"
    'ACTION_JSON: {"label": "<a short, specific button label -- e.g. '
    '\'Update blood type\' or \'Update allergies\'>", '
    '"type": "update_patient_info", "payload": {<ONLY the field(s) actually '
    'being changed, using these exact keys: "first_name", "last_name", '
    '"dateOfBirth" (YYYY-MM-DD), "sex", "bloodType", "allergies" (a list of '
    'strings), "primaryPhysician". Do NOT include any key the caregiver did '
    'not explicitly ask to change. When updating allergies, always include '
    'the COMPLETE desired list (existing allergies plus any being added or '
    'removed), never just the newly mentioned item on its own.>}}\n\n'
    "Be conservative here: only take this action when the caregiver is "
    "unambiguously stating a correction or update to one of these exact "
    "fields, never when they are just mentioning these details in passing "
    "or describing something else (e.g. describing a reaction is not the "
    "same as asking you to add an allergy). If in doubt, ask a clarifying "
    "question in plain text instead of guessing, and do NOT output an "
    "ACTION_JSON line that turn.\n\n"
    "For anything that isn't an appointment, task, or personal-info update "
    "request, just reply normally and never output an ACTION_JSON line.\n"
)

def getChatSystemPromptWithActions() -> str:
    return getChatBotSystemPrompt() + "\n\n" + CHAT_ACTION_INSTRUCTIONS

def _formatPatientContext(patientContext: dict | None) -> str:
    """
    Turns the raw CareRecipientData shape (sent from the frontend's
    CareRecipientContext) into a readable block the model can actually use
    to answer questions. Returns a placeholder if no data is available yet
    (e.g. the frontend is still loading when a message is sent).
    """
    if not patientContext:
        return "PATIENT RECORD: (not available)"

    recipient_info = patientContext.get("recipientInfo", {})
    profile = recipient_info.get("profile", {})
    medical_history = patientContext.get("medicalHistory", [])
    medications = patientContext.get("medications", [])
    appointments = patientContext.get("appointments", [])

    lines = ["PATIENT RECORD:"]

    lines.append(
        f"Name: {profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
    )
    lines.append(f"Date of birth: {recipient_info.get('dateOfBirth', 'unknown')}")
    lines.append(f"Sex: {recipient_info.get('sex', 'unknown')}")
    lines.append(f"Blood type: {recipient_info.get('bloodType', 'unknown')}")
    allergies = recipient_info.get("allergies", [])
    lines.append(f"Allergies: {', '.join(allergies) if allergies else 'None known'}")
    lines.append(f"Primary physician: {recipient_info.get('primaryPhysician', 'unknown')}")

    lines.append("\nMedical history:")
    if medical_history:
        for entry in medical_history:
            lines.append(
                f"- {entry.get('condition', 'Unknown condition')} "
                f"(diagnosed {entry.get('diagnosedDate', 'unknown')}, "
                f"status: {entry.get('status', 'unknown')})"
                + (f" — {entry.get('notes')}" if entry.get("notes") else "")
            )
    else:
        lines.append("- None on record")

    lines.append("\nCurrent medications:")
    if medications:
        for med in medications:
            status_note = f" [{med.get('status')}]" if med.get("status") else ""
            lines.append(
                f"- {med.get('name', 'Unknown')} {med.get('dosage', '')} "
                f"{med.get('frequency', '')}{status_note}"
            )
    else:
        lines.append("- None on record")

    lines.append("\nAppointments:")
    if appointments:
        for appt in appointments:
            lines.append(
                f"- {appt.get('type', 'Appointment')} on {appt.get('date', 'unknown date')} "
                f"with {appt.get('provider', 'unknown provider')} "
                f"({appt.get('status', 'unknown status')})"
            )
    else:
        lines.append("- None on record")

    return "\n".join(lines)

def _buildChatTranscript(
    messages: list[dict],
    today: str,
    patientContext: dict | None = None,
) -> str:
    lines = [
        f"TODAY'S DATE: {today}",
        "",
        _formatPatientContext(patientContext),
        "",
        "CONVERSATION SO FAR:",
    ]
    for m in messages:
        speaker = "Caregiver" if m["role"] == "user" else "Assistant"
        lines.append(f"{speaker}: {m['content']}")
    return "\n".join(lines)

def _extractChatAction(raw: str):
    """
    Pulls a trailing "ACTION_JSON: {...}" line out of Claude's reply, if
    present. Returns (display_text, action_dict_or_None). Never raises --
    a malformed action line is dropped rather than breaking the whole
    chat turn, since worst case the caregiver just doesn't get a button.
    """
    marker = "ACTION_JSON:"
    kept_lines = []
    action = None

    for line in raw.splitlines():
        stripped = line.strip()
        if stripped.startswith(marker):
            json_part = stripped[len(marker):].strip()
            try:
                data = json.loads(json_part)
                action = {
                    "id": str(uuid.uuid4()),
                    "label": data.get("label", "Confirm"),
                    "type": data.get("type", "confirm_generic"),
                    "payload": data.get("payload"),
                }
            except json.JSONDecodeError:
                action = None
            continue  # never show the raw marker line to the user
        kept_lines.append(line)

    return "\n".join(kept_lines).strip(), action

def runChatAgent(
    messages: list[dict],
    today: str,
    patientContext: dict | None = None,
) -> dict:
    """
    Runs one turn of the general chat agent and returns a plain dict
    shaped like ChatResponse (text + optional single-item actions list).
    """
    transcript = _buildChatTranscript(messages, today, patientContext)
    raw = chatPrompt(transcript, getChatSystemPromptWithActions())
    text, action_data = _extractChatAction(raw)

    actions = None
    if action_data is not None:
        try:
            actions = [ChatAction(**action_data)]
        except ValidationError:
            # e.g. Claude used a `type` outside the allowed Literal values --
            # keep the text reply, just drop the unusable action.
            actions = None

    return ChatResponse(text=text, actions=actions).model_dump()

def main() -> None:
    userInput = input("Please ask a question: ")
    reply = chatPrompt(userInput, debug=True)
    print(reply)

if __name__ == "__main__":
    main()