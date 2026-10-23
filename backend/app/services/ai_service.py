"""AI-powered content analysis service.

When configured with a provider and API key, this service sends content along
with the workspace's brand guidelines and approved facts to an AI model for
deeper analysis that goes beyond deterministic rule matching.
"""

import json
import logging
from dataclasses import dataclass
from typing import List, Optional

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)


@dataclass
class AIFinding:
    """A finding produced by AI analysis."""

    category: str  # guideline/tone/factual_claim
    title: str
    description: str
    matched_text: Optional[str] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    severity: str = "medium"
    confidence: str = "potential_mismatch"
    explanation: Optional[str] = None
    suggestion: Optional[str] = None
    evidence_status: str = "not_applicable"


_SYSTEM_PROMPT = """You are a brand compliance reviewer. Analyze the given content against the provided brand guidelines and approved facts.

Return a JSON array of findings. Each finding must be a JSON object with these fields:
- category: one of "guideline", "tone", "factual_claim"
- title: short title of the issue
- description: detailed explanation
- matched_text: the exact text snippet that has the issue (or null)
- severity: one of "critical", "high", "medium", "low", "info"
- confidence: one of "potential_mismatch", "unsupported_claim"
- explanation: why this is an issue
- suggestion: how to fix it
- evidence_status: one of "supported", "contradicted", "insufficient", "not_applicable"

If there are no issues, return an empty array: []
Only return valid JSON. No markdown, no explanation outside the JSON."""


class AIService:
    """Optional AI-powered content analysis."""

    def __init__(self, config: Settings) -> None:
        self.provider = config.AI_PROVIDER
        self.api_key = config.AI_API_KEY
        self.model = config.AI_MODEL
        self.available = bool(config.AI_API_KEY and config.AI_PROVIDER != "none")

    async def analyze_content(
        self,
        content: str,
        guidelines: list,
        facts: list,
    ) -> Optional[List[AIFinding]]:
        """Analyze content with the configured AI provider.

        Returns a list of AIFinding objects, or None if AI is not available
        or if the call fails.
        """
        if not self.available:
            return None

        guidelines_text = "\n".join(
            f"- [{g.severity.upper()}] {g.title}: {g.description}" for g in guidelines
        )
        facts_text = "\n".join(
            f"- {f.title}: {f.statement} (Source: {f.source_reference}, Status: {f.verification_status})"
            for f in facts
        )

        user_prompt = (
            f"## Brand Guidelines\n{guidelines_text or 'None provided.'}\n\n"
            f"## Approved Facts\n{facts_text or 'None provided.'}\n\n"
            f"## Content to Review\n{content}"
        )

        try:
            raw = await self._call_provider(user_prompt)
            if raw is None:
                return None
            return self._parse_response(raw)
        except Exception:
            logger.exception("AI analysis failed")
            return None

    # ------------------------------------------------------------------
    # Provider-specific API calls
    # ------------------------------------------------------------------

    async def _call_provider(self, user_prompt: str) -> Optional[str]:
        """Route to the appropriate provider."""
        if self.provider == "openai":
            return await self._call_openai(user_prompt)
        if self.provider == "gemini":
            return await self._call_gemini(user_prompt)
        logger.warning("Unsupported AI provider: %s", self.provider)
        return None

    async def _call_openai(self, user_prompt: str) -> Optional[str]:
        """Call OpenAI-compatible chat completions endpoint."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model or "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 4096,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def _call_gemini(self, user_prompt: str) -> Optional[str]:
        """Call Google Gemini API."""
        model = self.model or "gemini-2.0-flash"
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
            f":generateContent?key={self.api_key}"
        )
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [
                        {"parts": [{"text": f"{_SYSTEM_PROMPT}\n\n{user_prompt}"}]}
                    ],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4096},
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    # ------------------------------------------------------------------
    # Response parsing
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_response(raw: str) -> List[AIFinding]:
        """Parse the raw AI response into validated AIFinding objects."""
        # Strip markdown code fences if present
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last lines (fences)
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        try:
            items = json.loads(text)
        except json.JSONDecodeError:
            logger.error("Failed to parse AI response as JSON: %s", text[:200])
            return []

        if not isinstance(items, list):
            return []

        findings: List[AIFinding] = []
        valid_categories = {"guideline", "tone", "factual_claim"}
        valid_severities = {"critical", "high", "medium", "low", "info"}
        valid_confidences = {"potential_mismatch", "unsupported_claim"}
        valid_evidence = {"supported", "contradicted", "insufficient", "not_applicable"}

        for item in items:
            if not isinstance(item, dict):
                continue
            category = item.get("category", "")
            if category not in valid_categories:
                continue

            findings.append(
                AIFinding(
                    category=category,
                    title=str(item.get("title", "AI Finding"))[:255],
                    description=str(item.get("description", "")),
                    matched_text=item.get("matched_text"),
                    char_start=item.get("char_start"),
                    char_end=item.get("char_end"),
                    severity=(
                        item.get("severity", "medium")
                        if item.get("severity") in valid_severities
                        else "medium"
                    ),
                    confidence=(
                        item.get("confidence", "potential_mismatch")
                        if item.get("confidence") in valid_confidences
                        else "potential_mismatch"
                    ),
                    explanation=item.get("explanation"),
                    suggestion=item.get("suggestion"),
                    evidence_status=(
                        item.get("evidence_status", "not_applicable")
                        if item.get("evidence_status") in valid_evidence
                        else "not_applicable"
                    ),
                )
            )

        return findings
