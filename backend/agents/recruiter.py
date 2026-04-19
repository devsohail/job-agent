"""
Recruiter Agent — uses the recruiter skill as its system prompt.
Runs a multi-step agentic loop:
  1. Parse CV  →  extract structured profile
  2. Search    →  JSearch API + LinkedIn Job Search via RapidAPI (real tool calls)
  3. Match     →  score & rank results against profile
  4. Draft     →  cover letters, emails, gap analysis per job
"""

import os
import json
import uuid
import re
import httpx
from typing import Any

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-opus-4-5"

RECRUITER_SKILL = """
---
name: recruiter
description: >
  AI recruiter skill that finds real, current job openings for a candidate at a specified location
  (e.g. Islamabad, Spain, New Zealand, Dubai, Remote) and produces a ranked job match list plus a
  CV gap analysis. Use this skill whenever the user asks to find jobs, search for roles, look for
  opportunities, or mentions a location alongside job hunting, hiring, or career search. Trigger
  even for casual phrasings like "find me jobs in X", "what's hiring in Y for someone like me",
  "any roles in Z I should apply to", or "help me find work in [country/city]". Also trigger when
  the user shares a CV or skills profile and asks for job market advice, career moves, or role fit.
---
 
# Recruiter Skill
 
You are acting as an expert technical recruiter who deeply understands the candidate's profile and
actively hunts for the best-fit live job openings. Your job is to:
 
1. Parse the candidate's CV / skills profile (already in context or provided)
2. Search multiple job sources for real, current openings at the requested location
3. Return a **Ranked Job Matches** list with links
4. Return a **CV Gap Analysis** highlighting skill gaps per role and actionable improvements
---
 
## Step 1 — Understand the Candidate Profile
 
Read whatever is in context: CV, skills profile, or a brief description. Extract:
 
- **Current title / level** (e.g. Software Engineering Manager)
- **Years of experience**
- **Top technical skills** (languages, frameworks, cloud, AI/ML)
- **Domain expertise** (fintech, healthcare, govt, SaaS, etc.)
- **Soft skills / leadership** (team size, methodologies)
- **Certifications**
- **Location constraints / openness to relocation**
If no profile is in context, ask the user to paste their CV or describe their background before proceeding.
 
---
 
## Step 2 — Clarify the Search (if not already stated)
 
If the target location or role type is unclear, ask:
- What location(s)? (city, country, or "Remote")
- Any preferred role titles? (e.g. Engineering Manager, Head of Engineering, AI Lead)
- Full-time, contract, or either?
- Any salary expectations or company size preferences?
If the user already specified a location and role intent, skip asking and proceed directly.
 
---
 
## Step 3 — Search for Jobs
 
Use **web_search** to find live job postings. Run **multiple targeted searches** across sources:
 
### Search Queries to Run (adapt to candidate & location)
 
```
"Software Engineering Manager" [LOCATION] site:linkedin.com/jobs
"Engineering Manager" AI [LOCATION] site:indeed.com
"Head of Engineering" [LOCATION] 2025
"AI Engineering Lead" [LOCATION] site:linkedin.com
"Software Engineering Manager" remote [LOCATION] site:weworkremotely.com
"Engineering Manager" fintech [LOCATION]
"AI Lead" OR "ML Engineering Manager" [LOCATION]
[COMPANY_TYPE] "Engineering Manager" [LOCATION] careers
```
 
Also run web_fetch on any promising job listing URLs to get full details (requirements, salary, apply link).
 
### Sources to Cover
- **LinkedIn Jobs** — `site:linkedin.com/jobs` in search queries
- **Indeed** — `site:indeed.com` in search queries  
- **We Work Remotely** — for remote/hybrid roles: `site:weworkremotely.com`
- **Company career pages** — use general web search to find openings at notable companies in the target location
- **Local job boards** — e.g. Rozee.pk (Pakistan), InfoJobs (Spain), Seek.co.nz (New Zealand), Bayt.com (UAE/Middle East)
Run at least **5–8 distinct searches** to get broad coverage. Filter out postings older than 3 months where possible.
 
---
 
## Step 4 — Rank and Present Job Matches
 
Present results as a ranked table or structured list. For each role include:
 
| # | Role Title | Company | Location / Remote | Match % | Apply Link | Posted |
|---|-----------|---------|------------------|---------|-----------|--------|
 
**Match %** is your estimated fit based on:
- Title alignment (25%)
- Tech stack overlap (35%)
- Domain/industry fit (20%)
- Seniority match (20%)
Below the table, write a 1–2 sentence **Why it's a fit** note for the top 3–5 matches.
 
---
 
## Step 5 — CV Gap Analysis
 
For each of the top 5 matched roles, identify gaps between the candidate's profile and the job's
stated requirements. Format as:
 
### Gap Analysis: [Role Title] at [Company]
 
**✅ Strong Matches:**
- List skills/experience the candidate clearly has
**⚠️ Partial Matches (can be bridged):**
- Skill/requirement + brief note on how candidate's adjacent experience covers it partially
**❌ Gaps to Address:**
- Missing skill or requirement + **specific recommendation** (e.g. "Complete AWS SysOps cert", "Build a public LangChain project on GitHub", "Add Kubernetes to Docker experience")
**📝 CV Tailoring Tips:**
- Suggest 2–3 specific bullet point rewrites or additions to better match this role's language
---
 
## Step 6 — Summary & Next Steps
 
End with:
1. **Top 3 roles to prioritise** and why
2. **Quick wins** — 1–3 skill gaps that are easy to close fast (courses, certs, side projects)
3. **Profile improvements** — LinkedIn headline, GitHub, or portfolio suggestions if relevant
---
 
## Quality Checklist
 
Before presenting results, verify:
- [ ] At least 8 job matches found across 2+ sources
- [ ] All links are real (not hallucinated) — only include URLs from search results
- [ ] Gap analysis covers top 5 matches
- [ ] Each gap includes a specific, actionable recommendation
- [ ] Next steps section is personalised to the candidate's actual profile
**Never fabricate job listings.** If search results are thin for a location, say so honestly and
suggest adjacent locations or remote options instead.
"""

