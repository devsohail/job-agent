import { useEffect, useState } from 'react'
import { Copy, Download, CheckCircle, Loader, Bookmark } from 'lucide-react'
import { useStore } from '../store'
import { draftApplications, saveApplication } from '../services/api'
import toast from 'react-hot-toast'

const s = {
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'block' },
  btnPrimary: { background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 24px rgba(99,102,241,0.3)' },
  btnOutline: { background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '9px 16px', borderRadius: 10, fontSize: 13 },
  tab: (active) => ({
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? '#818cf8' : 'var(--text3)',
    border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
    cursor: 'pointer', transition: 'all 0.15s',
  }),
  textarea: {
    width: '100%', minHeight: 260, background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '14px 16px', color: 'var(--text)', fontSize: 13, lineHeight: 1.8,
    resize: 'vertical', fontFamily: "'DM Mono', 'Fira Code', monospace",
  },
  dot: (color) => ({ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }),
}

function DraftCard({ draft, tab, onMarkApplied, applied }) {
  const [copied, setCopied] = useState(false)
  const ga = draft.gap_analysis || {}

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }

  const downloadDraft = () => {
    const content = `${draft.job_title} @ ${draft.company}\n${'─'.repeat(50)}\nCOVER LETTER:\n\n${draft.cover_letter}\n\n${'─'.repeat(50)}\nEMAIL SUBJECT: ${draft.email_subject}\n\nEMAIL BODY:\n\n${draft.email_body}`
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${draft.company}-${draft.job_title.replace(/\s+/g, '-')}.txt`
    a.click()
    toast.success('Downloaded!')
  }

  const Header = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{draft.job_title}</span>
        <span style={{ color: 'var(--text3)', fontSize: 13 }}> @ {draft.company}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          style={{ ...s.btnOutline, padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, color: applied ? 'var(--green)' : 'var(--text2)' }}
          onClick={onMarkApplied}
          title="Mark as applied"
        >
          <Bookmark size={12} color={applied ? 'var(--green)' : undefined} />
          {applied ? 'Applied ✓' : 'Mark Applied'}
        </button>
        <button style={{ ...s.btnOutline, padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }} onClick={downloadDraft}>
          <Download size={12} /> Download
        </button>
      </div>
    </div>
  )

  if (tab === 'cover') return (
    <div style={s.card}>
      <Header />
      <textarea style={s.textarea} defaultValue={draft.cover_letter} />
      <button style={{ ...s.btnOutline, display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }} onClick={() => copyText(draft.cover_letter)}>
        {copied ? <CheckCircle size={13} color="var(--green)" /> : <Copy size={13} />} Copy Letter
      </button>
    </div>
  )

  if (tab === 'email') return (
    <div style={s.card}>
      <Header />
      <div style={{ marginBottom: 14 }}>
        <span style={s.label}>Subject Line</span>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text2)', fontFamily: "'DM Mono', monospace" }}>
          {draft.email_subject}
        </div>
      </div>
      <span style={s.label}>Email Body</span>
      <textarea style={s.textarea} defaultValue={draft.email_body} />
      <button style={{ ...s.btnOutline, display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }} onClick={() => copyText(`Subject: ${draft.email_subject}\n\n${draft.email_body}`)}>
        <Copy size={13} /> Copy Email
      </button>
    </div>
  )

  if (tab === 'gaps') return (
    <div style={s.card}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
        {draft.job_title} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>@ {draft.company}</span>
      </div>

      {['strengths', 'gaps', 'recommendations'].map((key) => {
        const items = (ga[key] || []).filter(Boolean)
        if (!items.length) return null
        const cfg = {
          strengths:       { label: '💪 Strengths',      color: 'var(--green)', symbol: '✓' },
          gaps:            { label: '⚠️ Skill Gaps',     color: 'var(--amber)', symbol: '△' },
          recommendations: { label: '🚀 Quick Wins',     color: 'var(--accent2)', symbol: '→' },
        }[key]
        return (
          <div key={key} style={{ marginBottom: 18 }}>
            <span style={s.label}>{cfg.label}</span>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ color: cfg.color, flexShrink: 0, fontWeight: 600 }}>{cfg.symbol}</span>
                <span style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )

  return null
}

export default function ApplyStep() {
  const [tab, setTab] = useState('cover')
  const [drafting, setDrafting] = useState(false)
  const [appliedIds, setAppliedIds] = useState(new Set())
  const { cvText, drafts, setDrafts, setStep, getSelectedJobs, addToTracker } = useStore()
  const selectedJobs = getSelectedJobs()

  useEffect(() => {
    if (drafts.length === 0) runDraft()
  }, [])

  const runDraft = async () => {
    if (selectedJobs.length === 0) return
    setDrafting(true)
    try {
      const data = await draftApplications(cvText, selectedJobs)
      setDrafts(data.drafts || [])
      toast.success(`✍️ Drafted ${data.total} application${data.total !== 1 ? 's' : ''}`)
    } catch (e) {
      toast.error('Draft failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setDrafting(false)
    }
  }

  const handleMarkApplied = async (draft) => {
    const job = selectedJobs.find((j) => j.id === draft.job_id)
    if (!job) return
    try {
      const { entry } = await saveApplication(job, 'applied')
      addToTracker(entry)
      setAppliedIds((prev) => new Set([...prev, draft.job_id]))
      toast.success(`Marked as applied: ${draft.company}`)
    } catch {
      toast.error('Could not update tracker')
    }
  }

  const exportAll = () => {
    let out = 'JOB APPLICATION DRAFTS\n' + '='.repeat(60) + '\n'
    drafts.forEach((d) => {
      out += `\n${d.job_title} @ ${d.company}\n${'-'.repeat(40)}\n`
      out += `COVER LETTER:\n${d.cover_letter}\n\n`
      out += `EMAIL SUBJECT: ${d.email_subject}\nEMAIL:\n${d.email_body}\n\n`
      out += '='.repeat(60) + '\n'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([out], { type: 'text/plain' }))
    a.download = 'job-applications.txt'
    a.click()
    toast.success('Exported all applications!')
  }

  return (
    <div>
      {drafting && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="spin-ring" />
          <span style={{ color: '#818cf8', fontSize: 13 }}>Agent is drafting tailored cover letters & emails...</span>
        </div>
      )}

      {!drafting && drafts.length > 0 && (
        <>
          {/* Summary bar */}
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--green)' }}>✅ {drafts.length} application{drafts.length !== 1 ? 's' : ''} drafted</span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>·</span>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{appliedIds.size} marked as applied</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['cover', '✉️ Cover Letters'], ['email', '📧 Emails'], ['gaps', '🎯 Gap Analysis']].map(([key, label]) => (
              <button key={key} style={s.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>

          {drafts.map((d) => (
            <DraftCard
              key={d.job_id}
              draft={d}
              tab={tab}
              onMarkApplied={() => handleMarkApplied(d)}
              applied={appliedIds.has(d.job_id)}
            />
          ))}
        </>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button style={s.btnOutline} onClick={() => setStep(2)}>← Back</button>
        {!drafting && drafts.length > 0 && (
          <>
            <button style={s.btnOutline} onClick={runDraft}>↻ Redraft</button>
            <button style={{ ...s.btnOutline, display: 'flex', alignItems: 'center', gap: 6 }} onClick={exportAll}>
              <Download size={13} /> Export All
            </button>
            <button style={{ ...s.btnPrimary, flex: 1 }} onClick={() => setStep(4)}>
              Skills Analysis & Roadmap →
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin-ring { width: 16px; height: 16px; border: 2px solid rgba(99,102,241,0.3); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }`}</style>
    </div>
  )
}
