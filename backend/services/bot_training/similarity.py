"""
Fuzzy Token and String Similarity Matcher
================================================================================
Provides offline, deterministic string and token similarity algorithms
(Levenshtein ratio, Jaccard token overlap, token sort ratio)
without external heavy dependencies.
"""

import re
import string
from typing import List, Tuple, Set, Dict, Optional


def normalize_text(text: str) -> str:
    """Normalize text by lowercasing, stripping punctuation, and compressing whitespace."""
    if not text:
        return ""
    # Replace punctuation with spaces
    cleaned = re.sub(r"[%s]" % re.escape(string.punctuation), " ", text.lower())
    return " ".join(cleaned.split())


def tokenize(text: str) -> List[str]:
    """Tokenize normalized string into words."""
    norm = normalize_text(text)
    return [t for t in norm.split() if t]


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute the Levenshtein edit distance between two strings."""
    if s1 == s2:
        return 0
    if len(s1) == 0:
        return len(s2)
    if len(s2) == 0:
        return len(s1)

    v0 = list(range(len(s2) + 1))
    v1 = [0] * (len(s2) + 1)

    for i in range(len(s1)):
        v1[0] = i + 1
        for j in range(len(s2)):
            cost = 0 if s1[i] == s2[j] else 1
            v1[j + 1] = min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
        v0 = list(v1)

    return v1[len(s2)]


def levenshtein_ratio(s1: str, s2: str) -> float:
    """Calculate normalized similarity ratio between 0.0 and 1.0."""
    n1 = normalize_text(s1)
    n2 = normalize_text(s2)
    if not n1 and not n2:
        return 1.0
    if not n1 or not n2:
        return 0.0
    max_len = max(len(n1), len(n2))
    dist = levenshtein_distance(n1, n2)
    return round(1.0 - (dist / max_len), 4)


def jaccard_similarity(s1: str, s2: str) -> float:
    """Calculate token-level Jaccard set intersection over union."""
    t1 = set(tokenize(s1))
    t2 = set(tokenize(s2))
    if not t1 and not t2:
        return 1.0
    if not t1 or not t2:
        return 0.0
    intersection = t1.intersection(t2)
    union = t1.union(t2)
    return round(len(intersection) / len(union), 4)


def token_sort_ratio(s1: str, s2: str) -> float:
    """Calculate similarity after sorting tokens in both strings."""
    t1 = " ".join(sorted(tokenize(s1)))
    t2 = " ".join(sorted(tokenize(s2)))
    return levenshtein_ratio(t1, t2)


def token_set_ratio(s1: str, s2: str) -> float:
    """Calculate token set ratio comparing intersection against remainders."""
    t1 = set(tokenize(s1))
    t2 = set(tokenize(s2))
    if not t1 or not t2:
        return 0.0

    intersection = sorted(list(t1.intersection(t2)))
    diff1 = sorted(list(t1.difference(t2)))
    diff2 = sorted(list(t2.difference(t1)))

    s_inter = " ".join(intersection)
    s_diff1 = f"{s_inter} {' '.join(diff1)}".strip()
    s_diff2 = f"{s_inter} {' '.join(diff2)}".strip()

    r1 = levenshtein_ratio(s_inter, s_diff1) if s_inter else 0.0
    r2 = levenshtein_ratio(s_inter, s_diff2) if s_inter else 0.0
    r3 = levenshtein_ratio(s_diff1, s_diff2)

    return round(max(r1, r2, r3, levenshtein_ratio(s1, s2)), 4)


class QuestionMatcher:
    """Finds best matching question and answer from a known bank using multi-strategy similarity."""

    def __init__(self, answer_bank: Dict[str, Dict[str, str]], threshold: float = 0.65):
        self.answer_bank = answer_bank
        self.threshold = threshold

    def find_best_match(self, query: str) -> Optional[Tuple[str, Dict[str, str], float]]:
        """Return (matched_question_key, answer_payload, score) or None if below threshold."""
        query_norm = normalize_text(query)
        if not query_norm:
            return None

        best_score = 0.0
        best_match = None

        for k, payload in self.answer_bank.items():
            k_norm = normalize_text(k)
            # 1. Exact match
            if query_norm == k_norm:
                return (k, payload, 1.0)

            # 2. Substring match bonus
            if query_norm in k_norm or k_norm in query_norm:
                sub_score = 0.90
                if sub_score > best_score:
                    best_score = sub_score
                    best_match = (k, payload, sub_score)

            # 3. Token set ratio
            ts_score = token_set_ratio(query_norm, k_norm)
            if ts_score > best_score:
                best_score = ts_score
                best_match = (k, payload, ts_score)

        if best_match and best_score >= self.threshold:
            return best_match
        return None
