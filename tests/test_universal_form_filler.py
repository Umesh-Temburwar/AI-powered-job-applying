"""
Unit tests for Universal Form Filler DOM Driver (platforms/universal_form_filler.py)
"""

import pytest
from unittest.mock import MagicMock
from platforms.universal_form_filler import (
    human_type,
    safe_click_control,
    select_dropdown_option,
    navigate_modal_step,
    UniversalFormFiller
)


class MockWebElement:
    def __init__(self, tag_name="input", el_type="text", attrs=None, text=""):
        self.tag_name = tag_name
        self.el_type = el_type
        self.attrs = attrs or {}
        self._text = text
        self.clicked = False
        self.typed_chars = []
        self._selected = False

    def get_attribute(self, name):
        if name == "type":
            return self.el_type
        return self.attrs.get(name, "")

    def is_displayed(self):
        return True

    def is_enabled(self):
        return True

    def is_selected(self):
        return self._selected

    @property
    def text(self):
        return self._text

    def click(self):
        self.clicked = True

    def clear(self):
        self.typed_chars = []

    def send_keys(self, *keys):
        for k in keys:
            self.typed_chars.append(str(k))


def test_human_type_success():
    elem = MockWebElement()
    res = human_type(elem, "Umesh Temburwar", min_delay=0.001, max_delay=0.002)
    assert res is True
    assert len(elem.typed_chars) > 0


def test_safe_click_control():
    elem = MockWebElement(tag_name="button")
    mock_driver = MagicMock()
    res = safe_click_control(mock_driver, elem)
    assert res is True
    assert elem.clicked is True


def test_navigate_modal_step_submission():
    mock_driver = MagicMock()
    submit_btn = MockWebElement(tag_name="button", text="Submit your application")
    mock_driver.find_elements.return_value = [submit_btn]

    status = navigate_modal_step(mock_driver)
    assert status == "submitted"


def test_navigate_modal_step_progression():
    mock_driver = MagicMock()
    # No submit button, only next button
    def find_elems(by, xpath):
        if "submit" in xpath:
            return []
        if "continue" in xpath or "next" in xpath:
            return [MockWebElement(tag_name="button", text="Continue to next step")]
        return []

    mock_driver.find_elements.side_effect = find_elems
    status = navigate_modal_step(mock_driver)
    assert status == "next_step"


def test_universal_form_filler_initialization():
    filler = UniversalFormFiller()
    assert filler.graph is not None
    assert "Umesh" in filler.graph.name
    assert filler.graph.notice_period == "Immediate (0 Days)"


def test_extract_field_label():
    filler = UniversalFormFiller()
    elem = MockWebElement(attrs={"aria-label": "How many years of React experience do you have?"})
    label = filler.extract_field_label(None, elem)
    assert label == "How many years of React experience do you have?"

