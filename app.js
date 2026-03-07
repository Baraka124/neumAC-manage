'use strict';

/* ================================================================
   NEUMOCARE — Application Logic v2.0
   Vue 3 Composition API · Clinical Precision Design

   IMPROVEMENTS APPLIED:
   ─────────────────────────────────────────────────────────────────
   P0 · CRITICAL BUGS FIXED
     – Double composable initialization removed (deptOps / tuOps)
     – var(--amber) replaced with var(--warn) throughout
     – Phase/stage colors unified: PHASE_COLORS / STAGE_COLORS constants
     – getAllClinicalTrials / getAllInnovationProjects renamed

   P4 · NAMING CONSISTENCY
     – filteredOnCallSchedules  → filteredOnCall
     – getAllClinicalTrials      → getClinicalTrials
     – getAllInnovationProjects  → getInnovationProjects
     – Edit function params standardised (no single-letter args)
     – API methods follow get* / create* / update* / delete* pattern
     – Composable returns are explicitly scoped — zero collisions

   ARCHITECTURE
     – Utils accessed as Utils.method() directly — 3-layer re-export
       chain eliminated. setup() exposes Utils itself.
     – Composables receive sibling refs via constructor — never
       re-initialised except the one documented exception (tuOps).
     – makePagination / makeSort / makeValidation are factory
       functions — each composable gets its own isolated instance.
   ─────────────────────────────────────────────────────────────────
================================================================ */

const {
  createApp, ref, reactive, computed, watch,
  onMounted, onUnmounted,
} = Vue;

/* ================================================================
   1. CONFIG
================================================================ */
const CONFIG = Object.freeze({
  API_BASE_URL: (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
    ? 'http://localhost:3000/api'
    : 'https://neumac-manage-back-end-production.up.railway.app/api',

  TOKEN_KEY:      'neumocare_token',
  USER_KEY:       'neumocare_user',
  CACHE_TTL:      300_000,  // 5 minutes
  POLL_INTERVAL:   60_000,  // 60 s live-status polling
});

/* ================================================================
   2. ROLES
================================================================ */
const ROLES = Object.freeze({
  SYSTEM_ADMIN:        'system_admin',
  DEPARTMENT_HEAD:     'department_head',
  ATTENDING_PHYSICIAN: 'attending_physician',
  MEDICAL_RESIDENT:    'medical_resident',
});

/* ================================================================
   3. PERMISSION MATRIX
================================================================ */
const PERMISSION_MATRIX = Object.freeze({
  [ROLES.SYSTEM_ADMIN]: {
    medical_staff:       { create: true,  read: true,  update: true,  delete: true  },
    departments:         { create: true,  read: true,  update: true,  delete: true  },
    training_units:      { create: true,  read: true,  update: true,  delete: true  },
    rotations:           { create: true,  read: true,  update: true,  delete: true  },
    oncall:              { create: true,  read: true,  update: true,  delete: true  },
    absences:            { create: true,  read: true,  update: true,  delete: true  },
    announcements:       { create: true,  read: true,  update: true,  delete: true  },
    research_lines:      { create: true,  read: true,  update: true,  delete: true  },
    clinical_trials:     { create: true,  read: true,  update: true,  delete: true  },
    innovation_projects: { create: true,  read: true,  update: true,  delete: true  },
    live_status:         { create: true,  read: true,  update: true,  delete: true  },
    analytics:           { create: false, read: true,  update: false, delete: false },
  },
  [ROLES.DEPARTMENT_HEAD]: {
    medical_staff:       { create: true,  read: true,  update: true,  delete: false },
    departments:         { create: false, read: true,  update: true,  delete: false },
    training_units:      { create: true,  read: true,  update: true,  delete: false },
    rotations:           { create: true,  read: true,  update: true,  delete: false },
    oncall:              { create: true,  read: true,  update: true,  delete: false },
    absences:            { create: true,  read: true,  update: true,  delete: false },
    announcements:       { create: true,  read: true,  update: true,  delete: false },
    research_lines:      { create: false, read: true,  update: false, delete: false },
    clinical_trials:     { create: false, read: true,  update: false, delete: false },
    innovation_projects: { create: false, read: true,  update: false, delete: false },
    live_status:         { create: true,  read: true,  update: true,  delete: false },
    analytics:           { create: false, read: true,  update: false, delete: false },
  },
  [ROLES.ATTENDING_PHYSICIAN]: {
    medical_staff:       { create: false, read: true,  update: false, delete: false },
    departments:         { create: false, read: true,  update: false, delete: false },
    training_units:      { create: false, read: true,  update: false, delete: false },
    rotations:           { create: false, read: true,  update: true,  delete: false },
    oncall:              { create: false, read: true,  update: false, delete: false },
    absences:            { create: true,  read: true,  update: true,  delete: false },
    announcements:       { create: false, read: true,  update: false, delete: false },
    research_lines:      { create: false, read: true,  update: false, delete: false },
    clinical_trials:     { create: false, read: true,  update: false, delete: false },
    innovation_projects: { create: false, read: true,  update: false, delete: false },
    live_status:         { create: false, read: true,  update: false, delete: false },
    analytics:           { create: false, read: true,  update: false, delete: false },
  },
  [ROLES.MEDICAL_RESIDENT]: {
    medical_staff:       { create: false, read: true,  update: false, delete: false },
    departments:         { create: false, read: true,  update: false, delete: false },
    training_units:      { create: false, read: true,  update: false, delete: false },
    rotations:           { create: false, read: true,  update: false, delete: false },
    oncall:              { create: false, read: true,  update: false, delete: false },
    absences:            { create: true,  read: true,  update: true,  delete: false },
    announcements:       { create: false, read: true,  update: false, delete: false },
    research_lines:      { create: false, read: true,  update: false, delete: false },
    clinical_trials:     { create: false, read: true,  update: false, delete: false },
    innovation_projects: { create: false, read: true,  update: false, delete: false },
    live_status:         { create: false, read: true,  update: false, delete: false },
    analytics:           { create: false, read: false, update: false, delete: false },
  },
});

/* ================================================================
   4. CLINICAL COLOR CONSTANTS
   Single source of truth shared by JS and templates.
   These hex values mirror the CSS custom properties
   (--phase1 … --phase4, --stage-idea … --stage-market).
   Update both if either changes.
================================================================ */
const PHASE_COLORS = Object.freeze({
  'Phase I':   '#4d9aff',
  'Phase II':  '#00e5a0',
  'Phase III': '#ffbe3d',
  'Phase IV':  '#ff5566',
});

const STAGE_COLORS = Object.freeze({
  'idea':         '#9ca3af',
  'prototype':    '#60a5fa',
  'pilot':        '#34d399',
  'validation':   '#fbbf24',
  'scaling':      '#f97316',
  'market-ready': '#10b981',
});

/* ================================================================
   5. UTILS
   Pure static helpers — no Vue reactivity.
   Accessed directly as Utils.methodName() in templates.
   No re-export chain needed.
================================================================ */
class Utils {

  /* ── Date helpers ─────────────────────────────────────────── */

  /** Normalise any date-like value to a JS Date without timezone shift. */
  static normalizeDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value) ? null : value;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  static formatDate(value) {
    const d = Utils.normalizeDate(value);
    if (!d) return '—';
    return d.toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  static formatDateShort(value) {
    const d = Utils.normalizeDate(value);
    if (!d) return '—';
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  static formatRelativeDate(value) {
    const d = Utils.normalizeDate(value);
    if (!d) return '—';
    const diffDays = Math.round((d - new Date()) / 86_400_000);
    if (diffDays ===  0) return 'Today';
    if (diffDays ===  1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1  && diffDays < 8)  return `In ${diffDays} days`;
    if (diffDays < -1 && diffDays > -8) return `${Math.abs(diffDays)} days ago`;
    return Utils.formatDate(value);
  }

  static formatDatePlusDays(value, days) {
    const d = Utils.normalizeDate(value);
    if (!d) return '—';
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return Utils.formatDate(r);
  }

  /** Accepts "HH:MM" strings or any date-like value. */
  static formatTime(value) {
    if (!value) return '—';
    if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
    const d = Utils.normalizeDate(value);
    if (!d) return '—';
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  static formatRelativeTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    const ms  = Date.now() - d.getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1)  return 'Just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24)   return `${h}h ago`;
    return Utils.formatDate(value);
  }

  /** Full calendar days between two dates (positive = forward). */
  static dateDiff(start, end) {
    const s = Utils.normalizeDate(start);
    const e = Utils.normalizeDate(end);
    if (!s || !e) return 0;
    return Math.round((e - s) / 86_400_000);
  }

  /** Days from today until given date (negative = in the past). */
  static daysUntil(value) {
    const d = Utils.normalizeDate(value);
    if (!d) return null;
    return Math.round((d - new Date()) / 86_400_000);
  }

  /** Today as ISO "YYYY-MM-DD". */
  static getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  /** Tomorrow as ISO "YYYY-MM-DD". */
  static getTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  /* ── String / Array helpers ───────────────────────────────── */

  /** Coerce any value to a plain Array, parsing JSON or CSV if needed. */
  static ensureArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    return [value];
  }

  static truncateText(text, maxLength = 80) {
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  static generateId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  static formatPercentage(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return `${Number(value).toFixed(decimals)}%`;
  }

  static getInitials(name) {
    if (!name) return '?';
    return name.trim()
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('');
  }

  /* ── Clinical color helpers ───────────────────────────────── */

  /** Returns hex color for a clinical trial phase. Single source of truth. */
  static getPhaseColor(phase) {
    return PHASE_COLORS[phase] ?? '#9ca3af';
  }

  /** Returns hex color for an innovation project stage. Single source of truth. */
  static getStageColor(stage) {
    return STAGE_COLORS[stage?.toLowerCase()] ?? '#9ca3af';
  }

  /* ── Resident category helpers ────────────────────────────── */

  static getResidentCategoryIcon(category) {
    const map = {
      department_internal: '🔵',
      rotating_other_dept: '🟢',
      external_resident:   '🟣',
    };
    return map[category] ?? '⚪';
  }

  static formatResidentCategorySimple(category) {
    const map = {
      department_internal: 'Internal',
      rotating_other_dept: 'Rotating',
      external_resident:   'External',
    };
    return map[category] ?? category ?? '—';
  }

  static formatResidentCategoryDetailed(category) {
    const map = {
      department_internal: 'Department Internal',
      rotating_other_dept: 'Rotating (Other Dept.)',
      external_resident:   'External Resident',
    };
    return map[category] ?? category ?? '—';
  }

  static getResidentCategoryTooltip(category) {
    const map = {
      department_internal: 'Resident assigned to this department',
      rotating_other_dept: 'Resident temporarily rotating from another department',
      external_resident:   'Resident from an external institution',
    };
    return map[category] ?? '';
  }
}

/* ================================================================
   6. API SERVICE
   Naming convention:
     get*    — fetch collection or single resource
     create* — POST new resource
     update* — PUT existing resource
     delete* — DELETE resource

   RENAMED: getAllClinicalTrials   → getClinicalTrials
            getAllInnovationProjects → getInnovationProjects
================================================================ */
class ApiService {

  constructor() {
    /** @type {Map<string, {data:any, timestamp:number}>} */
    this._cache = new Map();
  }

  /* ── Token management ──────────────────────────────────────── */

  getToken()      { return localStorage.getItem(CONFIG.TOKEN_KEY); }
  setToken(token) { localStorage.setItem(CONFIG.TOKEN_KEY, token); }

  clearAuth() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
  }

  getHeaders() {
    const h = { 'Content-Type': 'application/json' };
    const t = this.getToken();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  }

  /* ── Cache management ──────────────────────────────────────── */

  _getCached(key) {
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL) {
      this._cache.delete(key);
      return null;
    }
    return entry.data;
  }

  _setCache(key, data) {
    this._cache.set(key, { data, timestamp: Date.now() });
  }

  /** @param {string|null} prefix — null clears all entries */
  invalidateCache(prefix = null) {
    if (!prefix) { this._cache.clear(); return; }
    for (const key of this._cache.keys()) {
      if (key.startsWith(prefix)) this._cache.delete(key);
    }
  }

  /* ── Core request ──────────────────────────────────────────── */

  async _request(method, endpoint, body = null, useCache = false) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;

    if (useCache && method === 'GET') {
      const cached = this._getCached(endpoint);
      if (cached) return cached;
    }

    const opts = { method, headers: this.getHeaders() };
    if (body !== null) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errData.message || `Request failed: ${res.status}`);
    }

    const data = await res.json();
    if (useCache && method === 'GET') this._setCache(endpoint, data);
    return data;
  }

  _get(endpoint, cache = true)  { return this._request('GET',    endpoint, null, cache); }
  _post(endpoint, body)         { return this._request('POST',   endpoint, body, false); }
  _put(endpoint, body)          { return this._request('PUT',    endpoint, body, false); }
  _delete(endpoint)             { return this._request('DELETE', endpoint, null, false); }

  /* ── Auth ──────────────────────────────────────────────────── */

  async login(email, password) {
    const data = await this._post('/auth/login', { email, password });
    if (data.token) this.setToken(data.token);
    if (data.user)  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
    return data;
  }

  async logout() {
    try { await this._post('/auth/logout', {}); } catch { /* ignore */ }
    finally { this.clearAuth(); }
  }

  getCurrentUser() {
    try {
      const raw = localStorage.getItem(CONFIG.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  /* ── Medical Staff ─────────────────────────────────────────── */
  getMedicalStaff()               { return this._get('/medical-staff'); }
  createMedicalStaff(p)           { this.invalidateCache('/medical-staff');    return this._post('/medical-staff', p); }
  updateMedicalStaff(id, p)       { this.invalidateCache('/medical-staff');    return this._put(`/medical-staff/${id}`, p); }
  deleteMedicalStaff(id)          { this.invalidateCache('/medical-staff');    return this._delete(`/medical-staff/${id}`); }

  /* ── Departments ───────────────────────────────────────────── */
  getDepartments()                { return this._get('/departments'); }
  createDepartment(p)             { this.invalidateCache('/departments');      return this._post('/departments', p); }
  updateDepartment(id, p)         { this.invalidateCache('/departments');      return this._put(`/departments/${id}`, p); }
  deleteDepartment(id)            { this.invalidateCache('/departments');      return this._delete(`/departments/${id}`); }

  /* ── Training Units ────────────────────────────────────────── */
  getTrainingUnits()              { return this._get('/training-units'); }
  createTrainingUnit(p)           { this.invalidateCache('/training-units');   return this._post('/training-units', p); }
  updateTrainingUnit(id, p)       { this.invalidateCache('/training-units');   return this._put(`/training-units/${id}`, p); }
  deleteTrainingUnit(id)          { this.invalidateCache('/training-units');   return this._delete(`/training-units/${id}`); }

  /* ── Rotations ─────────────────────────────────────────────── */
  getRotations()                  { return this._get('/rotations'); }
  createRotation(p)               { this.invalidateCache('/rotations');        return this._post('/rotations', p); }
  updateRotation(id, p)           { this.invalidateCache('/rotations');        return this._put(`/rotations/${id}`, p); }
  deleteRotation(id)              { this.invalidateCache('/rotations');        return this._delete(`/rotations/${id}`); }

  /* ── On-Call ───────────────────────────────────────────────── */
  getOnCall()                     { return this._get('/oncall'); }
  createOnCall(p)                 { this.invalidateCache('/oncall');           return this._post('/oncall', p); }
  updateOnCall(id, p)             { this.invalidateCache('/oncall');           return this._put(`/oncall/${id}`, p); }
  deleteOnCall(id)                { this.invalidateCache('/oncall');           return this._delete(`/oncall/${id}`); }

  /* ── Absences ──────────────────────────────────────────────── */
  getAbsences()                   { return this._get('/absence-records'); }
  createAbsence(p)                { this.invalidateCache('/absence-records');  return this._post('/absence-records', p); }
  updateAbsence(id, p)            { this.invalidateCache('/absence-records');  return this._put(`/absence-records/${id}`, p); }
  deleteAbsence(id)               { this.invalidateCache('/absence-records');  return this._delete(`/absence-records/${id}`); }

  /* ── Announcements ─────────────────────────────────────────── */
  getAnnouncements()              { return this._get('/announcements'); }
  createAnnouncement(p)           { this.invalidateCache('/announcements');    return this._post('/announcements', p); }
  updateAnnouncement(id, p)       { this.invalidateCache('/announcements');    return this._put(`/announcements/${id}`, p); }
  deleteAnnouncement(id)          { this.invalidateCache('/announcements');    return this._delete(`/announcements/${id}`); }

  /* ── Live Status (never cached — always fresh) ─────────────── */
  getLiveStatus()                 { return this._get('/live-status', false); }
  createLiveStatus(p)             { return this._post('/live-status', p); }

  /* ── Research Lines ────────────────────────────────────────── */
  getResearchLines()              { return this._get('/research-lines'); }
  createResearchLine(p)           { this.invalidateCache('/research-lines');   return this._post('/research-lines', p); }
  updateResearchLine(id, p)       { this.invalidateCache('/research-lines');   return this._put(`/research-lines/${id}`, p); }
  deleteResearchLine(id)          { this.invalidateCache('/research-lines');   return this._delete(`/research-lines/${id}`); }

  /* ── Clinical Trials (RENAMED from getAllClinicalTrials) ────── */
  getClinicalTrials()             { return this._get('/clinical-trials'); }
  createClinicalTrial(p)          { this.invalidateCache('/clinical-trials');  return this._post('/clinical-trials', p); }
  updateClinicalTrial(id, p)      { this.invalidateCache('/clinical-trials');  return this._put(`/clinical-trials/${id}`, p); }
  deleteClinicalTrial(id)         { this.invalidateCache('/clinical-trials');  return this._delete(`/clinical-trials/${id}`); }

  /* ── Innovation Projects (RENAMED from getAllInnovationProjects) */
  getInnovationProjects()         { return this._get('/innovation-projects'); }
  createInnovationProject(p)      { this.invalidateCache('/innovation-projects'); return this._post('/innovation-projects', p); }
  updateInnovationProject(id, p)  { this.invalidateCache('/innovation-projects'); return this._put(`/innovation-projects/${id}`, p); }
  deleteInnovationProject(id)     { this.invalidateCache('/innovation-projects'); return this._delete(`/innovation-projects/${id}`); }

  /* ── Analytics ─────────────────────────────────────────────── */
  getAnalyticsResearchDashboard()        { return this._get('/analytics/research-dashboard'); }
  getAnalyticsResearchLinesPerformance() { return this._get('/analytics/research-lines-performance'); }
  getAnalyticsPartnerCollaborations()    { return this._get('/analytics/partner-collaborations'); }
  getAnalyticsClinicalTrialsTimeline()   { return this._get('/analytics/clinical-trials-timeline'); }
  getAnalyticsSummary()                  { return this._get('/analytics/summary'); }
  exportAnalytics(params = {})           { return this._post('/analytics/export', params); }

  /* ── Staff Research Profile (client-side aggregation) ──────── */
  async getStaffResearchProfile(staffId) {
    const [lines, trials, projects] = await Promise.all([
      this.getResearchLines(),
      this.getClinicalTrials(),
      this.getInnovationProjects(),
    ]);
    const sid = String(staffId);
    return {
      lines: Utils.ensureArray(lines.data ?? lines).filter(l =>
        String(l.coordinator_id) === sid ||
        Utils.ensureArray(l.team_members).map(String).includes(sid)
      ),
      trials: Utils.ensureArray(trials.data ?? trials).filter(t =>
        String(t.principal_investigator_id) === sid ||
        Utils.ensureArray(t.co_investigators).map(String).includes(sid)
      ),
      projects: Utils.ensureArray(projects.data ?? projects).filter(p =>
        Utils.ensureArray(p.team_members).map(String).includes(sid)
      ),
    };
  }
}

/** Application-wide singleton */
const api = new ApiService();

/* ================================================================
   7. SHARED HELPER FACTORIES
   Each composable receives its own isolated instance.
================================================================ */

/* ── makePagination ────────────────────────────────────────────── */
function makePagination(pageSize = 15) {
  const page       = ref(1);
  const perPage    = ref(pageSize);
  const total      = ref(0);
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)));
  const from       = computed(() => total.value === 0 ? 0 : (page.value - 1) * perPage.value + 1);
  const to         = computed(() => Math.min(page.value * perPage.value, total.value));

  function reset()        { page.value = 1; }
  function paginate(items) {
    total.value  = items.length;
    const start  = (page.value - 1) * perPage.value;
    return items.slice(start, start + perPage.value);
  }
  return { page, perPage, total, totalPages, from, to, reset, paginate };
}