COVER_LETTER_PROMPT = """
You are a professional job application writer. Write compelling, personalised application materials.
Return ONLY a valid JSON object with these exact fields:
{
  "cover_letter": "Full 4-5 paragraph cover letter personalised to this exact role and company",
  "email_subject": "Concise application email subject line",
  "email_body": "Professional 3-paragraph application email ready to send",
  "gap_analysis": {
    "strengths": ["strength1", "strength2", "strength3"],
    "gaps": ["gap1", "gap2"],
    "recommendations": ["actionable tip 1", "actionable tip 2"]
  }
}
"""

# Tool definitions — both JSearch and LinkedIn
SEARCH_TOOLS = [
    {
        "name": "search_jobs",
        "description": "Search for job listings on JSearch (aggregates Indeed, LinkedIn, Glassdoor, and more). Returns real job postings.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Job title or skill-based search query, e.g. 'Python Developer' or 'Engineering Manager AI'"},
                "location": {"type": "string", "description": "City, country, or 'remote'"},
                "job_type": {"type": "string", "description": "FULLTIME, PARTTIME, CONTRACTOR, or INTERN"}
            },
            "required": ["query", "location"]
        }
    },
    {
        "name": "linkedin_search",
        "description": "Search for job listings on LinkedIn via RapidAPI. Returns LinkedIn-specific job postings with company details.",
        "input_schema": {
            "type": "object",
            "properties": {
                "keywords": {"type": "string", "description": "Job title or keywords, e.g. 'Software Engineering Manager'"},
                "location": {"type": "string", "description": "Location name, e.g. 'Dubai' or 'London'"},
                "remote": {"type": "boolean", "description": "Set to true for remote jobs"}
            },
            "required": ["keywords", "location"]
        }
    }
]


def _headers() -> dict:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key or api_key.startswith("sk-ant-your"):
        raise ValueError(
            "ANTHROPIC_API_KEY is not configured. "
            "Please add it to backend/.env"
        )
    return {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }


def _rapidapi_headers(host: str) -> dict:
    key = os.environ.get("RAPIDAPI_KEY", "")
    if not key:
        raise ValueError("RAPIDAPI_KEY is not configured in backend/.env")
    return {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": host,
    }


