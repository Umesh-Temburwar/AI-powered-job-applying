import logging
from typing import Optional
from core.config import get_settings

logger = logging.getLogger("supabase")
_client = None


def get_supabase_client():
    """
    Get or create a cached Supabase service-role client.
    Returns None if environment variables are not configured or on import error.
    """
    global _client
    if _client is not None:
        return _client

    settings = get_settings()
    url = getattr(settings, "SUPABASE_URL", "")
    key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "") or getattr(settings, "SUPABASE_SECRET_KEY", "")
    if not url or not key:
        return None

    try:
        from supabase import Client, create_client
        _client = create_client(url, key)
        return _client
    except Exception as e:
        logger.warning("Could not initialize Supabase client: %s", e)
        return None
