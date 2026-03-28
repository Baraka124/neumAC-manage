// stores.js - Complete Pinia Stores for NeumoCare
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { API } from './api.js'
import { Utils } from './utils.js'
import { 
  PERMISSION_MATRIX, 
  ABSENCE_REASON_LABELS, 
  ROTATION_STATUS_LABELS,
  PROJECT_STAGES,
  LINE_ACCENTS,
  STAFF_TYPE_LABELS_FALLBACK,
  STAFF_TYPE_CLASSES_FALLBACK,
  ACADEMIC_DEGREES_FALLBACK
} from './config.js'

// ============================================================
// STAFF TYPE HELPERS (loaded dynamically from API)
// ============================================================
const staffTypesList = ref([])
const staffTypeMap = ref({})
const academicDegrees = ref(ACADEMIC_DEGREES_FALLBACK)

const formatStaffTypeGlobal = (key) => staffTypeMap.value[key]?.display_name || STAFF_TYPE_LABELS_FALLBACK[key] || key
const getStaffTypeClassGlobal = (key) => staffTypeMap.value[key]?.badge_class || STAFF_TYPE_CLASSES_FALLBACK[key] || 'badge-secondary'
const isResidentType = (key) => staffTypeMap.value[key]?.is_resident_type ?? (key === 'medical_resident')

// ============================================================
// UI STORE - Toast, Modals, Sidebar State
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
      show: false,
      title: '',
      message: '',
      icon: 'fa-question-circle',
      confirmButtonText: 'Confirm',
      confirmButtonClass: 'btn-primary',
      cancelButtonText: 'Cancel',
      onConfirm: null,
      details: ''
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

    showConfirmation(opts) {
      Object.assign(this.confirmationModal, { show: true, ...opts })
    },

    confirmAction() {
      if (this.confirmationModal.onConfirm) {
        this.confirmationModal.onConfirm()
      }
      this.confirmationModal.show = false
    },

    cancelConfirmation() {
      this.confirmationModal.show = false
    },

    dismissAlert(id) {
      const i = this.systemAlerts.findIndex(a => a.id === id)
      if (i > -1) this.systemAlerts.splice(i, 1)
    },

    toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed },
    toggleStatsSidebar() { this.statsSidebarOpen = !this.statsSidebarOpen },
    
    setCurrentView(view) {
      this.currentView = view
      this.mobileMenuOpen = false
      this.searchResultsOpen = false
    },

    addAlert(message, priority = 'normal') {
      this.systemAlerts.push({
        id: Date.now(),
        message,
        priority,
        status: 'active',
        created_at: new Date().toISOString()
      })
    }
  }
})

// ============================================================
// USER STORE - Authentication & Permissions
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
    userRole: (state) => state.currentUser?.user_role,
    userFullName: (state) => state.currentUser?.full_name,
    userEmail: (state) => state.currentUser?.email,
    
    hasPermission: (state) => (module, action = 'read') => {
      const role = state.currentUser?.user_role
      if (!role) return false
      if (role === 'system_admin') return true
      return PERMISSION_MATRIX[role]?.[module]?.includes(action) ?? false
    }
  },

  actions: {
    async login() {
      this.loginFieldErrors.email = !this.loginForm.email ? 'Email required' : ''
      this.loginFieldErrors.password = !this.loginForm.password ? 'Password required' : ''
      if (this.loginFieldErrors.email || this.loginFieldErrors.password) {
        this.loginError = 'Please fill all required fields'
        return false
      }
      
      this.loginLoading = true
      this.loginError = ''
      
      try {
        const response = await API.login(this.loginForm.email, this.loginForm.password)
        this.currentUser = response.user
        localStorage.setItem('neumocare_user', JSON.stringify(response.user))
        const ui = useUIStore()
        ui.showToast('Success', `Welcome, ${response.user.full_name}!`, 'success')
        return true
      } catch (e) {
        this.loginError = e.message || 'Invalid email or password'
        const ui = useUIStore()
        ui.showToast('Error', 'Login failed', 'error')
        return false
      } finally {
        this.loginLoading = false
      }
    },

    async logout() {
      try {
        await API.logout()
      } finally {
        this.currentUser = null
        const ui = useUIStore()
        ui.showToast('Info', 'Logged out successfully', 'info')
      }
    },

    async loadCurrentUser() {
      const stored = localStorage.getItem('neumocare_user')
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored)
          const fresh = await API.request('/api/auth/me')
          if (fresh && fresh.id) {
            this.currentUser = { ...this.currentUser, ...fresh }
          }
        } catch {
          this.currentUser = null
        }
      }
    },

    clearLoginError(field) {
      if (field === 'email') this.loginFieldErrors.email = ''
      if (field === 'password') this.loginFieldErrors.password = ''
      this.loginError = ''
    }
  }
})

