from pydantic import BaseModel
from typing import Optional, List

class LearningResource(BaseModel):
    title: str
    type: str        # "course" | "book" | "youtube" | "docs" | "project"
    url: str
    platform: str
    duration: Optional[str] = None
    free: bool = True

class SkillGapResult(BaseModel):
    target_role: str
    overall_readiness: int         # 1-10
    missing_skills: List[str]
    strong_skills: List[str]
    priority_upskills: List[str]   # top 3 to focus on now
    resources: List[LearningResource]
    timeline_weeks: int
    summary: str

class SkillGapRequest(BaseModel):
    cv_text: str
    target_roles: str
