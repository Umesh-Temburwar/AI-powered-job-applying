from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class JobOpportunity:
    job_title: str
    company: str
    job_url: str
    platform: str
    location: Optional[str] = None
    salary: Optional[str] = None
    description: Optional[str] = None
    match_score: Optional[float] = None
    is_easy_apply: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ApplyResult:
    job_url: str
    job_title: str
    company: str
    platform: str
    success: bool
    status: str  # "applied", "review_needed", "failed", "duplicate", "unsupported"
    notes: str
    error: Optional[str] = None


class BasePlatformAdapter(ABC):
    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Name of portal (Naukri, Internshala, Indeed)."""
        pass

    @abstractmethod
    def check_session(self, driver: Any) -> tuple[bool, Optional[str]]:
        """Verify if current browser driver has an active, authenticated session.
        Returns: (is_logged_in, account_identifier_or_reason)
        """
        pass

    @abstractmethod
    def build_search_urls(self, keywords: list[str], locations: list[str]) -> list[str]:
        """Construct platform-specific search URLs matching candidate targets."""
        pass

    @abstractmethod
    def search_jobs(
        self,
        driver: Any,
        search_urls: list[str],
        max_results: int,
        cancel_check: Optional[callable] = None,
    ) -> list[JobOpportunity]:
        """Extract job opportunities from portal search results."""
        pass

    @abstractmethod
    def apply_to_job(
        self,
        driver: Any,
        job: JobOpportunity,
        user_profile: dict[str, Any],
        resume_path: Optional[str],
        dry_run: bool = True,
        user_confirmed: bool = False,
    ) -> ApplyResult:
        """Process vacancy application or simulated dry-run review."""
        pass