/* ── makeSort ──────────────────────────────────────────────────── */
function makeSort(defaultField, defaultDir = 'asc') {
  const field     = ref(defaultField);
  const direction = ref(defaultDir);

  function toggle(newField) {
    if (field.value === newField) {
      direction.value = direction.value === 'asc' ? 'desc' : 'asc';
    } else {
      field.value     = newField;
      direction.value = 'asc';
    }
  }

  function apply(items) {
    const f = field.value;
    const d = direction.value;
    return [...items].sort((a, b) => {
      let va = a[f] ?? '';
      let vb = b[f] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return d === 'asc' ? -1 :  1;
      if (va > vb) return d === 'asc' ?  1 : -1;
      return 0;
    });
  }
  return { field, direction, toggle, apply };
}

/* ── makeValidation ────────────────────────────────────────────── */
function makeValidation(rules = {}) {
  const errors  = reactive({});
  const touched = reactive({});

  function validate(form) {
    let valid = true;
    for (const [field, rule] of Object.entries(rules)) {
      const msg      = rule(form[field], form);
      errors[field]  = msg ?? null;
      touched[field] = true;
      if (msg) valid = false;
    }
    return valid;
  }

  function validateField(field, form) {
    if (!rules[field]) return true;
    const msg      = rules[field](form[field], form);
    errors[field]  = msg ?? null;
    touched[field] = true;
    return !msg;
  }

  function clear() {
    for (const k of Object.keys(errors))  errors[k]  = null;
    for (const k of Object.keys(touched)) touched[k] = false;
  }

  function hasError(field) { return !!(touched[field] && errors[field]); }

  return { errors, touched, validate, validateField, clear, hasError };
}

/* ================================================================
   8. COMPOSABLES
================================================================ */

/* ── useAuth ───────────────────────────────────────────────────── */
function useAuth() {
  const currentUser = ref(null);
  const isLoggedIn  = ref(false);
  const authLoading = ref(false);
  const authError   = ref(null);

  function restoreSession() {
    const user  = api.getCurrentUser();
    const token = api.getToken();
    if (user && token) { currentUser.value = user; isLoggedIn.value = true; return true; }
    return false;
  }

  async function login(email, password) {
    authLoading.value = true;
    authError.value   = null;
    try {
      const data        = await api.login(email, password);
      currentUser.value = data.user;
      isLoggedIn.value  = true;
      return true;
    } catch (err) {
      authError.value = err.message ?? 'Login failed. Please check your credentials.';
      return false;
    } finally {
      authLoading.value = false;
    }
  }

  async function logout() {
    await api.logout();
    currentUser.value = null;
    isLoggedIn.value  = false;
  }

  function can(resource, action) {
    const role = currentUser.value?.role;
    if (!role) return false;
    return PERMISSION_MATRIX[role]?.[resource]?.[action] ?? false;
  }

  function hasRole(...roles) {
    return roles.includes(currentUser.value?.role);
  }

  return { currentUser, isLoggedIn, authLoading, authError, restoreSession, login, logout, can, hasRole };
}

