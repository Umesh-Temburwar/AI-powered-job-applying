"""
Contextual Answer Formatter & Normalizer
================================================================================
Adapts candidate data into specific portal formats: numeric, descriptive,
radio/boolean, currency (LPA vs Rupees), or dropdown options.
"""

import re
from typing import Optional, Union


def format_salary_response(value: Union[float, int, str], target_format: str = "lpa") -> str:
    """Format salary/CTC values into portal-compatible formats.

    Args:
        value: Raw value, e.g. 4.5, "4.5", "450000", "0"
        target_format: 'lpa' (e.g. '4.5'), 'lpa_text' ('4.5 LPA'), 'rupees' ('450000'), 'zero' ('0')
    """
    clean_str = str(value).lower().replace("lpa", "").replace("lakhs", "").replace("₹", "").replace(",", "").strip()
    try:
        val_float = float(clean_str)
    except ValueError:
        return str(value)

    if val_float == 0:
        if target_format == "rupees":
            return "0"
        return "0"

    # If already in lakhs (e.g. 4.5)
    if val_float < 100:
        lpa = val_float
        rupees = int(val_float * 100000)
    else:
        rupees = int(val_float)
        lpa = round(val_float / 100000, 2)

    if target_format == "rupees":
        return str(rupees)
    elif target_format == "lpa_text":
        return f"{lpa} LPA"
    return str(lpa)


def format_notice_period(days: int = 0, style: str = "immediate") -> str:
    """Format notice period into target style.

    Args:
        days: Notice period in days (0 for immediate)
        style: 'numeric' ('0'), 'immediate' ('Immediate'), 'full' ('Immediate (0 Days)'), 'dropdown' ('0-15 Days')
    """
    if days == 0:
        if style == "numeric":
            return "0"
        elif style == "full":
            return "Immediate (0 Days)"
        elif style == "dropdown":
            return "15 Days or less"
        return "Immediate"

    if style == "numeric":
        return str(days)
    elif style == "full":
        return f"{days} Days"
    return f"{days} Days"


def format_experience(years: Union[float, int, str] = 1, is_fresher: bool = False, style: str = "years") -> str:
    """Format experience for different field requirements.

    Args:
        years: Number of years
        is_fresher: Whether to format as fresher
        style: 'numeric', 'fresher_text', 'years_text'
    """
    if is_fresher or str(years) == "0":
        if style == "numeric":
            return "0"
        return "Fresher"

    y_str = str(years).replace("years", "").replace("year", "").strip()
    if style == "numeric":
        return y_str
    return f"{y_str} Year" if y_str == "1" else f"{y_str} Years"


def format_boolean_choice(val: bool, style: str = "yes_no") -> str:
    """Format boolean yes/no response.

    Args:
        val: True or False
        style: 'yes_no' ('Yes'/'No'), 'lower' ('yes'/'no'), 'bool' ('True'/'False')
    """
    if style == "lower":
        return "yes" if val else "no"
    elif style == "bool":
        return "True" if val else "False"
    return "Yes" if val else "No"


def adapt_answer_for_field(raw_answer: str, field_type: str = "text") -> str:
    """Adapt standard answer to expected form field type."""
    ft = (field_type or "text").lower().strip()
    ans = raw_answer.strip()

    if ft in ("radio", "checkbox", "boolean"):
        ans_lower = ans.lower()
        if ans_lower in ("yes", "y", "true", "1", "comfortable", "willing", "immediate"):
            return "Yes"
        elif ans_lower in ("no", "n", "false", "0"):
            return "No"
        return ans

    if ft == "number" or ft == "numeric":
        digits = re.findall(r"\d+\.?\d*", ans)
        if digits:
            return digits[0]
        return ans

    return ans
