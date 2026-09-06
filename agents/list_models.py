import boto3
from dotenv import load_dotenv
load_dotenv()

client = boto3.client("bedrock", region_name="ap-southeast-1")

print("--- Foundation models with 'claude' in the name ---")
for m in client.list_foundation_models()["modelSummaries"]:
    if "claude" in m["modelId"].lower():
        print(m["modelId"])

print("\n--- Available inference profiles ---")
for p in client.list_inference_profiles()["inferenceProfileSummaries"]:
    if "claude" in p["inferenceProfileId"].lower():
        print(p["inferenceProfileId"])