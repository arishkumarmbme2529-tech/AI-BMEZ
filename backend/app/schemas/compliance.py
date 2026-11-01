from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ComplianceRuleBase(BaseModel):
    rule_id: str
    name: str
    category_id: Optional[int] = None
    description: Optional[str] = None
    requirement: Optional[str] = None
    validation_type: Optional[str] = None
    severity: str = "MEDIUM"
    is_active: bool = True
    version: str = "1.0"


class ComplianceRuleCreate(ComplianceRuleBase):
    pass


class ComplianceRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    requirement: Optional[str] = None
    validation_type: Optional[str] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None
    version: Optional[str] = None


class ComplianceRuleResponse(ComplianceRuleBase):
    id: int
    is_sample: bool

    class Config:
        from_attributes = True


class ComplianceResultResponse(BaseModel):
    id: int
    application_id: int
    rule_id: int
    status: str
    evidence: Optional[str] = None
    notes: Optional[str] = None
    checked_at: datetime
    rule_name: Optional[str] = None
    rule_severity: Optional[str] = None

    class Config:
        from_attributes = True


class ComplianceCheckResponse(BaseModel):
    application_id: int
    total_rules: int
    compliant: int
    non_compliant: int
    partial: int
    pending: int
    results: List[ComplianceResultResponse]