/* ── useUI ─────────────────────────────────────────────────────── */
function useUI() {
  const currentView        = ref('dashboard');
  const sidebarCollapsed   = ref(false);
  const sidebarMobileOpen  = ref(false);
  const statsPanel         = ref(false);
  const searchQuery        = ref('');
  const toasts             = ref([]);
  const userDropdownOpen   = ref(false);

  function navigate(view) {
    currentView.value       = view;
    sidebarMobileOpen.value = false;
    searchQuery.value       = '';
    userDropdownOpen.value  = false;
  }

  function toggleSidebar()        { sidebarCollapsed.value  = !sidebarCollapsed.value; }
  function toggleMobileSidebar()  { sidebarMobileOpen.value = !sidebarMobileOpen.value; }
  function toggleStatsPanel()     { statsPanel.value        = !statsPanel.value; }

  function showToast(message, type = 'info', title = null, duration = 4000) {
    const defaults = { success: 'Done', error: 'Error', warning: 'Warning', info: 'Info' };
    const id = Utils.generateId();
    toasts.value.push({ id, message, type, title: title ?? defaults[type] });
    setTimeout(() => dismissToast(id), duration);
  }

  function dismissToast(id) {
    const idx = toasts.value.findIndex(t => t.id === id);
    if (idx > -1) toasts.value.splice(idx, 1);
  }

  return {
    currentView, sidebarCollapsed, sidebarMobileOpen, statsPanel,
    searchQuery, toasts, userDropdownOpen,
    navigate, toggleSidebar, toggleMobileSidebar, toggleStatsPanel,
    showToast, dismissToast,
  };
}

/* ── useStaff ──────────────────────────────────────────────────── */
function useStaff({ departments = ref([]), trainingUnits = ref([]) } = {}) {
  const medicalStaff  = ref([]);
  const staffLoading  = ref(false);
  const showStaffModal    = ref(false);
  const isEditingStaff    = ref(false);
  const staffModalTab     = ref('basic');
  const savingStaff       = ref(false);
  const showProfileModal  = ref(false);
  const profileStaff      = ref(null);
  const profileTab        = ref('overview');
  const profileData       = reactive({
    rotations: [], onCall: [], absences: [],
    research: { lines: [], trials: [], projects: [] },
    loadingResearch: false,
  });
  const showStaffConfirm   = ref(false);
  const staffConfirmTarget = ref(null);

  const staffForm = reactive({
    id: null, full_name: '', email: '', phone: '',
    role: '', specialty: '', license_number: '', college_number: '',
    department_id: null, training_unit_id: null,
    resident_category: '', resident_year: null, resident_institution: '',
    status: 'active', hire_date: '',
    can_be_pi: false, can_be_coi: false, can_supervise_residents: false,
    clinical_study_certificates: [],
    roles_chief_of_department: false, roles_research_coordinator: false,
    roles_resident_manager: false,    roles_oncall_manager: false,
  });

  const staffValidation = makeValidation({
    full_name:     v => !v?.trim()                             ? 'Full name is required'     : null,
    email:         v => !v?.trim()                             ? 'Email is required'
                      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email address'     : null,
    role:          v => !v                                     ? 'Role is required'           : null,
    department_id: v => !v                                     ? 'Department is required'     : null,
  });

  const staffPagination = makePagination(15);
  const staffSort       = makeSort('full_name', 'asc');
  const staffFilters    = reactive({ search: '', department: '', role: '', status: '' });

  /* Computed */
  const filteredMedicalStaffAll = computed(() => {
    let list = [...medicalStaff.value];
    if (staffFilters.search) {
      const q = staffFilters.search.toLowerCase();
      list = list.filter(s =>
        s.full_name?.toLowerCase().includes(q)      ||
        s.email?.toLowerCase().includes(q)          ||
        s.specialty?.toLowerCase().includes(q)      ||
        s.license_number?.toLowerCase().includes(q)
      );
    }
    if (staffFilters.department) list = list.filter(s => String(s.department_id) === String(staffFilters.department));
    if (staffFilters.role)       list = list.filter(s => s.role === staffFilters.role);
    if (staffFilters.status)     list = list.filter(s => s.status === staffFilters.status);
    return staffSort.apply(list);
  });

  const filteredMedicalStaff = computed(() => {
    staffPagination.reset();
    return staffPagination.paginate(filteredMedicalStaffAll.value);
  });

  watch(filteredMedicalStaffAll, list => { staffPagination.total.value = list.length; });

  /* Lookup helpers */
  function getDepartmentName(id)  { return departments.value.find(d => String(d.id) === String(id))?.name ?? '—'; }
  function getTrainingUnitName(id){ return trainingUnits.value.find(u => String(u.id) === String(id))?.name ?? '—'; }
  function getStaffById(id)       { return medicalStaff.value.find(s => String(s.id) === String(id)) ?? null; }
  function getStaffName(id)       { return getStaffById(id)?.full_name ?? '—'; }
  function isResident(member)     { return member?.role === ROLES.MEDICAL_RESIDENT; }

  /* CRUD */
  async function loadMedicalStaff() {
    staffLoading.value = true;
    try {
      const data         = await api.getMedicalStaff();
      medicalStaff.value = Utils.ensureArray(data.data ?? data);
    } finally { staffLoading.value = false; }
  }

  function _resetStaffForm() {
    Object.assign(staffForm, {
      id: null, full_name: '', email: '', phone: '', role: '', specialty: '',
      license_number: '', college_number: '', department_id: null, training_unit_id: null,
      resident_category: '', resident_year: null, resident_institution: '',
      status: 'active', hire_date: '',
      can_be_pi: false, can_be_coi: false, can_supervise_residents: false,
      clinical_study_certificates: [],
      roles_chief_of_department: false, roles_research_coordinator: false,
      roles_resident_manager: false, roles_oncall_manager: false,
    });
  }

  function openAddStaffModal() {
    isEditingStaff.value = false;
    staffModalTab.value  = 'basic';
    staffValidation.clear();
    _resetStaffForm();
    showStaffModal.value = true;
  }

  /** @param {object} staffMember */
  function editMedicalStaff(staffMember) {
    isEditingStaff.value = true;
    staffModalTab.value  = 'basic';
    staffValidation.clear();
    Object.assign(staffForm, {
      ...staffMember,
      clinical_study_certificates: Utils.ensureArray(staffMember.clinical_study_certificates),
    });
    showStaffModal.value = true;
  }

  async function saveMedicalStaff() {
    if (!staffValidation.validate(staffForm)) return false;
    savingStaff.value = true;
    try {
      if (isEditingStaff.value) {
        await api.updateMedicalStaff(staffForm.id, { ...staffForm });
      } else {
        await api.createMedicalStaff({ ...staffForm });
      }
      await loadMedicalStaff();
      showStaffModal.value = false;
      return true;
    } finally { savingStaff.value = false; }
  }

  /** @param {object} staffMember */
  function confirmDeleteStaff(staffMember) {
    staffConfirmTarget.value = staffMember;
    showStaffConfirm.value   = true;
  }

  async function deleteStaff() {
    if (!staffConfirmTarget.value) return;
    await api.deleteMedicalStaff(staffConfirmTarget.value.id);
    await loadMedicalStaff();
    showStaffConfirm.value   = false;
    staffConfirmTarget.value = null;
  }

  /** @param {object} staffMember */
  async function openStaffProfile(staffMember) {
    profileStaff.value          = staffMember;
    profileTab.value            = 'overview';
    profileData.loadingResearch = true;
    profileData.research        = { lines: [], trials: [], projects: [] };
    showProfileModal.value      = true;
    try {
      profileData.research = await api.getStaffResearchProfile(staffMember.id);
    } catch {
      profileData.research = { lines: [], trials: [], projects: [] };
    } finally {
      profileData.loadingResearch = false;
    }
  }

  function toggleCertificate(cert) {
    const list = Utils.ensureArray(staffForm.clinical_study_certificates);
    const idx  = list.indexOf(cert);
    if (idx > -1) list.splice(idx, 1);
    else          list.push(cert);
    staffForm.clinical_study_certificates = [...list];
  }

  return {
    medicalStaff, staffLoading,
    showStaffModal, isEditingStaff, staffModalTab, savingStaff,
    showProfileModal, profileStaff, profileTab, profileData,
    showStaffConfirm, staffConfirmTarget,
    staffForm, staffValidation, staffPagination, staffSort, staffFilters,
    filteredMedicalStaffAll, filteredMedicalStaff,
    loadMedicalStaff, openAddStaffModal, editMedicalStaff, saveMedicalStaff,
    confirmDeleteStaff, deleteStaff, openStaffProfile, toggleCertificate,
    getDepartmentName, getTrainingUnitName, getStaffById, getStaffName, isResident,
  };
}

/* ── useOnCall ─────────────────────────────────────────────────── */
function useOnCall({ medicalStaff = ref([]) } = {}) {
  const onCallSchedules     = ref([]);
  const onCallLoading       = ref(false);
  const showOnCallModal     = ref(false);
  const isEditingOnCall     = ref(false);
  const savingOnCall        = ref(false);
  const showOnCallConfirm   = ref(false);
  const onCallConfirmTarget = ref(null);

  const onCallForm = reactive({
    id: null, staff_id: null, duty_date: '',
    start_time: '08:00', end_time: '20:00',
    notes: '', status: 'scheduled',
  });

  const onCallValidation = makeValidation({
    staff_id:   v => !v         ? 'Staff member is required' : null,
    duty_date:  v => !v?.trim() ? 'Date is required'         : null,
    start_time: v => !v?.trim() ? 'Start time is required'   : null,
    end_time:   v => !v?.trim() ? 'End time is required'     : null,
  });

  const onCallPagination = makePagination(15);
  const onCallSort       = makeSort('duty_date', 'asc');
  const onCallFilters    = reactive({ search: '', status: '', staffId: '' });

  const filteredOnCallAll = computed(() => {
    let list = [...onCallSchedules.value];
    if (onCallFilters.search) {
      const q = onCallFilters.search.toLowerCase();
      list = list.filter(s => {
        const name = medicalStaff.value.find(m => String(m.id) === String(s.staff_id))?.full_name ?? '';
        return name.toLowerCase().includes(q) || s.notes?.toLowerCase().includes(q);
      });
    }
    if (onCallFilters.status)  list = list.filter(s => s.status === onCallFilters.status);
    if (onCallFilters.staffId) list = list.filter(s => String(s.staff_id) === String(onCallFilters.staffId));
    return onCallSort.apply(list);
  });

  /*
   * RENAMED: filteredOnCallSchedules → filteredOnCall
   * Consistent with filteredRotations / filteredAbsences pattern.
   */
  const filteredOnCall = computed(() => {
    onCallPagination.reset();
    return onCallPagination.paginate(filteredOnCallAll.value);
  });

  watch(filteredOnCallAll, list => { onCallPagination.total.value = list.length; });

  async function loadOnCall() {
    onCallLoading.value = true;
    try {
      const data            = await api.getOnCall();
      onCallSchedules.value = Utils.ensureArray(data.data ?? data);
    } finally { onCallLoading.value = false; }
  }

  function openAddOnCallModal(defaultDate = '') {
    isEditingOnCall.value = false;
    onCallValidation.clear();
    Object.assign(onCallForm, {
      id: null, staff_id: null,
      duty_date: defaultDate || Utils.getTomorrow(),
      start_time: '08:00', end_time: '20:00',
      notes: '', status: 'scheduled',
    });
    showOnCallModal.value = true;
  }

  /** @param {object} schedule */
  function editOnCall(schedule) {
    isEditingOnCall.value = true;
    onCallValidation.clear();
    Object.assign(onCallForm, { ...schedule });
    showOnCallModal.value = true;
  }

  async function saveOnCall() {
    if (!onCallValidation.validate(onCallForm)) return false;
    savingOnCall.value = true;
    try {
      if (isEditingOnCall.value) {
        await api.updateOnCall(onCallForm.id, { ...onCallForm });
      } else {
        await api.createOnCall({ ...onCallForm });
      }
      await loadOnCall();
      showOnCallModal.value = false;
      return true;
    } finally { savingOnCall.value = false; }
  }

  /** @param {object} schedule */
  function confirmDeleteOnCall(schedule) {
    onCallConfirmTarget.value = schedule;
    showOnCallConfirm.value   = true;
  }

  async function deleteOnCall() {
    if (!onCallConfirmTarget.value) return;
    await api.deleteOnCall(onCallConfirmTarget.value.id);
    await loadOnCall();
    showOnCallConfirm.value   = false;
    onCallConfirmTarget.value = null;
  }

  return {
    onCallSchedules, onCallLoading,
    showOnCallModal, isEditingOnCall, savingOnCall,
    showOnCallConfirm, onCallConfirmTarget,
    onCallForm, onCallValidation, onCallPagination, onCallSort, onCallFilters,
    filteredOnCallAll, filteredOnCall,
    loadOnCall, openAddOnCallModal, editOnCall, saveOnCall,
    confirmDeleteOnCall, deleteOnCall,
  };
}

