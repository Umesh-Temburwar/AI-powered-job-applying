"""Universal Job Apply Bot — Job Portal Registry
Defines the capabilities, authentication strategies, URLs, and operational limitations
for all audited job platforms in the multi-user system.
"""

from dataclasses import asdict, dataclass, field
from typing import Any, Optional


@dataclass
class PortalCapabilities:
    public_job_discovery: bool = True
    job_detail_navigation: bool = True
    application_form_assistance: bool = False
    application_submission: bool = False


@dataclass
class PortalDefinition:
    id: str
    name: str
    website_url: str
    login_url: str
    job_discovery_url: str
    integration_type: str  # 'browser_profile' | 'official_api' | 'oauth' | 'unsupported'
    supported_auth_methods: list[str] = field(default_factory=list)
    browser_adapter: Optional[str] = None
    login_verification_strategy: str = "session_cookie_and_url_inspection"
    capabilities: PortalCapabilities = field(default_factory=PortalCapabilities)
    restrictions: list[str] = field(default_factory=list)
    status: str = "supported"  # 'supported' | 'in_development' | 'planned' | 'unsupported'
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return data


PORTAL_REGISTRY: dict[str, PortalDefinition] = {
    "naukri": PortalDefinition(
        id="naukri",
        name="Naukri.com",
        website_url="https://www.naukri.com",
        login_url="https://www.naukri.com/nlogin/login",
        job_discovery_url="https://www.naukri.com/{keywords}-jobs-in-{location}",
        integration_type="browser_profile",
        supported_auth_methods=["manual_browser_login"],
        browser_adapter="NaukriPlatformAdapter",
        login_verification_strategy="session_cookie_and_url_inspection",
        capabilities=PortalCapabilities(
            public_job_discovery=True,
            job_detail_navigation=True,
            application_form_assistance=True,
            application_submission=True,
        ),
        restrictions=[
            "Mobile OTP / SMS 2FA must be completed manually by candidate",
            "Cloudflare bot protection may present verification challenges",
            "External employer redirects require manual candidate application",
        ],
        status="supported",
        notes="Active production adapter. Easy Apply and questionnaire autofill supported.",
    ),
    "internshala": PortalDefinition(
        id="internshala",
        name="Internshala",
        website_url="https://internshala.com",
        login_url="https://internshala.com/login/user",
        job_discovery_url="https://internshala.com/jobs/{keywords}-jobs-in-{location}",
        integration_type="browser_profile",
        supported_auth_methods=["manual_browser_login", "google_oauth_in_browser"],
        browser_adapter="InternshalaPlatformAdapter",
        login_verification_strategy="dashboard_dom_verification",
        capabilities=PortalCapabilities(
            public_job_discovery=True,
            job_detail_navigation=True,
            application_form_assistance=True,
            application_submission=True,
        ),
        restrictions=[
            "Mandatory candidate assessment and covering letter prompts",
            "Google reCAPTCHA v2/v3 during submission",
            "Requires verified student/candidate account",
        ],
        status="supported",
        notes="Active production adapter. Covers internships and fresher fresher/full-time jobs.",
    ),
    "indeed": PortalDefinition(
        id="indeed",
        name="Indeed",
        website_url="https://in.indeed.com",
        login_url="https://secure.indeed.com/auth",
        job_discovery_url="https://in.indeed.com/jobs?q={keywords}&l={location}",
        integration_type="browser_profile",
        supported_auth_methods=["manual_browser_login"],
        browser_adapter="IndeedPlatformAdapter",
        login_verification_strategy="account_indicator_check",
        capabilities=PortalCapabilities(
            public_job_discovery=True,
            job_detail_navigation=True,
            application_form_assistance=True,
            application_submission=True,
        ),
        restrictions=[
            "Cloudflare Turnstile challenges",
            "Aggressive IP rate limiting and bot detection",
            "Offsite employer ATS redirects require candidate completion",
        ],
        status="supported",
        notes="Active production adapter. Supports Indeed Apply modal flows and discovery.",
    ),
    "linkedin": PortalDefinition(
        id="linkedin",
        name="LinkedIn Jobs",
        website_url="https://www.linkedin.com",
        login_url="https://www.linkedin.com/login",
        job_discovery_url="https://www.linkedin.com/jobs/search/?keywords={keywords}&location={location}",
        integration_type="browser_profile",
        supported_auth_methods=["manual_browser_login"],
        browser_adapter="LinkedInPlatformAdapter",
        login_verification_strategy="feed_nav_verification",
        capabilities=PortalCapabilities(
            public_job_discovery=True,
            job_detail_navigation=True,
            application_form_assistance=True,
            application_submission=False,
        ),
        restrictions=[
            "Arkose Labs FunCaptcha on suspicious automation signatures",
            "Device and IP pinning checkpoints",
            "Official 1-Click Apply API requires enterprise ATS partner agreement",
            "Account safety limit: max 15 Easy Apply actions per day recommended",
        ],
        status="supported",
        notes="Session verification, profile sync, and public job discovery active. Live Easy Apply requires explicit user confirmation.",
    ),
    "foundit": PortalDefinition(
        id="foundit",
        name="Foundit",
        website_url="https://www.foundit.in",
        login_url="https://www.foundit.in/seeker/login",
        job_discovery_url="https://www.foundit.in/srp/results?query={keywords}&locations={location}",
        integration_type="browser_profile",
        supported_auth_methods=["manual_browser_login"],
        browser_adapter="FounditPlatformAdapter",
        login_verification_strategy="dashboard_dom_verification",
        capabilities=PortalCapabilities(
            public_job_discovery=True,
            job_detail_navigation=True,
            application_form_assistance=False,
            application_submission=False,
        ),
        restrictions=[
            "Phone OTP login requirement",
            "Dynamic client-side rendered Single-Page Application",
        ],
        status="in_development",
        notes="Browser profile isolation and session management active. Search scraper in testing.",
    ),
    "wellfound": PortalDefinition(
        id="wellfound",
        name="Wellfound",
        website_url="https://wellfound.com",
        login_url="https://wellfound.com/login",
        job_discovery_url="https://wellfound.com/jobs",
        integration_type="browser_profile",
        supported_auth_methods=["manual_browser_login"],
        browser_adapter="WellfoundPlatformAdapter",
        login_verification_strategy="user_menu_verification",
        capabilities=PortalCapabilities(
            public_job_discovery=True,
            job_detail_navigation=True,
            application_form_assistance=True,
            application_submission=False,
        ),
        restrictions=[
            "Requires customized pitch note per startup application",
            "Cloudflare Web Application Firewall protection",
        ],
        status="in_development",
        notes="Connection & profile isolation supported. Pitch note generator in development.",
    ),
    "glassdoor": PortalDefinition(
        id="glassdoor",
        name="Glassdoor",
        website_url="https://www.glassdoor.co.in",
        login_url="https://www.glassdoor.co.in/profile/login_input.htm",
        job_discovery_url="https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword={keywords}&locKeyword={location}",
        integration_type="browser_profile",
        supported_auth_methods=["manual_browser_login"],
        browser_adapter="GlassdoorPlatformAdapter",
        login_verification_strategy="session_cookie_and_url_inspection",
        capabilities=PortalCapabilities(
            public_job_discovery=True,
            job_detail_navigation=True,
            application_form_assistance=False,
            application_submission=False,
        ),
        restrictions=[
            "Mandatory user review/salary gate walls before viewing jobs",
            "Cloudflare bot protection challenges",
        ],
        status="in_development",
        notes="Job search discovery supported. Account-based automation in progress.",
    ),
    "cutshort": PortalDefinition(
        id="cutshort",
        name="Cutshort",
        website_url="https://cutshort.io",
        login_url="https://cutshort.io/login",
        job_discovery_url="https://cutshort.io/jobs/{keywords}-jobs",
        integration_type="browser_profile",
        supported_auth_methods=["manual_browser_login"],
        browser_adapter="CutshortPlatformAdapter",
        login_verification_strategy="session_cookie_and_url_inspection",
        capabilities=PortalCapabilities(
            public_job_discovery=True,
            job_detail_navigation=True,
            application_form_assistance=True,
            application_submission=False,
        ),
        restrictions=[
            "WhatsApp / Phone OTP verification",
            "Interactive Voila match questionnaire requirement",
        ],
        status="in_development",
        notes="Profile setup and job tracking supported. Direct application in testing.",
    ),
}


def get_all_portals() -> list[PortalDefinition]:
    """Return list of all registered portals."""
    return list(PORTAL_REGISTRY.values())


def get_portal(portal_id: str) -> Optional[PortalDefinition]:
    """Lookup portal definition by case-insensitive identifier or name."""
    clean_id = portal_id.strip().lower()
    if clean_id in PORTAL_REGISTRY:
        return PORTAL_REGISTRY[clean_id]
    for key, portal in PORTAL_REGISTRY.items():
        if portal.name.lower() == clean_id or key in clean_id:
            return portal
    return None


def is_portal_registered(portal_id: str) -> bool:
    """Check if portal exists in the registry."""
    return get_portal(portal_id) is not None
