import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ─── CV ──────────────────────────────────────────────────────────────────────
  cvText: '',
  cvProfile: null,
  setCvText: (text) => set({ cvText: text }),
  setCvProfile: (profile) => set({ cvProfile: profile }),

  // ─── Search Preferences ───────────────────────────────────────────────────────
  location: '',
  jobType: 'Any',
  targetRoles: 'Software Engineering Manager, AI Lead, Head of Engineering',
  keySkills: 'Python, OpenAI, AWS, FastAPI, LLM Agents, Engineering Management',
  salary: '',
  searchSource: 'both',   // "jsearch" | "linkedin" | "both"
  setLocation: (v) => set({ location: v }),
  setJobType: (v) => set({ jobType: v }),
  setTargetRoles: (v) => set({ targetRoles: v }),
  setKeySkills: (v) => set({ keySkills: v }),
  setSalary: (v) => set({ salary: v }),
  setSearchSource: (v) => set({ searchSource: v }),

  // ─── Jobs ─────────────────────────────────────────────────────────────────────
  jobs: [],
  selectedJobIds: new Set(),
  jobFilter: { minScore: 0, source: 'all', type: 'all' },
  setJobs: (jobs) => set({ jobs }),
  toggleJob: (id) =>
    set((s) => {
      const next = new Set(s.selectedJobIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { selectedJobIds: next }
    }),
  selectAllJobs: () =>
    set((s) => ({ selectedJobIds: new Set(s.jobs.map((j) => j.id)) })),
  clearSelection: () => set({ selectedJobIds: new Set() }),
  setJobFilter: (filter) =>
    set((s) => ({ jobFilter: { ...s.jobFilter, ...filter } })),

  // ─── Drafts ───────────────────────────────────────────────────────────────────
  drafts: [],
  setDrafts: (drafts) => set({ drafts }),

  // ─── Skills ───────────────────────────────────────────────────────────────────
  skillGaps: null,
  setSkillGaps: (gaps) => set({ skillGaps: gaps }),

  // ─── Tracker ──────────────────────────────────────────────────────────────────
  tracker: [],
  trackerOpen: false,
  setTracker: (entries) => set({ tracker: entries }),
  addToTracker: (entry) =>
    set((s) => ({ tracker: [entry, ...s.tracker] })),
  setTrackerOpen: (v) => set({ trackerOpen: v }),

  // ─── UI ───────────────────────────────────────────────────────────────────────
  step: 1,
  loading: false,
  statusMsg: '',
  setStep: (step) => set({ step }),
  setLoading: (v) => set({ loading: v }),
  setStatus: (msg) => set({ statusMsg: msg }),

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  getSelectedJobs: () => {
    const { jobs, selectedJobIds } = get()
    return jobs.filter((j) => selectedJobIds.has(j.id))
  },
  getFilteredJobs: () => {
    const { jobs, jobFilter } = get()
    return jobs.filter((j) => {
      if (jobFilter.minScore > 0 && j.match_score < jobFilter.minScore) return false
      if (jobFilter.source !== 'all' && j.source !== jobFilter.source) return false
      if (jobFilter.type !== 'all' && j.type.toLowerCase() !== jobFilter.type.toLowerCase()) return false
      return true
    })
  },
}))
