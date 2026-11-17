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


STOPWORDS: Set[str] = {
    "a", "an", "the", "is", "are", "was", "were", "do", "does", "did",
    "you", "your", "yours", "we", "our", "in", "on", "at", "for", "of",
    "to", "with", "and", "or", "by", "from", "what", "how", "have", "has",
    "can", "will", "would", "please", "enter", "mention", "provide", "tell", "us",
}


def char_ngram_similarity(s1: str, s2: str, n: int = 3) -> float:
    """Calculate Dice coefficient over character n-grams to resist typos and suffixes."""
    n1 = normalize_text(s1)
    n2 = normalize_text(s2)
    if not n1 or not n2:
        return 0.0
    if len(n1) < n or len(n2) < n:
        return levenshtein_ratio(n1, n2)
    g1 = {n1[i : i + n] for i in range(len(n1) - n + 1)}
    g2 = {n2[i : i + n] for i in range(len(n2) - n + 1)}
    if not g1 or not g2:
        return 0.0
    return round((2.0 * len(g1.intersection(g2))) / (len(g1) + len(g2)), 4)


def weighted_token_similarity(s1: str, s2: str) -> float:
    """Compute stopword-filtered Jaccard overlap blended with character trigram similarity."""
    t1 = {t for t in tokenize(s1) if t not in STOPWORDS}
    t2 = {t for t in tokenize(s2) if t not in STOPWORDS}
    if not t1 or not t2:
        return jaccard_similarity(s1, s2)
    overlap = len(t1.intersection(t2)) / len(t1.union(t2))
    ngram = char_ngram_similarity(" ".join(sorted(t1)), " ".join(sorted(t2)))
    return round((0.65 * overlap) + (0.35 * ngram), 4)


class QuestionMatcher:
    """Finds best matching question and answer from a known bank using multi-strategy similarity."""

    def __init__(self, answer_bank: Dict[str, Dict[str, str]], threshold: float = 0.65):
        self.answer_bank = answer_bank
        self.threshold = threshold

    def _score_pair(self, query_norm: str, k_norm: str) -> float:
        if query_norm == k_norm:
            return 1.0
        score = 0.0
        if query_norm in k_norm or k_norm in query_norm:
            score = max(score, 0.90)
        score = max(score, token_set_ratio(query_norm, k_norm))
        score = max(score, weighted_token_similarity(query_norm, k_norm))
        return round(score, 4)

    def find_top_matches(self, query: str, top_k: int = 3) -> List[Tuple[str, Dict[str, str], float]]:
        """Return top-k matching questions above threshold sorted by descending confidence."""
        query_norm = normalize_text(query)
        if not query_norm:
            return []

        scored: List[Tuple[str, Dict[str, str], float]] = []
        for k, payload in self.answer_bank.items():
            k_norm = normalize_text(k)
            score = self._score_pair(query_norm, k_norm)
            if score >= self.threshold:
                scored.append((k, payload, score))

        scored.sort(key=lambda item: item[2], reverse=True)
        return scored[:top_k]

    def find_best_match(self, query: str) -> Optional[Tuple[str, Dict[str, str], float]]:
        """Return (matched_question_key, answer_payload, score) or None if below threshold."""
        top = self.find_top_matches(query, top_k=1)
        return top[0] if top else None
