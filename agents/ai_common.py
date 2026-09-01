"""
Common dependencies / information that claude asks for, 
we put it here so we dont have to keep retyping it

Idk what the functions do..
The tutorials had these so i have these also ¯_(ツ)_/¯

Might kill myself after this though idk

"""

# import dependencies
import os
import sys
import json
from dotenv import load_dotenv, find_dotenv
from pathlib import Path

load_dotenv()

# constants
MAX_TOKENS = 300
ANTHROPIC_VERSION = "bedrock-2023-05-31"

# import information from .env file
MODEL_ID = os.environ.get(
    "BEDROCK_MODEL", "global.anthropic.claude-opus-4-6-v1"
)
REGION = os.environ.get("AWS_DEFAULT_REGION") or os.environ.get(
    "AWS_REGION", "ap-southeast-1"
)

# bedrock functions they wrote and this looks fancy so im trusting it
def require_aws_credentials() -> None:
    import boto3

    creds = boto3.Session().get_credentials()
    if creds is None or not creds.access_key:
        sys.exit(
            "No AWS credentials found.\n\n"
            "  boto3 looked at: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY,\n"
            "  ~/.aws/credentials, and any SSO or instance role.\n\n"
            "  Fix with ONE of:\n"
            "    export AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=...\n"
            "    aws sso login --profile <your-profile>\n\n"
            f"  Region currently resolves to: {REGION}\n"
            "  Set it with: export AWS_DEFAULT_REGION=ap-southeast-1\n\n"
            "  Session 1 needs none of this. If you are on Day 1, you have\n"
            "  LLM_PROVIDER=bedrock set by mistake — unset it."
        )

def bedrock_runtime():
    import boto3
    from botocore.config import Config

    require_aws_credentials()
    # read_timeout=300 because a long generation blows through the 60s default
    # and fails after you have already paid for the tokens. max_attempts=1 so
    # throttling reaches our own retry logic instead of being retried (and
    # hidden) down at the botocore layer.
    return boto3.client(
        "bedrock-runtime",
        config=Config(
            region_name=REGION,
            read_timeout=300,
            connect_timeout=120,
            retries={"max_attempts": 1},
        ),
    )

def invoke_claude(system_prompt: str, user_content: str, max_tokens: int = MAX_TOKENS) -> str:
    """
    The actual call to Bedrock. Every agent (chat, reports, etc.) should
    route through this instead of building its own boto3 client, so the
    timeout/retry config and model ID only live in one place.
    """
    client = bedrock_runtime()

    response = client.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps({
            "anthropic_version": ANTHROPIC_VERSION,
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_content}],
        }),
    )

    body = json.loads(response["body"].read())
    return body["content"][0]["text"]