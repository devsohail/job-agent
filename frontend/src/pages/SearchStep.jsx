import { useEffect, useState } from 'react'
import { ExternalLink, CheckCircle, Circle, RefreshCw, Bookmark, BookmarkCheck } from 'lucide-react'
import { useStore } from '../store'
import { searchJobsStream, saveApplication } from '../services/api'
import toast from 'react-hot-toast'

const s = {
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 12, transition: 'border-color 0.15s' },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' },
  btnPrimary: { background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 24px rgba(99,102,241,0.3)' },
  btnOutline: { background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '9px 16px', borderRadius: 10, fontSize: 13 },
  tag: { display: 'inline-block', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px', fontSize: 11, color: 'var(--text3)', margin: '2px 2px 2px 0' },
  metric: { background: 'var(--bg3)', borderRadius: 12, padding: '16px 20px', flex: 1 },
  statusBar: { background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
}

const SOURCE_BADGE = {
  jsearch:  { bg: 'rgba(34,197,94,0.1)',   color: '#22c55e', border: 'rgba(34,197,94,0.25)',   label: 'JSEARCH' },
  linkedin: { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)',  label: 'LINKEDIN' },
  agent:    { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)',  label: 'AI' },
}

function ScoreBadge({ score }) {
  const color = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--amber)' : 'var(--red)'
  const bg    = score >= 8 ? 'rgba(34,197,94,0.1)' : score >= 6 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
  return (
    <div style={{ background: bg, color, border: `1px solid ${color}40`, borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
      {score}/10
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ ...s.card, padding: 20 }}>
      {[100, 60, 80].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: i === 0 ? 16 : 12, width: `${w}%`, borderRadius: 6, marginBottom: 10 }} />
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        {[40, 55, 35].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 24, width: `${w}px`, borderRadius: 6 }} />
        ))}
      </div>
    </div>
  )
}