// ============================================================
// STAFF STORE - Medical Staff Management
// ============================================================
export const useStaffStore = defineStore('staff', {
  state: () => ({
    medicalStaff: [],
    allStaffLookup: [],
    hospitalsList: [],
    staffFilters: {
      search: '',
      staffType: '',
      department: '',
      status: '',
      residentCategory: '',
      hospital: '',
      networkType: ''
    },
    staffView: 'table',
    pagination: { page: 1, size: 15 },
    sortField: 'full_name',
    sortDir: 'asc',
    
    staffProfileModal: {
      show: false,
      staff: null,
      activeTab: 'activity',
      researchProfile: null,
      supervisionData: null,
      leaveBalance: null,
      loadingResearch: false,
      loadingSupervision: false,
      loadingLeave: false,
      collapsed: {}
    },
    
    medicalStaffModal: {
      show: false,
      mode: 'add',
      activeTab: 'basic',
      _addingHospital: false,
      _newHospitalName: '',
      _newHospitalNetwork: 'external',
      _certs: [],
      _addingCert: false,
      _newCert: { name: '', issued_month: '', renewal_months: 24 },
      _addingStaffType: false,
      _newStaffTypeName: '',
      _newStaffTypeIsResident: false,
      _savingStaffType: false,
      form: {
        full_name: '',
        staff_type: 'medical_resident',
        staff_id: '',
        employment_status: 'active',
        professional_email: '',
        department_id: '',
        academic_degree: '',
        specialization: '',
        training_year: '',
        clinical_certificate: '',
        certificate_status: '',
        mobile_phone: '',
        medical_license: '',
        can_supervise_residents: false,
        special_notes: '',
        can_be_pi: false,
        can_be_coi: false,
        other_certificate: '',
        resident_category: null,
        home_department: null,
        external_institution: null,
        home_department_id: null,
        external_contact_name: null,
        external_contact_email: null,
        external_contact_phone: null,
        academic_degree_id: null,
        has_medical_license: false,
        residency_start_date: null,
        residency_year_override: null,
        is_chief_of_department: false,
        is_research_coordinator: false,
        is_resident_manager: false,
        is_oncall_manager: false,
        clinical_study_certificates: [],
        hospital_id: null,
        has_phd: false,
        phd_field: '',
        office_phone: '',
        years_experience: null,
        _networkHint: null,
        _coordLineId: null,
        _investigadorLines: []
      }
    }
  }),

  getters: {
    filteredMedicalStaffAll: (state) => {
      let f = state.medicalStaff
      if (state.staffFilters.search) {
        const q = state.staffFilters.search.toLowerCase()
        f = f.filter(x => x.full_name?.toLowerCase().includes(q) || x.staff_id?.toLowerCase().includes(q) || x.professional_email?.toLowerCase().includes(q))
      }
      if (state.staffFilters.staffType) f = f.filter(x => x.staff_type === state.staffFilters.staffType)
      if (state.staffFilters.department) f = f.filter(x => x.department_id === state.staffFilters.department)
      if (state.staffFilters.status) f = f.filter(x => x.employment_status === state.staffFilters.status)
      if (state.staffFilters.residentCategory) f = f.filter(x => x.resident_category === state.staffFilters.residentCategory)
      if (state.staffFilters.hospital) f = f.filter(x => x.hospital_id === state.staffFilters.hospital)
      if (state.staffFilters.networkType) {
        const ids = state.hospitalsList.filter(h => h.parent_complex === state.staffFilters.networkType).map(h => h.id)
        f = f.filter(x => ids.includes(x.hospital_id))
      }
      
      const field = state.sortField
      const dir = state.sortDir
      return [...f].sort((a, b) => {
        let va = a[field] ?? '', vb = b[field] ?? ''
        if (typeof va === 'string' && /\d{4}-\d{2}-\d{2}/.test(va)) {
          va = Utils.normalizeDate(va)
          vb = Utils.normalizeDate(vb)
        }
        const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
        return dir === 'asc' ? cmp : -cmp
      })
    },

    filteredMedicalStaff: (state) => {
      const start = (state.pagination.page - 1) * state.pagination.size
      return state.filteredMedicalStaffAll.slice(start, start + state.pagination.size)
    },

    staffTotalPages: (state) => Math.max(1, Math.ceil(state.filteredMedicalStaffAll.length / state.pagination.size)),

    hasActiveStaffFilters: (state) => !!(
      state.staffFilters.search || state.staffFilters.staffType || 
      state.staffFilters.department || state.staffFilters.status || 
      state.staffFilters.residentCategory || state.staffFilters.hospital || 
      state.staffFilters.networkType
    ),

    compactStaffWithDividers: (state) => {
      const staff = state.filteredMedicalStaff
      const attendings = staff.filter(s => !isResidentType(s.staff_type))
      const residents = staff.filter(s => isResidentType(s.staff_type))
      const result = []
      if (attendings.length) {
        result.push({ _divider: `Attending Physicians · ${attendings.length}` })
        result.push(...attendings)
      }
      if (residents.length) {
        result.push({ _divider: `Medical Residents · ${residents.length}` })
        result.push(...residents)
      }
      return result
    },

    availablePhysicians: (state) => state.medicalStaff.filter(s => s.employment_status === 'active'),
    availableAttendings: (state) => state.medicalStaff.filter(s => s.employment_status === 'active' && s.staff_type === 'attending_physician'),
    availableResidents: (state) => state.medicalStaff.filter(s => s.employment_status === 'active' && isResidentType(s.staff_type))
  },

  actions: {
    async loadStaff() {
      try {
        const [raw, hospitals] = await Promise.all([
          API.getList('/api/medical-staff'),
          API.getHospitals()
        ])
        this.allStaffLookup = raw.map(s => ({ id: s.id, full_name: s.full_name, staff_type: s.staff_type, employment_status: s.employment_status }))
        this.hospitalsList = hospitals
        this.medicalStaff = await API.getMedicalStaff()
        await this.loadStaffTypes()
      } catch (error) {
        const ui = useUIStore()
        ui.showToast('Error', 'Failed to load medical staff', 'error')
      }
    },

    async loadStaffTypes(includeInactive = false) {
      try {
        const raw = await API.getStaffTypes(includeInactive)
        staffTypesList.value = raw
        const map = {}
        raw.forEach(t => { map[t.type_key] = t })
        staffTypeMap.value = map
      } catch (error) {
        console.error('Failed to load staff types', error)
      }
    },

    async loadAcademicDegrees() {
      try {
        const data = await API.getAcademicDegrees()
        academicDegrees.value = data.length ? data : ACADEMIC_DEGREES_FALLBACK
      } catch {
        academicDegrees.value = ACADEMIC_DEGREES_FALLBACK
      }
    },

    async createStaff(data) {
      const newStaff = await API.createMedicalStaff(data)
      this.medicalStaff.unshift(newStaff)
      const ui = useUIStore()
      ui.showToast('Success', 'Medical staff added', 'success')
      return newStaff
    },

    async updateStaff(id, data) {
      const updated = await API.updateMedicalStaff(id, data)
      const idx = this.medicalStaff.findIndex(s => s.id === id)
      if (idx !== -1) this.medicalStaff[idx] = updated
      const ui = useUIStore()
      ui.showToast('Success', 'Medical staff updated', 'success')
      return updated
    },

    async deleteStaff(id) {
      await API.deleteMedicalStaff(id)
      this.medicalStaff = this.medicalStaff.filter(s => s.id !== id)
      const ui = useUIStore()
      ui.showToast('Success', 'Staff member deactivated', 'success')
    },

    getStaffName(id) {
      if (!id) return 'Not assigned'
      const s = this.allStaffLookup.find(x => x.id === id) || this.medicalStaff.find(x => x.id === id)
      return s?.full_name || 'Not assigned'
    },

    formatStaffType(key) {
      return formatStaffTypeGlobal(key)
    },

    getStaffTypeClass(key) {
      return getStaffTypeClassGlobal(key)
    },

    isResidentType(key) {
      return isResidentType(key)
    },

    formatEmploymentStatus(s) {
      return { active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' }[s] || s
    }
  }
})

// ============================================================
// ROTATION STORE - Basic Structure
// ============================================================
export const useRotationStore = defineStore('rotations', {
  state: () => ({
    rotations: [],
    rotationFilters: {
      resident: '',
      status: '',
      trainingUnit: '',
      supervisor: '',
      search: ''
    },
    pagination: { page: 1, size: 15 },
    sortField: 'start_date',
    sortDir: 'desc',
    rotationModal: { show: false, mode: 'add', form: {} },
    rotationViewModal: { show: false, rotation: null },
    monthHorizon: 6,
    monthOffset: 0
  }),

  getters: {
    filteredRotationsAll: (state) => {
      let f = state.rotations
      if (state.rotationFilters.resident) f = f.filter(r => r.resident_id === state.rotationFilters.resident)
      if (state.rotationFilters.status) f = f.filter(r => r.rotation_status === state.rotationFilters.status)
      if (state.rotationFilters.trainingUnit) f = f.filter(r => r.training_unit_id === state.rotationFilters.trainingUnit)
      if (state.rotationFilters.search) {
        const staffStore = useStaffStore()
        const q = state.rotationFilters.search.toLowerCase()
        f = f.filter(r => staffStore.getStaffName(r.resident_id).toLowerCase().includes(q))
      }
      return f
    },

    activeRotations: (state) => state.rotations.filter(r => r.rotation_status === 'active').length,
    scheduledRotations: (state) => state.rotations.filter(r => r.rotation_status === 'scheduled').length
  },

  actions: {
    async loadRotations() {
      try {
        const raw = await API.getRotations()
        this.rotations = raw.map(r => ({
          ...r,
          start_date: Utils.normalizeDate(r.start_date || r.rotation_start_date),
          end_date: Utils.normalizeDate(r.end_date || r.rotation_end_date)
        }))
      } catch (error) {
        const ui = useUIStore()
        ui.showToast('Error', 'Failed to load rotations', 'error')
      }
    },

    formatRotationStatus(status) {
      return ROTATION_STATUS_LABELS[status] || status
    },

    getDaysRemaining(endDate) {
      return Utils.daysUntil(endDate)
    },

    getHorizonMonths(n, offset) {
      const today = new Date()
      const months = []
      for (let i = 0; i < n; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + offset + i, 1)
        months.push({
          key: `${d.getFullYear()}-${d.getMonth()}`,
          label: d.toLocaleDateString('es-ES', { month: 'short' }),
          year: d.getFullYear(),
          month: d.getMonth(),
          isCurrent: d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth(),
          daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
        })
      }
      return months
    },

    getHorizonRangeLabel() {
      const months = this.getHorizonMonths(this.monthHorizon, this.monthOffset)
      if (!months.length) return ''
      const first = months[0], last = months[months.length - 1]
      if (first.year === last.year) return `${first.label} – ${last.label} ${last.year}`
      return `${first.label} ${first.year} – ${last.label} ${last.year}`
    }
  }
})

