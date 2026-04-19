from pydantic import BaseModel, field_validator
from typing import Optional, List


# ─── CV ────────────────────────────────────────────────────────────────────────




# ─── Search ─────────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    cv_text: str
    location: str
    job_type: str = "Any"
    target_roles: str = ""
    key_skills: str = ""
    salary_expectation: str = ""
    search_source: str = "both"  # "jsearch" | "linkedin" | "both"

    @field_validator("cv_text")
    @classmethod
    def cv_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("CV text is required")
        if len(v) > 32_000:
            raise ValueError("CV text exceeds 32,000 character limit")
        return v

    @field_validator("location")
    @classmethod
    def location_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Location is required")
        return v.strip()


# ─── Job ─────────────────────────────────────────────────────────────────────────

class Job(BaseModel):
    id: str
    title: str
    company: str
    location: str
    type: str
    salary: str
    match_score: int
    match_reason: str
    tags: List[str]
    description: str
    meets_requirements: List[str]
    gaps: List[str]
    apply_url: str
    company_initials: str
    source: str = "agent"  # "jsearch" | "linkedin" | "agent"
    posted_at: Optional[str] = None
    remote: Optional[bool] = None


# ─── Applications ────────────────────────────────────────────────────────────────

class ApplicationRequest(BaseModel):
    cv_text: str
    jobs: List[Job]

    @field_validator("cv_text")
    @classmethod
    def cv_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("CV text is required")
        return v


class ApplicationDraft(BaseModel):
    job_id: str
    job_title: str
    company: str
    cover_letter: str
    email_subject: str
    email_body: str
    gap_analysis: dict





# ─── Application Tracker ─────────────────────────────────────────────────────────

class TrackerSaveRequest(BaseModel):
    job: Job
    draft_id: Optional[str] = None
    status: str = "saved"          # saved | applied | interview | offer | rejected


class TrackerEntry(BaseModel):
    id: str
    job_title: str
    company: str
    location: str
    apply_url: str
    source: str
    status: str
    saved_at: str
    applied_at: Optional[str] = None
    notes: Optional[str] = ""