function JobCard({ job, selected, onToggle, onSave, saved }) {
  const [expanded, setExpanded] = useState(false)
  const badge = SOURCE_BADGE[job.source] || SOURCE_BADGE.agent

  return (
    <div
      style={{ ...s.card, borderColor: selected ? 'rgba(99,102,241,0.5)' : 'var(--border)', cursor: 'pointer', boxShadow: selected ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none' }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Logo */}
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>
          {job.company_initials}
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{job.title}</span>
            <span style={{ fontSize: 10, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
              {badge.label}
            </span>
            {job.remote && <span style={{ fontSize: 10, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 4, padding: '2px 6px' }}>REMOTE</span>}
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 3 }}>{job.company} · {job.location} · {job.type}</p>
          {job.salary && job.salary !== 'Not disclosed' && (
            <p style={{ color: 'var(--green)', fontSize: 12, marginTop: 2, fontWeight: 500 }}>{job.salary}</p>
          )}
          {job.posted_at && (
            <p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>{new Date(job.posted_at).toLocaleDateString()}</p>
          )}
          <div style={{ marginTop: 8 }}>{job.tags.map((t) => <span key={t} style={s.tag}>{t}</span>)}</div>
        </div>
        <ScoreBadge score={job.match_score} />
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>{job.description}</p>
          <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>{job.match_reason}</p>

          {job.meets_requirements?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <span style={{ ...s.label, marginBottom: 8 }}>Requirements You Meet</span>
              {job.meets_requirements.map((r) => (
                <div key={r} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                  <span style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ color: 'var(--text2)', fontSize: 13 }}>{r}</span>
                </div>
              ))}
            </div>
          )}
          {job.gaps?.filter(Boolean).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <span style={{ ...s.label, marginBottom: 8 }}>Skill Gaps</span>
              {job.gaps.filter(Boolean).map((g) => (
                <div key={g} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
                  <span style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }}>△</span>
                  <span style={{ color: 'var(--text2)', fontSize: 13 }}>{g}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }} onClick={(e) => e.stopPropagation()}>
        <button style={{ ...s.btnOutline, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => onToggle(job.id)}>
          {selected ? <><CheckCircle size={13} color="var(--accent)" /> Selected</> : <><Circle size={13} /> Select to Apply</>}
        </button>
        <button style={{ ...s.btnOutline, display: 'flex', alignItems: 'center', gap: 6, color: saved ? 'var(--green)' : 'var(--text2)' }} onClick={() => onSave(job)} title="Save to tracker">
          {saved ? <BookmarkCheck size={13} color="var(--green)" /> : <Bookmark size={13} />}
        </button>
        <a href={job.apply_url} target="_blank" rel="noreferrer">
          <button style={{ ...s.btnOutline, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ExternalLink size={13} /> View
          </button>
        </a>
      </div>
    </div>
  )
}

export default function SearchStep() {
  const {
    cvText, location, jobType, targetRoles, keySkills, salary, searchSource,
    jobs, setJobs, selectedJobIds, toggleJob, selectAllJobs, clearSelection,
    jobFilter, setJobFilter, getFilteredJobs,
    setStep, loading, setLoading, statusMsg, setStatus,
    addToTracker, setTrackerOpen,
  } = useStore()

  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    if (jobs.length === 0) runSearch()
  }, [])

  const runSearch = async () => {
    setLoading(true)
    setStatus(`Searching for jobs in ${location}...`)
    setJobs([])
    try {
      await searchJobsStream(
        { cv_text: cvText, location, job_type: jobType, target_roles: targetRoles, key_skills: keySkills, salary_expectation: salary, search_source: searchSource },
        (msg) => setStatus(msg),
        (data) => setJobs(data.jobs || []),
        () => { setLoading(false); setStatus('') },
        (err) => { toast.error('Search failed: ' + err); setLoading(false); setStatus('') },
      )
    } catch (e) {
      toast.error('Search failed: ' + e.message)
      setLoading(false)
      setStatus('')
    }
  }

  const handleSave = async (job) => {
    try {
      const { entry } = await saveApplication(job, 'saved')
      addToTracker(entry)
      setSavedIds((prev) => new Set([...prev, job.id]))
      toast.success(`Saved: ${job.title} @ ${job.company}`)
    } catch {
      toast.error('Could not save to tracker')
    }
  }

  const filteredJobs = getFilteredJobs()
  const strongMatches = jobs.filter((j) => j.match_score >= 8).length
  const sources = [...new Set(jobs.map((j) => j.source))]

  return (
    <div>
      {/* Loading */}
      {loading && (
        <div style={s.statusBar}>
          <div className="spin-ring" />
          <span style={{ color: '#818cf8', fontSize: 13 }}>{statusMsg || 'Agent searching JSearch & LinkedIn...'}</span>
        </div>
      )}

      {loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}

      {!loading && jobs.length > 0 && (
        <>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { v: jobs.length, l: 'Jobs Found', color: 'var(--text)' },
              { v: strongMatches, l: 'Strong Matches (8+)', color: 'var(--green)' },
              { v: selectedJobIds.size, l: 'Selected', color: 'var(--accent2)' },
            ].map(({ v, l, color }) => (
              <div key={l} style={s.metric}>
                <div style={{ fontSize: 28, fontWeight: 700, color }}>{v}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={s.label}>Filters:</span>
            <select style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '7px 12px', fontSize: 12, width: 'auto' }}
              value={jobFilter.minScore} onChange={(e) => setJobFilter({ minScore: Number(e.target.value) })}>
              <option value={0}>All Scores</option>
              <option value={8}>8+ (Strong)</option>
              <option value={6}>6+ (Good)</option>
            </select>
            <select style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '7px 12px', fontSize: 12, width: 'auto' }}
              value={jobFilter.source} onChange={(e) => setJobFilter({ source: e.target.value })}>
              <option value="all">All Sources</option>
              {sources.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
            <select style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '7px 12px', fontSize: 12, width: 'auto' }}
              value={jobFilter.type} onChange={(e) => setJobFilter({ type: e.target.value })}>
              <option value="all">All Types</option>
              {['Full-time', 'Contract', 'Remote', 'FULLTIME', 'CONTRACTOR'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>{filteredJobs.length} showing</span>
            <button style={{ ...s.btnOutline, padding: '7px 12px' }} onClick={selectAllJobs}>All</button>
            <button style={{ ...s.btnOutline, padding: '7px 12px' }} onClick={clearSelection}>Clear</button>
            <button style={{ ...s.btnOutline, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 5 }} onClick={runSearch}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} selected={selectedJobIds.has(job.id)} onToggle={toggleJob} onSave={handleSave} saved={savedIds.has(job.id)} />
          ))}
        </>
      )}

      {!loading && jobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No results yet</p>
          <p style={{ fontSize: 13 }}>Click Refresh to run the search</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button style={s.btnOutline} onClick={() => setStep(1)}>← Back</button>
        {!loading && jobs.length > 0 && (
          <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => { if (selectedJobIds.size === 0) return toast.error('Select at least one job'); setStep(3) }}>
            Draft Applications for {selectedJobIds.size} Job{selectedJobIds.size !== 1 ? 's' : ''} →
          </button>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-ring { width: 16px; height: 16px; border: 2px solid rgba(99,102,241,0.3); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .skeleton { background: linear-gradient(90deg, var(--bg3) 25%, var(--bg2) 50%, var(--bg3) 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite; }
      `}</style>
    </div>
  )
}