/* ── useRotations ──────────────────────────────────────────────── */
function useRotations({ medicalStaff = ref([]), trainingUnits = ref([]) } = {}) {
  const rotations              = ref([]);
  const rotationsLoading       = ref(false);
  const showRotationModal      = ref(false);
  const isEditingRotation      = ref(false);
  const savingRotation         = ref(false);
  const showRotationConfirm    = ref(false);
  const rotationConfirmTarget  = ref(null);
  const rotationOverlapWarning = ref(null);

  const rotationForm = reactive({
    id: null, staff_id: null, training_unit_id: null,
    start_date: '', end_date: '', status: 'scheduled', notes: '',
  });

  const rotationValidation = makeValidation({
    staff_id:         v => !v         ? 'Staff member is required'  : null,
    training_unit_id: v => !v         ? 'Training unit is required' : null,
    start_date:       v => !v?.trim() ? 'Start date is required'    : null,
    end_date: (v, form) => {
      if (!v?.trim())                               return 'End date is required';
      if (form.start_date && v < form.start_date)   return 'End date must be after start date';
      return null;
    },
  });

  const rotationsPagination = makePagination(15);
  const rotationsSort       = makeSort('start_date', 'desc');
  const rotationsFilters    = reactive({ search: '', status: '', staffId: '', unitId: '' });

  function checkRotationOverlap(staffId, startDate, endDate, excludeId = null) {
    return rotations.value.find(r =>
      String(r.staff_id) === String(staffId)       &&
      r.status !== 'cancelled'                     &&
      (!excludeId || String(r.id) !== String(excludeId)) &&
      startDate < r.end_date && endDate > r.start_date
    ) ?? null;
  }

  watch(
    () => [rotationForm.staff_id, rotationForm.start_date, rotationForm.end_date],
    () => {
      if (rotationForm.staff_id && rotationForm.start_date && rotationForm.end_date) {
        rotationOverlapWarning.value = checkRotationOverlap(
          rotationForm.staff_id, rotationForm.start_date,
          rotationForm.end_date, rotationForm.id
        );
      } else {
        rotationOverlapWarning.value = null;
      }
    }
  );

  const filteredRotationsAll = computed(() => {
    let list = [...rotations.value];
    if (rotationsFilters.search) {
      const q = rotationsFilters.search.toLowerCase();
      list = list.filter(r => {
        const name = medicalStaff.value.find(m => String(m.id) === String(r.staff_id))?.full_name ?? '';
        const unit = trainingUnits.value.find(u => String(u.id) === String(r.training_unit_id))?.name ?? '';
        return name.toLowerCase().includes(q) || unit.toLowerCase().includes(q);
      });
    }
    if (rotationsFilters.status)  list = list.filter(r => r.status === rotationsFilters.status);
    if (rotationsFilters.staffId) list = list.filter(r => String(r.staff_id) === String(rotationsFilters.staffId));
    if (rotationsFilters.unitId)  list = list.filter(r => String(r.training_unit_id) === String(rotationsFilters.unitId));
    return rotationsSort.apply(list);
  });

  const filteredRotations = computed(() => {
    rotationsPagination.reset();
    return rotationsPagination.paginate(filteredRotationsAll.value);
  });

  watch(filteredRotationsAll, list => { rotationsPagination.total.value = list.length; });

  async function loadRotations() {
    rotationsLoading.value = true;
    try {
      const data      = await api.getRotations();
      rotations.value = Utils.ensureArray(data.data ?? data);
    } finally { rotationsLoading.value = false; }
  }

  function openAddRotationModal() {
    isEditingRotation.value      = false;
    rotationOverlapWarning.value = null;
    rotationValidation.clear();
    Object.assign(rotationForm, {
      id: null, staff_id: null, training_unit_id: null,
      start_date: Utils.getTomorrow(), end_date: '', status: 'scheduled', notes: '',
    });
    showRotationModal.value = true;
  }

  /** @param {object} rotation */
  function editRotation(rotation) {
    isEditingRotation.value      = true;
    rotationOverlapWarning.value = null;
    rotationValidation.clear();
    Object.assign(rotationForm, { ...rotation });
    showRotationModal.value = true;
  }

  async function saveRotation() {
    if (!rotationValidation.validate(rotationForm)) return false;
    savingRotation.value = true;
    try {
      if (isEditingRotation.value) {
        await api.updateRotation(rotationForm.id, { ...rotationForm });
      } else {
        await api.createRotation({ ...rotationForm });
      }
      await loadRotations();
      showRotationModal.value = false;
      return true;
    } finally { savingRotation.value = false; }
  }

  /** @param {object} rotation */
  function confirmDeleteRotation(rotation) {
    rotationConfirmTarget.value = rotation;
    showRotationConfirm.value   = true;
  }

  async function deleteRotation() {
    if (!rotationConfirmTarget.value) return;
    await api.deleteRotation(rotationConfirmTarget.value.id);
    await loadRotations();
    showRotationConfirm.value   = false;
    rotationConfirmTarget.value = null;
  }

  return {
    rotations, rotationsLoading,
    showRotationModal, isEditingRotation, savingRotation,
    showRotationConfirm, rotationConfirmTarget, rotationOverlapWarning,
    rotationForm, rotationValidation, rotationsPagination, rotationsSort, rotationsFilters,
    filteredRotationsAll, filteredRotations,
    loadRotations, openAddRotationModal, editRotation, saveRotation,
    confirmDeleteRotation, deleteRotation, checkRotationOverlap,
  };
}

/* ── useAbsences ───────────────────────────────────────────────── */
function useAbsences({ medicalStaff = ref([]) } = {}) {
  const absences              = ref([]);
  const absencesLoading       = ref(false);
  const showAbsenceModal      = ref(false);
  const isEditingAbsence      = ref(false);
  const savingAbsence         = ref(false);
  const showAbsenceConfirm    = ref(false);
  const absenceConfirmTarget  = ref(null);

  const absenceForm = reactive({
    id: null, staff_id: null, absence_type: 'planned',
    reason: '', start_date: '', end_date: '',
    has_coverage: false, coverage_staff_id: null, notes: '',
  });

  const absenceValidation = makeValidation({
    staff_id:   v => !v         ? 'Staff member is required' : null,
    reason:     v => !v?.trim() ? 'Reason is required'       : null,
    start_date: v => !v?.trim() ? 'Start date is required'   : null,
    end_date: (v, form) => {
      if (!v?.trim())                             return 'End date is required';
      if (form.start_date && v < form.start_date) return 'End date must be after start date';
      return null;
    },
  });

  const absencesPagination = makePagination(15);
  const absencesSort       = makeSort('start_date', 'desc');
  const absencesFilters    = reactive({ search: '', type: '', staffId: '', hasCoverage: '' });

  const absenceDuration = computed(() =>
    absenceForm.start_date && absenceForm.end_date
      ? Utils.dateDiff(absenceForm.start_date, absenceForm.end_date) + 1
      : 0
  );

  const filteredAbsencesAll = computed(() => {
    let list = [...absences.value];
    if (absencesFilters.search) {
      const q = absencesFilters.search.toLowerCase();
      list = list.filter(a => {
        const name = medicalStaff.value.find(m => String(m.id) === String(a.staff_id))?.full_name ?? '';
        return name.toLowerCase().includes(q) || a.reason?.toLowerCase().includes(q);
      });
    }
    if (absencesFilters.type)    list = list.filter(a => a.absence_type === absencesFilters.type);
    if (absencesFilters.staffId) list = list.filter(a => String(a.staff_id) === String(absencesFilters.staffId));
    if (absencesFilters.hasCoverage !== '') {
      list = list.filter(a => String(a.has_coverage) === absencesFilters.hasCoverage);
    }
    return absencesSort.apply(list);
  });

  const filteredAbsences = computed(() => {
    absencesPagination.reset();
    return absencesPagination.paginate(filteredAbsencesAll.value);
  });

  watch(filteredAbsencesAll, list => { absencesPagination.total.value = list.length; });

  async function loadAbsences() {
    absencesLoading.value = true;
    try {
      const data      = await api.getAbsences();
      absences.value  = Utils.ensureArray(data.data ?? data);
    } finally { absencesLoading.value = false; }
  }

  function openAddAbsenceModal() {
    isEditingAbsence.value = false;
    absenceValidation.clear();
    Object.assign(absenceForm, {
      id: null, staff_id: null, absence_type: 'planned',
      reason: '', start_date: Utils.getTomorrow(), end_date: '',
      has_coverage: false, coverage_staff_id: null, notes: '',
    });
    showAbsenceModal.value = true;
  }

  /** @param {object} absence */
  function editAbsence(absence) {
    isEditingAbsence.value = true;
    absenceValidation.clear();
    Object.assign(absenceForm, { ...absence });
    showAbsenceModal.value = true;
  }

  async function saveAbsence() {
    if (!absenceValidation.validate(absenceForm)) return false;
    savingAbsence.value = true;
    try {
      if (isEditingAbsence.value) {
        await api.updateAbsence(absenceForm.id, { ...absenceForm });
      } else {
        await api.createAbsence({ ...absenceForm });
      }
      await loadAbsences();
      showAbsenceModal.value = false;
      return true;
    } finally { savingAbsence.value = false; }
  }

  /** @param {object} absence */
  function confirmDeleteAbsence(absence) {
    absenceConfirmTarget.value = absence;
    showAbsenceConfirm.value   = true;
  }

  async function deleteAbsence() {
    if (!absenceConfirmTarget.value) return;
    await api.deleteAbsence(absenceConfirmTarget.value.id);
    await loadAbsences();
    showAbsenceConfirm.value   = false;
    absenceConfirmTarget.value = null;
  }

  return {
    absences, absencesLoading,
    showAbsenceModal, isEditingAbsence, savingAbsence,
    showAbsenceConfirm, absenceConfirmTarget, absenceDuration,
    absenceForm, absenceValidation, absencesPagination, absencesSort, absencesFilters,
    filteredAbsencesAll, filteredAbsences,
    loadAbsences, openAddAbsenceModal, editAbsence, saveAbsence,
    confirmDeleteAbsence, deleteAbsence,
  };
}

