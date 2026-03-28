// stores.js - All Pinia Stores
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { API } from './api.js'
import { Utils } from './utils.js'
import {
  PERMISSION_MATRIX,
  ABSENCE_REASON_LABELS,
  ROTATION_STATUS_LABELS,
  PROJECT_STAGES,
  STAFF_TYPE_LABELS_FALLBACK,
  STAFF_TYPE_CLASSES_FALLBACK,
  ACADEMIC_DEGREES_FALLBACK
} from './config.js'

// ── Module-level staff type state shared across stores ──────────────────────
const staffTypesList = ref([])
const staffTypeMap   = ref({})
const academicDegrees = ref(ACADEMIC_DEGREES_FALLBACK)

const formatStaffTypeGlobal   = (key) => staffTypeMap.value[key]?.display_name || STAFF_TYPE_LABELS_FALLBACK[key] || key
const getStaffTypeClassGlobal = (key) => staffTypeMap.value[key]?.badge_class   || STAFF_TYPE_CLASSES_FALLBACK[key] || 'badge-secondary'
const isResidentTypeGlobal    = (key) => staffTypeMap.value[key]?.is_resident_type ?? (key === 'medical_resident')

// ============================================================
// UI STORE
// ============================================================
export const useUIStore = defineStore('ui', {
  state: () => ({
    toasts: [],
    sidebarCollapsed: false,
    mobileMenuOpen: false,
    userMenuOpen: false,
    statsSidebarOpen: false,
    searchResultsOpen: false,
    globalSearchQuery: '',
    currentView: 'dashboard',
    systemAlerts: [],
    confirmationModal: {
      show: false, title: '', message: '', icon: 'fa-question-circle',
      confirmButtonText: 'Confirm', confirmButtonClass: 'btn-primary',
      cancelButtonText: 'Cancel', onConfirm: null, details: ''
    }
  }),
  getters: {
    activeAlertsCount: (state) => state.systemAlerts.filter(a => !a.status || a.status === 'active').length
  },
  actions: {
    showToast(title, message, type = 'info', duration = 5000) {
      const icons = { info: 'fas fa-info-circle', success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle' }
      const toast = { id: Date.now(), title, message, type, icon: icons[type], duration }
      this.toasts.push(toast)
      if (duration > 0) setTimeout(() => this.removeToast(toast.id), duration)
    },
    removeToast(id) {
      const i = this.toasts.findIndex(t => t.id === id)
      if (i > -1) this.toasts.splice(i, 1)
    },
    showConfirmation(opts) { Object.assign(this.confirmationModal, { show: true, ...opts }) },
    async confirmAction() {
      if (this.confirmationModal.onConfirm) {
        try { await this.confirmationModal.onConfirm() } catch (e) { this.showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
      }
      this.confirmationModal.show = false
    },
    cancelConfirmation() { this.confirmationModal.show = false },
    dismissAlert(id) { const i = this.systemAlerts.findIndex(a => a.id === id); if (i > -1) this.systemAlerts.splice(i, 1) },
    toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed },
    toggleStatsSidebar() { this.statsSidebarOpen = !this.statsSidebarOpen },
    setCurrentView(view) { this.currentView = view; this.mobileMenuOpen = false },
    addAlert(message, priority = 'normal') {
      this.systemAlerts.push({ id: Date.now(), message, priority, status: 'active', created_at: new Date().toISOString() })
    }
  }
})

// ============================================================
// USER STORE
// ============================================================
export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    loginForm: { email: '', password: '', remember_me: false },
    loginLoading: false,
    loginError: '',
    loginFieldErrors: { email: '', password: '' }
  }),
  getters: {
    isLoggedIn: (state) => !!state.currentUser,
    userRole:     (state) => state.currentUser?.user_role,
    userFullName: (state) => state.currentUser?.full_name,
    userEmail:    (state) => state.currentUser?.email,
    hasPermission: (state) => (module, action = 'read') => {
      const role = state.currentUser?.user_role
      if (!role) return false
      if (role === 'system_admin') return true
      return PERMISSION_MATRIX[role]?.[module]?.includes(action) ?? false
    }
  },
  actions: {
    async login() {
      this.loginFieldErrors.email    = !this.loginForm.email    ? 'Email required'    : ''
      this.loginFieldErrors.password = !this.loginForm.password ? 'Password required' : ''
      if (this.loginFieldErrors.email || this.loginFieldErrors.password) {
        this.loginError = 'Please fill all required fields'; return false
      }
      this.loginLoading = true; this.loginError = ''
      try {
        const response = await API.login(this.loginForm.email, this.loginForm.password)
        this.currentUser = response.user
        localStorage.setItem('neumocare_user', JSON.stringify(response.user))
        useUIStore().showToast('Success', `Welcome, ${response.user.full_name}!`, 'success')
        return true
      } catch (e) {
        this.loginError = e.message || 'Invalid email or password'
        useUIStore().showToast('Error', 'Login failed', 'error')
        return false
      } finally { this.loginLoading = false }
    },
    async logout() {
      try { await API.logout() } finally {
        this.currentUser = null
        useUIStore().showToast('Info', 'Logged out successfully', 'info')
      }
    },
    clearLoginError(field) {
      if (field === 'email')    this.loginFieldErrors.email    = ''
      if (field === 'password') this.loginFieldErrors.password = ''
      this.loginError = ''
    }
  }
})