// ============================================================
// TRAINING UNIT STORE - Basic Structure
// ============================================================
export const useTrainingStore = defineStore('training', {
  state: () => ({
    trainingUnits: [],
    trainingUnitFilters: { search: '', department: '', status: '' },
    trainingUnitModal: { show: false, mode: 'add', form: {} },
    trainingUnitView: 'timeline',
    trainingUnitHorizon: 6,
    tlPopover: { show: false, unitName: '', slotIdx: 0, monthLabel: '', entries: [], x: 0, y: 0 },
    occupancyPanel: { show: false },
    unitDetailDrawer: { show: false, unit: null }
  }),

  getters: {
    filteredTrainingUnits: (state) => {
      let f = state.trainingUnits
      if (state.trainingUnitFilters.search) {
        const q = state.trainingUnitFilters.search.toLowerCase()
        f = f.filter(u => u.unit_name?.toLowerCase().includes(q))
      }
      if (state.trainingUnitFilters.department) f = f.filter(u => u.department_id === state.trainingUnitFilters.department)
      if (state.trainingUnitFilters.status) f = f.filter(u => u.unit_status === state.trainingUnitFilters.status)
      return f
    }
  },

  actions: {
    async loadTrainingUnits() {
      try {
        this.trainingUnits = await API.getTrainingUnits()
      } catch (error) {
        const ui = useUIStore()
        ui.showToast('Error', 'Failed to load training units', 'error')
      }
    },

    getTrainingUnitName(id) {
      return this.trainingUnits.find(u => u.id === id)?.unit_name || 'Not assigned'
    },

    getUnitActiveRotationCount(id) {
      const rotationStore = useRotationStore()
      const today = new Date(); today.setHours(0, 0, 0, 0)
      return rotationStore.rotations.filter(r =>
        r.training_unit_id === id &&
        r.rotation_status === 'active' &&
        new Date(r.start_date) <= today &&
        new Date(r.end_date) >= today
      ).length
    },

    getUnitRotations(id) {
      const rotationStore = useRotationStore()
      return rotationStore.rotations.filter(r =>
        r.training_unit_id === id && ['active', 'scheduled'].includes(r.rotation_status)
      )
    },

    getUnitScheduledCount(id) {
      const rotationStore = useRotationStore()
      const today = new Date(); today.setHours(0, 0, 0, 0)
      return rotationStore.rotations.filter(r =>
        r.training_unit_id === id &&
        r.rotation_status === 'scheduled' &&
        new Date(r.start_date) > today
      ).length
    },

    getUnitOverlapWarning(id) {
      const rotationStore = useRotationStore()
      const unit = this.trainingUnits.find(u => u.id === id)
      if (!unit) return null
      const maxSlots = unit.maximum_residents
      const upcoming = rotationStore.rotations.filter(r =>
        r.training_unit_id === id &&
        ['active', 'scheduled'].includes(r.rotation_status)
      )
      for (const rot of upcoming) {
        const checkDate = new Date(rot.start_date)
        const concurrent = upcoming.filter(r =>
          new Date(r.start_date) <= checkDate && new Date(r.end_date) >= checkDate
        ).length
        if (concurrent > maxSlots) {
          return { date: rot.start_date, concurrent, max: maxSlots }
        }
      }
      return null
    },

    getTimelineMonths(horizonMonths) {
      const today = new Date()
      const months = []
      for (let i = 0; i < horizonMonths; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
        months.push({
          key: `${d.getFullYear()}-${d.getMonth()}`,
          label: d.toLocaleDateString('es-ES', { month: 'short' }),
          year: d.getFullYear(),
          month: d.getMonth(),
          isCurrent: i === 0
        })
      }
      return months
    },

    getDaysUntilFree(endDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      return Math.ceil((end - today) / (1000 * 60 * 60 * 24))
    },

    getUnitSlots(unitId, maxResidents, horizonMonths) {
      const slots = []
      for (let i = 0; i < maxResidents; i++) {
        slots.push({ slotIdx: i, months: [], initials: null })
      }
      return slots
    },

    openCellPopover(event, unitId, unitName, slot, month) {
      this.tlPopover.show = true
      this.tlPopover.unitName = unitName
      this.tlPopover.slotIdx = slot.slotIdx + 1
      this.tlPopover.monthLabel = month.label
      this.tlPopover.entries = [{ name: '—', start: null, end: null, status: 'free', partial: false }]
      const rect = event.currentTarget.getBoundingClientRect()
      this.tlPopover.x = rect.left
      this.tlPopover.y = rect.bottom + 6
    },

    closeCellPopover() {
      this.tlPopover.show = false
    }
  }
})