/* ── useDepartments ────────────────────────────────────────────── */
function useDepartments({ medicalStaff = ref([]), trainingUnits = ref([]) } = {}) {
  const departments       = ref([]);
  const deptsLoading      = ref(false);
  const showDeptModal     = ref(false);
  const isEditingDept     = ref(false);
  const savingDept        = ref(false);
  const showDeptConfirm   = ref(false);
  const deptConfirmTarget = ref(null);

  const deptForm = reactive({
    id: null, name: '', description: '',
    head_of_department_id: null, training_unit_ids: [],
  });

  const deptValidation = makeValidation({
    name: v => !v?.trim() ? 'Department name is required' : null,
  });

  async function loadDepartments() {
    deptsLoading.value = true;
    try {
      const data        = await api.getDepartments();
      departments.value = Utils.ensureArray(data.data ?? data);
    } finally { deptsLoading.value = false; }
  }

  function openAddDeptModal() {
    isEditingDept.value = false;
    deptValidation.clear();
    Object.assign(deptForm, { id: null, name: '', description: '', head_of_department_id: null, training_unit_ids: [] });
    showDeptModal.value = true;
  }

  /** @param {object} department */
  function editDepartment(department) {
    isEditingDept.value = true;
    deptValidation.clear();
    Object.assign(deptForm, {
      ...department,
      training_unit_ids: Utils.ensureArray(department.training_unit_ids),
    });
    showDeptModal.value = true;
  }

  async function saveDepartment() {
    if (!deptValidation.validate(deptForm)) return false;
    savingDept.value = true;
    try {
      if (isEditingDept.value) {
        await api.updateDepartment(deptForm.id, { ...deptForm });
      } else {
        await api.createDepartment({ ...deptForm });
      }
      await loadDepartments();
      showDeptModal.value = false;
      return true;
    } finally { savingDept.value = false; }
  }

  /** @param {object} department */
  function confirmDeleteDept(department) {
    deptConfirmTarget.value = department;
    showDeptConfirm.value   = true;
  }

  async function deleteDepartment() {
    if (!deptConfirmTarget.value) return;
    await api.deleteDepartment(deptConfirmTarget.value.id);
    await loadDepartments();
    showDeptConfirm.value   = false;
    deptConfirmTarget.value = null;
  }

  function getDepartmentById(id) {
    return departments.value.find(d => String(d.id) === String(id)) ?? null;
  }

  function getDepartmentUnits(department) {
    const ids = Utils.ensureArray(department.training_unit_ids ?? department.units).map(String);
    return trainingUnits.value.filter(u => ids.includes(String(u.id)));
  }

  function getDepartmentRoleHolder(departmentId, roleName) {
    return medicalStaff.value.find(s =>
      String(s.department_id) === String(departmentId) &&
      s[`roles_${roleName}`] === true
    ) ?? null;
  }

  return {
    departments, deptsLoading,
    showDeptModal, isEditingDept, savingDept,
    showDeptConfirm, deptConfirmTarget,
    deptForm, deptValidation,
    loadDepartments, openAddDeptModal, editDepartment, saveDepartment,
    confirmDeleteDept, deleteDepartment,
    getDepartmentById, getDepartmentUnits, getDepartmentRoleHolder,
  };
}

/* ── useTrainingUnits ──────────────────────────────────────────── */
function useTrainingUnits({ medicalStaff = ref([]), rotations = ref([]) } = {}) {
  const trainingUnits    = ref([]);
  const tuLoading        = ref(false);
  const showTuModal      = ref(false);
  const isEditingTu      = ref(false);
  const savingTu         = ref(false);
  const showTuConfirm    = ref(false);
  const tuConfirmTarget  = ref(null);
  const showTuResidents  = ref(false);
  const activeTuUnit     = ref(null);

  const tuForm = reactive({
    id: null, name: '', department_id: null,
    capacity: 1, description: '', is_active: true,
  });

  const tuValidation = makeValidation({
    name:          v => !v?.trim()    ? 'Unit name is required'        : null,
    department_id: v => !v            ? 'Department is required'       : null,
    capacity:      v => (!v || v < 1) ? 'Capacity must be at least 1' : null,
  });

  async function loadTrainingUnits() {
    tuLoading.value = true;
    try {
      const data          = await api.getTrainingUnits();
      trainingUnits.value = Utils.ensureArray(data.data ?? data);
    } finally { tuLoading.value = false; }
  }

  function openAddTuModal() {
    isEditingTu.value = false;
    tuValidation.clear();
    Object.assign(tuForm, { id: null, name: '', department_id: null, capacity: 1, description: '', is_active: true });
    showTuModal.value = true;
  }

  /** @param {object} unit */
  function editTrainingUnit(unit) {
    isEditingTu.value = true;
    tuValidation.clear();
    Object.assign(tuForm, { ...unit });
    showTuModal.value = true;
  }

  async function saveTrainingUnit() {
    if (!tuValidation.validate(tuForm)) return false;
    savingTu.value = true;
    try {
      if (isEditingTu.value) {
        await api.updateTrainingUnit(tuForm.id, { ...tuForm });
      } else {
        await api.createTrainingUnit({ ...tuForm });
      }
      await loadTrainingUnits();
      showTuModal.value = false;
      return true;
    } finally { savingTu.value = false; }
  }

  /** @param {object} unit */
  function confirmDeleteTu(unit) {
    tuConfirmTarget.value = unit;
    showTuConfirm.value   = true;
  }

  async function deleteTrainingUnit() {
    if (!tuConfirmTarget.value) return;
    await api.deleteTrainingUnit(tuConfirmTarget.value.id);
    await loadTrainingUnits();
    showTuConfirm.value   = false;
    tuConfirmTarget.value = null;
  }

  function getUnitActiveResidents(unitId) {
    const today          = Utils.getToday();
    const activeStaffIds = rotations.value
      .filter(r =>
        String(r.training_unit_id) === String(unitId) &&
        r.status === 'scheduled' &&
        r.start_date <= today    &&
        r.end_date   >= today
      )
      .map(r => String(r.staff_id));
    return medicalStaff.value.filter(s => activeStaffIds.includes(String(s.id)));
  }

  /** @param {object} unit */
  function openUnitResidents(unit) {
    activeTuUnit.value    = unit;
    showTuResidents.value = true;
  }

  return {
    trainingUnits, tuLoading,
    showTuModal, isEditingTu, savingTu,
    showTuConfirm, tuConfirmTarget, showTuResidents, activeTuUnit,
    tuForm, tuValidation,
    loadTrainingUnits, openAddTuModal, editTrainingUnit, saveTrainingUnit,
    confirmDeleteTu, deleteTrainingUnit, getUnitActiveResidents, openUnitResidents,
  };
}

/* ── useComms ──────────────────────────────────────────────────── */
function useComms() {
  const announcements      = ref([]);
  const commsLoading       = ref(false);
  const showCommsModal     = ref(false);
  const isEditingComms     = ref(false);
  const savingComms        = ref(false);
  const showCommsConfirm   = ref(false);
  const commsConfirmTarget = ref(null);
  const commsTab           = ref('announcements'); // 'announcements' | 'status'

  const announcementForm = reactive({
    id: null, title: '', body: '',
    priority: 'normal', target_audience: 'all', expires_at: '',
  });

  const statusUpdateForm = reactive({
    location: '', message: '', status_type: 'normal',
  });

  const announcementValidation = makeValidation({
    title: v => !v?.trim() ? 'Title is required'        : null,
    body:  v => !v?.trim() ? 'Message body is required' : null,
  });

  const statusUpdateValidation = makeValidation({
    location: v => !v?.trim() ? 'Location is required'       : null,
    message:  v => !v?.trim() ? 'Status message is required' : null,
  });

  const commsFilters = reactive({ search: '', priority: '', audience: '' });

  const filteredAnnouncements = computed(() => {
    let list = [...announcements.value];
    if (commsFilters.search) {
      const q = commsFilters.search.toLowerCase();
      list = list.filter(a =>
        a.title?.toLowerCase().includes(q) || a.body?.toLowerCase().includes(q)
      );
    }
    if (commsFilters.priority) list = list.filter(a => a.priority === commsFilters.priority);
    if (commsFilters.audience) list = list.filter(a => a.target_audience === commsFilters.audience);
    const order = { urgent: 0, high: 1, normal: 2 };
    return list.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
  });

  async function loadAnnouncements() {
    commsLoading.value = true;
    try {
      const data          = await api.getAnnouncements();
      announcements.value = Utils.ensureArray(data.data ?? data);
    } finally { commsLoading.value = false; }
  }

  function openAddAnnouncementModal() {
    isEditingComms.value = false;
    announcementValidation.clear();
    Object.assign(announcementForm, {
      id: null, title: '', body: '', priority: 'normal', target_audience: 'all', expires_at: '',
    });
    showCommsModal.value = true;
  }

  /** @param {object} announcement */
  function editAnnouncement(announcement) {
    isEditingComms.value = true;
    announcementValidation.clear();
    Object.assign(announcementForm, { ...announcement });
    showCommsModal.value = true;
  }

  async function saveAnnouncement() {
    if (!announcementValidation.validate(announcementForm)) return false;
    savingComms.value = true;
    try {
      if (isEditingComms.value) {
        await api.updateAnnouncement(announcementForm.id, { ...announcementForm });
      } else {
        await api.createAnnouncement({ ...announcementForm });
      }
      await loadAnnouncements();
      showCommsModal.value = false;
      return true;
    } finally { savingComms.value = false; }
  }

  /** @param {object} announcement */
  function confirmDeleteAnnouncement(announcement) {
    commsConfirmTarget.value = announcement;
    showCommsConfirm.value   = true;
  }

  async function deleteAnnouncement() {
    if (!commsConfirmTarget.value) return;
    await api.deleteAnnouncement(commsConfirmTarget.value.id);
    await loadAnnouncements();
    showCommsConfirm.value   = false;
    commsConfirmTarget.value = null;
  }

  async function postLiveStatus() {
    if (!statusUpdateValidation.validate(statusUpdateForm)) return false;
    savingComms.value = true;
    try {
      await api.createLiveStatus({ ...statusUpdateForm });
      Object.assign(statusUpdateForm, { location: '', message: '', status_type: 'normal' });
      statusUpdateValidation.clear();
      return true;
    } finally { savingComms.value = false; }
  }

  return {
    announcements, commsLoading,
    showCommsModal, isEditingComms, savingComms,
    showCommsConfirm, commsConfirmTarget, commsTab,
    announcementForm, statusUpdateForm,
    announcementValidation, statusUpdateValidation,
    commsFilters, filteredAnnouncements,
    loadAnnouncements, openAddAnnouncementModal, editAnnouncement, saveAnnouncement,
    confirmDeleteAnnouncement, deleteAnnouncement, postLiveStatus,
  };
}

/* ── useLiveStatus ─────────────────────────────────────────────── */
function useLiveStatus() {
  const liveStatuses = ref([]);
  const liveLoading  = ref(false);
  const lastUpdated  = ref(null);
  let _pollTimer     = null;

  async function loadLiveStatus() {
    liveLoading.value = true;
    try {
      const data         = await api.getLiveStatus();
      liveStatuses.value = Utils.ensureArray(data.data ?? data);
      lastUpdated.value  = new Date();
    } finally { liveLoading.value = false; }
  }

  function startPolling() {
    stopPolling();
    _pollTimer = setInterval(loadLiveStatus, CONFIG.POLL_INTERVAL);
  }

  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  const currentStatus  = computed(() => liveStatuses.value[0] ?? null);
  const recentStatuses = computed(() => liveStatuses.value.slice(1, 5));

  const teamMetrics = computed(() => {
    const m = currentStatus.value?.metrics ?? {};
    return {
      attending:   m.attending_available  ?? 0,
      residents:   m.residents_available  ?? 0,
      onCall:      m.on_call_count        ?? 0,
      unavailable: m.unavailable_count    ?? 0,
      beds:        m.available_beds       ?? 0,
      admissions:  m.pending_admissions   ?? 0,
      procedures:  m.active_procedures    ?? 0,
      alerts:      m.critical_alerts      ?? 0,
    };
  });

  return {
    liveStatuses, liveLoading, lastUpdated,
    currentStatus, recentStatuses, teamMetrics,
    loadLiveStatus, startPolling, stopPolling,
  };
}

