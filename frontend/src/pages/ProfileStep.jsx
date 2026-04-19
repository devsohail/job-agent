const s = {
  card: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'block' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 },
  field: { marginBottom: 12 },
  btnPrimary: { background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', color: '#fff', width: '100%', padding: '14px 20px', borderRadius: 12, fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', boxShadow: '0 4px 24px rgba(99,102,241,0.35)', transition: 'all 0.2s' },
  btnOutline: { background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', padding: '10px 16px', borderRadius: 10, fontSize: 13, transition: 'all 0.15s' },
  tag: { display: 'inline-block', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, padding: '3px 10px', fontSize: 12, margin: '3px 3px 3px 0' },
  sourceBtn: (active) => ({
    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    color: active ? '#818cf8' : 'var(--text3)',
    border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border)',
    cursor: 'pointer', transition: 'all 0.15s',
  }),
}

function CharCounter({ text, max = 32000 }) {
  const pct = Math.min((text.length / max) * 100, 100)
  const color = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--text3)'
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, gap: 8, alignItems: 'center' }}>
      <div style={{ height: 3, flex: 1, background: 'var(--bg3)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, color }}>{text.length.toLocaleString()} / {max.toLocaleString()}</span>
    </div>
  )
}

export default function ProfileStep() {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)

  const {
    cvText, setCvText,
    location, jobType, targetRoles, keySkills, salary, searchSource,
    setLocation, setJobType, setTargetRoles, setKeySkills, setSalary, setSearchSource,
    setStep,
  } = useStore()

  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    const isPdf = f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
    if (isPdf) {
      setUploading(true)
      try {
        const { text, chars } = await uploadCVFile(f)
        setCvText(text)
        toast.success(`PDF parsed — ${chars.toLocaleString()} characters extracted`)
      } catch {
        toast.error('PDF parse failed. Try copy-pasting the text instead.')
      } finally {
        setUploading(false)
      }
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => { setCvText(ev.target.result); toast.success(`Loaded: ${f.name}`) }
      reader.readAsText(f)
    }
    e.target.value = ''
  }

  const handleSearch = () => {
    if (!location.trim()) return toast.error('Enter a target location')
    if (!cvText.trim()) return toast.error('Add your CV first')
    setStep(2)
  }

  return (
    <div>
      {/* CV Upload */}
      <div style={s.card}>
        <span style={s.label}>Your CV / Resume</span>
        <div
          className="upload-zone"
          onClick={() => fileRef.current.click()}
          style={{ border: '1.5px dashed var(--border2)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.01)', transition: 'all 0.2s' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: { files: e.dataTransfer.files } }) } }}
        >
          {uploading
            ? <><div className="spin-icon" style={{ width: 22, height: 22, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 8px' }} /><p style={{ color: 'var(--text2)', fontSize: 13 }}>Extracting text from PDF...</p></>
            : <><Upload size={22} color="var(--text3)" /><p style={{ color: 'var(--text2)', marginTop: 8, fontSize: 13 }}>Drop PDF / TXT / DOCX or click to upload</p><p style={{ color: 'var(--text3)', fontSize: 11, marginTop: 4 }}>Max 5 MB — PDF text extraction supported</p></>
          }
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      {/* CV Text */}
      <div style={s.card}>
        <span style={s.label}>Extracted CV Text</span>
        <textarea
          style={{ minHeight: 200 }}
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="CV text will appear here after upload, or you can paste it manually..."
        />
        <CharCounter text={cvText} />
      </div>

      {/* Search Preferences */}
      <div style={s.card}>
        <span style={s.label}>Job Search Preferences</span>
        <div style={s.row2}>
          <div style={s.field}>
            <label style={{ ...s.label, marginBottom: 6 }}>Target Location *</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Dubai, London, Remote" />
          </div>
          <div style={s.field}>
            <label style={{ ...s.label, marginBottom: 6 }}>Job Type</label>
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              {['Any', 'Full-time', 'Contract', 'Remote'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={s.row2}>
          <div style={s.field}>
            <label style={{ ...s.label, marginBottom: 6 }}>Target Roles</label>
            <input value={targetRoles} onChange={(e) => setTargetRoles(e.target.value)} placeholder="e.g. Engineering Manager, AI Lead" />
          </div>
          <div style={s.field}>
            <label style={{ ...s.label, marginBottom: 6 }}>Salary Expectation</label>
            <input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. $120k, £80k, AED 40k" />
          </div>
        </div>
        <div style={s.field}>
          <label style={{ ...s.label, marginBottom: 6 }}>Key Skills</label>
          <input value={keySkills} onChange={(e) => setKeySkills(e.target.value)} placeholder="e.g. Python, AWS, OpenAI, Engineering Management" />
        </div>

        {/* Source Selector */}
        <div>
          <label style={{ ...s.label, marginBottom: 8 }}>Search Source</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['both', '🔀 JSearch + LinkedIn'], ['jsearch', '🔍 JSearch Only'], ['linkedin', '💼 LinkedIn Only']].map(([val, label]) => (
              <button key={val} style={s.sourceBtn(searchSource === val)} onClick={() => setSearchSource(val)}>{label}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>JSearch aggregates Indeed, Glassdoor, ZipRecruiter & more</p>
        </div>
      </div>

      <button style={s.btnPrimary} onClick={handleSearch}>
        Find Matching Jobs →
      </button>

      <style>{`.upload-zone:hover { border-color: var(--accent) !important; background: rgba(99,102,241,0.04) !important; } .spin-icon { animation: spin 0.8s linear infinite; }`}</style>
    </div>
  )
}