// ============================================================
// ON-CALL STORE - Basic Structure
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
    todaysOnCallCount: (state) => state.todaysOnCall.length,
    upcomingOnCallDays: (state) => []
  },

  actions: {
    async loadOnCallSchedule() {
      this.loadingSchedule = true
      try {
        const raw = await API.getOnCallSchedule()
        this.onCallSchedule = raw.map(s => ({ ...s, duty_date: Utils.normalizeDate(s.duty_date) }))
      } catch (error) {
        const ui = useUIStore()
        ui.showToast('Error', 'Failed to load on-call schedule', 'error')
      } finally {
        this.loadingSchedule = false
      }
    },

    async loadTodaysOnCall() {
      try {
        const data = await API.getOnCallToday()
        this.todaysOnCall = data.map(item => ({
          id: item.id,
          startTime: item.start_time?.substring(0, 5) || 'N/A',
          endTime: item.end_time?.substring(0, 5) || 'N/A',
          physicianName: item.primary_physician?.full_name || 'Unknown Physician',
          shiftTypeDisplay: item.shift_type === 'primary_call' ? 'Primary' : 'Backup'
        }))
      } catch {
        this.todaysOnCall = []
      }
    },

    async deleteOnCall(id) {
      await API.deleteOnCall(id)
      this.onCallSchedule = this.onCallSchedule.filter(s => s.id !== id)
      const ui = useUIStore()
      ui.showToast('Success', 'Schedule deleted', 'success')
    },

    isToday(dateStr) {
      if (!dateStr) return false
      const today = Utils.normalizeDate(new Date())
      return Utils.normalizeDate(dateStr) === today
    },

    getPhysicianName(id) {
      const staffStore = useStaffStore()
      return staffStore.getStaffName(id)
    }
  }
})