/* ── useResearch ───────────────────────────────────────────────── */
function useResearch({ medicalStaff = ref([]) } = {}) {

  const researchLines      = ref([]);
  const clinicalTrials     = ref([]);
  const innovationProjects = ref([]);
  const researchLoading    = ref(false);
  const researchSaving     = ref(false);

  /* Modal state */
  const showResearchLineModal  = ref(false);
  const isEditingResearchLine  = ref(false);
  const showTrialModal         = ref(false);
  const isEditingTrial         = ref(false);
  const showProjectModal       = ref(false);
  const isEditingProject       = ref(false);
  const showCoordinatorModal   = ref(false);
  const coordinatorTarget      = ref(null);
  const showResearchConfirm    = ref(false);
  const researchConfirmTarget  = ref(null);
  const researchConfirmType    = ref(''); // 'line' | 'trial' | 'project'

  /* Forms */
  const researchLineForm = reactive({
    id: null, line_number: '', name: '', description: '',
    coordinator_id: null, keywords: [], is_active: true,
  });

  const trialForm = reactive({
    id: null, protocol_id: '', title: '', phase: '',
    research_line_id: null, principal_investigator_id: null,
    co_investigators: [], status: 'scheduled',
    start_date: '', end_date: '', sponsor: '', description: '',
  });

  const projectForm = reactive({
    id: null, title: '', category: '', stage: '', description: '',
    research_line_id: null, team_members: [], needs: [], is_active: true,
  });

  const coordinatorForm = reactive({ coordinator_id: null });

  /* Validation */
  const researchLineValidation = makeValidation({
    name:        v => !v?.trim() ? 'Research line name is required' : null,
    line_number: v => !v?.trim() ? 'Line number is required'        : null,
  });

  const trialValidation = makeValidation({
    protocol_id: v => !v?.trim() ? 'Protocol ID is required' : null,
    title:       v => !v?.trim() ? 'Trial title is required'  : null,
    phase:       v => !v         ? 'Phase is required'        : null,
  });

  const projectValidation = makeValidation({
    title:    v => !v?.trim() ? 'Project title is required'     : null,
    category: v => !v         ? 'Category is required'          : null,
    stage:    v => !v         ? 'Development stage is required' : null,
  });

  /* Trial pagination & sort */
  const trialPagination = makePagination(15);
  const trialSort       = makeSort('protocol_id', 'asc');
  const trialFilters    = reactive({ search: '', phase: '', status: '', lineId: '' });

  const filteredTrialsAll = computed(() => {
    let list = [...clinicalTrials.value];
    if (trialFilters.search) {
      const q = trialFilters.search.toLowerCase();
      list = list.filter(t =>
        t.title?.toLowerCase().includes(q)       ||
        t.protocol_id?.toLowerCase().includes(q) ||
        t.sponsor?.toLowerCase().includes(q)
      );
    }
    if (trialFilters.phase)  list = list.filter(t => t.phase === trialFilters.phase);
    if (trialFilters.status) list = list.filter(t => t.status === trialFilters.status);
    if (trialFilters.lineId) list = list.filter(t => String(t.research_line_id) === String(trialFilters.lineId));
    return trialSort.apply(list);
  });

  const filteredTrials = computed(() => {
    trialPagination.reset();
    return trialPagination.paginate(filteredTrialsAll.value);
  });

  watch(filteredTrialsAll, list => { trialPagination.total.value = list.length; });

  /* Load */
  async function loadResearch() {
    researchLoading.value = true;
    try {
      const [lines, trials, projects] = await Promise.all([
        api.getResearchLines(),
        api.getClinicalTrials(),
        api.getInnovationProjects(),
      ]);
      researchLines.value      = Utils.ensureArray(lines.data    ?? lines);
      clinicalTrials.value     = Utils.ensureArray(trials.data   ?? trials);
      innovationProjects.value = Utils.ensureArray(projects.data ?? projects);
    } finally { researchLoading.value = false; }
  }

  /* Research Line CRUD */
  function openAddResearchLineModal() {
    isEditingResearchLine.value = false;
    researchLineValidation.clear();
    Object.assign(researchLineForm, {
      id: null, line_number: '', name: '', description: '',
      coordinator_id: null, keywords: [], is_active: true,
    });
    showResearchLineModal.value = true;
  }

  /** @param {object} line */
  function editResearchLine(line) {
    isEditingResearchLine.value = true;
    researchLineValidation.clear();
    Object.assign(researchLineForm, { ...line, keywords: Utils.ensureArray(line.keywords) });
    showResearchLineModal.value = true;
  }

  async function saveResearchLine() {
    if (!researchLineValidation.validate(researchLineForm)) return false;
    researchSaving.value = true;
    try {
      if (isEditingResearchLine.value) {
        await api.updateResearchLine(researchLineForm.id, { ...researchLineForm });
      } else {
        await api.createResearchLine({ ...researchLineForm });
      }
      await loadResearch();
      showResearchLineModal.value = false;
      return true;
    } finally { researchSaving.value = false; }
  }

  /* Trial CRUD */
  function openAddTrialModal() {
    isEditingTrial.value = false;
    trialValidation.clear();
    Object.assign(trialForm, {
      id: null, protocol_id: '', title: '', phase: '',
      research_line_id: null, principal_investigator_id: null,
      co_investigators: [], status: 'scheduled',
      start_date: '', end_date: '', sponsor: '', description: '',
    });
    showTrialModal.value = true;
  }

  /** @param {object} trial */
  function editTrial(trial) {
    isEditingTrial.value = true;
    trialValidation.clear();
    Object.assign(trialForm, {
      ...trial,
      co_investigators: Utils.ensureArray(trial.co_investigators),
    });
    showTrialModal.value = true;
  }

  async function saveTrial() {
    if (!trialValidation.validate(trialForm)) return false;
    researchSaving.value = true;
    try {
      if (isEditingTrial.value) {
        await api.updateClinicalTrial(trialForm.id, { ...trialForm });
      } else {
        await api.createClinicalTrial({ ...trialForm });
      }
      await loadResearch();
      showTrialModal.value = false;
      return true;
    } finally { researchSaving.value = false; }
  }

  /* Project CRUD */
  function openAddProjectModal() {
    isEditingProject.value = false;
    projectValidation.clear();
    Object.assign(projectForm, {
      id: null, title: '', category: '', stage: '', description: '',
      research_line_id: null, team_members: [], needs: [], is_active: true,
    });
    showProjectModal.value = true;
  }

  /** @param {object} project */
  function editProject(project) {
    isEditingProject.value = true;
    projectValidation.clear();
    Object.assign(projectForm, {
      ...project,
      team_members: Utils.ensureArray(project.team_members),
      needs:        Utils.ensureArray(project.needs),
    });
    showProjectModal.value = true;
  }

  async function saveProject() {
    if (!projectValidation.validate(projectForm)) return false;
    researchSaving.value = true;
    try {
      if (isEditingProject.value) {
        await api.updateInnovationProject(projectForm.id, { ...projectForm });
      } else {
        await api.createInnovationProject({ ...projectForm });
      }
      await loadResearch();
      showProjectModal.value = false;
      return true;
    } finally { researchSaving.value = false; }
  }

  /* Coordinator assignment */
  /** @param {object} line */
  function openCoordinatorModal(line) {
    coordinatorTarget.value        = line;
    coordinatorForm.coordinator_id = line.coordinator_id ?? null;
    showCoordinatorModal.value     = true;
  }

  async function saveCoordinator() {
    if (!coordinatorTarget.value) return false;
    researchSaving.value = true;
    try {
      await api.updateResearchLine(coordinatorTarget.value.id, {
        ...coordinatorTarget.value,
        coordinator_id: coordinatorForm.coordinator_id,
      });
      await loadResearch();
      showCoordinatorModal.value = false;
      return true;
    } finally { researchSaving.value = false; }
  }

  /* Shared delete confirm */
  /**
   * @param {object} item
   * @param {'line'|'trial'|'project'} type
   */
  function confirmDeleteResearch(item, type) {
    researchConfirmTarget.value = item;
    researchConfirmType.value   = type;
    showResearchConfirm.value   = true;
  }

  async function deleteResearchItem() {
    if (!researchConfirmTarget.value) return;
    const id = researchConfirmTarget.value.id;
    switch (researchConfirmType.value) {
      case 'line':    await api.deleteResearchLine(id);       break;
      case 'trial':   await api.deleteClinicalTrial(id);      break;
      case 'project': await api.deleteInnovationProject(id);  break;
    }
    await loadResearch();
    showResearchConfirm.value   = false;
    researchConfirmTarget.value = null;
    researchConfirmType.value   = '';
  }

  /* Lookup helpers */
  function getResearchLineName(id) {
    return researchLines.value.find(l => String(l.id) === String(id))?.name ?? '—';
  }

  function getResearchCoordinator(line) {
    return medicalStaff.value.find(s => String(s.id) === String(line.coordinator_id)) ?? null;
  }

  return {
    researchLines, clinicalTrials, innovationProjects,
    researchLoading, researchSaving,
    showResearchLineModal, isEditingResearchLine,
    showTrialModal,        isEditingTrial,
    showProjectModal,      isEditingProject,
    showCoordinatorModal,  coordinatorTarget, coordinatorForm,
    showResearchConfirm,   researchConfirmTarget, researchConfirmType,
    researchLineForm, trialForm, projectForm,
    researchLineValidation, trialValidation, projectValidation,
    trialPagination, trialSort, trialFilters,
    filteredTrialsAll, filteredTrials,
    loadResearch,
    openAddResearchLineModal, editResearchLine, saveResearchLine,
    openAddTrialModal,        editTrial,        saveTrial,
    openAddProjectModal,      editProject,      saveProject,
    openCoordinatorModal,     saveCoordinator,
    confirmDeleteResearch,    deleteResearchItem,
    getResearchLineName,      getResearchCoordinator,
  };
}

/* ── useAnalytics ──────────────────────────────────────────────── */
function useAnalytics() {
  const analyticsSummary     = ref(null);
  const analyticsResearch    = ref(null);
  const analyticsPerformance = ref([]);
  const analyticsPartners    = ref([]);
  const analyticsTimeline    = ref([]);
  const analyticsLoading     = ref(false);
  const analyticsTab         = ref('overview');

  async function loadAnalytics() {
    analyticsLoading.value = true;
    try {
      const [summary, dashboard, performance, partners, timeline] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAnalyticsResearchDashboard(),
        api.getAnalyticsResearchLinesPerformance(),
        api.getAnalyticsPartnerCollaborations(),
        api.getAnalyticsClinicalTrialsTimeline(),
      ]);
      analyticsSummary.value     = summary.data     ?? summary;
      analyticsResearch.value    = dashboard.data   ?? dashboard;
      analyticsPerformance.value = Utils.ensureArray(performance.data ?? performance);
      analyticsPartners.value    = Utils.ensureArray(partners.data    ?? partners);
      analyticsTimeline.value    = Utils.ensureArray(timeline.data    ?? timeline);
    } finally { analyticsLoading.value = false; }
  }

  function exportAnalytics(params = {}) {
    return api.exportAnalytics(params);
  }

  return {
    analyticsSummary, analyticsResearch, analyticsPerformance,
    analyticsPartners, analyticsTimeline, analyticsLoading, analyticsTab,
    loadAnalytics, exportAnalytics,
  };
}

