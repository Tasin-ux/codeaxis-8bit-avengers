"""Deterministic rule engine for content compliance checking.

Scans content against workspace rules (prohibited phrases, terminology,
required disclaimers) and returns findings with exact character offsets.
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.disclaimer import RequiredDisclaimer
from app.models.prohibited_phrase import ProhibitedPhrase
from app.models.terminology import ApprovedTerminology


@dataclass
class FindingResult:
    """A single finding produced by the rule engine."""

    category: str
    title: str
    description: str
    matched_text: Optional[str] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    severity: str = "medium"
    confidence: str = "rule_violation"
    explanation: Optional[str] = None
    suggestion: Optional[str] = None
    rule_id: Optional[str] = None
    rule_type: Optional[str] = None
    evidence_status: str = "not_applicable"
    source: str = "deterministic"


# Maximum pattern length to protect against ReDoS
_MAX_PATTERN_LEN = 500


def _safe_escape(text: str) -> str:
    """Escape regex special chars but limit total length to prevent ReDoS."""
    escaped = re.escape(text[:_MAX_PATTERN_LEN])
    return escaped


def _word_boundary(pattern_text: str) -> str:
    """Wrap a pattern with lookaround boundaries.

    ``\\b`` cannot be used here: patterns that begin or end with a
    non-word character (e.g. "#1 solution", "no strings attached!")
    would never match. Lookarounds require a non-word character (or
    string edge) on each side instead.
    """
    return rf"(?<!\w){pattern_text}(?!\w)"


class RuleEngine:
    """Run deterministic compliance checks against workspace rules."""

    def __init__(self, db: Session, workspace_id: str) -> None:
        self.db = db
        self.workspace_id = workspace_id

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run_all_checks(
        self, content: str, content_type: Optional[str] = None
    ) -> List[FindingResult]:
        """Execute every check category and return de-duplicated findings."""
        findings: List[FindingResult] = []
        findings.extend(self.check_prohibited_phrases(content))
        findings.extend(self.check_terminology(content))
        findings.extend(self.check_disclaimers(content, content_type))
        return self._deduplicate(findings)

    # ------------------------------------------------------------------
    # Prohibited phrases
    # ------------------------------------------------------------------

    def check_prohibited_phrases(self, content: str) -> List[FindingResult]:
        """Find all occurrences of prohibited phrases in *content*."""
        phrases = (
            self.db.query(ProhibitedPhrase)
            .filter(
                ProhibitedPhrase.workspace_id == self.workspace_id,
                ProhibitedPhrase.is_active == True,  # noqa: E712
            )
            .all()
        )

        findings: List[FindingResult] = []
        for phrase_rule in phrases:
            pattern_text = _safe_escape(phrase_rule.phrase)

            if phrase_rule.whole_word:
                pattern_text = _word_boundary(pattern_text)

            flags = 0 if phrase_rule.case_sensitive else re.IGNORECASE
            try:
                pattern = re.compile(pattern_text, flags)
            except re.error:
                continue  # skip malformed patterns

            for match in pattern.finditer(content):
                suggestion_text = None
                if phrase_rule.suggested_alternative:
                    suggestion_text = f"Consider using: \"{phrase_rule.suggested_alternative}\""

                findings.append(
                    FindingResult(
                        category="prohibited_phrase",
                        title=f"Prohibited phrase: \"{phrase_rule.phrase}\"",
                        description=(
                            phrase_rule.reason
                            or f"The phrase \"{phrase_rule.phrase}\" is not allowed."
                        ),
                        matched_text=match.group(),
                        char_start=match.start(),
                        char_end=match.end(),
                        severity=phrase_rule.severity,
                        confidence="rule_violation",
                        explanation=phrase_rule.reason,
                        suggestion=suggestion_text,
                        rule_id=phrase_rule.id,
                        rule_type="prohibited_phrase",
                    )
                )

        return findings

    # ------------------------------------------------------------------
    # Terminology
    # ------------------------------------------------------------------

    def check_terminology(self, content: str) -> List[FindingResult]:
        """Find disallowed terms and suggest preferred alternatives."""
        terms = (
            self.db.query(ApprovedTerminology)
            .filter(
                ApprovedTerminology.workspace_id == self.workspace_id,
                ApprovedTerminology.is_active == True,  # noqa: E712
            )
            .all()
        )

        findings: List[FindingResult] = []
        for term_rule in terms:
            pattern_text = _safe_escape(term_rule.disallowed_term)
            # Always match on word boundaries for terminology
            pattern_text = _word_boundary(pattern_text)

            flags = 0 if term_rule.case_sensitive else re.IGNORECASE
            try:
                pattern = re.compile(pattern_text, flags)
            except re.error:
                continue

            for match in pattern.finditer(content):
                findings.append(
                    FindingResult(
                        category="terminology",
                        title=f"Non-preferred term: \"{term_rule.disallowed_term}\"",
                        description=(
                            term_rule.explanation
                            or f"Use \"{term_rule.preferred_term}\" instead of \"{term_rule.disallowed_term}\"."
                        ),
                        matched_text=match.group(),
                        char_start=match.start(),
                        char_end=match.end(),
                        severity="medium",
                        confidence="rule_violation",
                        explanation=term_rule.explanation,
                        suggestion=f"Replace with \"{term_rule.preferred_term}\"",
                        rule_id=term_rule.id,
                        rule_type="terminology",
                    )
                )

        return findings

    # ------------------------------------------------------------------
    # Disclaimers
    # ------------------------------------------------------------------

    def check_disclaimers(
        self, content: str, content_type: Optional[str] = None
    ) -> List[FindingResult]:
        """Check that required disclaimers are present in *content*."""
        query = self.db.query(RequiredDisclaimer).filter(
            RequiredDisclaimer.workspace_id == self.workspace_id,
            RequiredDisclaimer.is_active == True,  # noqa: E712
        )
        if content_type:
            query = query.filter(RequiredDisclaimer.content_category == content_type)

        disclaimers = query.all()

        findings: List[FindingResult] = []

        def _normalize(text: str) -> str:
            """Collapse all whitespace runs so line-wrapped disclaimers still match."""
            return re.sub(r"\s+", " ", text).lower().strip()

        content_normalized = _normalize(content)

        for disc in disclaimers:
            if _normalize(disc.text) not in content_normalized:
                findings.append(
                    FindingResult(
                        category="disclaimer",
                        title=f'Missing required disclaimer: "{disc.text}"',
                        description=(
                            f"Content of type '{disc.content_category}' must include the disclaimer: "
                            f"\"{disc.text[:120]}{'...' if len(disc.text) > 120 else ''}\""
                        ),
                        matched_text=None,
                        char_start=None,
                        char_end=None,
                        severity=disc.severity,
                        confidence="rule_violation",
                        explanation=f"Required for content category: {disc.content_category}",
                        suggestion=f'Add this disclaimer to your content: "{disc.text}"',
                        rule_id=disc.id,
                        rule_type="disclaimer",
                    )
                )

        return findings

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _deduplicate(findings: List[FindingResult]) -> List[FindingResult]:
        """Remove duplicate findings based on (rule_id, char_start, char_end)."""
        seen: set = set()
        unique: List[FindingResult] = []
        for f in findings:
            key = (f.rule_id, f.char_start, f.char_end, f.category)
            if key in seen:
                continue
            seen.add(key)
            unique.append(f)
        return unique