// ============================================================
// ABSENCE STORE - Basic Structure
// ============================================================
export const useAbsenceStore = defineStore('absence', {
  state: () => ({
    absences: [],
    absenceFilters: { staff: '', status: '', reason: '', startDate: '', search: '', hideReturned: true },
    absenceModal: { show: false, mode: 'add', form: {} },
    absenceResolutionModal: { show: false, absence: null, action: null, saving: false },
    pagination: { page: 1, size: 15 },
    sortField: 'start_date',
    sortDir: 'desc'
  }),

  getters: {
    deriveAbsenceStatus: (state) => (a) => {
      if (a.current_status === 'cancelled') return 'cancelled'
      if (a.current_status === 'returned_to_duty') return 'returned_to_duty'
      const today = Utils.normalizeDate(new Date())
      const start = Utils.normalizeDate(a.start_date)
      const end = Utils.normalizeDate(a.end_date)
      if (end < today) return 'completed'
      if (start <= today) return 'currently_absent'
      return 'upcoming'
    }
  },

  actions: {
    async loadAbsences() {
      try {
        const raw = await API.getAbsences()
        this.absences = raw.filter(a => a.current_status !== 'cancelled').map(a => ({
          ...a,
          start_date: Utils.normalizeDate(a.start_date),
          end_date: Utils.normalizeDate(a.end_date)
        }))
      } catch (error) {
        const ui = useUIStore()
        ui.showToast('Error', 'Failed to load absences', 'error')
      }
    },

    async deleteAbsence(id) {
      await API.deleteAbsence(id)
      this.absences = this.absences.filter(a => a.id !== id)
      const ui = useUIStore()
      ui.showToast('Success', 'Absence record cancelled', 'success')
    },

    formatAbsenceReason(reason) {
      return ABSENCE_REASON_LABELS[reason] || reason
    },

    getStaffName(id) {
      const staffStore = useStaffStore()
      return staffStore.getStaffName(id)
    }
  }
})