// ============================================================
// STAFF STORE
// ============================================================
export const useStaffStore = defineStore('staff', {
  state: () => ({
    medicalStaff:   [],
    allStaffLookup: [],
    hospitalsList:  [],
    clinicalUnits:  [],
    staffFilters: { search: '', staffType: '', department: '', status: '', residentCategory: '', hospital: '', networkType: '' },
    staffView: 'table',
    pagination: { page: 1, size: 15 },
    sortField: 'full_name',
    sortDir: 'asc',
    staffProfileModal: {
      show: false, staff: null, activeTab: 'activity', collapsed: {},
      researchProfile: null, supervisionData: null, leaveBalance: null,
      loadingResearch: false, loadingSupervision: false, loadingLeave: false
    },
    medicalStaffModal: {
      show: false, mode: 'add', activeTab: 'basic',
      _addingHospital: false, _newHospitalName: '', _newHospitalNetwork: 'external',
      _certs: [], _addingCert: false, _newCert: { name: '', issued_month: '', renewal_months: 24 },
      _addingStaffType: false, _newStaffTypeName: '', _newStaffTypeIsResident: false, _savingStaffType: false,
      form: {}
    }
  }),
  getters: {
    filteredMedicalStaffAll: (state) => {
      let f = state.medicalStaff
      if (state.staffFilters.search) { const q = state.staffFilters.search.toLowerCase(); f = f.filter(x => x.full_name?.toLowerCase().includes(q) || x.professional_email?.toLowerCase().includes(q)) }
      if (state.staffFilters.staffType)        f = f.filter(x => x.staff_type         === state.staffFilters.staffType)
      if (state.staffFilters.department)       f = f.filter(x => x.department_id      === state.staffFilters.department)
      if (state.staffFilters.status)           f = f.filter(x => x.employment_status  === state.staffFilters.status)
      if (state.staffFilters.residentCategory) f = f.filter(x => x.resident_category  === state.staffFilters.residentCategory)
      if (state.staffFilters.hospital)         f = f.filter(x => x.hospital_id        === state.staffFilters.hospital)
      if (state.staffFilters.networkType) {
        // filter via hospitalsList ref — need to use getter trick
        const ids = state.hospitalsList.filter(h => h.parent_complex === state.staffFilters.networkType).map(h => h.id)
        f = f.filter(x => ids.includes(x.hospital_id))
      }
      const { sortField: field, sortDir: dir } = state
      return [...f].sort((a, b) => {
        const va = a[field] ?? '', vb = b[field] ?? ''
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return dir === 'asc' ? cmp : -cmp
      })
    },
    filteredMedicalStaff: (state) => {
      const start = (state.pagination.page - 1) * state.pagination.size
      return state.filteredMedicalStaffAll.slice(start, start + state.pagination.size)
    },
    staffTotalPages: (state) => Math.max(1, Math.ceil(state.filteredMedicalStaffAll.length / state.pagination.size)),
    hasActiveStaffFilters: (state) => !!(state.staffFilters.search || state.staffFilters.staffType || state.staffFilters.department || state.staffFilters.status || state.staffFilters.residentCategory || state.staffFilters.hospital || state.staffFilters.networkType),
    compactStaffWithDividers: (state) => {
      const staff = state.filteredMedicalStaff
      const attendings = staff.filter(s => !isResidentTypeGlobal(s.staff_type))
      const residents  = staff.filter(s =>  isResidentTypeGlobal(s.staff_type))
      const result = []
      if (attendings.length) { result.push({ _divider: `Attending Physicians · ${attendings.length}` }); result.push(...attendings) }
      if (residents.length)  { result.push({ _divider: `Medical Residents · ${residents.length}` });   result.push(...residents) }
      return result
    },
    availablePhysicians: (state) => state.medicalStaff.filter(s => s.employment_status === 'active'),
    availableAttendings: (state) => state.medicalStaff.filter(s => s.employment_status === 'active' && s.staff_type === 'attending_physician'),
    availableResidents:  (state) => state.medicalStaff.filter(s => s.employment_status === 'active' && isResidentTypeGlobal(s.staff_type)),
    // Expose module-level refs as getters for template access
    staffTypesList:   () => staffTypesList.value,
    staffTypeMap:     () => staffTypeMap.value,
    academicDegrees:  () => academicDegrees.value
  },
  actions: {
    async loadStaff() {
      try {
        const [raw, hospitals] = await Promise.all([API.getList('/api/medical-staff'), API.getHospitals()])
        this.allStaffLookup = raw.map(s => ({ id: s.id, full_name: s.full_name, staff_type: s.staff_type, employment_status: s.employment_status }))
        this.hospitalsList  = hospitals
        this.medicalStaff   = await API.getMedicalStaff()
        await this.loadStaffTypes()
      } catch { useUIStore().showToast('Error', 'Failed to load medical staff', 'error') }
    },
    async loadStaffTypes(includeInactive = false) {
      try {
        const raw = await API.getStaffTypes(includeInactive)
        staffTypesList.value = raw
        const map = {}; raw.forEach(t => { map[t.type_key] = t }); staffTypeMap.value = map
      } catch { console.error('Failed to load staff types') }
    },
    async loadAcademicDegrees() {
      try { const data = await API.getAcademicDegrees(); academicDegrees.value = data.length ? data : ACADEMIC_DEGREES_FALLBACK }
      catch { academicDegrees.value = ACADEMIC_DEGREES_FALLBACK }
    },
    async createStaff(data) {
      const newStaff = await API.createMedicalStaff(data)
      this.medicalStaff.unshift(newStaff)
      this.allStaffLookup.unshift({ id: newStaff.id, full_name: newStaff.full_name, staff_type: newStaff.staff_type, employment_status: newStaff.employment_status })
      useUIStore().showToast('Success', 'Medical staff added', 'success')
      return newStaff
    },
    async updateStaff(id, data) {
      const updated = await API.updateMedicalStaff(id, data)
      const idx = this.medicalStaff.findIndex(s => s.id === id)
      if (idx !== -1) this.medicalStaff[idx] = updated
      const lidx = this.allStaffLookup.findIndex(s => s.id === id)
      if (lidx !== -1) this.allStaffLookup[lidx] = { id: updated.id, full_name: updated.full_name, staff_type: updated.staff_type, employment_status: updated.employment_status }
      useUIStore().showToast('Success', 'Medical staff updated', 'success')
      return updated
    },
    async deleteStaff(id) {
      await API.deleteMedicalStaff(id)
      this.medicalStaff   = this.medicalStaff.filter(s => s.id !== id)
      useUIStore().showToast('Success', 'Staff member deactivated', 'success')
    },
    async addHospitalInline(name, networkType = 'external') {
      if (!name?.trim()) return null
      try {
        const result = await API.createHospital({ name: name.trim(), network_type: networkType })
        if (result?.success && result.data) {
          this.hospitalsList = [...this.hospitalsList, result.data].sort((a, b) => a.name.localeCompare(b.name))
          useUIStore().showToast('Success', `Hospital "${result.data.name}" added`, 'success')
          return result.data
        }
        return null
      } catch { useUIStore().showToast('Error', 'Failed to add hospital', 'error'); return null }
    },
    async addStaffTypeInline(name, isResident = false) {
      if (!name?.trim()) { useUIStore().showToast('Required', 'Please enter a staff type name', 'warning'); return null }
      const typeKey = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 60)
      if (!typeKey) { useUIStore().showToast('Invalid', 'Name must contain letters or numbers', 'warning'); return null }
      try {
        await API.createStaffType({ type_key: typeKey, display_name: name, badge_class: 'badge-secondary', is_resident_type: isResident, can_supervise: false, is_active: true, display_order: staffTypesList.value.length * 10 })
        await this.loadStaffTypes()
        useUIStore().showToast('Success', `Staff type "${name}" created`, 'success')
        return typeKey
      } catch (e) { useUIStore().showToast('Error', e?.message || 'Failed to create staff type', 'error'); return null }
    },
    async loadStaffCertificates(staffId) {
      try { this.medicalStaffModal._certs = await API.getStaffCertificates(staffId) }
      catch { this.medicalStaffModal._certs = [] }
    },
    async saveCertificate(staffId, cert) {
      await API.createStaffCertificate(staffId, { certificate_name: cert.name.trim(), issued_date: cert.issued_month ? cert.issued_month + '-01' : null, renewal_months: cert.renewal_months || 24 })
      await this.loadStaffCertificates(staffId)
      useUIStore().showToast('Saved', 'Certificate added', 'success')
    },
    async deleteCertificate(staffId, certId) {
      await API.deleteStaffCertificate(staffId, certId)
      await this.loadStaffCertificates(staffId)
      useUIStore().showToast('Removed', 'Certificate removed', 'success')
    },
    getStaffName(id) {
      if (!id) return 'Not assigned'
      const s = this.allStaffLookup.find(x => x.id === id) || this.medicalStaff.find(x => x.id === id)
      return s?.full_name || 'Not assigned'
    },
    formatStaffType(key)       { return formatStaffTypeGlobal(key) },
    getStaffTypeClass(key)     { return getStaffTypeClassGlobal(key) },
    isResidentType(key)        { return isResidentTypeGlobal(key) },
    formatStaffTypeShort(key)  {
      const short = { attending_physician: 'Attending', medical_resident: 'Resident', fellow: 'Fellow', nurse_practitioner: 'NP', administrator: 'Admin' }
      return short[key] || (staffTypeMap.value[key]?.display_name?.split(' ')[0]) || key?.replace(/_/g, ' ') || key
    },
    formatEmploymentStatus(s)  { return { active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' }[s] || s },
    setStaffFilter(key, value) { this.staffFilters[key] = value; this.pagination.page = 1 },
    clearStaffFilters()        { Object.keys(this.staffFilters).forEach(k => { this.staffFilters[k] = k === 'hideReturned' ? true : '' }); this.pagination.page = 1 },
    goToPage(page)             { this.pagination.page = Math.max(1, Math.min(page, this.staffTotalPages)) },
    sortBy(field)              { this.sortDir = this.sortField === field && this.sortDir === 'asc' ? 'desc' : 'asc'; this.sortField = field }
  }
})

// ============================================================
// ROTATION STORE
// ============================================================
export const useRotationStore = defineStore('rotations', {
  state: () => ({
    rotations: [],
    rotationFilters: { resident: '', status: '', trainingUnit: '', supervisor: '', search: '' },
    pagination: { page: 1, size: 15 },
    sortField: 'start_date',
    sortDir: 'desc',
    rotationModal: { show: false, mode: 'add', checkingAvailability: false, availability: null, form: {} },
    rotationViewModal: { show: false, rotation: null },
    activationModal: { show: false, rotations: [], selectedRotation: null, notes: '', action: 'activate' },
    monthHorizon: 6,
    monthOffset: 0
  }),
  getters: {
    filteredRotationsAll: (state) => {
      let f = state.rotations
      if (state.rotationFilters.resident)    f = f.filter(r => r.resident_id        === state.rotationFilters.resident)
      if (state.rotationFilters.status)      f = f.filter(r => r.rotation_status    === state.rotationFilters.status)
      if (state.rotationFilters.trainingUnit)f = f.filter(r => r.training_unit_id   === state.rotationFilters.trainingUnit)
      if (state.rotationFilters.supervisor)  f = f.filter(r => r.supervising_attending_id === state.rotationFilters.supervisor)
      if (state.rotationFilters.search) {
        const staffStore = useStaffStore(); const q = state.rotationFilters.search.toLowerCase()
        f = f.filter(r => staffStore.getStaffName(r.resident_id).toLowerCase().includes(q))
      }
      const { sortField: field, sortDir: dir } = state
      return [...f].sort((a, b) => {
        let va = a[field] ?? '', vb = b[field] ?? ''
        if (field === 'start_date' || field === 'end_date') { va = Utils.normalizeDate(va); vb = Utils.normalizeDate(vb) }
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return dir === 'asc' ? cmp : -cmp
      })
    },
    filteredRotations: (state) => {
      const start = (state.pagination.page - 1) * state.pagination.size
      return state.filteredRotationsAll.slice(start, start + state.pagination.size)
    },
    rotationTotalPages: (state) => Math.max(1, Math.ceil(state.filteredRotationsAll.length / state.pagination.size)),
    activeRotations:    (state) => state.rotations.filter(r => r.rotation_status === 'active').length,
    scheduledRotations: (state) => state.rotations.filter(r => r.rotation_status === 'scheduled').length,
    residentsWithRotations: (state) => {
      const staffStore = useStaffStore()
      return staffStore.medicalStaff
        .filter(s => staffStore.isResidentType(s.staff_type) && s.employment_status === 'active')
        .map(resident => {
          const sorted = [...state.rotations.filter(r => r.resident_id === resident.id)].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
          return { ...resident, allRotations: sorted, currentRotation: sorted.find(r => r.rotation_status === 'active'), upcomingRotations: sorted.filter(r => r.rotation_status === 'scheduled'), pastRotations: sorted.filter(r => r.rotation_status === 'completed') }
        })
    },
    residentGapWarnings: (state) => {
      const staffStore = useStaffStore(); const today = new Date(); const warnings = []
      for (const resident of staffStore.medicalStaff.filter(s => staffStore.isResidentType(s.staff_type) && s.employment_status === 'active')) {
        const gaps = []
        for (let i = 0; i < 3; i++) {
          const mStart = new Date(today.getFullYear(), today.getMonth() + i, 1)
          const mEnd   = new Date(today.getFullYear(), today.getMonth() + i + 1, 0)
          const covered = state.rotations.some(r => r.resident_id === resident.id && ['active', 'scheduled'].includes(r.rotation_status) && new Date(r.start_date) <= mEnd && new Date(r.end_date) >= mStart)
          if (!covered) gaps.push(mStart.toLocaleDateString('es-ES', { month: 'short' }))
        }
        if (gaps.length) warnings.push({ id: resident.id, name: resident.full_name, year: resident.training_year, gaps, gapCount: gaps.length })
      }
      return warnings.sort((a, b) => b.gapCount - a.gapCount)
    }
  },
  actions: {
    async loadRotations() {
      try {
        const raw = await API.getRotations()
        this.rotations = raw.map(r => ({ ...r, start_date: Utils.normalizeDate(r.start_date), end_date: Utils.normalizeDate(r.end_date) }))
      } catch { useUIStore().showToast('Error', 'Failed to load rotations', 'error') }
    },
    async createRotation(data) {
      const created = await API.createRotation(data)
      this.rotations.push({ ...created, start_date: Utils.normalizeDate(created.start_date), end_date: Utils.normalizeDate(created.end_date) })
      useUIStore().showToast('Success', 'Rotation created', 'success')
      return created
    },
    async updateRotation(id, data) {
      const updated = await API.updateRotation(id, data)
      const idx = this.rotations.findIndex(r => r.id === id)
      if (idx !== -1) this.rotations[idx] = { ...updated, start_date: Utils.normalizeDate(updated.start_date), end_date: Utils.normalizeDate(updated.end_date) }
      useUIStore().showToast('Success', 'Rotation updated', 'success')
      return updated
    },
    async deleteRotation(id) {
      await API.deleteRotation(id)
      const idx = this.rotations.findIndex(r => r.id === id)
      if (idx !== -1) this.rotations[idx].rotation_status = 'terminated_early'
      useUIStore().showToast('Success', 'Rotation terminated', 'success')
    },
    async checkRotationAvailability(params) {
      return API.checkRotationAvailability(params)
    },
    formatRotationStatus(status) { return ROTATION_STATUS_LABELS[status] || status },
    getDaysRemaining(endDate)    { return Utils.daysUntil(endDate) },
    getDaysUntilStart(startDate) { return Utils.daysUntil(startDate) },
    setRotationFilter(key, value){ this.rotationFilters[key] = value; this.pagination.page = 1 },
    sortBy(field)                { this.sortDir = this.sortField === field && this.sortDir === 'asc' ? 'desc' : 'asc'; this.sortField = field },
    goToPage(page)               { this.pagination.page = Math.max(1, Math.min(page, this.rotationTotalPages)) },
    getHorizonMonths(n, offset) {
      const today = new Date(); const months = []
      for (let i = 0; i < n; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + offset + i, 1)
        months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('es-ES', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), isCurrent: d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth(), daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() })
      }
      return months
    },
    getHorizonRangeLabel() {
      const months = this.getHorizonMonths(this.monthHorizon, this.monthOffset); if (!months.length) return ''
      const first = months[0], last = months[months.length - 1]
      return first.year === last.year ? `${first.label} – ${last.label} ${last.year}` : `${first.label} ${first.year} – ${last.label} ${last.year}`
    },
    getResidentRotationsInHorizon(resident) {
      const months = this.getHorizonMonths(this.monthHorizon, this.monthOffset); const n = months.length; if (!n) return []
      const horizonStart = new Date(months[0].year, months[0].month, 1)
      const horizonEnd   = new Date(months[n-1].year, months[n-1].month + 1, 0)
      return this.rotations.filter(r => r.resident_id === resident.id && ['active', 'scheduled', 'completed'].includes(r.rotation_status) && new Date(r.start_date) <= horizonEnd && new Date(r.end_date) >= horizonStart)
    },
    getRotationBarStyle(rotation) {
      const months = this.getHorizonMonths(this.monthHorizon, this.monthOffset); const n = months.length; if (!n) return { display: 'none' }
      const horizonStart = new Date(months[0].year, months[0].month, 1)
      const horizonEnd   = new Date(months[n-1].year, months[n-1].month + 1, 0)
      const rotStart = new Date(rotation.start_date + 'T00:00:00')
      const rotEnd   = new Date(rotation.end_date   + 'T00:00:00')
      const cs = rotStart < horizonStart ? horizonStart : rotStart
      const ce = rotEnd   > horizonEnd   ? horizonEnd   : rotEnd
      if (cs > ce) return { display: 'none' }
      const totalDays   = months.reduce((s, m) => s + m.daysInMonth, 0)
      const daysToStart = Math.round((cs - horizonStart) / 86400000)
      const daysToEnd   = Math.round((ce - horizonStart) / 86400000) + 1
      const leftPct     = (daysToStart / totalDays) * 100
      const widthPct    = ((daysToEnd - daysToStart) / totalDays) * 100
      return { left: `calc(${leftPct.toFixed(2)}% + 3px)`, width: `calc(${widthPct.toFixed(2)}% - 6px)` }
    },
    rotationStartsInHorizon(rotation) {
      const months = this.getHorizonMonths(this.monthHorizon, this.monthOffset); if (!months.length) return false
      return new Date(rotation.start_date + 'T00:00:00') >= new Date(months[0].year, months[0].month, 1)
    },
    rotationEndsInHorizon(rotation) {
      const months = this.getHorizonMonths(this.monthHorizon, this.monthOffset); if (!months.length) return false
      const n = months.length
      return new Date(rotation.end_date + 'T00:00:00') <= new Date(months[n-1].year, months[n-1].month + 1, 0)
    }
  }
})

