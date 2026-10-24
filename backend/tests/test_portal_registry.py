"""Unit tests for portal registry definitions in backend/services/portal_registry.py."""

import pytest
from backend.services.portal_registry import (
    PORTAL_REGISTRY,
    get_all_portals,
    get_portal,
    is_portal_registered,
    PortalDefinition,
)


def test_portal_registry_contains_major_platforms():
    """Ensure core job platforms are registered."""
    portals = get_all_portals()
    portal_ids = {p.id for p in portals}
    assert "naukri" in portal_ids
    assert "internshala" in portal_ids
    assert "indeed" in portal_ids
    assert "linkedin" in portal_ids


def test_get_portal_lookup_case_insensitive():
    """Verify case-insensitive portal lookup."""
    p_naukri = get_portal("Naukri")
    assert p_naukri is not None
    assert p_naukri.id == "naukri"

    p_linkedin = get_portal("LINKEDIN")
    assert p_linkedin is not None
    assert p_linkedin.id == "linkedin"


def test_is_portal_registered():
    """Test registry membership check."""
    assert is_portal_registered("indeed") is True
    assert is_portal_registered("non_existent_portal_xyz") is False


def test_portal_definition_to_dict():
    """Test serialization of portal definition to dict."""
    p = get_portal("naukri")
    assert p is not None
    d = p.to_dict()
    assert isinstance(d, dict)
    assert d["id"] == "naukri"
    assert "capabilities" in d
