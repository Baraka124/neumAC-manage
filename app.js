// app.js - Simplified
import { createApp, ref, reactive, computed, onMounted } from 'vue'
import { createPinia } from 'pinia'
import { 
  useUIStore, 
  useUserStore, 
  useStaffStore, 
  useRotationStore, 
  useTrainingStore, 
  useOnCallStore, 
  useAbsenceStore, 
  useResearchStore, 
  useNewsStore 
} from './stores.js'
import { Utils } from './utils.js'
import { API } from './api.js'
import { PROJECT_STAGES } from './config.js'

const pinia = createPinia()

// Create app directly with a setup function (no App object)
const app = createApp({
  setup() {
    // ============================================================
    // STORES
    // ============================================================
    const uiStore = useUIStore()
    const userStore = useUserStore()
    const staffStore = useStaffStore()
    const rotationStore = useRotationStore()
    const trainingStore = useTrainingStore()
    const onCallStore = useOnCallStore()
    const absenceStore = useAbsenceStore()
    const researchStore = useResearchStore()
    const newsStore = useNewsStore()

    // ============================================================
    // LOCAL STATE
    // ============================================================
    const loading = ref(false)
    const saving = ref(false)
    const showPassword = ref(false)
    const currentTime = ref(new Date())
    const currentView = ref('dashboard')
    
    // View modes
    const staffView = ref('table')
    const onCallView = ref('detailed')
    const rotationView = ref('detailed')
    const trainingUnitView = ref('timeline')
    const trainingUnitHorizon = ref(6)
    const researchHubTab = ref('lines')
    const analyticsActiveTab = ref('dashboard')
    
    // ============================================================
    // FILTERS
    // ============================================================
    const staffFilters = reactive({
      search: '', staffType: '', department: '', status: '', residentCategory: '', hospital: '', networkType: ''
    })
    const rotationFilters = reactive({
      resident: '', status: '', trainingUnit: '', supervisor: '', search: ''
    })
    const onCallFilters = reactive({
      date: '', shiftType: '', physician: '', coverageArea: '', search: ''
    })
    const absenceFilters = reactive({
      staff: '', status: '', reason: '', startDate: '', search: '', hideReturned: true
    })
    const trainingUnitFilters = reactive({
      search: '', department: '', status: ''
    })
    const trialFilters = reactive({
      line: '', phase: '', status: '', search: ''
    })
    const projectFilters = reactive({
      research_line_id: '', category: '', stage: '', funding_status: '', search: ''
    })
    const newsFilters = reactive({
      type: '', status: '', search: '', scope: ''
    })
    
    // ============================================================
    // PAGINATION & SORTING
    // ============================================================
    const pagination = reactive({
      medical_staff: { page: 1, size: 15 },
      rotations: { page: 1, size: 15 },
      oncall: { page: 1, size: 15 },
      absences: { page: 1, size: 15 },
      trials: { page: 1, size: 15 },
      projects: { page: 1, size: 15 }
    })
    
    const sortState = reactive({
      medical_staff: { field: 'full_name', dir: 'asc' },
      rotations: { field: 'start_date', dir: 'desc' },
      oncall: { field: 'duty_date', dir: 'asc' },
      absences: { field: 'start_date', dir: 'desc' }
    })
    
    // ============================================================
    // MODAL STATES
    // ============================================================
    const staffProfileModal = reactive({ show: false, staff: null, activeTab: 'activity', collapsed: {}, researchProfile: null, supervisionData: null, leaveBalance: null, loadingResearch: false, loadingSupervision: false, loadingLeave: false })
    const medicalStaffModal = reactive({ show: false, mode: 'add', activeTab: 'basic', _addingHospital: false, _newHospitalName: '', _newHospitalNetwork: 'external', _certs: [], _addingCert: false, _newCert: { name: '', issued_month: '', renewal_months: 24 }, _addingStaffType: false, _newStaffTypeName: '', _newStaffTypeIsResident: false, _savingStaffType: false, form: {} })
    const rotationModal = reactive({ show: false, mode: 'add', checkingAvailability: false, availability: null, form: {} })
    const rotationViewModal = reactive({ show: false, rotation: null })
    const onCallModal = reactive({ show: false, mode: 'add', form: {} })
    const absenceModal = reactive({ show: false, mode: 'add', form: {} })
    const absenceResolutionModal = reactive({ show: false, absence: null, action: null, saving: false, returnDate: '', returnNotes: '', extendedEndDate: '' })
    const trainingUnitModal = reactive({ show: false, mode: 'add', form: {} })
    const unitResidentsModal = reactive({ show: false, unit: null, rotations: [] })
    const unitCliniciansModal = reactive({ show: false, unit: null, clinicians: [], supervisorId: '', allStaff: [] })
    const unitDetailDrawer = reactive({ show: false, unit: null })
    const occupancyPanel = reactive({ show: false })
    const tlPopover = reactive({ show: false, unitName: '', slotIdx: 0, monthLabel: '', entries: [], x: 0, y: 0 })
    const researchLineModal = reactive({ show: false, mode: 'add', form: {} })
    const clinicalTrialModal = reactive({ show: false, mode: 'add', form: {} })
    const innovationProjectModal = reactive({ show: false, mode: 'add', form: {} })
    const assignCoordinatorModal = reactive({ show: false, lineId: null, lineName: '', selectedCoordinatorId: '' })
    const trialDetailModal = reactive({ show: false, trial: null })
    const newsModal = reactive({ show: false, mode: 'add', _tab: 'meta', form: {} })
    const newsDrawer = reactive({ show: false, post: null })
    const deptPanel = reactive({ show: false, dept: null, tab: 'staff' })
    const reassignmentModal = reactive({ show: false, staff: null, saving: false, affectedShifts: [], affectedRotations: [], affectedAbsences: [], replacements: {} })
    const deptReassignModal = reactive({ show: false, dept: null, impact: { activeStaff: [], activeUnits: [], activeRotations: [] }, staffTargetDeptId: '', unitsTargetDeptId: '' })
    const staffTypeModal = reactive({ show: false, mode: 'add', saving: false, form: {} })
    const exportModal = reactive({ show: false, type: 'clinical-trials', format: 'csv', loading: false })
    const userProfileModal = reactive({ show: false, form: { full_name: '', email: '', department_id: '', linked_staff_id: null } })
    const confirmationModal = reactive({ show: false, title: '', message: '', icon: 'fa-question-circle', confirmButtonText: 'Confirm', confirmButtonClass: 'btn-primary', cancelButtonText: 'Cancel', onConfirm: null, details: '' })
    const announcementReadModal = reactive({ show: false, announcement: null })
    const communicationsModal = reactive({ show: false, activeTab: 'announcement', mode: 'add', form: {} })
    const activationModal = reactive({ show: false, rotations: [], selectedRotation: null, notes: '', action: 'activate' })
    
    // ============================================================
    // SYSTEM DATA
    // ============================================================
    const systemStats = reactive({ totalStaff: 0, activeAttending: 0, activeResidents: 0, onCallNow: 0, inSurgery: 0, activeRotations: 0, endingThisWeek: 0, startingNextWeek: 0, onLeaveStaff: 0, departmentStatus: 'normal', activePatients: 0, icuOccupancy: 0, wardOccupancy: 0, pendingApprovals: 0, nextShiftChange: '' })
    const clinicalStatus = ref(null)
    const clinicalStatusHistory = ref([])
    const isLoadingStatus = ref(false)
    const newStatusText = ref('')
    const selectedAuthorId = ref('')
    const expiryHours = ref(8)
    const liveStatsEditMode = ref(false)
    const activeMedicalStaff = ref([])
    const quickStatus = ref('')
    const researchDashboard = ref(null)
    const researchLinesPerformance = ref([])
    const partnerCollaborations = ref(null)
    const trialsTimeline = ref(null)
    const analyticsSummary = ref(null)
    const loadingAnalytics = ref(false)
    const dailyBriefing = ref([])
    const todaysOnCall = ref([])
    const upcomingOnCallDays = ref([])
    const residentGapWarnings = ref([])
    const announcements = ref([])
    const monthHorizon = ref(6)
    const monthOffset = ref(0)
    const departments = ref([])
    
    // Login form
    const loginForm = ref({ email: '', password: '', remember_me: false })
    const loginLoading = ref(false)
    const loginError = ref('')
    
    // ============================================================
    // HELPER FUNCTIONS (all your existing helpers go here)
    // ============================================================
    const hasPermission = (module, action) => userStore.hasPermission(module, action)
    const formatDate = (d) => Utils.formatDate(d)
    const formatDateShort = (d) => Utils.formatDateShort(d)
    const formatRelativeDate = (d) => Utils.formatRelativeDate(d)
    const formatTime = (d) => Utils.formatTime(d)
    const formatRelativeTime = (d) => Utils.formatRelativeTime(d)
    const formatNewsDate = (d) => Utils.formatNewsDate(d)
    const getInitials = (n) => Utils.getInitials(n)
    const getStaffName = (id) => staffStore.getStaffName(id)
    const getTrainingUnitName = (id) => trainingStore.getTrainingUnitName(id)
    const getResidentName = (id) => staffStore.getStaffName(id)
    const getSupervisorName = (id) => staffStore.getStaffName(id)
    const getPhysicianName = (id) => staffStore.getStaffName(id)
    const getDepartmentName = (id) => departments.value.find(d => d.id === id)?.name || ''
    const getResearchLineName = (id) => researchStore.getResearchLineName(id)
    const getPhaseColor = (phase) => Utils.getPhaseColor(phase)
    const getStageColor = (stage) => Utils.getStageColor(stage)
    const getStageConfig = (stage) => Utils.getStageConfig(stage)
    const getPartnerTypeColor = (type) => Utils.getPartnerTypeColor(type)
    
    const formatStaffType = (t) => staffStore.formatStaffType(t)
    const formatStaffTypeShort = (t) => {
      const short = { attending_physician: 'Attending', medical_resident: 'Resident', fellow: 'Fellow', nurse_practitioner: 'NP' }
      return short[t] || t?.replace(/_/g, ' ') || t
    }
    const getStaffTypeClass = (t) => staffStore.getStaffTypeClass(t)
    const isResidentType = (t) => staffStore.isResidentType(t)
    const formatEmploymentStatus = (s) => staffStore.formatEmploymentStatus(s)
    const formatAbsenceReason = (r) => absenceStore.formatAbsenceReason(r)
    const formatRotationStatus = (s) => rotationStore.formatRotationStatus(s)
    const formatStudyStatus = (s) => {
      const map = { 'Reclutando': 'Recruiting', 'Activo': 'Active', 'Completado': 'Completed', 'Suspendido': 'Suspended' }
      return map[s] || s
    }
    const formatAudience = (a) => {
      const map = { all_staff: 'All Staff', all: 'All (incl. admin)', residents_only: 'Residents Only', attending_only: 'Attendings Only' }
      return map[a] || a
    }
    
    const calculateAbsenceDuration = (s, e) => Utils.dateDiff(s, e)
    const getDaysRemaining = (d) => Utils.daysUntil(d)
    const getDaysUntilStart = (d) => Utils.daysUntil(d)
    
    const getUnitActiveRotationCount = (id) => trainingStore.getUnitActiveRotationCount(id)
    const getUnitRotations = (id) => trainingStore.getUnitRotations(id)
    const getUnitScheduledCount = (id) => trainingStore.getUnitScheduledCount(id)
    const getUnitOverlapWarning = (id) => trainingStore.getUnitOverlapWarning(id)
    const getUnitMonthOccupancy = (unitId, year, month) => trainingStore.getUnitMonthOccupancy(unitId, year, month)
    const getNextFreeMonth = (unitId) => trainingStore.getNextFreeMonth(unitId)
    const getTimelineMonths = (n) => trainingStore.getTimelineMonths(n)
    const getUnitSlots = (unitId, max, horizon) => trainingStore.getUnitSlots(unitId, max, horizon)
    const getDaysUntilFree = (endDate) => trainingStore.getDaysUntilFree(endDate)
    
    const getHorizonMonths = (n, offset) => rotationStore.getHorizonMonths(n, offset)
    const getHorizonRangeLabel = () => rotationStore.getHorizonRangeLabel()
    const getResidentRotationsInHorizon = (resident) => rotationStore.getResidentRotationsInHorizon(resident)
    const getRotationBarStyle = (rotation) => rotationStore.getRotationBarStyle(rotation)
    const rotationStartsInHorizon = (rotation) => rotationStore.rotationStartsInHorizon(rotation)
    const rotationEndsInHorizon = (rotation) => rotationStore.rotationEndsInHorizon(rotation)
    
    const getRotationProgress = (rotation) => {
      if (!rotation) return { pct: 0, label: '', urgent: false, done: false }
      const start = new Date(Utils.normalizeDate(rotation.start_date) + 'T00:00:00')
      const end = new Date(Utils.normalizeDate(rotation.end_date) + 'T23:59:59')
      const now = new Date()
      if (rotation.rotation_status === 'completed') return { pct: 100, label: 'Completed', urgent: false, done: true }
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return { pct: 0, label: '', urgent: false, done: false }
      const total = end - start
      const elapsed = now - start
      const pct = Math.min(100, Math.max(0, Math.round(elapsed / total * 100)))
      const daysLeft = Math.ceil((end - now) / 86400000)
      const urgent = daysLeft <= 7 && daysLeft >= 0
      const label = daysLeft <= 0 ? 'Ending' : daysLeft === 1 ? '1 day left' : `${daysLeft}d left`
      return { pct, label, urgent, done: false }
    }
    
    const getCurrentRotationForStaff = (id) => rotationStore.rotations.find(r => r.resident_id === id && r.rotation_status === 'active')
    const getRotationHistory = (id) => rotationStore.rotations.filter(r => r.resident_id === id && !['active', 'scheduled'].includes(r.rotation_status))
    const getUpcomingRotations = (id) => rotationStore.rotations.filter(r => r.resident_id === id && ['active', 'scheduled'].includes(r.rotation_status))
    const getRotationDaysLeft = (id) => { const r = getCurrentRotationForStaff(id); return r ? getDaysRemaining(r.end_date) : 0 }
    const getCurrentRotationSupervisor = (id) => { const r = getCurrentRotationForStaff(id); return r?.supervising_attending_id ? getStaffName(r.supervising_attending_id) : 'Not assigned' }
    const isOnCallToday = (staffId) => onCallStore.isToday(onCallStore.onCallSchedule.find(s => s.primary_physician_id === staffId || s.backup_physician_id === staffId)?.duty_date)
    const getUpcomingOnCall = (staffId) => onCallStore.onCallSchedule.filter(s => (s.primary_physician_id === staffId || s.backup_physician_id === staffId) && Utils.normalizeDate(s.duty_date) >= Utils.normalizeDate(new Date()))
    const getUpcomingLeave = (staffId) => absenceStore.absences.filter(a => a.staff_member_id === staffId && Utils.normalizeDate(a.start_date) >= Utils.normalizeDate(new Date()) && a.current_status !== 'cancelled')
    
    // ============================================================
    // ACTION FUNCTIONS (all your existing action functions go here)
    // ============================================================
    const goToPage = (view, page) => { if (pagination[view]) pagination[view].page = page }
    const sortBy = (view, field) => { const s = sortState[view]; if (s) { s.dir = (s.field === field && s.dir === 'asc') ? 'desc' : 'asc'; s.field = field } }
    const sortIcon = (view, field) => { const s = sortState[view]; if (!s || s.field !== field) return 'fa-sort'; return s.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down' }
    
    const viewStaffDetails = async (staff) => {
      if (!staff || !staff.id) return
      staffProfileModal.staff = staff
      staffProfileModal.activeTab = 'activity'
      staffProfileModal.show = true
      const quickProfile = researchStore.getStaffResearchQuick(staff.id)
      if (quickProfile) staffProfileModal.researchProfile = quickProfile
    }
    
    const showAddMedicalStaffModal = (opts = {}) => {
      medicalStaffModal.mode = 'add'
      medicalStaffModal.activeTab = 'basic'
      medicalStaffModal.form = {
        full_name: '', staff_type: 'medical_resident', staff_id: `MD-${Date.now().toString().slice(-6)}`,
        employment_status: 'active', professional_email: '', department_id: opts.department_id || '',
        academic_degree: '', specialization: '', training_year: '', clinical_certificate: '',
        certificate_status: '', mobile_phone: '', medical_license: '', can_supervise_residents: false,
        special_notes: '', can_be_pi: false, can_be_coi: false, other_certificate: '',
        resident_category: null, home_department: null, external_institution: null,
        home_department_id: null, external_contact_name: null, external_contact_email: null,
        external_contact_phone: null, academic_degree_id: null, has_medical_license: false,
        residency_start_date: null, residency_year_override: null, is_chief_of_department: false,
        is_research_coordinator: false, is_resident_manager: false, is_oncall_manager: false,
        clinical_study_certificates: [], hospital_id: null, has_phd: false, phd_field: '',
        office_phone: '', years_experience: null, _networkHint: null, _coordLineId: null, _investigadorLines: []
      }
      medicalStaffModal.show = true
    }
    
    const editMedicalStaff = (staff) => {
      medicalStaffModal.mode = 'edit'
      medicalStaffModal.activeTab = 'basic'
      medicalStaffModal.form = { ...staff, full_name: staff.full_name || '', professional_email: staff.professional_email || '' }
      medicalStaffModal.show = true
    }
    
    const deleteMedicalStaff = (staff) => {
      uiStore.showConfirmation({
        title: 'Remove Staff Member', message: `Remove ${staff.full_name} from active staff?`,
        icon: 'fa-user-times', confirmButtonText: 'Confirm Removal', confirmButtonClass: 'btn-danger',
        details: 'All historical records are preserved for audit purposes.',
        onConfirm: async () => { await staffStore.deleteStaff(staff.id); uiStore.showToast('Done', `${staff.full_name} has been deactivated`, 'success') }
      })
    }
    
    const showAddRotationModal = (resident = null, unit = null) => {
      rotationModal.mode = 'add'
      rotationModal.form = {
        rotation_id: `ROT-${Date.now().toString().slice(-6)}`,
        resident_id: resident?.id || '',
        training_unit_id: unit?.id || '',
        start_date: Utils.localDateStr(new Date()),
        end_date: Utils.localDateStr(new Date(Date.now() + 30 * 86400000)),
        rotation_status: 'scheduled', rotation_category: 'clinical_rotation', supervising_attending_id: ''
      }
      rotationModal.show = true
    }
    
    const editRotation = (rotation) => {
      rotationModal.mode = 'edit'
      rotationModal.form = { ...rotation, start_date: Utils.normalizeDate(rotation.start_date), end_date: Utils.normalizeDate(rotation.end_date) }
      rotationModal.show = true
    }
    
    const deleteRotation = (rotation) => {
      uiStore.showConfirmation({
        title: 'Terminate Rotation', message: 'This will mark the rotation as terminated early.',
        icon: 'fa-stop-circle', confirmButtonText: 'Terminate', confirmButtonClass: 'btn-danger',
        details: `Resident: ${getResidentName(rotation.resident_id)}`,
        onConfirm: async () => { await rotationStore.deleteRotation(rotation.id); uiStore.showToast('Success', 'Rotation terminated', 'success') }
      })
    }
    
    const viewRotationDetails = (rotation) => {
      rotationViewModal.rotation = {
        ...rotation, unitName: getTrainingUnitName(rotation.training_unit_id),
        residentName: getResidentName(rotation.resident_id), supervisorName: getStaffName(rotation.supervising_attending_id) || '—',
        clinicalDuration: Utils.formatClinicalDuration(rotation.start_date, rotation.end_date),
        daysTotal: Math.max(1, Math.round((new Date(rotation.end_date) - new Date(rotation.start_date)) / 86400000)),
        daysLeft: Math.max(0, Math.round((new Date(rotation.end_date) - new Date()) / 86400000))
      }
      rotationViewModal.show = true
    }
    
    const showAddOnCallModal = (physician = null) => {
      onCallModal.mode = 'add'
      onCallModal.form = {
        duty_date: Utils.localDateStr(new Date()), shift_type: 'primary_call',
        start_time: '15:00', end_time: '08:00', primary_physician_id: physician?.id || '',
        backup_physician_id: '', coverage_area: 'emergency', coverage_notes: ''
      }
      onCallModal.show = true
    }
    
    const editOnCallSchedule = (schedule) => {
      onCallModal.mode = 'edit'
      onCallModal.form = { ...schedule, duty_date: Utils.normalizeDate(schedule.duty_date), shift_type: ['primary', 'primary_call'].includes(schedule.shift_type) ? 'primary_call' : 'backup_call' }
      onCallModal.show = true
    }
    
    const deleteOnCallSchedule = (schedule) => {
      uiStore.showConfirmation({
        title: 'Delete On-Call', message: 'Delete this on-call schedule?',
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        details: `Physician: ${getPhysicianName(schedule.primary_physician_id)}`,
        onConfirm: async () => { await onCallStore.deleteOnCall(schedule.id); uiStore.showToast('Success', 'Schedule deleted', 'success') }
      })
    }
    
    const showAddAbsenceModal = (staff = null) => {
      absenceModal.mode = 'add'
      absenceModal.form = {
        staff_member_id: staff?.id || '', absence_type: 'planned', absence_reason: 'vacation',
        start_date: Utils.localDateStr(new Date()), end_date: Utils.localDateStr(new Date(Date.now() + 7 * 86400000)),
        covering_staff_id: '', coverage_notes: '', coverage_arranged: false, hod_notes: ''
      }
      absenceModal.show = true
    }
    
    const editAbsence = (absence) => {
      absenceModal.mode = 'edit'
      absenceModal.form = {
        id: absence.id, staff_member_id: absence.staff_member_id || '', absence_type: absence.absence_type || 'planned',
        absence_reason: absence.absence_reason || 'vacation', start_date: Utils.normalizeDate(absence.start_date),
        end_date: Utils.normalizeDate(absence.end_date), covering_staff_id: absence.covering_staff_id || '',
        coverage_notes: absence.coverage_notes || '', coverage_arranged: absence.coverage_arranged ?? false,
        hod_notes: absence.hod_notes || '', current_status: absence.current_status || null
      }
      absenceModal.show = true
    }
    
    const deleteAbsence = (absence) => {
      uiStore.showConfirmation({
        title: 'Cancel Absence Record', message: 'This will mark the absence as cancelled.',
        icon: 'fa-ban', confirmButtonText: 'Cancel Absence', confirmButtonClass: 'btn-danger',
        details: `Staff: ${getStaffName(absence.staff_member_id)}`,
        onConfirm: async () => { await absenceStore.deleteAbsence(absence.id); uiStore.showToast('Success', 'Absence record cancelled', 'success') }
      })
    }
    
    const openResolutionModal = (absence) => {
      absenceResolutionModal.absence = absence
      absenceResolutionModal.action = 'confirm_return'
      absenceResolutionModal.returnDate = Utils.localDateStr(new Date())
      absenceResolutionModal.returnNotes = ''
      absenceResolutionModal.extendedEndDate = Utils.localDateStr(new Date(Date.now() + 7 * 86400000))
      absenceResolutionModal.show = true
    }
    
    const resolveAbsence = async () => {
      const m = absenceResolutionModal
      if (!m.absence) return
      m.saving = true
      try {
        if (m.action === 'confirm_return') {
          await absenceStore.returnToDuty(m.absence.id, m.returnDate, m.returnNotes || 'Staff confirmed returned to duty')
        } else if (m.action === 'extend') {
          await absenceStore.updateAbsence(m.absence.id, {
            ...m.absence, end_date: m.extendedEndDate,
            hod_notes: (m.absence.hod_notes ? m.absence.hod_notes + '\n' : '') + `[EXTENDED: ${new Date().toISOString()}] New end date: ${m.extendedEndDate}` + (m.returnNotes ? ` — ${m.returnNotes}` : '')
          })
        } else if (m.action === 'archive') {
          await absenceStore.deleteAbsence(m.absence.id)
        }
        m.show = false
        await absenceStore.loadAbsences()
        uiStore.showToast('Success', 'Absence resolved', 'success')
      } catch (e) {
        uiStore.showToast('Error', e?.message || 'Failed to resolve absence', 'error')
      } finally {
        m.saving = false
      }
    }
    
    const showAddTrainingUnitModal = () => {
      trainingUnitModal.mode = 'add'
      trainingUnitModal.form = {
        unit_name: '', unit_code: '', department_id: '', maximum_residents: 10,
        unit_status: 'active', unit_type: 'training_unit', unit_description: '',
        specialty: '', supervising_attending_id: ''
      }
      trainingUnitModal.show = true
    }
    
    const editTrainingUnit = (unit) => {
      trainingUnitModal.mode = 'edit'
      trainingUnitModal.form = { ...unit }
      trainingUnitModal.show = true
    }
    
    const deleteTrainingUnit = (unit) => {
      uiStore.showConfirmation({
        title: 'Delete Training Unit', message: `Delete "${unit.unit_name}"?`,
        icon: 'fa-trash', confirmButtonText: 'Delete Unit', confirmButtonClass: 'btn-danger',
        onConfirm: async () => { await trainingStore.deleteTrainingUnit(unit.id); uiStore.showToast('Deactivated', `${unit.unit_name} deactivated`, 'success') }
      })
    }
    
    const openUnitDetail = (unit) => {
      const today = new Date()
      const occ = getUnitMonthOccupancy(unit.id, today.getFullYear(), today.getMonth())
      const nextFree = getNextFreeMonth(unit.id)
      unitDetailDrawer.unit = { ...unit, occ, nextFree }
      unitDetailDrawer.show = true
    }
    
    const openUnitClinicians = (unit) => {
      unitCliniciansModal.unit = unit
      unitCliniciansModal.supervisorId = unit.supervisor_id || unit.supervising_attending_id || ''
      unitCliniciansModal.allStaff = staffStore.medicalStaff.filter(s => (s.staff_type === 'attending_physician' || s.staff_type === 'fellow') && s.employment_status === 'active')
      unitCliniciansModal.show = true
    }
    
    const saveUnitClinicians = async () => {
      const u = unitCliniciansModal.unit
      await trainingStore.updateTrainingUnit(u.id, { ...u, supervising_attending_id: unitCliniciansModal.supervisorId || null })
      unitCliniciansModal.show = false
      uiStore.showToast('Saved', 'Supervisor assignment updated', 'success')
    }
    
    const openCellPopover = (event, unitId, unitName, slot, month) => {
      trainingStore.openCellPopover(event, unitId, unitName, slot, month)
      Object.assign(tlPopover, trainingStore.tlPopover)
    }
    
    const closeCellPopover = () => {
      trainingStore.closeCellPopover()
      tlPopover.show = false
    }
    
    const showCommunicationsModal = () => {
      communicationsModal.mode = 'add'
      communicationsModal.activeTab = 'announcement'
      communicationsModal.form = { id: null, title: '', content: '', priority: 'normal', target_audience: 'all_staff' }
      communicationsModal.show = true
    }
    
    const saveCommunication = async () => {
      saving.value = true
      try {
        if (communicationsModal.activeTab === 'announcement') {
          const f = communicationsModal.form
          if (communicationsModal.mode === 'edit') {
            await API.updateAnnouncement(f.id, { title: f.title, content: f.content, priority_level: f.priority, target_audience: f.target_audience })
          } else {
            await API.createAnnouncement({ title: f.title, content: f.content, priority_level: f.priority, target_audience: f.target_audience })
          }
          const data = await API.getAnnouncements()
          announcements.value = data
          uiStore.showToast('Success', communicationsModal.mode === 'edit' ? 'Announcement updated' : 'Announcement posted', 'success')
        }
        communicationsModal.show = false
      } catch (e) {
        uiStore.showToast('Error', e?.message || 'An unexpected error occurred', 'error')
      } finally {
        saving.value = false
      }
    }
    
    const showAddResearchLineModal = () => researchStore.showAddResearchLineModal()
    const editResearchLine = (line) => researchStore.editResearchLine(line)
    const deleteResearchLine = (line) => {
      uiStore.showConfirmation({
        title: 'Delete Research Line', message: `Delete "${line.research_line_name || line.name}"?`,
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        onConfirm: async () => { await researchStore.deleteResearchLine(line.id); uiStore.showToast('Success', 'Research line deleted', 'success') }
      })
    }
    
    const showAddTrialModal = (line = null) => researchStore.showAddTrialModal(line)
    const editTrial = (trial) => researchStore.editTrial(trial)
    const deleteClinicalTrial = (trial) => {
      uiStore.showConfirmation({
        title: 'Delete Study', message: `Delete "${trial.title}"?`,
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        onConfirm: async () => { await researchStore.deleteClinicalTrial(trial.id); uiStore.showToast('Success', 'Study deleted', 'success') }
      })
    }
    const viewTrial = (trial) => researchStore.viewTrial(trial)
    
    const showAddProjectModal = (line = null) => researchStore.showAddProjectModal(line)
    const editProject = (project) => researchStore.editProject(project)
    const deleteInnovationProject = (project) => {
      uiStore.showConfirmation({
        title: 'Delete Project', message: `Delete "${project.title}"?`,
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        onConfirm: async () => { await researchStore.deleteInnovationProject(project.id); uiStore.showToast('Success', 'Project deleted', 'success') }
      })
    }
    
    const openAssignCoordinatorModal = (line) => researchStore.openAssignCoordinatorModal(line)
    const saveCoordinatorAssignment = async () => {
      await researchStore.saveCoordinatorAssignment()
      assignCoordinatorModal.show = false
    }
    
    const openLineDetail = (line) => researchStore.setActiveMissionLine(line)
    const drillToTrials = (lineId) => { trialFilters.line = lineId; researchHubTab.value = 'trials' }
    const drillToProjects = (lineId) => { projectFilters.research_line_id = lineId; researchHubTab.value = 'projects' }
    
    const showAddNewsModal = () => newsStore.showAddModal()
    const editNews = (post) => newsStore.editNews(post)
    const deleteNews = (post) => {
      uiStore.showConfirmation({
        title: 'Delete Post', message: `Permanently delete "${post.title}"?`,
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        onConfirm: async () => { await newsStore.deleteNews(post.id); uiStore.showToast('Deleted', 'Post deleted', 'success') }
      })
    }
    const publishNews = (post) => newsStore.publishNews(post.id, post)
    const archiveNews = (post) => newsStore.archiveNews(post.id, post)
    const toggleNewsPublic = (post) => newsStore.togglePublic(post.id, post)
    const openNewsDrawer = (post) => { newsDrawer.post = post; newsDrawer.show = true }
    const closeNewsDrawer = () => { newsDrawer.show = false; newsDrawer.post = null }
    
    const showExportModal = () => { exportModal.show = true }
    const handleExport = async () => {
      exportModal.loading = true
      try {
        const data = await API.exportData(exportModal.type, exportModal.format)
        const blob = new Blob([data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportModal.type}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        uiStore.showToast('Success', 'Export completed', 'success')
        exportModal.show = false
      } catch (e) {
        uiStore.showToast('Error', e.message || 'Export failed', 'error')
      } finally {
        exportModal.loading = false
      }
    }
    
    const refreshStatus = () => {
      loadClinicalStatus()
      loadClinicalStatusHistory()
    }
    
    const showCreateStatusModal = () => {
      liveStatsEditMode.value = true
      newStatusText.value = ''
      selectedAuthorId.value = ''
      expiryHours.value = 8
    }
    
    const calculateTimeRemaining = (expiry) => {
      if (!expiry) return 'N/A'
      const diff = new Date(expiry) - new Date()
      if (diff <= 0) return 'Expired'
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      return h > 0 ? `${h}h ${m}m` : `${m}m`
    }
    
    const isStatusExpired = (expiry) => {
      if (!expiry) return true
      return new Date() > new Date(expiry)
    }
    
    const loadClinicalStatus = async () => {
      isLoadingStatus.value = true
      try {
        const r = await API.getClinicalStatus()
        clinicalStatus.value = r?.success ? r.data : null
      } catch {
        clinicalStatus.value = null
      } finally {
        isLoadingStatus.value = false
      }
    }
    
    const loadClinicalStatusHistory = async () => {
      try {
        const history = await API.getClinicalStatusHistory(20)
        clinicalStatusHistory.value = history
      } catch {
        clinicalStatusHistory.value = []
      }
    }
    
    const loadAllData = async () => {
      loading.value = true
      try {
        await Promise.all([
          staffStore.loadStaff(),
          staffStore.loadAcademicDegrees(),
          rotationStore.loadRotations(),
          trainingStore.loadTrainingUnits(),
          onCallStore.loadOnCallSchedule(),
          absenceStore.loadAbsences(),
          researchStore.loadResearchLines(),
          researchStore.loadClinicalTrials(),
          researchStore.loadInnovationProjects(),
          newsStore.loadNews(),
          API.getDepartments().then(data => { departments.value = data })
        ])
        await onCallStore.loadTodaysOnCall()
        await Promise.all([
          API.getAnnouncements().then(data => { announcements.value = data }),
          loadClinicalStatus(),
          loadClinicalStatusHistory(),
          API.getSystemStats().then(data => { Object.assign(systemStats, data) }),
          API.getAnalyticsSummary().then(data => { analyticsSummary.value = data }),
          API.getResearchDashboard().then(data => { researchDashboard.value = data }),
          API.getResearchLinesPerformance().then(data => { researchLinesPerformance.value = data }),
          API.getPartnerCollaborations().then(data => { partnerCollaborations.value = data }),
          API.getClinicalTrialsTimeline().then(data => { trialsTimeline.value = data })
        ])
        updateDashboardStats()
      } catch (e) {
        uiStore.showToast('Error', 'Failed to load some data', 'error')
      } finally {
        loading.value = false
      }
    }
    
    const updateDashboardStats = () => {
      systemStats.totalStaff = staffStore.medicalStaff.length
      systemStats.activeAttending = staffStore.medicalStaff.filter(s => s.staff_type === 'attending_physician' && s.employment_status === 'active').length
      systemStats.activeResidents = staffStore.medicalStaff.filter(s => isResidentType(s.staff_type) && s.employment_status === 'active').length
      systemStats.onLeaveStaff = absenceStore.absences.filter(a => { const today = Utils.normalizeDate(new Date()); const start = Utils.normalizeDate(a.start_date); const end = Utils.normalizeDate(a.end_date); return start <= today && today <= end && a.current_status !== 'cancelled' }).length
      systemStats.activeRotations = rotationStore.rotations.filter(r => r.rotation_status === 'active').length
      const today = Utils.normalizeDate(new Date())
      const nextWeek = Utils.normalizeDate(new Date(Date.now() + 7 * 86400000))
      systemStats.endingThisWeek = rotationStore.rotations.filter(r => r.rotation_status === 'active' && Utils.normalizeDate(r.end_date) >= today && Utils.normalizeDate(r.end_date) <= nextWeek).length
      const twoWeeks = Utils.normalizeDate(new Date(Date.now() + 14 * 86400000))
      systemStats.startingNextWeek = rotationStore.rotations.filter(r => r.rotation_status === 'scheduled' && Utils.normalizeDate(r.start_date) >= nextWeek && Utils.normalizeDate(r.start_date) <= twoWeeks).length
      const unique = new Set()
      onCallStore.onCallSchedule.filter(s => Utils.normalizeDate(s.duty_date) === today).forEach(s => { if (s.primary_physician_id) unique.add(s.primary_physician_id); if (s.backup_physician_id) unique.add(s.backup_physician_id) })
      systemStats.onCallNow = unique.size
      todaysOnCall.value = onCallStore.todaysOnCall
      upcomingOnCallDays.value = onCallStore.upcomingOnCallDays
      residentGapWarnings.value = rotationStore.residentGapWarnings
      
      const items = []
      const endingThisWeek = rotationStore.rotations.filter(r => r.rotation_status === 'active' && Utils.normalizeDate(r.end_date) >= today && Utils.normalizeDate(r.end_date) <= nextWeek)
      if (endingThisWeek.length > 0) items.push({ type: 'warn', text: `${endingThisWeek.length} rotation${endingThisWeek.length > 1 ? 's' : ''} ending this week`, action: 'resident_rotations', icon: 'fa-clock' })
      const startingThisWeek = rotationStore.rotations.filter(r => r.rotation_status === 'scheduled' && Utils.normalizeDate(r.start_date) >= today && Utils.normalizeDate(r.start_date) <= nextWeek)
      if (startingThisWeek.length > 0) items.push({ type: 'ok', text: `${startingThisWeek.length} rotation${startingThisWeek.length > 1 ? 's' : ''} starting this week`, action: 'resident_rotations', icon: 'fa-play-circle' })
      const ocGaps = []
      for (let i = 0; i < 7; i++) { const d = new Date(Date.now() + i * 86400000); const ds = Utils.normalizeDate(d); const hasPrimary = onCallStore.onCallSchedule.some(s => Utils.normalizeDate(s.duty_date) === ds && s.shift_type === 'primary_call'); if (!hasPrimary) ocGaps.push(d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })) }
      if (ocGaps.length > 0) items.push({ type: 'danger', text: `${ocGaps.length} day${ocGaps.length > 1 ? 's' : ''} without primary on-call`, action: 'oncall_schedule', icon: 'fa-phone-slash' })
      dailyBriefing.value = items.slice(0, 3)
    }
    
    const switchView = async (view, filters = {}) => {
      currentView.value = view
      uiStore.mobileMenuOpen = false
      if (filters.department && staffFilters) staffFilters.department = filters.department
      if (filters.residentCategory && staffFilters) { staffFilters.staffType = 'medical_resident'; staffFilters.residentCategory = filters.residentCategory }
      if (filters.rotationStatus && rotationFilters) rotationFilters.status = filters.rotationStatus
      if (filters.trainingUnit && rotationFilters) rotationFilters.trainingUnit = filters.trainingUnit
      uiStore.searchResultsOpen = false
      if (view === 'research_hub') {
        if (!researchHubTab.value) researchHubTab.value = 'lines'
        if (researchStore.researchLines.length === 0) {
          await researchStore.loadResearchLines()
          await researchStore.loadClinicalTrials()
          await researchStore.loadInnovationProjects()
        }
      }
    }
    
    const handleLogin = async () => {
      if (!loginForm.value.email || !loginForm.value.password) {
        uiStore.showToast('Error', 'Please fill all required fields', 'error')
        return
      }
      loginLoading.value = true
      loginError.value = ''
      try {
        const response = await API.login(loginForm.value.email, loginForm.value.password)
        userStore.currentUser = response.user
        localStorage.setItem('neumocare_user', JSON.stringify(response.user))
        uiStore.showToast('Success', `Welcome, ${response.user.full_name}!`, 'success')
        await loadAllData()
        currentView.value = 'dashboard'
      } catch (e) {
        loginError.value = e.message || 'Invalid email or password'
        uiStore.showToast('Error', 'Login failed', 'error')
      } finally {
        loginLoading.value = false
      }
    }
    
    const handleLogout = () => {
      uiStore.showConfirmation({
        title: 'Logout', message: 'Are you sure you want to logout?',
        icon: 'fa-sign-out-alt', confirmButtonText: 'Logout', confirmButtonClass: 'btn-danger',
        onConfirm: async () => { await userStore.logout(); currentView.value = 'login'; uiStore.showToast('Info', 'Logged out successfully', 'info') }
      })
    }
    
    const showUserProfileModal = () => {
      userProfileModal.form.full_name = userStore.currentUser?.full_name || ''
      userProfileModal.form.email = userStore.currentUser?.email || ''
      userProfileModal.show = true
      uiStore.userMenuOpen = false
    }
    
    const saveUserProfile = async () => {
      saving.value = true
      try {
        userStore.currentUser.full_name = userProfileModal.form.full_name
        localStorage.setItem('neumocare_user', JSON.stringify(userStore.currentUser))
        userProfileModal.show = false
        uiStore.showToast('Success', 'Profile updated', 'success')
      } catch (e) {
        uiStore.showToast('Error', 'Failed to update profile', 'error')
      } finally {
        saving.value = false
      }
    }
    
    const handleGlobalSearch = () => {
      if (uiStore.globalSearchQuery.trim()) {
        uiStore.searchResultsOpen = true
      }
    }
    
    const clearSearch = () => {
      uiStore.globalSearchQuery = ''
      uiStore.searchResultsOpen = false
    }
    
    const getCurrentViewTitle = () => {
      const titles = { dashboard: 'Dashboard Overview', medical_staff: 'Medical Staff Management', oncall_schedule: 'On-call Schedule', resident_rotations: 'Resident Rotations', training_units: 'Clinical Units', staff_absence: 'Staff Absence Management', research_hub: 'Research Hub', news: 'News & Posts' }
      return titles[currentView.value] || 'NeumoCare Dashboard'
    }
    
    const getCurrentViewSubtitle = () => {
      const subtitles = { dashboard: 'Real-time department overview and analytics', medical_staff: 'Manage physicians, residents, and clinical staff', oncall_schedule: 'View and manage on-call physician schedules', resident_rotations: 'Track and manage resident training rotations', training_units: 'Clinical units and resident assignments', staff_absence: 'Track staff absences and coverage assignments', research_hub: 'Research lines, studies, projects and analytics', news: 'Department news and publications' }
      return subtitles[currentView.value] || ''
    }
    
    // ============================================================
    // COMPUTED FILTERED LISTS
    // ============================================================
    const filteredMedicalStaff = computed(() => {
      let f = staffStore.medicalStaff
      if (staffFilters.search) { const q = staffFilters.search.toLowerCase(); f = f.filter(x => x.full_name?.toLowerCase().includes(q) || x.professional_email?.toLowerCase().includes(q)) }
      if (staffFilters.staffType) f = f.filter(x => x.staff_type === staffFilters.staffType)
      if (staffFilters.department) f = f.filter(x => x.department_id === staffFilters.department)
      if (staffFilters.status) f = f.filter(x => x.employment_status === staffFilters.status)
      if (staffFilters.residentCategory) f = f.filter(x => x.resident_category === staffFilters.residentCategory)
      const field = sortState.medical_staff.field; const dir = sortState.medical_staff.dir
      return [...f].sort((a, b) => { let va = a[field] ?? '', vb = b[field] ?? ''; const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true }); return dir === 'asc' ? cmp : -cmp })
    })
    
    const filteredRotations = computed(() => {
      let f = rotationStore.rotations
      if (rotationFilters.resident) f = f.filter(r => r.resident_id === rotationFilters.resident)
      if (rotationFilters.status) f = f.filter(r => r.rotation_status === rotationFilters.status)
      if (rotationFilters.trainingUnit) f = f.filter(r => r.training_unit_id === rotationFilters.trainingUnit)
      if (rotationFilters.search) { const q = rotationFilters.search.toLowerCase(); f = f.filter(r => getResidentName(r.resident_id).toLowerCase().includes(q)) }
      const field = sortState.rotations.field; const dir = sortState.rotations.dir
      return [...f].sort((a, b) => { let va = a[field] ?? '', vb = b[field] ?? ''; if (field === 'start_date' || field === 'end_date') { va = Utils.normalizeDate(va); vb = Utils.normalizeDate(vb) } const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true }); return dir === 'asc' ? cmp : -cmp })
    })
    
    const filteredOnCallSchedules = computed(() => {
      let f = onCallStore.onCallSchedule
      const today = Utils.normalizeDate(new Date())
      if (!onCallFilters.date && !onCallFilters.search) f = f.filter(s => Utils.normalizeDate(s.duty_date) >= today)
      if (onCallFilters.date) f = f.filter(s => Utils.normalizeDate(s.duty_date) === onCallFilters.date)
      if (onCallFilters.shiftType) f = f.filter(s => s.shift_type === onCallFilters.shiftType)
      if (onCallFilters.physician) f = f.filter(s => s.primary_physician_id === onCallFilters.physician || s.backup_physician_id === onCallFilters.physician)
      if (onCallFilters.search) { const q = onCallFilters.search.toLowerCase(); f = f.filter(s => getPhysicianName(s.primary_physician_id).toLowerCase().includes(q)) }
      const field = sortState.oncall.field; const dir = sortState.oncall.dir
      return [...f].sort((a, b) => { let va = a[field] ?? '', vb = b[field] ?? ''; if (field === 'duty_date') { va = Utils.normalizeDate(va); vb = Utils.normalizeDate(vb) } const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true }); return dir === 'asc' ? cmp : -cmp })
    })
    
    const filteredAbsences = computed(() => {
      let f = absenceStore.absences.map(a => ({ ...a, current_status: absenceStore.deriveAbsenceStatus(a) }))
      if (!absenceFilters.status && absenceFilters.hideReturned) f = f.filter(a => a.current_status !== 'returned_to_duty' && a.current_status !== 'cancelled')
      if (absenceFilters.staff) f = f.filter(a => a.staff_member_id === absenceFilters.staff)
      if (absenceFilters.status) f = f.filter(a => a.current_status === absenceFilters.status)
      if (absenceFilters.reason) f = f.filter(a => a.absence_reason === absenceFilters.reason)
      if (absenceFilters.startDate) f = f.filter(a => Utils.normalizeDate(a.start_date) >= absenceFilters.startDate)
      if (absenceFilters.search) { const q = absenceFilters.search.toLowerCase(); f = f.filter(a => getStaffName(a.staff_member_id).toLowerCase().includes(q)) }
      const field = sortState.absences.field; const dir = sortState.absences.dir
      return [...f].sort((a, b) => { let va = a[field] ?? '', vb = b[field] ?? ''; if (field === 'start_date' || field === 'end_date') { va = Utils.normalizeDate(va); vb = Utils.normalizeDate(vb) } const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true }); return dir === 'asc' ? cmp : -cmp })
    })
    
    const filteredTrainingUnits = computed(() => {
      let f = trainingStore.trainingUnits
      if (trainingUnitFilters.search) { const q = trainingUnitFilters.search.toLowerCase(); f = f.filter(u => u.unit_name?.toLowerCase().includes(q)) }
      if (trainingUnitFilters.department) f = f.filter(u => u.department_id === trainingUnitFilters.department)
      if (trainingUnitFilters.status) f = f.filter(u => u.unit_status === trainingUnitFilters.status)
      return f
    })
    
    const filteredTrials = computed(() => {
      let f = researchStore.clinicalTrials
      if (trialFilters.line) f = f.filter(t => t.research_line_id === trialFilters.line)
      if (trialFilters.phase) f = f.filter(t => t.phase === trialFilters.phase)
      if (trialFilters.status) f = f.filter(t => t.status === trialFilters.status)
      if (trialFilters.search) { const q = trialFilters.search.toLowerCase(); f = f.filter(t => t.protocol_id?.toLowerCase().includes(q) || t.title?.toLowerCase().includes(q)) }
      return f
    })
    
    const filteredProjects = computed(() => {
      let f = researchStore.innovationProjects
      if (projectFilters.research_line_id) f = f.filter(p => p.research_line_id === projectFilters.research_line_id)
      if (projectFilters.category) f = f.filter(p => p.category === projectFilters.category)
      if (projectFilters.stage) f = f.filter(p => (p.current_stage || p.development_stage) === projectFilters.stage)
      if (projectFilters.funding_status) f = f.filter(p => (p.funding_status || 'not_applicable') === projectFilters.funding_status)
      if (projectFilters.search) { const q = projectFilters.search.toLowerCase(); f = f.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) }
      return f
    })
    
    // ============================================================
    // LIFECYCLE
    // ============================================================
    onMounted(async () => {
      const token = localStorage.getItem('neumocare_token')
      const user = localStorage.getItem('neumocare_user')
      if (token && user) {
        try {
          userStore.currentUser = JSON.parse(user)
          await loadAllData()
          currentView.value = 'dashboard'
        } catch { 
          currentView.value = 'login' 
        }
      } else { 
        currentView.value = 'login' 
      }
      setInterval(() => { currentTime.value = new Date(); updateDashboardStats() }, 60000)
      window.addEventListener('neumax:session-expired', () => { 
        userStore.currentUser = null
        currentView.value = 'login'
        uiStore.showToast('Session Expired', 'Your session has expired. Please log in again.', 'warning')
      })
    })
    
    // ============================================================
    // RETURN - ALL DATA AND METHODS EXPOSED TO TEMPLATE
    // ============================================================
    return {
      // Stores
      uiStore, userStore, staffStore, rotationStore, trainingStore, onCallStore, absenceStore, researchStore, newsStore,
      
      // State
      loading, saving, showPassword, currentTime, currentView,
      staffView, onCallView, rotationView, trainingUnitView, trainingUnitHorizon,
      researchHubTab, analyticsActiveTab,
      
      // Filters
      staffFilters, rotationFilters, onCallFilters, absenceFilters, trainingUnitFilters,
      trialFilters, projectFilters, newsFilters,
      
      // Pagination & Sorting
      pagination, sortState, sortBy, sortIcon, goToPage,
      
      // All Modals
      staffProfileModal, medicalStaffModal, rotationModal, rotationViewModal, onCallModal,
      absenceModal, absenceResolutionModal, trainingUnitModal, unitResidentsModal,
      unitCliniciansModal, unitDetailDrawer, occupancyPanel, tlPopover,
      researchLineModal, clinicalTrialModal, innovationProjectModal, assignCoordinatorModal,
      trialDetailModal, newsModal, newsDrawer, deptPanel, reassignmentModal, deptReassignModal,
      staffTypeModal, exportModal, userProfileModal, confirmationModal, announcementReadModal,
      communicationsModal, activationModal,
      
      // System Data
      systemStats, clinicalStatus, clinicalStatusHistory, isLoadingStatus,
      newStatusText, selectedAuthorId, expiryHours, liveStatsEditMode,
      activeMedicalStaff, quickStatus, researchDashboard, researchLinesPerformance,
      partnerCollaborations, trialsTimeline, analyticsSummary, loadingAnalytics,
      dailyBriefing, todaysOnCall, upcomingOnCallDays, residentGapWarnings, announcements,
      monthHorizon, monthOffset, departments,
      
      // Helper Functions
      hasPermission, formatDate, formatDateShort, formatRelativeDate, formatTime,
      formatRelativeTime, formatNewsDate, getInitials, getStaffName,
      getTrainingUnitName, getResidentName, getSupervisorName, getPhysicianName,
      getDepartmentName, getResearchLineName, getPhaseColor, getStageColor,
      getStageConfig, getPartnerTypeColor,
      formatStaffType, formatStaffTypeShort, getStaffTypeClass, isResidentType,
      formatEmploymentStatus, formatAbsenceReason, formatRotationStatus,
      formatStudyStatus, formatAudience, calculateAbsenceDuration, getDaysRemaining,
      getDaysUntilStart, getRotationProgress, getCurrentRotationForStaff,
      getRotationHistory, getUpcomingRotations, getRotationDaysLeft,
      getCurrentRotationSupervisor, isOnCallToday, getUpcomingOnCall, getUpcomingLeave,
      getUnitActiveRotationCount, getUnitRotations, getUnitScheduledCount,
      getUnitOverlapWarning, getUnitMonthOccupancy, getNextFreeMonth,
      getTimelineMonths, getUnitSlots, getDaysUntilFree,
      getHorizonMonths, getHorizonRangeLabel, getResidentRotationsInHorizon,
      getRotationBarStyle, rotationStartsInHorizon, rotationEndsInHorizon,
      
      // Action Functions
      viewStaffDetails, showAddMedicalStaffModal, editMedicalStaff, deleteMedicalStaff,
      showAddRotationModal, editRotation, deleteRotation, viewRotationDetails,
      showAddOnCallModal, editOnCallSchedule, deleteOnCallSchedule,
      showAddAbsenceModal, editAbsence, deleteAbsence, openResolutionModal, resolveAbsence,
      showAddTrainingUnitModal, editTrainingUnit, deleteTrainingUnit, openUnitDetail,
      openUnitClinicians, saveUnitClinicians, openCellPopover, closeCellPopover,
      showCommunicationsModal, saveCommunication,
      showAddResearchLineModal, editResearchLine, deleteResearchLine,
      showAddTrialModal, editTrial, deleteClinicalTrial, viewTrial,
      showAddProjectModal, editProject, deleteInnovationProject,
      openAssignCoordinatorModal, saveCoordinatorAssignment, openLineDetail,
      drillToTrials, drillToProjects, showAddNewsModal, editNews, deleteNews,
      publishNews, archiveNews, toggleNewsPublic, openNewsDrawer, closeNewsDrawer,
      showExportModal, handleExport, switchView,
      handleLogin, handleLogout, showUserProfileModal, saveUserProfile,
      refreshStatus, showCreateStatusModal, calculateTimeRemaining, isStatusExpired,
      handleGlobalSearch, clearSearch,
      
      // Login
      loginForm, loginLoading, loginError, showPassword,
      
      // Filtered Lists
      filteredMedicalStaff, filteredRotations, filteredOnCallSchedules,
      filteredAbsences, filteredTrainingUnits, filteredTrials, filteredProjects,
      
      // Utils and Constants
      Utils, PROJECT_STAGES,
      
      // Title Helpers
      getCurrentViewTitle, getCurrentViewSubtitle
    }
  }
})

// Create and mount app
const app = createApp(App)
app.use(pinia)
app.mount('#app')