def _parse_json(text: str) -> Any:
    """Strip markdown fences and parse JSON — robust to common LLM formatting issues."""
    text = text.replace("```json", "").replace("```", "").strip()
    # Try array first, then object
    for start, end in [("[", "]"), ("{", "}")]:
        si = text.find(start)
        ei = text.rfind(end)
        if si >= 0 and ei > si:
            try:
                return json.loads(text[si:ei + 1])
            except Exception:
                continue
    return json.loads(text)


def _sanitize_text(text: str) -> str:
    """Strip HTML tags and script patterns from user input."""
    text = re.sub(r"<script[\s\S]*?>[\s\S]*?</script>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    return text.strip()


# ─── Real API Tool Implementations ────────────────────────────────────────────────

async def _jsearch(query: str, location: str, job_type: str = "") -> list:
    """Call JSearch API — aggregates Indeed, LinkedIn, Glassdoor, ZipRecruiter."""
    host = os.environ.get("JSEARCH_HOST", "jsearch.p.rapidapi.com")
    params = {
        "query": f"{query} in {location}",
        "num_pages": "2",
        "date_posted": "month",
    }
    if job_type and job_type.upper() != "ANY":
        params["employment_types"] = job_type.upper()

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"https://{host}/search",
                headers=_rapidapi_headers(host),
                params=params,
            )
            r.raise_for_status()
            jobs = r.json().get("data", [])
    except Exception as e:
        # Log and return empty — agent will still have other tool results
        print(f"[JSearch] Error: {e}")
        return []

    result = []
    for j in jobs[:8]:
        result.append({
            "title": j.get("job_title", ""),
            "company": j.get("employer_name", ""),
            "location": j.get("job_city") or j.get("job_country") or location,
            "type": j.get("job_employment_type", "FULLTIME"),
            "salary": _format_salary(j),
            "description": (j.get("job_description") or "")[:400],
            "apply_url": j.get("job_apply_link") or j.get("job_google_link") or "#",
            "posted_at": j.get("job_posted_at_datetime_utc", ""),
            "remote": j.get("job_is_remote", False),
            "source": "jsearch",
        })
    return result


async def _linkedin_search(keywords: str, location: str, remote: bool = False) -> list:
    """Call LinkedIn Job Search via RapidAPI."""
    host = os.environ.get("LINKEDIN_HOST", "linkedin-job-search2.p.rapidapi.com")
    params = {
        "keyword": keywords,
        "location": location,
        "dateSincePosted": "past Month",
        "sort": "recent",
    }
    if remote:
        params["remoteFilter"] = "remote"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"https://{host}/active-jb-7d",
                headers=_rapidapi_headers(host),
                params=params,
            )
            r.raise_for_status()
            jobs = r.json() if isinstance(r.json(), list) else r.json().get("response", [])
    except Exception as e:
        print(f"[LinkedIn] Error: {e}")
        return []

    result = []
    for j in jobs[:8]:
        result.append({
            "title": j.get("title", ""),
            "company": j.get("company", ""),
            "location": j.get("location", location),
            "type": j.get("type", "Full-time"),
            "salary": j.get("salary", "Not disclosed"),
            "description": (j.get("description") or "")[:400],
            "apply_url": j.get("url") or j.get("applyUrl") or "#",
            "posted_at": j.get("postDate", ""),
            "remote": "remote" in (j.get("location") or "").lower(),
            "source": "linkedin",
        })
    return result


def _format_salary(job: dict) -> str:
    """Format salary from JSearch response."""
    min_s = job.get("job_min_salary")
    max_s = job.get("job_max_salary")
    curr = job.get("job_salary_currency", "USD")
    period = job.get("job_salary_period", "YEAR")

    if min_s and max_s:
        return f"{curr} {int(min_s):,} – {int(max_s):,} / {period.lower()}"
    elif min_s:
        return f"{curr} {int(min_s):,}+ / {period.lower()}"
    return "Not disclosed"


# ─── Tool Router ───────────────────────────────────────────────────────────────────