// ============================================================
// RESEARCH STORE - Basic Structure
// ============================================================
export const useResearchStore = defineStore('research', {
  state: () => ({
    researchLines: [],
    clinicalTrials: [],
    innovationProjects: [],
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
    portfolioKPIs: (state) => ({
      totalLines: state.researchLines.length,
      activeLines: state.researchLines.filter(l => l.active !== false).length,
      totalStudies: state.clinicalTrials.length,
      activeStudies: state.clinicalTrials.filter(t => ['Activo', 'Reclutando'].includes(t.status)).length,
      totalProjects: state.innovationProjects.length
    })
  },

  actions: {
    async loadResearchLines() {
      try {
        this.researchLines = await API.getResearchLines()
      } catch (error) {
        const ui = useUIStore()
        ui.showToast('Error', 'Failed to load research lines', 'error')
      }
    },

    async loadClinicalTrials() {
      try {
        this.clinicalTrials = await API.getAllClinicalTrials()
      } catch (error) {
        const ui = useUIStore()
        ui.showToast('Error', 'Failed to load clinical trials', 'error')
      }
    },

    async loadInnovationProjects() {
      try {
        this.innovationProjects = await API.getAllInnovationProjects()
      } catch (error) {
        const ui = useUIStore()
        ui.showToast('Error', 'Failed to load innovation projects', 'error')
      }
    },

    getResearchLineName(id) {
      const line = this.researchLines.find(l => l.id === id)
      return line ? (line.research_line_name || line.name) : 'Not assigned'
    },

    showAddResearchLineModal() {
      this.researchLineModal.show = true
      this.researchLineModal.mode = 'add'
    },

    editResearchLine(line) {
      this.researchLineModal.show = true
      this.researchLineModal.mode = 'edit'
      this.researchLineModal.form = { ...line }
    },

    async deleteResearchLine(id) {
      await API.deleteResearchLine(id)
      this.researchLines = this.researchLines.filter(l => l.id !== id)
      const ui = useUIStore()
      ui.showToast('Success', 'Research line deleted', 'success')
    },

    showAddTrialModal(line = null) {
      this.clinicalTrialModal.show = true
      this.clinicalTrialModal.mode = 'add'
      if (line) this.clinicalTrialModal.form.research_line_id = line.id
    },

    editTrial(trial) {
      this.clinicalTrialModal.show = true
      this.clinicalTrialModal.mode = 'edit'
      this.clinicalTrialModal.form = { ...trial }
    },

    async deleteClinicalTrial(id) {
      await API.deleteClinicalTrial(id)
      this.clinicalTrials = this.clinicalTrials.filter(t => t.id !== id)
      const ui = useUIStore()
      ui.showToast('Success', 'Study deleted', 'success')
    },

    viewTrial(trial) {
      this.trialDetailModal.trial = trial
      this.trialDetailModal.show = true
    },

    showAddProjectModal(line = null) {
      this.innovationProjectModal.show = true
      this.innovationProjectModal.mode = 'add'
      if (line) this.innovationProjectModal.form.research_line_id = line.id
    },

    editProject(project) {
      this.innovationProjectModal.show = true
      this.innovationProjectModal.mode = 'edit'
      this.innovationProjectModal.form = { ...project }
    },

    async deleteInnovationProject(id) {
      await API.deleteInnovationProject(id)
      this.innovationProjects = this.innovationProjects.filter(p => p.id !== id)
      const ui = useUIStore()
      ui.showToast('Success', 'Project deleted', 'success')
    },

    openAssignCoordinatorModal(line) {
      this.assignCoordinatorModal.lineId = line.id
      this.assignCoordinatorModal.lineName = line.research_line_name || line.name
      this.assignCoordinatorModal.selectedCoordinatorId = line.coordinator_id || ''
      this.assignCoordinatorModal.show = true
    },

    async saveCoordinatorAssignment() {
      await API.assignCoordinator(this.assignCoordinatorModal.lineId, this.assignCoordinatorModal.selectedCoordinatorId || null)
      await this.loadResearchLines()
      this.assignCoordinatorModal.show = false
      const ui = useUIStore()
      ui.showToast('Success', 'Coordinator assigned', 'success')
    },

    setActiveMissionLine(line) {
      this.activeMissionLine = line
    },

    getStaffResearchQuick(staffId) {
      return null
    }
  }
})

// ============================================================
// NEWS STORE - Basic Structure
// ============================================================
export const useNewsStore = defineStore('news', {
  state: () => ({
    newsPosts: [],
    newsLoading: false,
    newsFilters: { type: '', status: '', search: '', scope: '' },
    newsModal: { show: false, mode: 'add', _tab: 'meta', form: {} }
  }),

  getters: {
    filteredNews: (state) => {
      let posts = state.newsPosts
      if (state.newsFilters.type) posts = posts.filter(p => p.post_type === state.newsFilters.type)
      if (state.newsFilters.status) posts = posts.filter(p => p.status === state.newsFilters.status)
      if (state.newsFilters.search) {
        const q = state.newsFilters.search.toLowerCase()
        posts = posts.filter(p => (p.title || '').toLowerCase().includes(q) || (p.body || '').toLowerCase().includes(q))
      }
      return posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
  },

  actions: {
    async loadNews() {
      this.newsLoading = true
      try {
        const data = await API.getList('/api/news')
        this.newsPosts = data || []
      } catch {
        this.newsPosts = []
      } finally {
        this.newsLoading = false
      }
    },

    showAddModal() {
      this.newsModal.show = true
      this.newsModal.mode = 'add'
    },

    editNews(post) {
      this.newsModal.show = true
      this.newsModal.mode = 'edit'
      this.newsModal.form = { ...post }
    },

    async deleteNews(id) {
      await API.request(`/api/news/${id}`, { method: 'DELETE' })
      this.newsPosts = this.newsPosts.filter(p => p.id !== id)
      const ui = useUIStore()
      ui.showToast('Deleted', 'Post deleted', 'success')
    },

    formatAuthorName(staffId) {
      const staffStore = useStaffStore()
      const s = staffStore.medicalStaff.find(m => m.id === staffId)
      if (!s) return '—'
      const parts = (s.full_name || '').trim().split(' ')
      const last = parts[parts.length - 1]
      return `Dr. ${last}`
    },

    getLineName(lineId) {
      const researchStore = useResearchStore()
      const l = researchStore.researchLines.find(r => r.id === lineId)
      return l ? `L${l.line_number} — ${l.research_line_name || l.name}` : '—'
    }
  }
})
