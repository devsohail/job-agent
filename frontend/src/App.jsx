import { Toaster } from 'react-hot-toast'
import { useStore } from './store'
import StepBar from './components/StepBar'
import ProfileStep  from './pages/ProfileStep'
import SearchStep   from './pages/SearchStep'
import ApplyStep    from './pages/ApplyStep'
import SkillsStep   from './pages/SkillsStep'
import TrackerPanel from './pages/TrackerPanel'

export default function App() {
  const { step, tracker, trackerOpen, setTrackerOpen } = useStore()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 13,
            borderRadius: 10,
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#18181b' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#18181b' } },
        }}
      />

      {/* Header */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        position: 'sticky',
        top: 0,
        background: 'rgba(9,9,11,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
        }}>
          ⚡
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>Job Application Agent</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
            Powered by Claude AI · JSearch · LinkedIn · FastAPI
          </p>
        </div>

        {/* Tracker Button */}
        <button
          onClick={() => setTrackerOpen(!trackerOpen)}
          style={{
            background: trackerOpen ? 'rgba(99,102,241,0.15)' : 'transparent',
            border: '1px solid var(--border2)',
            color: trackerOpen ? '#818cf8' : 'var(--text2)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            transition: 'all 0.15s',
          }}
        >
          📋
          <span>Tracker</span>
          {tracker.length > 0 && (
            <span style={{
              background: 'var(--accent)', color: '#fff',
              borderRadius: '50%', width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>
              {tracker.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 24px' }}>
        <StepBar current={step} />

        <div className="fade-in" key={step}>
          {step === 1 && <ProfileStep />}
          {step === 2 && <SearchStep />}
          {step === 3 && <ApplyStep />}
          {step === 4 && <SkillsStep />}
        </div>
      </div>

      {/* Tracker Slide-over */}
      {trackerOpen && (
        <>
          <div className="tracker-overlay" onClick={() => setTrackerOpen(false)} />
          <TrackerPanel />
        </>
      )}
    </div>
  )
}
