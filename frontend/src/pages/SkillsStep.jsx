import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { analyzeSkills } from '../services/api'
import toast from 'react-hot-toast'

const s = {
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, display: 'block' },
  btnPrimary: { background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 24px rgba(99,102,241,0.3)' },
  btnOutline: { background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '9px 16px', borderRadius: 10, fontSize: 13 },
  pill: (color, bg, border) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, color, border: `1px solid ${border}`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500, margin: '3px 3px 3px 0' }),
  resourceCard: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 },
}

const TYPE_ICONS = { course: '🎓', youtube: '▶️', book: '📚', docs: '📄', project: '🛠️', tutorial: '📝' }
const TYPE_COLOR = { course: '#818cf8', youtube: '#f87171', book: '#34d399', docs: '#60a5fa', project: '#fbbf24', tutorial: '#c084fc' }

function ReadinessBar({ score }) {
  const color = score >= 8 ? '#22c55e' : score >= 6 ? '#f59e0b' : score >= 4 ? '#818cf8' : '#ef4444'
  const label = score >= 8 ? 'Very Ready' : score >= 6 ? 'Good Fit' : score >= 4 ? 'Developing' : 'Needs Work'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Overall Readiness</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}/10 — {label}</span>
      </div>
      <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score * 10}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

function SkillPill({ skill, type }) {
  const styles = {
    strong:  s.pill('#22c55e', 'rgba(34,197,94,0.1)',   'rgba(34,197,94,0.25)'),
    missing: s.pill('#ef4444', 'rgba(239,68,68,0.1)',   'rgba(239,68,68,0.25)'),
    priority:s.pill('#818cf8', 'rgba(99,102,241,0.12)', 'rgba(99,102,241,0.3)'),
  }[type]
  const icons = { strong: '✓', missing: '✕', priority: '★' }
  return <span style={styles}><span>{icons[type]}</span> {skill}</span>
}

function ResourceCard({ resource }) {
  const icon  = TYPE_ICONS[resource.type] || '🔗'
  const color = TYPE_COLOR[resource.type] || '#818cf8'
  return (
    <a href={resource.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{ ...s.resourceCard, cursor: 'pointer', transition: 'border-color 0.15s' }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{resource.title}</span>
              <span style={{ fontSize: 10, background: `${color}18`, color, border: `1px solid ${color}40`, borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', fontWeight: 600 }}>{resource.type}</span>
              {resource.free && <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>FREE</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{resource.platform}</span>
              {resource.duration && <span style={{ fontSize: 12, color: 'var(--text3)' }}>⏱ {resource.duration}</span>}
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--accent2)' }}>→</span>
        </div>
      </div>
    </a>
  )
}

export default function SkillsStep() {
  const [analyzing, setAnalyzing] = useState(false)
  const { cvText, targetRoles, skillGaps, setSkillGaps, setStep } = useStore()

  useEffect(() => {
    if (!skillGaps) runAnalysis()
  }, [])

  const runAnalysis = async () => {
    if (!cvText.trim()) return
    setAnalyzing(true)
    try {
      const { analysis } = await analyzeSkills(cvText, targetRoles)
      setSkillGaps(analysis)
      toast.success('Skill analysis complete!')
    } catch (e) {
      toast.error('Analysis failed: ' + (e.response?.data?.detail || e.message))
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div>
      {/* Loading */}
      {analyzing && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="spin-ring" />
          <span style={{ color: '#818cf8', fontSize: 13 }}>AI coach is analysing your skill gaps & building your roadmap...</span>
        </div>
      )}

      {!analyzing && skillGaps && (
        <>
          {/* Hero summary */}
          <div style={{ ...s.card, borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🎯 {skillGaps.target_role}</h2>
                <p style={{ fontSize: 13, color: 'var(--text3)' }}>Estimated roadmap: {skillGaps.timeline_weeks} weeks to close priority gaps</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#818cf8', lineHeight: 1 }}>{skillGaps.overall_readiness}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>/ 10 ready</div>
              </div>
            </div>
            <ReadinessBar score={skillGaps.overall_readiness} />
            {skillGaps.summary && (
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>{skillGaps.summary}</p>
            )}
          </div>

          {/* Priority Upskills */}
          {skillGaps.priority_upskills?.length > 0 && (
            <div style={{ ...s.card, borderColor: 'rgba(99,102,241,0.2)' }}>
              <span style={s.label}>⚡ Priority Upskills — Focus on These First</span>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>These appear in 80%+ of {skillGaps.target_role} job listings</p>
              <div>{skillGaps.priority_upskills.map((sk) => <SkillPill key={sk} skill={sk} type="priority" />)}</div>
            </div>
          )}

          {/* Skills Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {skillGaps.strong_skills?.length > 0 && (
              <div style={s.card}>
                <span style={s.label}>💪 Strong Skills</span>
                <div>{skillGaps.strong_skills.map((sk) => <SkillPill key={sk} skill={sk} type="strong" />)}</div>
              </div>
            )}
            {skillGaps.missing_skills?.length > 0 && (
              <div style={s.card}>
                <span style={s.label}>📋 Missing Skills</span>
                <div>{skillGaps.missing_skills.map((sk) => <SkillPill key={sk} skill={sk} type="missing" />)}</div>
              </div>
            )}
          </div>

          {/* Learning Resources */}
          {skillGaps.resources?.length > 0 && (
            <div style={s.card}>
              <span style={s.label}>📚 Learning Roadmap — {skillGaps.resources.length} Resources</span>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                {Object.entries(TYPE_ICONS).map(([type, icon]) => {
                  const count = skillGaps.resources.filter((r) => r.type === type).length
                  if (!count) return null
                  return (
                    <span key={type} style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {icon} {count} {type}{count > 1 ? 's' : ''}
                    </span>
                  )
                })}
                <span style={{ fontSize: 12, color: 'var(--green)', marginLeft: 'auto' }}>
                  ✓ {skillGaps.resources.filter((r) => r.free).length} free resource{skillGaps.resources.filter((r) => r.free).length !== 1 ? 's' : ''}
                </span>
              </div>
              {skillGaps.resources.map((resource, i) => <ResourceCard key={i} resource={resource} />)}
            </div>
          )}
        </>
      )}

      {!analyzing && !skillGaps && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Skills Roadmap</p>
          <p style={{ fontSize: 13, marginBottom: 20 }}>Get a personalised skill gap analysis & learning plan</p>
          <button style={{ ...s.btnPrimary, width: 'auto', padding: '12px 28px', fontSize: 14 }} onClick={runAnalysis}>
            Analyse My Skills →
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button style={s.btnOutline} onClick={() => setStep(3)}>← Back</button>
        {!analyzing && skillGaps && (
          <button style={{ ...s.btnOutline, display: 'flex', alignItems: 'center', gap: 6 }} onClick={runAnalysis}>
            ↻ Re-analyse
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin-ring { width: 16px; height: 16px; border: 2px solid rgba(99,102,241,0.3); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }`}</style>
    </div>
  )
}
