import os
import json
import datetime

# Resolve the path to loans.json
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOANS_FILE = os.path.join(BASE_DIR, "data", "loans.json")

try:
    with open(LOANS_FILE, "r", encoding="utf-8") as f:
        LOANS_DATA = json.load(f)
except Exception:
    LOANS_DATA = []

def now() -> str:
    """Returns current timestamp in ISO format with India Standard Time offset."""
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    return datetime.datetime.now(ist).isoformat()

def lookup_loan(loan_id: str) -> dict:
    """
    Find loan by loan_id. Return the full dict.
    If not found: return {"error": f"Loan {loan_id} not found"}.
    """
    for loan in LOANS_DATA:
        if loan.get("loan_id") == loan_id:
            return loan
    return {"error": f"Loan {loan_id} not found"}

def record_commitment(loan_id: str, amount: float, payment_date: str) -> dict:
    """
    Append {"amount": amount, "date": payment_date, "recorded_at": now()} to
    loan["commitments"]. Return {"success": True, "message": "Commitment recorded"}.
    """
    for loan in LOANS_DATA:
        if loan.get("loan_id") == loan_id:
            if "commitments" not in loan:
                loan["commitments"] = []
            loan["commitments"].append({
                "amount": amount,
                "date": payment_date,
                "recorded_at": now()
            })
            return {"success": True, "message": "Commitment recorded"}
    return {"error": f"Loan {loan_id} not found"}
