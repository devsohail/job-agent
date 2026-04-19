import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  timeout: 120_000,  // 2 min — agent loops take time
})

// ─── Response Error Interceptor ────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const detail = err.response?.data?.detail || err.message

    if (status === 429) {
      toast.error('Rate limit hit — please wait a moment and try again.')
    } else if (status === 413) {
      toast.error('Input too large. Please trim your CV text.')
    } else if (status === 422) {
      toast.error(`Validation error: ${detail}`)
    } else if (status >= 500) {
      toast.error(`Server error: ${detail}`)
    }
    return Promise.reject(err)
  }
)

// ─── CV ────────────────────────────────────────────────────────────────────────

export const parseCV = (text) =>
  api.post('/cv/parse', { text }).then((r) => r.data)

export const uploadCVFile = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const r = await api.post('/cv/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return r.data
}

// ─── Jobs ──────────────────────────────────────────────────────────────────────

export const searchJobs = (payload) =>
  api.post('/jobs/search', payload).then((r) => r.data)

/** SSE streaming search — calls onStatus, onResults, onError callbacks */
export const searchJobsStream = (payload, onStatus, onResults, onDone, onError) => {
  return fetch('/api/jobs/search/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((res) => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const pump = () =>
      reader.read().then(({ done, value }) => {
        if (done) {
          onDone?.()
          return
        }
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop()

        for (const chunk of chunks) {
          const eventMatch = chunk.match(/^event: (.+)/m)
          const dataMatch  = chunk.match(/^data: (.+)/m)
          if (eventMatch && dataMatch) {
            const event = eventMatch[1].trim()
            const data  = JSON.parse(dataMatch[1].trim())
            if (event === 'status')  onStatus?.(data.message)
            if (event === 'results') onResults?.(data)
            if (event === 'done')    onDone?.()
            if (event === 'error')   onError?.(data.message)
          }
        }
        return pump()
      })
    return pump()
  })
}

// ─── Applications ──────────────────────────────────────────────────────────────

export const draftApplications = (cv_text, jobs) =>
  api.post('/applications/draft', { cv_text, jobs }).then((r) => r.data)

// ─── Skills ────────────────────────────────────────────────────────────────────

export const analyzeSkills = (cv_text, target_roles) =>
  api.post('/skills/analyze', { cv_text, target_roles }).then((r) => r.data)

// ─── Tracker ───────────────────────────────────────────────────────────────────

export const saveApplication = (job, status = 'saved') =>
  api.post('/tracker/save', { job, status }).then((r) => r.data)

export const listApplications = () =>
  api.get('/tracker/list').then((r) => r.data)

export const updateApplicationStatus = (id, status) =>
  api.patch(`/tracker/${id}/status`, null, { params: { status } }).then((r) => r.data)

export const deleteApplication = (id) =>
  api.delete(`/tracker/${id}`).then((r) => r.data)
