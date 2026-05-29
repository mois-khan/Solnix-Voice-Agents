from tools.loan_tools import lookup_loan, record_commitment
from tools.policy_tools import lookup_policy, send_renewal_link
from tools.booking_tools import get_available_slots, book_slot, lookup_booking, cancel_booking

TOOL_REGISTRY = {
    "lookup_loan": lookup_loan,
    "record_commitment": record_commitment,
    "lookup_policy": lookup_policy,
    "send_renewal_link": send_renewal_link,
    "get_available_slots": get_available_slots,
    "book_slot": book_slot,
    "lookup_booking": lookup_booking,
    "cancel_booking": cancel_booking,
}

def execute_tool(tool_name: str, args: dict) -> dict:
    """
    Looks up a tool in the TOOL_REGISTRY and executes it with the provided arguments.
    Returns the result of the execution or an error dictionary on failure.
    """
    fn = TOOL_REGISTRY.get(tool_name)
    if not fn:
        return {"error": f"Unknown tool: {tool_name}"}
    try:
        return fn(**args)
    except Exception as e:
        return {"error": str(e)}
