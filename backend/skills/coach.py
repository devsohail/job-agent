"""
Skills Gap Coach — moved to dedicated skills folder.
Analyzes candidate CV vs target role market demand.
"""

import os
import json
import httpx
from typing import Any

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-opus-4-5"

SKILLS_COACH_PROMPT = """
You are a senior technical career coach and skills advisor with deep knowledge of:
- Current tech industry job market requirements (2024-2025)
- Programming languages, frameworks, cloud platforms, and AI/ML tools
- What hiring managers actually look for at different seniority levels
- The most effective and freely available learning resources

Your job is to:
1. Analyse a candidate's CV/resume against their target role(s)
2. Identify skill gaps (what they're missing vs. what the market demands)
3. Highlight their existing strong skills
4. Prioritise the TOP 3 skills they should build FIRST for maximum job impact
5. Recommend specific, real, high-quality learning resources (prefer free options)
6. Give a realistic timeline

## Rules
- Be honest but encouraging — don't sugarcoat gaps but focus on actionable paths
- Only recommend REAL resources that actually exist (Coursera, Udemy, YouTube channels, official docs, GitHub projects)
- Prioritise quick wins: skills that appear on 80%+ of job postings for this role
- Consider the candidate's existing foundation when suggesting learning paths
- Return ONLY valid JSON, no markdown, no explanation outside the JSON
"""

SKILLS_ANALYSIS_SCHEMA = """
Return ONLY a valid JSON object exactly matching this schema:
{
  "target_role": "the primary target role analysed",
  "overall_readiness": 7,
  "missing_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "strong_skills": ["existing_skill1", "existing_skill2", "existing_skill3"],
  "priority_upskills": ["top_priority1", "top_priority2", "top_priority3"],
  "resources": [
    {
      "title": "Resource Name",
      "type": "course",
      "url": "https://actual-url.com",
      "platform": "Coursera",
      "duration": "8 hours",
      "free": true
    }
  ],
  "timeline_weeks": 8,
  "summary": "2-3 sentence overall assessment and encouragement"
}
"""

def _headers() -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or api_key.startswith("sk-ant-your"):
        raise ValueError("ANTHROPIC_API_KEY is not configured")
    return {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }

def _parse_json(text: str) -> Any:
    text = text.replace("```json", "").replace("```", "").strip()
    for start, end in [("{", "}"), ("[", "]")]:
        si = text.find(start)
        ei = text.rfind(end)
        if si >= 0 and ei > si:
            try:
                return json.loads(text[si:ei + 1])
            except Exception:
                continue
    return json.loads(text)

async def analyze_skill_gaps(cv_text: str, target_roles: str) -> dict:
    prompt = f"Analyse this candidate's CV against their target role(s).\n\nTARGET ROLE(S): {target_roles}\n\nCANDIDATE CV:\n{cv_text}\n\n{SKILLS_ANALYSIS_SCHEMA}"
    
    payload = {
        "model": MODEL,
        "max_tokens": 2500,
        "system": SKILLS_COACH_PROMPT,
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(ANTHROPIC_API_URL, headers=_headers(), json=payload)
        r.raise_for_status()
        resp = r.json()

    text = "".join(b.get("text", "") for b in resp.get("content", []))
    result = _parse_json(text)

    return {
        "target_role": result.get("target_role", target_roles.split(",")[0].strip()),
        "overall_readiness": int(result.get("overall_readiness", 5)),
        "missing_skills": result.get("missing_skills", []),
        "strong_skills": result.get("strong_skills", []),
        "priority_upskills": result.get("priority_upskills", [])[:3],
        "resources": result.get("resources", []),
        "timeline_weeks": int(result.get("timeline_weeks", 8)),
        "summary": result.get("summary", ""),
    }
