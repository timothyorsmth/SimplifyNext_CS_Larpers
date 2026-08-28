#!/usr/bin/env python3
"""
check_bedrock_access.py

Discovers which Bedrock foundation models / inference profiles your current
AWS credentials can ACTUALLY invoke — accounting for SCP denies, missing
Model Access grants, and IAM permission gaps, not just what Bedrock lists
as theoretically available.

Usage:
    python3 check_bedrock_access.py [--region us-east-1] [--prefix anthropic]

Requires: boto3, and AWS credentials already configured (same profile/role
you used for the AWS CLI calls that produced the errors above).
"""

import argparse
import json
import sys
import time

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    print("Missing boto3. Install with: pip install boto3 --break-system-packages")
    sys.exit(1)


def get_candidate_models(bedrock_client, prefix=None):
    """Pull both base foundation models and cross-region inference profiles."""
    candidates = []

    # Base foundation models
    try:
        resp = bedrock_client.list_foundation_models()
        for m in resp.get("modelSummaries", []):
            model_id = m["modelId"]
            if prefix and not model_id.startswith(prefix):
                continue
            supports_on_demand = "ON_DEMAND" in m.get("inferenceTypesSupported", [])
            candidates.append({
                "id": model_id,
                "type": "foundation-model",
                "on_demand_supported": supports_on_demand,
            })
    except ClientError as e:
        print(f"Warning: could not list foundation models: {e}")

    # Inference profiles (needed for models like Claude Sonnet 4 / Haiku 4.5
    # that reject direct on-demand invocation)
    try:
        resp = bedrock_client.list_inference_profiles()
        for p in resp.get("inferenceProfileSummaries", []):
            profile_id = p["inferenceProfileId"]
            if prefix and prefix not in profile_id:
                continue
            candidates.append({
                "id": profile_id,
                "type": "inference-profile",
                "on_demand_supported": True,  # profiles are the on-demand-compatible path
            })
    except ClientError as e:
        print(f"Warning: could not list inference profiles: {e}")

    return candidates


def try_invoke(runtime_client, model_id):
    """Attempt a minimal invoke and classify the failure reason."""
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 5,
        "messages": [{"role": "user", "content": "hi"}],
    })
    try:
        runtime_client.invoke_model(modelId=model_id, body=body)
        return "OK", None
    except ClientError as e:
        code = e.response["Error"]["Code"]
        msg = e.response["Error"]["Message"]
        if code == "AccessDeniedException" and "explicit deny" in msg.lower():
            return "SCP_DENIED", msg
        if code == "AccessDeniedException":
            return "IAM_DENIED_OR_NO_MODEL_ACCESS", msg
        if code == "ValidationException" and "inference profile" in msg.lower():
            return "NEEDS_INFERENCE_PROFILE", msg
        if code == "ResourceNotFoundException":
            return "NOT_FOUND", msg
        if code == "ThrottlingException":
            return "THROTTLED_RETRY", msg
        return f"ERROR_{code}", msg
    except Exception as e:
        return "UNKNOWN_ERROR", str(e)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--prefix", default="anthropic",
                         help="Only test models/profiles containing this string (default: anthropic)")
    parser.add_argument("--profile", default=None, help="AWS named profile, if not using default/SSO env")
    args = parser.parse_args()

    session = boto3.Session(profile_name=args.profile, region_name=args.region) if args.profile \
        else boto3.Session(region_name=args.region)

    try:
        bedrock = session.client("bedrock")
        runtime = session.client("bedrock-runtime")
        identity = session.client("sts").get_caller_identity()
    except NoCredentialsError:
        print("No AWS credentials found. Make sure you're logged in (aws sso login, etc).")
        sys.exit(1)

    print(f"Checking access as: {identity['Arn']}")
    print(f"Region: {args.region}")
    print(f"Filtering to models/profiles matching: '{args.prefix}'\n")

    candidates = get_candidate_models(bedrock, prefix=args.prefix)
    if not candidates:
        print("No candidate models found. Check your prefix or region.")
        sys.exit(0)

    results = []
    for c in candidates:
        status, detail = try_invoke(runtime, c["id"])
        results.append({**c, "status": status, "detail": detail})
        marker = "✅" if status == "OK" else "❌"
        print(f"{marker} {c['id']:55s} [{c['type']:18s}] -> {status}")
        if status == "THROTTLED_RETRY":
            time.sleep(1)  # brief backoff, then move on

    # Summary
    ok = [r for r in results if r["status"] == "OK"]
    scp_denied = [r for r in results if r["status"] == "SCP_DENIED"]
    needs_profile = [r for r in results if r["status"] == "NEEDS_INFERENCE_PROFILE"]
    no_access = [r for r in results if r["status"] == "IAM_DENIED_OR_NO_MODEL_ACCESS"]

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"✅ Invokable right now:        {len(ok)}")
    for r in ok:
        print(f"    - {r['id']}")
    print(f"🔁 Needs inference profile:     {len(needs_profile)} (retry using the profile ID, not base model ID)")
    for r in needs_profile:
        print(f"    - {r['id']}")
    print(f"🚫 Blocked by org SCP:          {len(scp_denied)} (org admins must change this — not fixable client-side)")
    for r in scp_denied:
        print(f"    - {r['id']}")
    print(f"⚠️  No IAM perm / Model Access: {len(no_access)} (check Bedrock console > Model access, or IAM policy)")
    for r in no_access:
        print(f"    - {r['id']}")

    # Save full results to file for reference
    with open("bedrock_access_report.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nFull detail saved to bedrock_access_report.json")


if __name__ == "__main__":
    main()
