"""
Platform Automation Engine
==========================
Per-user isolated browser automation handlers for Naukri, Internshala, Indeed, and LinkedIn.
"""

from services.platform_automation.base import ApplyResult, BasePlatformAdapter, JobOpportunity
from services.platform_automation.indeed import IndeedPlatformAdapter
from services.platform_automation.internshala import InternshalaPlatformAdapter
from services.platform_automation.linkedin import LinkedInPlatformAdapter
from services.platform_automation.naukri import NaukriPlatformAdapter
from services.platform_automation.runner import get_adapter_for_platform, run_platform_automation_task

__all__ = [
    "ApplyResult",
    "BasePlatformAdapter",
    "JobOpportunity",
    "IndeedPlatformAdapter",
    "InternshalaPlatformAdapter",
    "LinkedInPlatformAdapter",
    "NaukriPlatformAdapter",
    "get_adapter_for_platform",
    "run_platform_automation_task",
]
