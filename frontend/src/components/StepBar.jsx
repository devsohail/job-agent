import React from 'react'

const STEPS = [
  { label: 'Profile',  icon: '👤' },
  { label: 'Search',   icon: '🔍' },
  { label: 'Apply',    icon: '✉️' },
  { label: 'Skills',   icon: '🧠' },
]

export default function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
      {STEPS.map(({ label, icon }, i) => {
        const n = i + 1
        const done   = n < current
        const active = n === current
        return (
          <React.Fragment key={n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: done ? 13 : 12, fontWeight: 600,
                background: done
                  ? 'var(--green)'
                  : active
                  ? 'linear-gradient(135deg, var(--accent), #8b5cf6)'
                  : 'transparent',
                border: done || active ? 'none' : '1px solid var(--border2)',
                color: done || active ? '#fff' : 'var(--text3)',
                transition: 'all 0.25s',
                boxShadow: active ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
              }}>
                {done ? '✓' : active ? icon : n}
              </div>
              <span style={{
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? 'var(--text)' : done ? 'var(--green)' : 'var(--text3)',
                transition: 'color 0.2s',
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1,
                background: n < current ? 'var(--green)' : 'var(--border)',
                transition: 'background 0.4s',
                margin: '0 4px',
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
