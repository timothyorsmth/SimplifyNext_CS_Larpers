"""
Honestly like idk but! 
The tutorials had these so i have these also ¯_(ツ)_/¯

Might kill myself after this though idk

"""

import os
import sys
from dotenv import load_dotenv, find_dotenv
from pathlib import Path

load_dotenv()

# constants
MAX_TOKENS = 300

# import information from env file
MODEL_ID = os.environ.get(
    "BEDROCK_MODEL", "global.anthropic.claude-haiku-4-5-20251001-v1:0"
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