async def _execute_tool(tool_name: str, tool_input: dict) -> str:
    """Route tool calls to real API implementations."""

    if tool_name == "search_jobs":
        query = tool_input.get("query", "")
        location = tool_input.get("location", "")
        job_type = tool_input.get("job_type", "")
        jobs = await _jsearch(query, location, job_type)
        if not jobs:
            return json.dumps({"note": "No results from JSearch for this query. Try different keywords."})
        return json.dumps(jobs)

    elif tool_name == "linkedin_search":
        keywords = tool_input.get("keywords", "")
        location = tool_input.get("location", "")
        remote = tool_input.get("remote", False)
        jobs = await _linkedin_search(keywords, location, remote)
        if not jobs:
            return json.dumps({"note": "No results from LinkedIn for this query. Try different keywords."})
        return json.dumps(jobs)

    return json.dumps({"error": f"Unknown tool: {tool_name}"})


# ─── Core Agent Loop ──────────────────────────────────────────────────────────────

async def _claude(system: str, messages: list, tools: list = None, max_tokens: int = 4000) -> dict:
    payload: dict[str, Any] = {
        "model": MODEL,
        "max_tokens": max_tokens,
        "system": system,
        "messages": messages,
    }
    if tools:
        payload["tools"] = tools

    async with httpx.AsyncClient(timeout=90.0) as client:
        r = await client.post(ANTHROPIC_API_URL, headers=_headers(), json=payload)
        r.raise_for_status()
        return r.json()


async def run_agent_loop(system: str, user_prompt: str, tools: list = None) -> str:
    """
    Core agentic loop — runs until Claude stops calling tools or hits 10 iterations.
    Claude autonomously decides which tools to call and when to stop.
    """
    messages = [{"role": "user", "content": user_prompt}]
    last_text = ""

    for iteration in range(10):  # max 10 iterations
        response = await _claude(system, messages, tools=tools)
        stop_reason = response.get("stop_reason")
        content = response.get("content", [])

        # Collect text and tool calls from response
        text_parts = []
        tool_calls = []

        for block in content:
            if block.get("type") == "text":
                text_parts.append(block["text"])
            elif block.get("type") == "tool_use":
                tool_calls.append(block)

        if text_parts:
            last_text = " ".join(text_parts)

        # If no tool calls or end_turn, we're done
        if stop_reason == "end_turn" or not tool_calls:
            return last_text

        # Add assistant response to message history
        messages.append({"role": "assistant", "content": content})

        # Execute all tool calls in parallel
        import asyncio
        tool_results_raw = await asyncio.gather(
            *[_execute_tool(tc["name"], tc.get("input", {})) for tc in tool_calls]
        )

        tool_results = [
            {
                "type": "tool_result",
                "tool_use_id": tc["id"],
                "content": result,
            }
            for tc, result in zip(tool_calls, tool_results_raw)
        ]

        # Feed tool results back to Claude
        messages.append({"role": "user", "content": tool_results})

    # Return last captured text if loop maxed out
    return last_text


# ─── Public Agent Functions ────────────────────────────────────────────────────────

async def parse_cv(cv_text: str) -> dict:
    """Agent Step 1: Parse CV into structured profile."""
    cv_text = _sanitize_text(cv_text)
    response = await _claude(
        system=CV_PARSER_PROMPT,
        messages=[{"role": "user", "content": f"Parse this CV:\n\n{cv_text}"}],
        max_tokens=1500
    )
    text = "".join(b.get("text", "") for b in response.get("content", []))
    result = _parse_json(text)

    # Ensure suggested_roles field exists
    if "suggested_roles" not in result:
        result["suggested_roles"] = []

    return result


