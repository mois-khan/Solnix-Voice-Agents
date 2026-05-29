import datetime

def generate_slots() -> dict:
    """
    Generates 20 slots across the next 7 days with varied services and times.
    """
    # India Standard Time timezone (+05:30)
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    now = datetime.datetime.now(ist)
    
    services = ["consultation", "follow-up", "vaccination"]
    doctors = ["Dr. Krishnan", "Dr. Patel"]
    
    # 20 slots configurations across the next 7 days (day_offset 1 to 7)
    # This keeps dates relative and fresh
    slot_configs = [
        {"day_offset": 1, "hour": 9, "minute": 0, "service": "consultation", "doctor": "Dr. Krishnan", "time_of_day": "morning"},
        {"day_offset": 1, "hour": 10, "minute": 30, "service": "follow-up", "doctor": "Dr. Patel", "time_of_day": "morning"},
        {"day_offset": 1, "hour": 14, "minute": 0, "service": "vaccination", "doctor": "Dr. Krishnan", "time_of_day": "afternoon"},
        
        {"day_offset": 2, "hour": 9, "minute": 30, "service": "consultation", "doctor": "Dr. Patel", "time_of_day": "morning"},
        {"day_offset": 2, "hour": 11, "minute": 0, "service": "vaccination", "doctor": "Dr. Krishnan", "time_of_day": "morning"},
        {"day_offset": 2, "hour": 15, "minute": 30, "service": "follow-up", "doctor": "Dr. Patel", "time_of_day": "afternoon"},
        
        {"day_offset": 3, "hour": 10, "minute": 0, "service": "consultation", "doctor": "Dr. Krishnan", "time_of_day": "morning"},
        {"day_offset": 3, "hour": 14, "minute": 30, "service": "follow-up", "doctor": "Dr. Krishnan", "time_of_day": "afternoon"},
        {"day_offset": 3, "hour": 16, "minute": 0, "service": "vaccination", "doctor": "Dr. Patel", "time_of_day": "afternoon"},
        
        {"day_offset": 4, "hour": 9, "minute": 0, "service": "follow-up", "doctor": "Dr. Patel", "time_of_day": "morning"},
        {"day_offset": 4, "hour": 11, "minute": 30, "service": "consultation", "doctor": "Dr. Krishnan", "time_of_day": "morning"},
        {"day_offset": 4, "hour": 15, "minute": 0, "service": "vaccination", "doctor": "Dr. Patel", "time_of_day": "afternoon"},
        
        {"day_offset": 5, "hour": 10, "minute": 30, "service": "consultation", "doctor": "Dr. Patel", "time_of_day": "morning"},
        {"day_offset": 5, "hour": 14, "minute": 0, "service": "follow-up", "doctor": "Dr. Krishnan", "time_of_day": "afternoon"},
        {"day_offset": 5, "hour": 16, "minute": 30, "service": "vaccination", "doctor": "Dr. Krishnan", "time_of_day": "afternoon"},
        
        {"day_offset": 6, "hour": 9, "minute": 0, "service": "vaccination", "doctor": "Dr. Patel", "time_of_day": "morning"},
        {"day_offset": 6, "hour": 11, "minute": 0, "service": "consultation", "doctor": "Dr. Krishnan", "time_of_day": "morning"},
        {"day_offset": 6, "hour": 15, "minute": 0, "service": "follow-up", "doctor": "Dr. Patel", "time_of_day": "afternoon"},
        
        {"day_offset": 7, "hour": 10, "minute": 0, "service": "consultation", "doctor": "Dr. Krishnan", "time_of_day": "morning"},
        {"day_offset": 7, "hour": 14, "minute": 30, "service": "follow-up", "doctor": "Dr. Patel", "time_of_day": "afternoon"},
    ]
    
    slots = []
    for cfg in slot_configs:
        dt = now + datetime.timedelta(days=cfg["day_offset"])
        dt = dt.replace(hour=cfg["hour"], minute=cfg["minute"], second=0, microsecond=0)
        
        # S-YYYY-MM-DD-HHMM format
        slot_id = f"S-{dt.year}-{dt.month:02d}-{dt.day:02d}-{dt.hour:02d}{dt.minute:02d}"
        
        slots.append({
            "slot_id": slot_id,
            "service": cfg["service"],
            "doctor": cfg["doctor"],
            "datetime": dt.isoformat(),
            "time_of_day": cfg["time_of_day"],
            "available": True
        })
        
    return {
        "business_name": "SolnixCare Clinic, Hyderabad",
        "services": services,
        "doctors": doctors,
        "slots": slots
    }

# Call generate_slots() at module import time and store in a module-level SLOTS_DATA variable
SLOTS_DATA = generate_slots()
