"""Analytics schemas."""

from typing import List, Optional

from pydantic import BaseModel


class StatusCount(BaseModel):
    status: str
    count: int


class CategoryCount(BaseModel):
    category: str
    count: int


class SeverityCount(BaseModel):
    severity: str
    count: int


class RuleHit(BaseModel):
    rule_id: Optional[str] = None
    rule_type: Optional[str] = None
    title: str
    hit_count: int


class AnalyticsOverview(BaseModel):
    total_submissions: int
    submissions_by_status: List[StatusCount]
    total_findings: int
    total_resolved_findings: int


class FindingAnalytics(BaseModel):
    total_findings: int
    by_category: List[CategoryCount]
    by_severity: List[SeverityCount]


class RuleAnalytics(BaseModel):
    most_triggered: List[RuleHit]
