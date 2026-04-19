import { useEffect, useState } from 'react'
import { X, ExternalLink, Trash2, RefreshCw } from 'lucide-react'
import { useStore } from '../store'
import { listApplications, updateApplicationStatus, deleteApplication } from '../services/api'
import toast from 'react-hot-toast'

const STATUSES = ['saved', 'applied', 'interview', 'offer', 'rejected']
const STATUS_STYLE = {
  saved:    { bg: 'rgba(99,102,241,0.1)',  color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
  applied:  { bg: 'rgba(245,158,11,0.1)',  color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  interview:{ bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  offer:    { bg: 'rgba(34,197,94,0.1)',   color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  rejected: { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.3)' },
}
const STATUS_ICONS = { saved: '🔖', applied: '📤', interview: '💬', offer: '🎉', rejected: '✕' }

function StatusBadge({ status }) {
  const st = STATUS_STYLE[status] || STATUS_STYLE.saved
  return (
    <span style={{ fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 6, padding: '3px 8px' }}>
      {STATUS_ICONS[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function TrackerCard({ entry, onStatusChange, onDelete }) {
  const [updating, setUpdating] = useState(false)

  const handleStatus = async (status) => {
    setUpdating(true)
    try {
      await onStatusChange(entry.id, status)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>
          {entry.company?.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{entry.job_title}</span>
            <StatusBadge status={entry.status} />
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 3 }}>{entry.company} · {entry.location}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
            {entry.salary && entry.salary !== 'Not disclosed' && (
              <span style={{ fontSize: 11, color: 'var(--green)' }}>{entry.salary}</span>
            )}
            {entry.match_score && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Match: {entry.match_score}/10</span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Saved: {new Date(entry.saved_at).toLocaleDateString()}</span>
            {entry.applied_at && <span style={{ fontSize: 11, color: 'var(--amber)' }}>Applied: {new Date(entry.applied_at).toLocaleDateString()}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <a href={entry.apply_url} target="_blank" rel="noreferrer">
            <button style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--text2)', display: 'flex', alignItems: 'center', cursor: 'pointer' }} title="View job posting">
              <ExternalLink size={12} />
            </button>
          </a>
          <button style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 8px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => onDelete(entry.id)} title="Remove">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Status Pipeline */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        {STATUSES.map((status) => {
          const active = entry.status === status
          const st = STATUS_STYLE[status]
          return (
            <button
              key={status}
              disabled={updating}
              onClick={() => handleStatus(status)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: active ? 600 : 400, cursor: 'pointer',
                background: active ? st.bg : 'transparent', color: active ? st.color : 'var(--text3)',
                border: active ? `1px solid ${st.border}` : '1px solid var(--border)',
                transition: 'all 0.15s', opacity: updating ? 0.5 : 1,
              }}
            >
              {STATUS_ICONS[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function TrackerPanel() {
  const { tracker, setTracker, trackerOpen, setTrackerOpen } = useStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (trackerOpen) loadTracker()
  }, [trackerOpen])

  const loadTracker = async () => {
    setLoading(true)
    try {
      const { applications } = await listApplications()
      setTracker(applications)
    } catch {
      toast.error('Could not load tracker')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      const { entry } = await updateApplicationStatus(id, status)
      setTracker(tracker.map((t) => t.id === id ? entry : t))
      toast.success(`Status updated: ${status}`)
    } catch {
      toast.error('Could not update status')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteApplication(id)
      setTracker(tracker.filter((t) => t.id !== id))
      toast.success('Removed from tracker')
    } catch {
      toast.error('Could not delete entry')
    }
  }

  if (!trackerOpen) return null

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = tracker.filter((t) => t.status === s).length
    return acc
  }, {})

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 480, maxWidth: '95vw', height: '100vh', background: 'var(--bg2)', borderLeft: '1px solid var(--border)', zIndex: 1000, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>📋 Application Tracker</h2>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{tracker.length} total applications</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text2)', cursor: 'pointer' }} onClick={loadTracker} title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer', padding: 6 }} onClick={() => setTrackerOpen(false)}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Pipeline Summary */}
      {tracker.length > 0 && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUSES.map((status) => {
            if (!counts[status]) return null
            const st = STATUS_STYLE[status]
            return (
              <span key={status} style={{ fontSize: 11, background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 6, padding: '3px 8px', fontWeight: 600 }}>
                {STATUS_ICONS[status]} {counts[status]} {status}
              </span>
            )
          })}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <div className="spin-ring" />
          </div>
        )}

        {!loading && tracker.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No applications yet</p>
            <p style={{ fontSize: 12 }}>Save jobs from the search results or mark applications as applied to track them here.</p>
          </div>
        )}

        {!loading && tracker.map((entry) => (
          <TrackerCard
            key={entry.id}
            entry={entry}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin-ring { width: 16px; height: 16px; border: 2px solid rgba(99,102,241,0.3); border-top-color: #818cf8; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }`}</style>
    </div>
  )
}
