# ⚡ Job Application Agent v2.0 (Production Ready)

A powerful, agentic AI career assistant that automates the job search, application drafting, and skills development lifecycle. Powered by Claude AI, JSearch, and LinkedIn.

## 🚀 Vision
Transforming career growth from a manual chore into an automated, AI-driven experience. This agent doesn't just "find links"—it understands your profile, hunts for the best matches across the web, negotiates the gap between your skills and market demand, and drafts your entry into new roles.

## ✨ Core Features

### 1. Multi-Engine Job Search
- **JSearch Integration**: Directly queries 100+ job boards (Indeed, Glassdoor, ZipRecruiter, etc.).
- **LinkedIn Search**: Targeted hunting for roles on the world's largest professional network.
- **AI-Powered Evaluation**: Every job is ranked (0-10) based on title match, tech stack alignment, and domain expertise.

### 2. Intelligent CV Pipeline
- **PDF/DOCX Extraction**: Seamlessly extracts raw text from your resume.
- **Internal Profile Understanding**: The agent digests your experience in context—no manual parsing Step required.
- **Tailored Drafting**: Generates hyper-personalized Cover Letters and Emails for every application.

### 3. Skills Gap Roadmap
- **Market Fit Analysis**: Compares your CV against current job requirements for your target roles.
- **Learning Roadmap**: Provides a prioritized list of missing skills and curated free resources (Coursera, YouTube, Docs) to close the gap.

### 4. Application Tracker
- **Pipeline Management**: Move jobs from "Saved" to "Applied", "Interview", "Offer", or "Rejected".
- **Local Persistence**: Keep track of your entire career journey in a slide-over dashboard.

---

## 🛠️ Technical Stack

- **Backend**: FastAPI (Python), Uvicorn, httpx, PyPDF2
- **Agent Logic**: Claude 3.5 Sonnet / Opus (Anthropic), custom tool-calling agents
- **Frontend**: Vite (React), Zustand (State), CSS-in-JS (Premium Aesthetics)
- **APIs**: RapidAPI (JSearch & LinkedIn), Anthropic API

---

## 🚦 Getting Started

### 1. Prerequisites
- Node.js (v20+)
- Python 3.10+
- Anthropic API Key
- RapidAPI Key (for JSearch/LinkedIn)

### 2. Backend Setup
```bash
cd backend
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
cp .env.example .env # Add your keys here
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🛡️ Security & Performance
- **Rate Limiting**: Integrated `SlowAPI` to prevent API abuse.
- **Input Sanitization**: Built-in protection against HTML/Script injection in CV text.
- **Concurrent Execution**: Job drafting runs in parallel via `asyncio` for blazing fast results.

## 🤝 Contributing
Contributions are welcome! If you have ideas for new search sources or agent capabilities, feel free to open a PR.