// ============================================================
// TRAINING STORE
// ============================================================
export const useTrainingStore = defineStore('training', {
  state: () => ({
    trainingUnits: [],
    trainingUnitFilters: { search: '', department: '', status: '' },
    trainingUnitModal: { show: false, mode: 'add', form: {} },
    unitResidentsModal: { show: false, unit: null, rotations: [] },
    unitCliniciansModal: { show: false, unit: null, clinicians: [], supervisorId: '', allStaff: [] },
    trainingUnitView: 'timeline',
    trainingUnitHorizon: 6,
    tlPopover: { show: false, unitName: '', slotIdx: 0, monthLabel: '', entries: [], x: 0, y: 0 },
    occupancyPanel: { show: false },
    unitDetailDrawer: { show: false, unit: null }
  }),
  getters: {
    filteredTrainingUnits: (state) => {
      let f = state.trainingUnits
      if (state.trainingUnitFilters.search)     { const q = state.trainingUnitFilters.search.toLowerCase(); f = f.filter(u => u.unit_name?.toLowerCase().includes(q)) }
      if (state.trainingUnitFilters.department) f = f.filter(u => u.department_id === state.trainingUnitFilters.department)
      if (state.trainingUnitFilters.status)     f = f.filter(u => u.unit_status   === state.trainingUnitFilters.status)
      return f
    },
    occupancyPanelUnits() {
      const today = new Date()
      return this.trainingUnits.filter(u => u.unit_status === 'active').map(u => ({
        ...u,
        occ: this.getUnitMonthOccupancy(u.id, today.getFullYear(), today.getMonth()),
        nextFree: this.getNextFreeMonth(u.id)
      })).sort((a, b) => {
        const order = { free: 0, closing: 1, partial: 2, occupied: 3 }
        const diff = (order[a.occ?.status] ?? 4) - (order[b.occ?.status] ?? 4)
        return diff !== 0 ? diff : (a.nextFree?.monthsAway ?? 99) - (b.nextFree?.monthsAway ?? 99)
      })
    }
  },
  actions: {
    async loadTrainingUnits() {
      try { this.trainingUnits = await API.getTrainingUnits() }
      catch { useUIStore().showToast('Error', 'Failed to load training units', 'error') }
    },
    async createTrainingUnit(data) {
      const created = await API.createTrainingUnit(data); this.trainingUnits.push(created)
      useUIStore().showToast('Success', 'Training unit created', 'success'); return created
    },
    async updateTrainingUnit(id, data) {
      const updated = await API.updateTrainingUnit(id, data)
      const idx = this.trainingUnits.findIndex(u => u.id === id); if (idx !== -1) this.trainingUnits[idx] = updated
      return updated
    },
    async deleteTrainingUnit(id) {
      await API.deleteTrainingUnit(id); this.trainingUnits = this.trainingUnits.filter(u => u.id !== id)
    },
    getTrainingUnitName(id) { return this.trainingUnits.find(u => u.id === id)?.unit_name || 'Not assigned' },
    getUnitActiveRotationCount(id) {
      const rotStore = useRotationStore(); const today = new Date()
      return rotStore.rotations.filter(r => r.training_unit_id === id && r.rotation_status === 'active' && new Date(r.start_date) <= today && new Date(r.end_date) >= today).length
    },
    getUnitRotations(id) {
      return useRotationStore().rotations.filter(r => r.training_unit_id === id && ['active', 'scheduled'].includes(r.rotation_status))
    },
    getUnitScheduledCount(id) {
      const today = new Date()
      return useRotationStore().rotations.filter(r => r.training_unit_id === id && r.rotation_status === 'scheduled' && new Date(r.start_date) > today).length
    },
    getUnitOverlapWarning(id) {
      const unit = this.trainingUnits.find(u => u.id === id); if (!unit) return null
      const upcoming = useRotationStore().rotations.filter(r => r.training_unit_id === id && ['active', 'scheduled'].includes(r.rotation_status))
      for (const rot of upcoming) {
        const checkDate = new Date(rot.start_date)
        const concurrent = upcoming.filter(r => new Date(r.start_date) <= checkDate && new Date(r.end_date) >= checkDate).length
        if (concurrent > unit.maximum_residents) return { date: rot.start_date, concurrent, max: unit.maximum_residents }
      }
      return null
    },
    getUnitMonthOccupancy(unitId, year, month) {
      const unit = this.trainingUnits.find(u => u.id === unitId); if (!unit) return { status: 'free', occupied: 0, total: 0 }
      const maxSlots = unit.maximum_residents
      const mStart = new Date(year, month, 1); const mEnd = new Date(year, month + 1, 0)
      const occupied = useRotationStore().rotations.filter(r => r.training_unit_id === unitId && ['active', 'scheduled'].includes(r.rotation_status) && new Date(r.start_date) <= mEnd && new Date(r.end_date) >= mStart).length
      if (occupied === 0)          return { status: 'free',     occupied: 0,        total: maxSlots }
      if (occupied >= maxSlots)    return { status: 'occupied', occupied,            total: maxSlots }
      if (occupied >= maxSlots - 1)return { status: 'closing',  occupied,            total: maxSlots }
      return                              { status: 'partial',  occupied,            total: maxSlots }
    },
    getNextFreeMonth(unitId) {
      const today = new Date()
      for (let i = 0; i < 24; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
        const occ = this.getUnitMonthOccupancy(unitId, d.getFullYear(), d.getMonth())
        if (occ.occupied < occ.total) return { label: d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }), shortLabel: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }), date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`, monthsAway: i, freeSlots: occ.total - occ.occupied }
      }
      return null
    },
    getTimelineMonths(horizonMonths) {
      const today = new Date(); const months = []
      for (let i = 0; i < horizonMonths; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
        months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('es-ES', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), isCurrent: i === 0 })
      }
      return months
    },
    getUnitSlots(unitId, maxResidents, horizonMonths) {
      const months = this.getTimelineMonths(horizonMonths); const slots = []
      for (let i = 0; i < maxResidents; i++) {
        slots.push({ slotIdx: i, residentId: null, residentName: null, initials: null, rotationCount: 0, months: months.map(m => ({ ...m, status: 'free', tooltip: `Slot ${i+1} — ${m.label}: Available`, showName: false, initials: null })) })
      }
      return slots
    },
    getDaysUntilFree(endDate) { return Math.ceil((new Date(endDate) - new Date()) / 86400000) },
    openCellPopover(event, unitId, unitName, slot, month) {
      this.tlPopover.show = true; this.tlPopover.unitName = unitName; this.tlPopover.slotIdx = slot.slotIdx + 1
      this.tlPopover.monthLabel = month.label; this.tlPopover.entries = [{ name: '—', start: null, end: null, status: 'free', partial: false }]
      const rect = event.currentTarget.getBoundingClientRect(); this.tlPopover.x = rect.left; this.tlPopover.y = rect.bottom + 6
    },
    closeCellPopover() { this.tlPopover.show = false }
  }
})

// ============================================================
// ON-CALL STORE
// ============================================================
export const useOnCallStore = defineStore('oncall', {
  state: () => ({
    onCallSchedule: [],
    todaysOnCall: [],
    loadingSchedule: false,
    onCallFilters: { date: '', shiftType: '', physician: '', coverageArea: '', search: '' },
    onCallModal: { show: false, mode: 'add', form: {} },
    pagination: { page: 1, size: 15 },
    sortField: 'duty_date',
    sortDir: 'asc'
  }),
  getters: {
    filteredOnCallAll: (state) => {
      let f = state.onCallSchedule
      const today = Utils.normalizeDate(new Date())
      if (!state.onCallFilters.date && !state.onCallFilters.search) f = f.filter(s => Utils.normalizeDate(s.duty_date) >= today)
      if (state.onCallFilters.date)      f = f.filter(s => Utils.normalizeDate(s.duty_date) === state.onCallFilters.date)
      if (state.onCallFilters.shiftType) f = f.filter(s => s.shift_type === state.onCallFilters.shiftType)
      if (state.onCallFilters.physician) f = f.filter(s => s.primary_physician_id === state.onCallFilters.physician || s.backup_physician_id === state.onCallFilters.physician)
      if (state.onCallFilters.search) {
        const staffStore = useStaffStore(); const q = state.onCallFilters.search.toLowerCase()
        f = f.filter(s => staffStore.getStaffName(s.primary_physician_id).toLowerCase().includes(q))
      }
      const { sortField: field, sortDir: dir } = state
      return [...f].sort((a, b) => {
        let va = a[field] ?? '', vb = b[field] ?? ''
        if (field === 'duty_date') { va = Utils.normalizeDate(va); vb = Utils.normalizeDate(vb) }
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return dir === 'asc' ? cmp : -cmp
      })
    },
    filteredOnCallSchedules: (state) => {
      const start = (state.pagination.page - 1) * state.pagination.size
      return state.filteredOnCallAll.slice(start, start + state.pagination.size)
    },
    oncallTotalPages:  (state) => Math.max(1, Math.ceil(state.filteredOnCallAll.length / state.pagination.size)),
    todaysOnCallCount: (state) => state.todaysOnCall.length,
    upcomingOnCallDays: (state) => {
      const today = Utils.normalizeDate(new Date()); const map = {}
      state.onCallSchedule.forEach(s => {
        const d = Utils.normalizeDate(s.duty_date); if (d < today) return
        if (!map[d]) map[d] = { date: d, label: d === today ? 'Today' : new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }), isToday: d === today, primary: null, backup: null }
        if (s.shift_type === 'primary_call') map[d].primary = s; else map[d].backup = s
      })
      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
    },
    staffWithOnCallOrbs: (state) => {
      const staffStore = useStaffStore(); const today = Utils.normalizeDate(new Date()); const map = {}
      state.onCallSchedule.forEach(shift => {
        const id = shift.primary_physician_id; if (!id) return
        const staff = staffStore.allStaffLookup.find(s => s.id === id); if (!staff) return
        if (!map[id]) map[id] = { id, name: staff.full_name, staffType: staff.staff_type, shifts: [] }
        map[id].shifts.push({ ...shift, dutyDate: Utils.normalizeDate(shift.duty_date), isToday: Utils.normalizeDate(shift.duty_date) === today, isPast: Utils.normalizeDate(shift.duty_date) < today, dayLabel: new Date(shift.duty_date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }), dateLabel: new Date(shift.duty_date + 'T12:00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' }) })
      })
      Object.values(map).forEach(p => p.shifts.sort((a, b) => a.dutyDate.localeCompare(b.dutyDate)))
      return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
    },
    groupedOnCallSchedules: (state) => {
      const map = {}
      state.onCallSchedule.forEach(s => {
        const d = Utils.normalizeDate(s.duty_date)
        if (!map[d]) map[d] = { date: d, shifts: [] }
        map[d].shifts.push(s)
      })
      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
    }
  },
  actions: {
    async loadOnCallSchedule() {
      this.loadingSchedule = true
      try { const raw = await API.getOnCallSchedule(); this.onCallSchedule = raw.map(s => ({ ...s, duty_date: Utils.normalizeDate(s.duty_date) })) }
      catch { useUIStore().showToast('Error', 'Failed to load on-call schedule', 'error') }
      finally { this.loadingSchedule = false }
    },
    async loadTodaysOnCall() {
      try {
        const data = await API.getOnCallToday()
        this.todaysOnCall = data.map(item => ({ id: item.id, startTime: item.start_time?.substring(0,5) || 'N/A', endTime: item.end_time?.substring(0,5) || 'N/A', physicianName: item.primary_physician?.full_name || 'Unknown Physician' }))
      } catch { this.todaysOnCall = [] }
    },
    async createOnCall(data) {
      const created = await API.createOnCall(data)
      this.onCallSchedule.push({ ...created, duty_date: Utils.normalizeDate(created.duty_date) })
      useUIStore().showToast('Success', 'On-call schedule created', 'success'); return created
    },
    async updateOnCall(id, data) {
      const updated = await API.updateOnCall(id, data)
      const idx = this.onCallSchedule.findIndex(s => s.id === id)
      if (idx !== -1) this.onCallSchedule[idx] = { ...updated, duty_date: Utils.normalizeDate(updated.duty_date) }
      useUIStore().showToast('Success', 'On-call schedule updated', 'success'); return updated
    },
    async deleteOnCall(id) {
      await API.deleteOnCall(id); this.onCallSchedule = this.onCallSchedule.filter(s => s.id !== id)
      useUIStore().showToast('Success', 'Schedule deleted', 'success')
    },
    isToday(dateStr) { if (!dateStr) return false; return Utils.normalizeDate(dateStr) === Utils.normalizeDate(new Date()) },
    setOnCallFilter(key, value) { this.onCallFilters[key] = value; this.pagination.page = 1 },
    sortBy(field)  { this.sortDir = this.sortField === field && this.sortDir === 'asc' ? 'desc' : 'asc'; this.sortField = field },
    goToPage(page) { this.pagination.page = Math.max(1, Math.min(page, this.oncallTotalPages)) }
  }
})

// ============================================================
// ABSENCE STORE
// ============================================================
export const useAbsenceStore = defineStore('absence', {
  state: () => ({
    absences: [],
    absenceFilters: { staff: '', status: '', reason: '', startDate: '', search: '', hideReturned: true },
    absenceModal: { show: false, mode: 'add', form: {} },
    absenceResolutionModal: { show: false, absence: null, action: null, saving: false, returnDate: '', returnNotes: '', extendedEndDate: '' },
    pagination: { page: 1, size: 15 },
    sortField: 'start_date',
    sortDir: 'desc'
  }),
  getters: {
    deriveAbsenceStatus: () => (a) => {
      if (a.current_status === 'cancelled')        return 'cancelled'
      if (a.current_status === 'returned_to_duty') return 'returned_to_duty'
      const today = Utils.normalizeDate(new Date())
      const start = Utils.normalizeDate(a.start_date)
      const end   = Utils.normalizeDate(a.end_date)
      if (end   < today) return 'completed'
      if (start <= today) return 'currently_absent'
      return 'upcoming'
    },
    filteredAbsencesAll: (state) => {
      let f = state.absences.map(a => ({ ...a, current_status: (() => {
        if (a.current_status === 'cancelled')        return 'cancelled'
        if (a.current_status === 'returned_to_duty') return 'returned_to_duty'
        const today = Utils.normalizeDate(new Date()), start = Utils.normalizeDate(a.start_date), end = Utils.normalizeDate(a.end_date)
        if (end < today)   return 'completed'
        if (start <= today) return 'currently_absent'
        return 'upcoming'
      })() }))
      if (!state.absenceFilters.status && state.absenceFilters.hideReturned) f = f.filter(a => a.current_status !== 'returned_to_duty' && a.current_status !== 'cancelled')
      if (state.absenceFilters.staff)     f = f.filter(a => a.staff_member_id  === state.absenceFilters.staff)
      if (state.absenceFilters.status)    f = f.filter(a => a.current_status   === state.absenceFilters.status)
      if (state.absenceFilters.reason)    f = f.filter(a => a.absence_reason   === state.absenceFilters.reason)
      if (state.absenceFilters.startDate) f = f.filter(a => Utils.normalizeDate(a.start_date) >= state.absenceFilters.startDate)
      if (state.absenceFilters.search) {
        const staffStore = useStaffStore(); const q = state.absenceFilters.search.toLowerCase()
        f = f.filter(a => staffStore.getStaffName(a.staff_member_id).toLowerCase().includes(q))
      }
      const { sortField: field, sortDir: dir } = state
      return [...f].sort((a, b) => {
        let va = a[field] ?? '', vb = b[field] ?? ''
        if (field === 'start_date' || field === 'end_date') { va = Utils.normalizeDate(va); vb = Utils.normalizeDate(vb) }
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return dir === 'asc' ? cmp : -cmp
      })
    },
    filteredAbsences: (state) => {
      const start = (state.pagination.page - 1) * state.pagination.size
      return state.filteredAbsencesAll.slice(start, start + state.pagination.size)
    },
    absenceTotalPages: (state) => Math.max(1, Math.ceil(state.filteredAbsencesAll.length / state.pagination.size))
  },
  actions: {
    async loadAbsences() {
      try {
        const raw = await API.getAbsences()
        this.absences = raw.filter(a => a.current_status !== 'cancelled').map(a => ({ ...a, start_date: Utils.normalizeDate(a.start_date), end_date: Utils.normalizeDate(a.end_date) }))
      } catch { useUIStore().showToast('Error', 'Failed to load absences', 'error') }
    },
    async createAbsence(data) {
      const created = await API.createAbsence(data)
      this.absences.unshift({ ...created, start_date: Utils.normalizeDate(created.start_date), end_date: Utils.normalizeDate(created.end_date) })
      useUIStore().showToast('Success', 'Absence record created', 'success'); return created
    },
    async updateAbsence(id, data) {
      const updated = await API.updateAbsence(id, data)
      const idx = this.absences.findIndex(a => a.id === id)
      if (idx !== -1) this.absences[idx] = { ...updated, start_date: Utils.normalizeDate(updated.start_date), end_date: Utils.normalizeDate(updated.end_date) }
      useUIStore().showToast('Success', 'Absence record updated', 'success'); return updated
    },
    async deleteAbsence(id) {
      await API.deleteAbsence(id); this.absences = this.absences.filter(a => a.id !== id)
      useUIStore().showToast('Success', 'Absence record cancelled', 'success')
    },
    async returnToDuty(id, returnDate, notes = '') {
      await API.returnToDuty(id, { return_date: returnDate, notes })
      await this.loadAbsences()
      useUIStore().showToast('Success', 'Staff marked as returned to duty', 'success')
    },
    formatAbsenceReason(reason) { return ABSENCE_REASON_LABELS[reason] || reason },
    setAbsenceFilter(key, value){ this.absenceFilters[key] = value; this.pagination.page = 1 },
    sortBy(field)                { this.sortDir = this.sortField === field && this.sortDir === 'asc' ? 'desc' : 'asc'; this.sortField = field },
    goToPage(page)               { this.pagination.page = Math.max(1, Math.min(page, this.absenceTotalPages)) }
  }
})

// ============================================================
// RESEARCH STORE
// ============================================================
export const useResearchStore = defineStore('research', {
  state: () => ({
    researchLines: [],
    clinicalTrials: [],
    innovationProjects: [],
    researchLinesPerformance: [],
    partnerCollaborations: null,
    researchLineFilters: { search: '', active: '' },
    trialFilters: { line: '', phase: '', status: '', search: '' },
    projectFilters: { research_line_id: '', category: '', stage: '', funding_status: '', search: '' },
    researchLineModal: { show: false, mode: 'add', form: {} },
    clinicalTrialModal: { show: false, mode: 'add', form: {} },
    innovationProjectModal: { show: false, mode: 'add', form: {} },
    assignCoordinatorModal: { show: false, lineId: null, lineName: '', selectedCoordinatorId: '' },
    trialDetailModal: { show: false, trial: null },
    researchHubTab: 'lines',
    activeMissionLine: null,
    pagination: { trials: { page: 1, size: 15 }, projects: { page: 1, size: 15 } },
    sortField: 'line_number',
    sortDir: 'asc'
  }),
  getters: {
    filteredResearchLines: (state) => {
      let f = state.researchLines
      if (state.researchLineFilters.search) { const q = state.researchLineFilters.search.toLowerCase(); f = f.filter(l => (l.research_line_name || l.name)?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q)) }
      if (state.researchLineFilters.active !== '') { const active = state.researchLineFilters.active === 'true'; f = f.filter(l => l.active === active) }
      return f
    },
    filteredTrialsAll: (state) => {
      let f = state.clinicalTrials
      if (state.trialFilters.line)   f = f.filter(t => t.research_line_id === state.trialFilters.line)
      if (state.trialFilters.phase)  f = f.filter(t => t.phase            === state.trialFilters.phase)
      if (state.trialFilters.status) f = f.filter(t => t.status           === state.trialFilters.status)
      if (state.trialFilters.search) { const q = state.trialFilters.search.toLowerCase(); f = f.filter(t => t.protocol_id?.toLowerCase().includes(q) || t.title?.toLowerCase().includes(q)) }
      return f
    },
    filteredTrials: (state) => {
      const start = (state.pagination.trials.page - 1) * state.pagination.trials.size
      return state.filteredTrialsAll.slice(start, start + state.pagination.trials.size)
    },
    trialTotalPages: (state) => Math.max(1, Math.ceil(state.filteredTrialsAll.length / state.pagination.trials.size)),
    filteredProjectsAll: (state) => {
      let f = state.innovationProjects
      if (state.projectFilters.research_line_id) f = f.filter(p => p.research_line_id === state.projectFilters.research_line_id)
      if (state.projectFilters.category)         f = f.filter(p => p.category         === state.projectFilters.category)
      if (state.projectFilters.stage)            f = f.filter(p => (p.current_stage || p.development_stage) === state.projectFilters.stage)
      if (state.projectFilters.funding_status)   f = f.filter(p => (p.funding_status || 'not_applicable')   === state.projectFilters.funding_status)
      if (state.projectFilters.search)           { const q = state.projectFilters.search.toLowerCase(); f = f.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) }
      return f
    },
    filteredProjects: (state) => {
      const start = (state.pagination.projects.page - 1) * state.pagination.projects.size
      return state.filteredProjectsAll.slice(start, start + state.pagination.projects.size)
    },
    projectTotalPages: (state) => Math.max(1, Math.ceil(state.filteredProjectsAll.length / state.pagination.projects.size)),
    portfolioKPIs: (state) => ({
      totalLines:   state.researchLines.length,
      activeLines:  state.researchLines.filter(l => l.active !== false).length,
      totalStudies: state.clinicalTrials.length,
      activeStudies:state.clinicalTrials.filter(t => ['Activo', 'Reclutando'].includes(t.status)).length,
      totalProjects:state.innovationProjects.length
    })
  },
  actions: {
    async loadResearchLines() {
      try { this.researchLines = await API.getResearchLines() }
      catch { useUIStore().showToast('Error', 'Failed to load research lines', 'error') }
    },
    async loadClinicalTrials() {
      try { this.clinicalTrials = await API.getAllClinicalTrials() }
      catch { useUIStore().showToast('Error', 'Failed to load clinical trials', 'error') }
    },
    async loadInnovationProjects() {
      try { this.innovationProjects = await API.getAllInnovationProjects() }
      catch { useUIStore().showToast('Error', 'Failed to load innovation projects', 'error') }
    },
    async loadResearchLinesPerformance() {
      try { const r = await API.request('/api/analytics/research-lines-performance'); this.researchLinesPerformance = r?.data || [] }
      catch { this.researchLinesPerformance = [] }
    },
    async loadPartnerCollaborations() {
      try { const r = await API.request('/api/analytics/partner-collaborations'); this.partnerCollaborations = r?.data || null }
      catch { this.partnerCollaborations = null }
    },
    getResearchLineName(id) {
      const l = this.researchLines.find(l => l.id === id); return l ? (l.research_line_name || l.name) : 'Not assigned'
    },
    getLineAccent(lineNumber) {
      const accents = [
        { bg: 'linear-gradient(135deg,#3b82f6,#6366f1)', light: '#eff6ff', color: '#1e40af' },
        { bg: 'linear-gradient(135deg,#10b981,#0891b2)', light: '#d1fae5', color: '#065f46' },
        { bg: 'linear-gradient(135deg,#22d3ee,#0ea5e9)', light: '#e0f7fa', color: '#0e7490' },
        { bg: 'linear-gradient(135deg,#f59e0b,#f97316)', light: '#fef3c7', color: '#92400e' },
        { bg: 'linear-gradient(135deg,#a78bfa,#8b5cf6)', light: '#ede9fe', color: '#5b21b6' },
        { bg: 'linear-gradient(135deg,#fb7185,#ec4899)', light: '#fce7f3', color: '#9d174d' }
      ]
      return accents[((lineNumber || 1) - 1) % 6]
    },
    showAddResearchLineModal() {
      this.researchLineModal.show = true; this.researchLineModal.mode = 'add'
      this.researchLineModal.form = { line_number: this.researchLines.length + 1, research_line_name: '', name: '', description: '', capabilities: '', active: true, keywords: [], keywordsInput: '' }
    },
    editResearchLine(line) {
      this.researchLineModal.show = true; this.researchLineModal.mode = 'edit'
      this.researchLineModal.form = { ...line, research_line_name: line.research_line_name || line.name, keywordsInput: Array.isArray(line.keywords) ? line.keywords.join(', ') : '' }
    },
    async saveResearchLine() {
      const f = this.researchLineModal.form
      if (this.researchLineModal.mode === 'edit') { await API.updateResearchLine(f.id, f) } else { await API.createResearchLine(f) }
      await this.loadResearchLines(); this.researchLineModal.show = false
      useUIStore().showToast('Success', `Research line ${this.researchLineModal.mode === 'edit' ? 'updated' : 'created'}`, 'success')
    },
    async deleteResearchLine(id) {
      await API.deleteResearchLine(id); this.researchLines = this.researchLines.filter(l => l.id !== id)
      useUIStore().showToast('Success', 'Research line deleted', 'success')
    },
    showAddTrialModal(line = null) {
      this.clinicalTrialModal.show = true; this.clinicalTrialModal.mode = 'add'
      this.clinicalTrialModal.form = { protocol_id: `HUAC-${Date.now().toString().slice(-6)}`, title: '', research_line_id: line?.id || '', phase: 'Phase III', status: 'Reclutando', description: '', inclusion_criteria: '', exclusion_criteria: '', principal_investigator_id: '', co_investigators: [], sub_investigators: [], contact_email: '', start_date: '', end_date: '', actual_enrollment: 0, enrollment_target: 0 }
    },
    editTrial(trial) {
      this.clinicalTrialModal.show = true; this.clinicalTrialModal.mode = 'edit'
      this.clinicalTrialModal.form = { ...trial, co_investigators: Array.isArray(trial.co_investigators) ? [...trial.co_investigators] : [], sub_investigators: Array.isArray(trial.sub_investigators) ? [...trial.sub_investigators] : [] }
    },
    async saveClinicalTrial() {
      const f = this.clinicalTrialModal.form
      if (this.clinicalTrialModal.mode === 'edit') { await API.updateClinicalTrial(f.id, f) } else { await API.createClinicalTrial(f) }
      await this.loadClinicalTrials(); this.clinicalTrialModal.show = false
      useUIStore().showToast('Success', `Study ${this.clinicalTrialModal.mode === 'edit' ? 'updated' : 'created'}`, 'success')
    },
    async deleteClinicalTrial(id) {
      await API.deleteClinicalTrial(id); this.clinicalTrials = this.clinicalTrials.filter(t => t.id !== id)
      useUIStore().showToast('Success', 'Study deleted', 'success')
    },
    viewTrial(trial) { this.trialDetailModal.trial = trial; this.trialDetailModal.show = true },
    showAddProjectModal(line = null) {
      this.innovationProjectModal.show = true; this.innovationProjectModal.mode = 'add'
      this.innovationProjectModal.form = { title: '', category: 'Dispositivo', current_stage: 'Idea', description: '', clinical_rationale: '', research_line_id: line?.id || '', lead_investigator_id: '', co_investigators: [], partner_needs: [], partner_found: false, partner_name: '', funding_status: 'not_applicable', keywords: [], keywordsInput: '' }
    },
    editProject(project) {
      this.innovationProjectModal.show = true; this.innovationProjectModal.mode = 'edit'
      this.innovationProjectModal.form = { ...project, current_stage: project.current_stage || project.development_stage, co_investigators: Array.isArray(project.co_investigators) ? [...project.co_investigators] : [], keywords: Array.isArray(project.keywords) ? [...project.keywords] : [], keywordsInput: Array.isArray(project.keywords) ? project.keywords.join(', ') : '' }
    },
    async saveInnovationProject() {
      const f = this.innovationProjectModal.form
      if (this.innovationProjectModal.mode === 'edit') { await API.updateInnovationProject(f.id, f) } else { await API.createInnovationProject(f) }
      await this.loadInnovationProjects(); this.innovationProjectModal.show = false
      useUIStore().showToast('Success', `Project ${this.innovationProjectModal.mode === 'edit' ? 'updated' : 'created'}`, 'success')
    },
    async deleteInnovationProject(id) {
      await API.deleteInnovationProject(id); this.innovationProjects = this.innovationProjects.filter(p => p.id !== id)
      useUIStore().showToast('Success', 'Project deleted', 'success')
    },
    openAssignCoordinatorModal(line) {
      this.assignCoordinatorModal.lineId = line.id; this.assignCoordinatorModal.lineName = line.research_line_name || line.name
      this.assignCoordinatorModal.selectedCoordinatorId = line.coordinator_id || ''; this.assignCoordinatorModal.show = true
    },
    async saveCoordinatorAssignment() {
      await API.assignCoordinator(this.assignCoordinatorModal.lineId, this.assignCoordinatorModal.selectedCoordinatorId || null)
      await this.loadResearchLines(); this.assignCoordinatorModal.show = false
      useUIStore().showToast('Success', 'Coordinator assigned', 'success')
    },
    setActiveMissionLine(line) { this.activeMissionLine = line },
    setTrialFilter(key, value)   { this.trialFilters[key]   = value; this.pagination.trials.page   = 1 },
    setProjectFilter(key, value) { this.projectFilters[key] = value; this.pagination.projects.page = 1 },
    goToTrialsPage(page)   { this.pagination.trials.page   = Math.max(1, Math.min(page, this.trialTotalPages)) },
    goToProjectsPage(page) { this.pagination.projects.page = Math.max(1, Math.min(page, this.projectTotalPages)) },
    addKeyword(form)           { if (!form.keywordsInput?.trim()) return; form.keywordsInput.split(',').map(k => k.trim()).filter(Boolean).forEach(kw => { if (!form.keywords.includes(kw)) form.keywords.push(kw) }); form.keywordsInput = '' },
    removeKeyword(form, idx)   { form.keywords.splice(idx, 1) },
    handleKeywordKey(e, form)  { if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') { e.preventDefault(); this.addKeyword(form) } }
  }
})

// ============================================================
// NEWS STORE
// ============================================================
export const useNewsStore = defineStore('news', {
  state: () => ({
    newsPosts: [],
    newsLoading: false,
    newsFilters: { type: '', status: '', search: '', scope: '' },
    newsModal: {
      show: false, mode: 'add', _tab: 'meta',
      form: { id: null, post_type: 'article', title: '', body: '', featured_image_url: '', author_id: '', research_line_id: '', is_public: false, status: 'draft', expires_at: '', journal_name: '', authors_text: '', doi: '' }
    },
    newsDrawer: { show: false, post: null }
  }),
  getters: {
    filteredNews: (state) => {
      let posts = state.newsPosts
      if (state.newsFilters.type)   posts = posts.filter(p => p.post_type === state.newsFilters.type)
      if (state.newsFilters.status) posts = posts.filter(p => p.status    === state.newsFilters.status)
      if (state.newsFilters.search) { const q = state.newsFilters.search.toLowerCase(); posts = posts.filter(p => (p.title || '').toLowerCase().includes(q) || (p.body || '').toLowerCase().includes(q)) }
      return posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    },
    newsWordCount: (state) => (state.newsModal.form.body || '').trim().split(/\s+/).filter(Boolean).length
  },
  actions: {
    async loadNews() {
      this.newsLoading = true
      try { this.newsPosts = await API.getList('/api/news') || [] }
      catch { this.newsPosts = [] }
      finally { this.newsLoading = false }
    },
    showAddModal() {
      this.newsModal.show = true; this.newsModal.mode = 'add'; this.newsModal._tab = 'meta'
      this.newsModal.form = { id: null, post_type: 'article', title: '', body: '', featured_image_url: '', author_id: '', research_line_id: '', is_public: false, status: 'draft', expires_at: this._autoExpiry('article'), journal_name: '', authors_text: '', doi: '' }
    },
    editNews(post) {
      this.newsModal.show = true; this.newsModal.mode = 'edit'; this.newsModal._tab = 'meta'
      this.newsModal.form = { ...post, expires_at: post.expires_at ? post.expires_at.split('T')[0] : '', research_line_id: post.research_line_id || '', author_id: post.author_id || '' }
    },
    async saveNews() {
      const f = this.newsModal.form
      if (f.id) { await API.updateNews(f.id, f) } else { await API.createNews(f) }
      await this.loadNews(); this.newsModal.show = false
      useUIStore().showToast('Success', `Post ${f.id ? 'updated' : 'created'}`, 'success')
    },
    async deleteNews(id) {
      await API.deleteNews(id); this.newsPosts = this.newsPosts.filter(p => p.id !== id)
      useUIStore().showToast('Deleted', 'Post deleted', 'success')
    },
    async publishNews(id, post) {
      await API.updateNews(id, { ...post, status: 'published', published_at: new Date().toISOString() })
      await this.loadNews(); useUIStore().showToast('Published', 'Post published', 'success')
    },
    async archiveNews(id, post) {
      await API.updateNews(id, { ...post, status: 'archived' })
      await this.loadNews(); useUIStore().showToast('Archived', 'Post archived', 'info')
    },
    async togglePublic(id, post) {
      await API.updateNews(id, { ...post, is_public: !post.is_public })
      await this.loadNews()
    },
    openNewsDrawer(post) { this.newsDrawer.post = post; this.newsDrawer.show = true },
    closeNewsDrawer()    { this.newsDrawer.show = false; this.newsDrawer.post = null },
    _autoExpiry(type) {
      const d = new Date()
      if (type === 'update')      d.setDate(d.getDate() + 90)
      if (type === 'article')     d.setMonth(d.getMonth() + 18)
      if (type === 'photo_story') d.setMonth(d.getMonth() + 12)
      if (type === 'publication') return ''
      return d.toISOString().split('T')[0]
    },
    formatAuthorName(staffId) {
      const staffStore = useStaffStore(); const s = staffStore.medicalStaff.find(m => m.id === staffId)
      if (!s) return '—'; const parts = (s.full_name || '').trim().split(' '); return `Dr. ${parts[parts.length - 1]}`
    },
    getLineName(lineId) {
      const researchStore = useResearchStore(); const l = researchStore.researchLines.find(r => r.id === lineId)
      return l ? `L${l.line_number} — ${l.research_line_name || l.name}` : '—'
    }
  }
})