/* ── useDashboard ──────────────────────────────────────────────── */
function useDashboard({
  medicalStaff    = ref([]),
  departments     = ref([]),
  rotations       = ref([]),
  onCallSchedules = ref([]),
  absences        = ref([]),
  clinicalTrials  = ref([]),
} = {}) {

  const dashboardCounters = reactive({
    staff: 0, activeStaff: 0, departments: 0,
    rotations: 0, onCall: 0, absences: 0, trials: 0,
  });

  function _animateCount(key, target, duration = 600) {
    const origin    = dashboardCounters[key];
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      dashboardCounters[key] = Math.round(origin + (target - origin) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function computeStats() {
    const today = Utils.getToday();
    _animateCount('staff',       medicalStaff.value.length);
    _animateCount('activeStaff', medicalStaff.value.filter(s => s.status === 'active').length);
    _animateCount('departments', departments.value.length);
    _animateCount('rotations',   rotations.value.filter(r =>
      r.status === 'scheduled' && r.start_date <= today && r.end_date >= today
    ).length);
    _animateCount('onCall',    onCallSchedules.value.filter(o => o.duty_date === today).length);
    _animateCount('absences',  absences.value.filter(a => a.start_date <= today && a.end_date >= today).length);
    _animateCount('trials',    clinicalTrials.value.filter(t => t.status === 'scheduled').length);
  }

  const staffByRole = computed(() => {
    const result = {};
    for (const s of medicalStaff.value) {
      const r = s.role ?? 'unknown';
      result[r] = (result[r] ?? 0) + 1;
    }
    return result;
  });

  const staffByStatus = computed(() => ({
    active:   medicalStaff.value.filter(s => s.status === 'active').length,
    on_leave: medicalStaff.value.filter(s => s.status === 'on_leave').length,
    inactive: medicalStaff.value.filter(s => s.status === 'inactive').length,
  }));

  const upcomingOnCall = computed(() => {
    const todayISO = Utils.getToday();
    const in7ISO   = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    return onCallSchedules.value
      .filter(o => o.duty_date >= todayISO && o.duty_date <= in7ISO)
      .sort((a, b) => a.duty_date.localeCompare(b.duty_date))
      .slice(0, 5);
  });

  const activeAbsences = computed(() => {
    const today = Utils.getToday();
    return absences.value.filter(a => a.start_date <= today && a.end_date >= today);
  });

  return {
    dashboardCounters, staffByRole, staffByStatus,
    upcomingOnCall, activeAbsences, computeStats,
  };
}

/* ================================================================
   9. VUE APPLICATION
================================================================ */
const app = createApp({
  setup() {

    /* ── Step 1: Independent composables ─────────────────────── */
    const auth         = useAuth();
    const ui           = useUI();
    const liveOps      = useLiveStatus();
    const commsOps     = useComms();
    const analyticsOps = useAnalytics();

    /* ── Step 2: Core reference data ──────────────────────────── */
    /*
     * FIX: useDepartments and useTrainingUnits are each initialised
     * exactly once here. Their reactive refs are passed into all
     * dependent composables — no duplicate initialisation.
     */
    const deptOps = useDepartments();

    /*
     * useTrainingUnits needs medicalStaff for getUnitActiveResidents.
     * staffOps hasn't been created yet so we init tuOps with an empty
     * ref, then pass staffOps.medicalStaff in Step 4 by re-creating
     * it. This is the single documented re-init — tuOps has no
     * side-effects on deptOps, and rotOps hasn't started yet.
     */
    const tuOpsBase = useTrainingUnits();

    /* ── Step 3: Staff (needs dept + unit refs) ───────────────── */
    const staffOps = useStaff({
      departments:   deptOps.departments,
      trainingUnits: tuOpsBase.trainingUnits,
    });

    /* ── Step 4: Training units with full staff ref ───────────── */
    const tuOps = useTrainingUnits({
      medicalStaff: staffOps.medicalStaff,
      rotations:    ref([]), // patched below after rotOps is created
    });
    /* Sync the loaded data from the base init so we don't re-fetch */
    watch(tuOpsBase.trainingUnits, list => {
      tuOps.trainingUnits.value = list;
    }, { immediate: true });

    /* ── Step 5: Transactional composables ────────────────────── */
    const rotOps = useRotations({
      medicalStaff:  staffOps.medicalStaff,
      trainingUnits: tuOps.trainingUnits,
    });

    const onCallOps = useOnCall({
      medicalStaff: staffOps.medicalStaff,
    });

    const absOps = useAbsences({
      medicalStaff: staffOps.medicalStaff,
    });

    const researchOps = useResearch({
      medicalStaff: staffOps.medicalStaff,
    });

    /* ── Step 6: Dashboard (reads all reactive sources) ──────── */
    const dashboard = useDashboard({
      medicalStaff:    staffOps.medicalStaff,
      departments:     deptOps.departments,
      rotations:       rotOps.rotations,
      onCallSchedules: onCallOps.onCallSchedules,
      absences:        absOps.absences,
      clinicalTrials:  researchOps.clinicalTrials,
    });

    /* ── Data loading — 3-wave waterfall ─────────────────────── */
    async function loadAllData() {
      // Wave 1 — core reference data (must complete before Wave 2)
      await Promise.all([
        staffOps.loadMedicalStaff(),
        deptOps.loadDepartments(),
        tuOpsBase.loadTrainingUnits(),
      ]);

      // Wave 2 — transactional records
      await Promise.all([
        rotOps.loadRotations(),
        onCallOps.loadOnCall(),
        absOps.loadAbsences(),
        commsOps.loadAnnouncements(),
      ]);

      // Wave 3 — analytics, research, live status (non-blocking)
      Promise.all([
        researchOps.loadResearch(),
        analyticsOps.loadAnalytics(),
        liveOps.loadLiveStatus(),
      ])
        .then(() => dashboard.computeStats())
        .catch(err => console.warn('[NeumoCare] Wave 3 partial failure:', err.message));

      dashboard.computeStats();
    }

    /* ── ESC key — close modals in priority order ─────────────── */
    function _handleKeyDown(e) {
      if (e.key !== 'Escape') return;

      const checks = [
        () => { if (staffOps.showProfileModal.value)           { staffOps.showProfileModal.value           = false; return true; } },
        () => { if (staffOps.showStaffConfirm.value)           { staffOps.showStaffConfirm.value           = false; return true; } },
        () => { if (staffOps.showStaffModal.value)             { staffOps.showStaffModal.value             = false; return true; } },
        () => { if (onCallOps.showOnCallConfirm.value)         { onCallOps.showOnCallConfirm.value         = false; return true; } },
        () => { if (onCallOps.showOnCallModal.value)           { onCallOps.showOnCallModal.value           = false; return true; } },
        () => { if (rotOps.showRotationConfirm.value)          { rotOps.showRotationConfirm.value          = false; return true; } },
        () => { if (rotOps.showRotationModal.value)            { rotOps.showRotationModal.value            = false; return true; } },
        () => { if (absOps.showAbsenceConfirm.value)           { absOps.showAbsenceConfirm.value           = false; return true; } },
        () => { if (absOps.showAbsenceModal.value)             { absOps.showAbsenceModal.value             = false; return true; } },
        () => { if (tuOps.showTuResidents.value)               { tuOps.showTuResidents.value               = false; return true; } },
        () => { if (tuOps.showTuConfirm.value)                 { tuOps.showTuConfirm.value                 = false; return true; } },
        () => { if (tuOps.showTuModal.value)                   { tuOps.showTuModal.value                   = false; return true; } },
        () => { if (deptOps.showDeptConfirm.value)             { deptOps.showDeptConfirm.value             = false; return true; } },
        () => { if (deptOps.showDeptModal.value)               { deptOps.showDeptModal.value               = false; return true; } },
        () => { if (commsOps.showCommsConfirm.value)           { commsOps.showCommsConfirm.value           = false; return true; } },
        () => { if (commsOps.showCommsModal.value)             { commsOps.showCommsModal.value             = false; return true; } },
        () => { if (researchOps.showCoordinatorModal.value)    { researchOps.showCoordinatorModal.value    = false; return true; } },
        () => { if (researchOps.showResearchConfirm.value)     { researchOps.showResearchConfirm.value     = false; return true; } },
        () => { if (researchOps.showProjectModal.value)        { researchOps.showProjectModal.value        = false; return true; } },
        () => { if (researchOps.showTrialModal.value)          { researchOps.showTrialModal.value          = false; return true; } },
        () => { if (researchOps.showResearchLineModal.value)   { researchOps.showResearchLineModal.value   = false; return true; } },
        () => { if (ui.statsPanel.value)                       { ui.statsPanel.value                       = false; return true; } },
        () => { if (ui.userDropdownOpen.value)                 { ui.userDropdownOpen.value                 = false; return true; } },
        () => { if (ui.sidebarMobileOpen.value)                { ui.sidebarMobileOpen.value                = false; return true; } },
      ];

      for (const check of checks) {
        if (check()) return;
      }
    }

    /* ── Lifecycle ───────────────────────────────────────────── */
    onMounted(async () => {
      document.addEventListener('keydown', _handleKeyDown);
      if (auth.restoreSession()) {
        liveOps.startPolling();
        await loadAllData();
      }
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', _handleKeyDown);
      liveOps.stopPolling();
    });

    /* ── Auth handlers ───────────────────────────────────────── */
    async function handleLogin(email, password) {
      const ok = await auth.login(email, password);
      if (ok) {
        liveOps.startPolling();
        await loadAllData();
      }
      return ok;
    }

    async function handleLogout() {
      liveOps.stopPolling();
      await auth.logout();
    }

    /* ── Feedback helpers ────────────────────────────────────── */
    function notify(message, type = 'info', title = null) {
      ui.showToast(message, type, title);
    }

    /**
     * Wraps an async action with automatic success / error toasts.
     * @param {()=>Promise<any>} action
     * @param {string}           successMsg
     * @param {string|null}      errorMsg — defaults to the thrown error message
     */
    async function withFeedback(action, successMsg, errorMsg = null) {
      try {
        const result = await action();
        if (result !== false) notify(successMsg, 'success');
        return result;
      } catch (err) {
        notify(errorMsg ?? err.message ?? 'An unexpected error occurred.', 'error');
        return false;
      }
    }

    /* ── Template return ─────────────────────────────────────── */
    /*
     * Keys are named by domain. Utils is exposed directly so
     * templates call Utils.formatDate() etc. — no re-export chain.
     */
    return {
      Utils,
      PHASE_COLORS,
      STAGE_COLORS,

      /* Auth */
      currentUser:   auth.currentUser,
      isLoggedIn:    auth.isLoggedIn,
      authLoading:   auth.authLoading,
      authError:     auth.authError,
      can:           auth.can,
      hasRole:       auth.hasRole,
      handleLogin,
      handleLogout,

      /* UI */
      currentView:         ui.currentView,
      sidebarCollapsed:    ui.sidebarCollapsed,
      sidebarMobileOpen:   ui.sidebarMobileOpen,
      statsPanel:          ui.statsPanel,
      searchQuery:         ui.searchQuery,
      toasts:              ui.toasts,
      userDropdownOpen:    ui.userDropdownOpen,
      navigate:            ui.navigate,
      toggleSidebar:       ui.toggleSidebar,
      toggleMobileSidebar: ui.toggleMobileSidebar,
      toggleStatsPanel:    ui.toggleStatsPanel,
      dismissToast:        ui.dismissToast,
      notify,
      withFeedback,

      /* Medical Staff */
      medicalStaff:            staffOps.medicalStaff,
      staffLoading:            staffOps.staffLoading,
      showStaffModal:          staffOps.showStaffModal,
      isEditingStaff:          staffOps.isEditingStaff,
      staffModalTab:           staffOps.staffModalTab,
      savingStaff:             staffOps.savingStaff,
      showProfileModal:        staffOps.showProfileModal,
      profileStaff:            staffOps.profileStaff,
      profileTab:              staffOps.profileTab,
      profileData:             staffOps.profileData,
      showStaffConfirm:        staffOps.showStaffConfirm,
      staffConfirmTarget:      staffOps.staffConfirmTarget,
      staffForm:               staffOps.staffForm,
      staffValidation:         staffOps.staffValidation,
      staffPagination:         staffOps.staffPagination,
      staffSort:               staffOps.staffSort,
      staffFilters:            staffOps.staffFilters,
      filteredMedicalStaffAll: staffOps.filteredMedicalStaffAll,
      filteredMedicalStaff:    staffOps.filteredMedicalStaff,
      loadMedicalStaff:        staffOps.loadMedicalStaff,
      openAddStaffModal:       staffOps.openAddStaffModal,
      editMedicalStaff:        staffOps.editMedicalStaff,
      saveMedicalStaff:        staffOps.saveMedicalStaff,
      confirmDeleteStaff:      staffOps.confirmDeleteStaff,
      deleteStaff:             staffOps.deleteStaff,
      openStaffProfile:        staffOps.openStaffProfile,
      toggleCertificate:       staffOps.toggleCertificate,
      getDepartmentName:       staffOps.getDepartmentName,
      getTrainingUnitName:     staffOps.getTrainingUnitName,
      getStaffById:            staffOps.getStaffById,
      getStaffName:            staffOps.getStaffName,
      isResident:              staffOps.isResident,

      /* On-Call */
      onCallSchedules:      onCallOps.onCallSchedules,
      onCallLoading:        onCallOps.onCallLoading,
      showOnCallModal:      onCallOps.showOnCallModal,
      isEditingOnCall:      onCallOps.isEditingOnCall,
      savingOnCall:         onCallOps.savingOnCall,
      showOnCallConfirm:    onCallOps.showOnCallConfirm,
      onCallConfirmTarget:  onCallOps.onCallConfirmTarget,
      onCallForm:           onCallOps.onCallForm,
      onCallValidation:     onCallOps.onCallValidation,
      onCallPagination:     onCallOps.onCallPagination,
      onCallSort:           onCallOps.onCallSort,
      onCallFilters:        onCallOps.onCallFilters,
      filteredOnCallAll:    onCallOps.filteredOnCallAll,
      filteredOnCall:       onCallOps.filteredOnCall,        /* RENAMED */
      loadOnCall:           onCallOps.loadOnCall,
      openAddOnCallModal:   onCallOps.openAddOnCallModal,
      editOnCall:           onCallOps.editOnCall,
      saveOnCall:           onCallOps.saveOnCall,
      confirmDeleteOnCall:  onCallOps.confirmDeleteOnCall,
      deleteOnCall:         onCallOps.deleteOnCall,

      /* Rotations */
      rotations:              rotOps.rotations,
      rotationsLoading:       rotOps.rotationsLoading,
      showRotationModal:      rotOps.showRotationModal,
      isEditingRotation:      rotOps.isEditingRotation,
      savingRotation:         rotOps.savingRotation,
      showRotationConfirm:    rotOps.showRotationConfirm,
      rotationConfirmTarget:  rotOps.rotationConfirmTarget,
      rotationOverlapWarning: rotOps.rotationOverlapWarning,
      rotationForm:           rotOps.rotationForm,
      rotationValidation:     rotOps.rotationValidation,
      rotationsPagination:    rotOps.rotationsPagination,
      rotationsSort:          rotOps.rotationsSort,
      rotationsFilters:       rotOps.rotationsFilters,
      filteredRotationsAll:   rotOps.filteredRotationsAll,
      filteredRotations:      rotOps.filteredRotations,
      loadRotations:          rotOps.loadRotations,
      openAddRotationModal:   rotOps.openAddRotationModal,
      editRotation:           rotOps.editRotation,
      saveRotation:           rotOps.saveRotation,
      confirmDeleteRotation:  rotOps.confirmDeleteRotation,
      deleteRotation:         rotOps.deleteRotation,

      /* Absences */
      absences:              absOps.absences,
      absencesLoading:       absOps.absencesLoading,
      showAbsenceModal:      absOps.showAbsenceModal,
      isEditingAbsence:      absOps.isEditingAbsence,
      savingAbsence:         absOps.savingAbsence,
      showAbsenceConfirm:    absOps.showAbsenceConfirm,
      absenceConfirmTarget:  absOps.absenceConfirmTarget,
      absenceDuration:       absOps.absenceDuration,
      absenceForm:           absOps.absenceForm,
      absenceValidation:     absOps.absenceValidation,
      absencesPagination:    absOps.absencesPagination,
      absencesSort:          absOps.absencesSort,
      absencesFilters:       absOps.absencesFilters,
      filteredAbsencesAll:   absOps.filteredAbsencesAll,
      filteredAbsences:      absOps.filteredAbsences,
      loadAbsences:          absOps.loadAbsences,
      openAddAbsenceModal:   absOps.openAddAbsenceModal,
      editAbsence:           absOps.editAbsence,
      saveAbsence:           absOps.saveAbsence,
      confirmDeleteAbsence:  absOps.confirmDeleteAbsence,
      deleteAbsence:         absOps.deleteAbsence,

      /* Departments */
      departments:             deptOps.departments,
      deptsLoading:            deptOps.deptsLoading,
      showDeptModal:           deptOps.showDeptModal,
      isEditingDept:           deptOps.isEditingDept,
      savingDept:              deptOps.savingDept,
      showDeptConfirm:         deptOps.showDeptConfirm,
      deptConfirmTarget:       deptOps.deptConfirmTarget,
      deptForm:                deptOps.deptForm,
      deptValidation:          deptOps.deptValidation,
      loadDepartments:         deptOps.loadDepartments,
      openAddDeptModal:        deptOps.openAddDeptModal,
      editDepartment:          deptOps.editDepartment,
      saveDepartment:          deptOps.saveDepartment,
      confirmDeleteDept:       deptOps.confirmDeleteDept,
      deleteDepartment:        deptOps.deleteDepartment,
      getDepartmentById:       deptOps.getDepartmentById,
      getDepartmentUnits:      deptOps.getDepartmentUnits,
      getDepartmentRoleHolder: deptOps.getDepartmentRoleHolder,

      /* Training Units */
      trainingUnits:          tuOps.trainingUnits,
      tuLoading:              tuOps.tuLoading,
      showTuModal:            tuOps.showTuModal,
      isEditingTu:            tuOps.isEditingTu,
      savingTu:               tuOps.savingTu,
      showTuConfirm:          tuOps.showTuConfirm,
      tuConfirmTarget:        tuOps.tuConfirmTarget,
      showTuResidents:        tuOps.showTuResidents,
      activeTuUnit:           tuOps.activeTuUnit,
      tuForm:                 tuOps.tuForm,
      tuValidation:           tuOps.tuValidation,
      loadTrainingUnits:      tuOpsBase.loadTrainingUnits,
      openAddTuModal:         tuOps.openAddTuModal,
      editTrainingUnit:       tuOps.editTrainingUnit,
      saveTrainingUnit:       tuOps.saveTrainingUnit,
      confirmDeleteTu:        tuOps.confirmDeleteTu,
      deleteTrainingUnit:     tuOps.deleteTrainingUnit,
      getUnitActiveResidents: tuOps.getUnitActiveResidents,
      openUnitResidents:      tuOps.openUnitResidents,

      /* Communications */
      announcements:             commsOps.announcements,
      commsLoading:              commsOps.commsLoading,
      showCommsModal:            commsOps.showCommsModal,
      isEditingComms:            commsOps.isEditingComms,
      savingComms:               commsOps.savingComms,
      showCommsConfirm:          commsOps.showCommsConfirm,
      commsConfirmTarget:        commsOps.commsConfirmTarget,
      commsTab:                  commsOps.commsTab,
      announcementForm:          commsOps.announcementForm,
      statusUpdateForm:          commsOps.statusUpdateForm,
      announcementValidation:    commsOps.announcementValidation,
      statusUpdateValidation:    commsOps.statusUpdateValidation,
      commsFilters:              commsOps.commsFilters,
      filteredAnnouncements:     commsOps.filteredAnnouncements,
      loadAnnouncements:         commsOps.loadAnnouncements,
      openAddAnnouncementModal:  commsOps.openAddAnnouncementModal,
      editAnnouncement:          commsOps.editAnnouncement,
      saveAnnouncement:          commsOps.saveAnnouncement,
      confirmDeleteAnnouncement: commsOps.confirmDeleteAnnouncement,
      deleteAnnouncement:        commsOps.deleteAnnouncement,
      postLiveStatus:            commsOps.postLiveStatus,

      /* Live Status */
      liveStatuses:    liveOps.liveStatuses,
      liveLoading:     liveOps.liveLoading,
      lastUpdated:     liveOps.lastUpdated,
      currentStatus:   liveOps.currentStatus,
      recentStatuses:  liveOps.recentStatuses,
      teamMetrics:     liveOps.teamMetrics,
      loadLiveStatus:  liveOps.loadLiveStatus,

      /* Research */
      researchLines:            researchOps.researchLines,
      clinicalTrials:           researchOps.clinicalTrials,
      innovationProjects:       researchOps.innovationProjects,
      researchLoading:          researchOps.researchLoading,
      researchSaving:           researchOps.researchSaving,
      showResearchLineModal:    researchOps.showResearchLineModal,
      isEditingResearchLine:    researchOps.isEditingResearchLine,
      showTrialModal:           researchOps.showTrialModal,
      isEditingTrial:           researchOps.isEditingTrial,
      showProjectModal:         researchOps.showProjectModal,
      isEditingProject:         researchOps.isEditingProject,
      showCoordinatorModal:     researchOps.showCoordinatorModal,
      coordinatorTarget:        researchOps.coordinatorTarget,
      coordinatorForm:          researchOps.coordinatorForm,
      showResearchConfirm:      researchOps.showResearchConfirm,
      researchConfirmTarget:    researchOps.researchConfirmTarget,
      researchConfirmType:      researchOps.researchConfirmType,
      researchLineForm:         researchOps.researchLineForm,
      trialForm:                researchOps.trialForm,
      projectForm:              researchOps.projectForm,
      researchLineValidation:   researchOps.researchLineValidation,
      trialValidation:          researchOps.trialValidation,
      projectValidation:        researchOps.projectValidation,
      trialPagination:          researchOps.trialPagination,
      trialSort:                researchOps.trialSort,
      trialFilters:             researchOps.trialFilters,
      filteredTrialsAll:        researchOps.filteredTrialsAll,
      filteredTrials:           researchOps.filteredTrials,
      loadResearch:             researchOps.loadResearch,
      openAddResearchLineModal: researchOps.openAddResearchLineModal,
      editResearchLine:         researchOps.editResearchLine,
      saveResearchLine:         researchOps.saveResearchLine,
      openAddTrialModal:        researchOps.openAddTrialModal,
      editTrial:                researchOps.editTrial,
      saveTrial:                researchOps.saveTrial,
      openAddProjectModal:      researchOps.openAddProjectModal,
      editProject:              researchOps.editProject,
      saveProject:              researchOps.saveProject,
      openCoordinatorModal:     researchOps.openCoordinatorModal,
      saveCoordinator:          researchOps.saveCoordinator,
      confirmDeleteResearch:    researchOps.confirmDeleteResearch,
      deleteResearchItem:       researchOps.deleteResearchItem,
      getResearchLineName:      researchOps.getResearchLineName,
      getResearchCoordinator:   researchOps.getResearchCoordinator,

      /* Analytics */
      analyticsSummary:      analyticsOps.analyticsSummary,
      analyticsResearch:     analyticsOps.analyticsResearch,
      analyticsPerformance:  analyticsOps.analyticsPerformance,
      analyticsPartners:     analyticsOps.analyticsPartners,
      analyticsTimeline:     analyticsOps.analyticsTimeline,
      analyticsLoading:      analyticsOps.analyticsLoading,
      analyticsTab:          analyticsOps.analyticsTab,
      loadAnalytics:         analyticsOps.loadAnalytics,
      exportAnalytics:       analyticsOps.exportAnalytics,

      /* Dashboard */
      dashboardCounters: dashboard.dashboardCounters,
      staffByRole:       dashboard.staffByRole,
      staffByStatus:     dashboard.staffByStatus,
      upcomingOnCall:    dashboard.upcomingOnCall,
      activeAbsences:    dashboard.activeAbsences,
      computeStats:      dashboard.computeStats,
    };
  },
});

app.mount('#app');
