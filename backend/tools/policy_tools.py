import os
import json

# Resolve the path to policies.json
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POLICIES_FILE = os.path.join(BASE_DIR, "data", "policies.json")

try:
    with open(POLICIES_FILE, "r", encoding="utf-8") as f:
        POLICIES_DATA = json.load(f)
except Exception:
    POLICIES_DATA = []

def lookup_policy(policy_id: str) -> dict:
    """
    Find by policy_id. Return full dict. Return error dict if not found.
    """
    for policy in POLICIES_DATA:
        if policy.get("policy_id") == policy_id:
            return policy
    return {"error": f"Policy {policy_id} not found"}

def send_renewal_link(policy_id: str, channel: str = "sms") -> dict:
    """
    Set renewal_link_sent = True. Return:
    {"sent": True, "channel": channel,
     "mock_link": f"https://renew.solnixinsure.com/{policy_id}"}
    """
    for policy in POLICIES_DATA:
        if policy.get("policy_id") == policy_id:
            policy["renewal_link_sent"] = True
            return {
                "sent": True,
                "channel": channel,
                "mock_link": f"https://renew.solnixinsure.com/{policy_id}"
            }
    return {"error": f"Policy {policy_id} not found"}
