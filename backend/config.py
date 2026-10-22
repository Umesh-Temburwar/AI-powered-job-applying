"""Legacy configuration shim redirecting to core.config."""

from core.config import Settings, get_settings

settings = get_settings()

__all__ = ["Settings", "get_settings", "settings"]
