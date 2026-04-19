from fastapi import APIRouter, HTTPException
from skills.models import SkillGapRequest
from skills.coach import analyze_skill_gaps

router = APIRouter()


@router.post("/analyze")
async def analyze_skills(body: SkillGapRequest):
    """
    Analyze skill gaps between the candidate's CV and their target role(s).
    Returns missing skills, strong skills, priority upskills, and a learning roadmap.
    """
    try:
        result = await analyze_skill_gaps(
            cv_text=body.cv_text,
            target_roles=body.target_roles,
        )
        return {"success": True, "analysis": result}
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Skills analysis failed: {str(e)}")