async def search_and_rank_jobs(
    cv_text: str,
    location: str,
    job_type: str,
    target_roles: str,
    key_skills: str,
    salary: str,
    search_source: str = "both",
) -> list:
    """
    Agent Steps 2+3: Search for real jobs using JSearch + LinkedIn tools, then rank.
    The agent autonomously decides how many searches to run.
    """
    cv_text = _sanitize_text(cv_text)

    # Determine which tools to expose based on search_source preference
    if search_source == "jsearch":
        tools = [t for t in SEARCH_TOOLS if t["name"] == "search_jobs"]
    elif search_source == "linkedin":
        tools = [t for t in SEARCH_TOOLS if t["name"] == "linkedin_search"]
    else:
        tools = SEARCH_TOOLS  # both

    prompt = f"""
You are a recruiter agent. Search for jobs for this candidate using the available tools and return a ranked list.

CANDIDATE CV:
{cv_text}

SEARCH CRITERIA:
- Location: {location}
- Job type: {job_type}
- Target roles: {target_roles or 'infer from CV'}
- Key skills: {key_skills or 'infer from CV'}
- Salary expectation: {salary or 'not specified'}

INSTRUCTIONS:
1. Use search_jobs (JSearch) with 2-3 different query variations — vary title AND skills
2. Use linkedin_search for additional coverage if available
3. Combine all results, deduplicate by company+title
4. Score each unique job 1-10 using the scoring rubric
5. Return ONLY a JSON array of the top 6-8 jobs with this EXACT schema per item:
{{
  "id": "unique 8-char string",
  "title": "exact job title from API result",
  "company": "exact company name from API result",
  "location": "city, country from API result",
  "type": "Full-time/Contract/Remote",
  "salary": "salary from API or Not disclosed",
  "match_score": 8,
  "match_reason": "2 sentence explanation of why this matches the candidate",
  "tags": ["skill1", "skill2", "skill3", "skill4"],
  "description": "2-3 sentence role description from the posting",
  "meets_requirements": ["specific CV requirement that matches this job"],
  "gaps": ["gap1 if any, or empty list"],
  "apply_url": "exact URL from API result",
  "company_initials": "AB",
  "source": "jsearch or linkedin",
  "posted_at": "date string or empty",
  "remote": false
}}

IMPORTANT: Use the ACTUAL job data from tool results. Do NOT invent companies or job titles.
"""
    text = await run_agent_loop(
        system=RECRUITER_SKILL,
        user_prompt=prompt,
        tools=tools,
    )

    try:
        jobs = _parse_json(text)
    except Exception:
        jobs = []

    # Normalise and validate all jobs
    result = []
    for job in (jobs if isinstance(jobs, list) else []):
        result.append({
            "id": str(job.get("id", uuid.uuid4().hex[:8])),
            "title": job.get("title", "Unknown"),
            "company": job.get("company", "Unknown"),
            "location": job.get("location", location),
            "type": job.get("type", "Full-time"),
            "salary": job.get("salary", "Not disclosed"),
            "match_score": max(1, min(10, int(job.get("match_score", 7)))),
            "match_reason": job.get("match_reason", ""),
            "tags": job.get("tags", []),
            "description": job.get("description", ""),
            "meets_requirements": job.get("meets_requirements", []),
            "gaps": [g for g in job.get("gaps", []) if g],
            "apply_url": job.get("apply_url", "#"),
            "company_initials": job.get("company_initials", job.get("company", "?")[:2].upper()),
            "source": job.get("source", "agent"),
            "posted_at": job.get("posted_at", ""),
            "remote": bool(job.get("remote", False)),
        })
    return result


async def draft_application(cv_text: str, job: dict) -> dict:
    """Agent Step 4: Draft tailored cover letter + email for a single job."""
    cv_text = _sanitize_text(cv_text)

    prompt = f"""
Write a tailored, personalised job application for this candidate.

CANDIDATE CV:
{cv_text}

JOB DETAILS:
Title: {job['title']}
Company: {job['company']}
Location: {job['location']}
Job Type: {job.get('type', 'Full-time')}
Description: {job['description']}
Salary: {job.get('salary', 'Not disclosed')}
Requirements candidate meets: {', '.join(job.get('meets_requirements', []))}
Skill gaps: {', '.join(job.get('gaps', [])) or 'none identified'}
Match score: {job['match_score']}/10
Apply URL: {job.get('apply_url', '')}
"""
    response = await _claude(
        system=COVER_LETTER_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2500
    )
    text = "".join(b.get("text", "") for b in response.get("content", []))

    try:
        draft = _parse_json(text)
    except Exception:
        draft = {}

    return {
        "job_id": job["id"],
        "job_title": job["title"],
        "company": job["company"],
        "cover_letter": draft.get("cover_letter", ""),
        "email_subject": draft.get("email_subject", ""),
        "email_body": draft.get("email_body", ""),
        "gap_analysis": draft.get("gap_analysis", {
            "strengths": [], "gaps": [], "recommendations": []
        }),
    }
