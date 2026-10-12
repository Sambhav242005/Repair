"""Strict ISO-8601 parsing for stored and user-supplied timestamps."""
from datetime import datetime, timezone


def parse_offset_datetime(value: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Timestamp must be an ISO-8601 date and time with an explicit UTC offset.")
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        raise ValueError("Timestamp must be an ISO-8601 date and time with an explicit UTC offset.") from None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Timestamp must include a UTC offset, for example Z or +05:30.")
    return parsed.astimezone(timezone.utc)


def normalize_utc_iso(value: str) -> str:
    return parse_offset_datetime(value).isoformat()
