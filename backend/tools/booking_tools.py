import datetime
from data.generate_slots import SLOTS_DATA

def ensure_tz(dt: datetime.datetime) -> datetime.datetime:
    """Helper to ensure a datetime object is timezone-aware (defaulting to IST)."""
    if dt.tzinfo is None:
        ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        return dt.replace(tzinfo=ist)
    return dt

def parse_dt_from(dt_str: str) -> datetime.datetime:
    """Parses date_from string to timezone-aware datetime."""
    dt_str = dt_str.replace('/', '-')
    if len(dt_str) == 10:
        ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        return datetime.datetime.strptime(dt_str, "%Y-%m-%d").replace(tzinfo=ist)
    dt = datetime.datetime.fromisoformat(dt_str)
    return ensure_tz(dt)

def parse_dt_to(dt_str: str) -> datetime.datetime:
    """Parses date_to string to timezone-aware datetime, including end of day for date-only format."""
    dt_str = dt_str.replace('/', '-')
    if len(dt_str) == 10:
        ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        return datetime.datetime.strptime(dt_str, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=ist)
    dt = datetime.datetime.fromisoformat(dt_str)
    return ensure_tz(dt)

def get_available_slots(service: str, date_from: str, date_to: str,
                        time_of_day: str = None) -> list[dict]:
    """
    Filter slots by service (case-insensitive), available=True,
    datetime between date_from and date_to.
    If time_of_day is provided, filter by time_of_day field.
    Return up to 5 results.
    """
    try:
        df = parse_dt_from(date_from)
        dt_limit = parse_dt_to(date_to)
    except Exception:
        return []

    results = []
    for slot in SLOTS_DATA["slots"]:
        if not slot.get("available", False):
            continue
        if slot.get("service", "").lower() != service.lower():
            continue
        try:
            slot_dt = datetime.datetime.fromisoformat(slot["datetime"])
        except Exception:
            continue
            
        if not (df <= slot_dt <= dt_limit):
            continue
            
        if time_of_day:
            if slot.get("time_of_day", "").lower() != time_of_day.lower():
                continue
                
        results.append(slot)
        if len(results) >= 5:
            break
            
    return results

def book_slot(slot_id: str, name: str, phone: str) -> dict:
    """
    Find slot by slot_id. If not available: return error.
    Mark available=False. Add booking: {booked_by: name, phone: phone}.
    Generate booking code: f"BK{slot_id[-8:].replace('-','').upper()}"
    Return {"booking_code": code, "slot": slot, "confirmation": "Booking confirmed"}.
    """
    for slot in SLOTS_DATA["slots"]:
        if slot.get("slot_id") == slot_id:
            if not slot.get("available", False):
                return {"error": f"Slot {slot_id} is not available"}
                
            code = f"BK{slot_id[-8:].replace('-','').upper()}"
            slot["available"] = False
            slot["booked_by"] = name
            slot["phone"] = phone
            slot["booking_code"] = code
            slot["booking"] = {
                "booked_by": name,
                "phone": phone,
                "booking_code": code
            }
            return {
                "booking_code": code,
                "slot": slot,
                "confirmation": "Booking confirmed"
            }
    return {"error": f"Slot {slot_id} not found"}

def lookup_booking(identifier: str) -> dict | None:
    """
    Search all slots where available=False and (slot_id contains identifier
    or phone matches). Return the slot dict or None.
    """
    for slot in SLOTS_DATA["slots"]:
        if not slot.get("available", True):
            slot_id_val = slot.get("slot_id", "")
            phone_val = slot.get("phone") or slot.get("booking", {}).get("phone") or ""
            code_val = slot.get("booking_code") or slot.get("booking", {}).get("booking_code") or ""
            
            if (identifier in slot_id_val) or (identifier == phone_val) or (identifier == code_val):
                return slot
    return None

def cancel_booking(booking_code: str) -> dict:
    """
    Find slot by booking_code match. Set available=True. Clear booking info.
    Return {"cancelled": True}. Return error if not found.
    """
    for slot in SLOTS_DATA["slots"]:
        if not slot.get("available", True):
            code_val = slot.get("booking_code") or slot.get("booking", {}).get("booking_code") or f"BK{slot.get('slot_id', '')[-8:].replace('-', '').upper()}"
            if code_val == booking_code:
                slot["available"] = True
                slot.pop("booking", None)
                slot.pop("booked_by", None)
                slot.pop("phone", None)
                slot.pop("booking_code", None)
                return {"cancelled": True}
    return {"error": f"Booking with code {booking_code} not found"}
