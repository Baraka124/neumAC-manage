// app.js - Complete Vue Application with All Templates
import { createApp, ref, reactive, computed, onMounted, watch } from 'vue'
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
import { VIEW_TITLES, VIEW_SUBTITLES, PROJECT_STAGES } from './config.js'

const pinia = createPinia()

const App = {
  setup() {
    // Initialize all stores
    const uiStore = useUIStore()
    const userStore = useUserStore()
    const staffStore = useStaffStore()
    const rotationStore = useRotationStore()
    const trainingStore = useTrainingStore()
    const onCallStore = useOnCallStore()
    const absenceStore = useAbsenceStore()
    const researchStore = useResearchStore()
    const newsStore = useNewsStore()

    // Local state
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
    
    // Filters
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
    
    // Pagination
    const pagination = reactive({
      medical_staff: { page: 1, size: 15 },
      rotations: { page: 1, size: 15 },
      oncall: { page: 1, size: 15 },
      absences: { page: 1, size: 15 },
      trials: { page: 1, size: 15 },
      projects: { page: 1, size: 15 }
    })
    
    // Sort state
    const sortState = reactive({
      medical_staff: { field: 'full_name', dir: 'asc' },
      rotations: { field: 'start_date', dir: 'desc' },
      oncall: { field: 'duty_date', dir: 'asc' },
      absences: { field: 'start_date', dir: 'desc' }
    })
    
    // Modal states
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
    
    // System data
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
    
    // Helper functions
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
    const getLineAccent = (lineNumber) => {
      const accents = [
        { bg: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#1e40af' },
        { bg: 'linear-gradient(135deg,#10b981,#0891b2)', color: '#065f46' },
        { bg: 'linear-gradient(135deg,#22d3ee,#0ea5e9)', color: '#0e7490' },
        { bg: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#92400e' },
        { bg: 'linear-gradient(135deg,#a78bfa,#8b5cf6)', color: '#5b21b6' },
        { bg: 'linear-gradient(135deg,#fb7185,#ec4899)', color: '#9d174d' }
      ]
      return accents[((lineNumber || 1) - 1) % 6]
    }
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
      const loginFieldErrorsLocal = { email: !loginForm.value.email ? 'Email required' : '', password: !loginForm.value.password ? 'Password required' : '' }
      if (loginFieldErrorsLocal.email || loginFieldErrorsLocal.password) { uiStore.showToast('Error', 'Please fill all required fields', 'error'); return }
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
          API.getClinicalStatus().then(data => { clinicalStatus.value = data?.success ? data.data : null }),
          API.getClinicalStatusHistory(20).then(data => { clinicalStatusHistory.value = data }),
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
    
    const getCurrentViewTitle = () => {
      const titles = { dashboard: 'Dashboard Overview', medical_staff: 'Medical Staff Management', oncall_schedule: 'On-call Schedule', resident_rotations: 'Resident Rotations', training_units: 'Clinical Units', staff_absence: 'Staff Absence Management', research_hub: 'Research Hub', news: 'News & Posts' }
      return titles[currentView.value] || 'NeumoCare Dashboard'
    }
    
    const getCurrentViewSubtitle = () => {
      const subtitles = { dashboard: 'Real-time department overview and analytics', medical_staff: 'Manage physicians, residents, and clinical staff', oncall_schedule: 'View and manage on-call physician schedules', resident_rotations: 'Track and manage resident training rotations', training_units: 'Clinical units and resident assignments', staff_absence: 'Track staff absences and coverage assignments', research_hub: 'Research lines, studies, projects and analytics', news: 'Department news and publications' }
      return subtitles[currentView.value] || ''
    }
    
    const loginForm = ref({ email: '', password: '', remember_me: false })
    const loginLoading = ref(false)
    const loginError = ref('')
    
    // Initialize
    onMounted(async () => {
      const token = localStorage.getItem('neumocare_token')
      const user = localStorage.getItem('neumocare_user')
      if (token && user) {
        try {
          userStore.currentUser = JSON.parse(user)
          await loadAllData()
          currentView.value = 'dashboard'
        } catch { currentView.value = 'login' }
      } else { currentView.value = 'login' }
      setInterval(() => { currentTime.value = new Date(); updateDashboardStats() }, 60000)
      window.addEventListener('neumax:session-expired', () => { userStore.currentUser = null; currentView.value = 'login'; uiStore.showToast('Session Expired', 'Your session has expired. Please log in again.', 'warning') })
    })
    
    return {
      uiStore, userStore, staffStore, rotationStore, trainingStore, onCallStore, absenceStore, researchStore, newsStore,
      loading, saving, showPassword, currentTime, currentView, staffView, onCallView, rotationView,
      trainingUnitView, trainingUnitHorizon, researchHubTab, analyticsActiveTab,
      staffFilters, rotationFilters, onCallFilters, absenceFilters, trainingUnitFilters,
      trialFilters, projectFilters, newsFilters, pagination, sortState, sortBy, sortIcon,
      staffProfileModal, medicalStaffModal, rotationModal, rotationViewModal, onCallModal,
      absenceModal, absenceResolutionModal, trainingUnitModal, unitResidentsModal,
      unitCliniciansModal, unitDetailDrawer, occupancyPanel, tlPopover,
      researchLineModal, clinicalTrialModal, innovationProjectModal, assignCoordinatorModal,
      trialDetailModal, newsModal, newsDrawer, deptPanel, reassignmentModal, deptReassignModal,
      staffTypeModal, exportModal, userProfileModal, confirmationModal, announcementReadModal,
      communicationsModal, activationModal, systemStats, clinicalStatus, clinicalStatusHistory,
      isLoadingStatus, newStatusText, selectedAuthorId, expiryHours, liveStatsEditMode,
      activeMedicalStaff, quickStatus, researchDashboard, researchLinesPerformance,
      partnerCollaborations, trialsTimeline, analyticsSummary, loadingAnalytics,
      dailyBriefing, todaysOnCall, upcomingOnCallDays, residentGapWarnings, announcements,
      monthHorizon, monthOffset, departments, hasPermission, formatDate, formatDateShort,
      formatRelativeDate, formatTime, formatRelativeTime, formatNewsDate, getInitials,
      getStaffName, getTrainingUnitName, getResidentName, getSupervisorName, getPhysicianName,
      getDepartmentName, getResearchLineName, getPhaseColor, getStageColor, getStageConfig,
      getPartnerTypeColor, getLineAccent, formatStaffType, formatStaffTypeShort, getStaffTypeClass,
      isResidentType, formatEmploymentStatus, formatAbsenceReason, formatRotationStatus,
      formatStudyStatus, formatAudience, calculateAbsenceDuration, getDaysRemaining,
      getDaysUntilStart, getRotationProgress, getCurrentRotationForStaff, getRotationHistory,
      getUpcomingRotations, getRotationDaysLeft, getCurrentRotationSupervisor, isOnCallToday,
      getUpcomingOnCall, getUpcomingLeave, getUnitActiveRotationCount, getUnitRotations,
      getUnitScheduledCount, getUnitOverlapWarning, getUnitMonthOccupancy, getNextFreeMonth,
      getTimelineMonths, getUnitSlots, getDaysUntilFree, getHorizonMonths, getHorizonRangeLabel,
      getResidentRotationsInHorizon, getRotationBarStyle, rotationStartsInHorizon, rotationEndsInHorizon,
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
      showExportModal, handleExport, switchView, goToPage,
      handleLogin, handleLogout, loginForm, loginLoading, loginError,
      filteredMedicalStaff, filteredRotations, Utils, filteredOnCallSchedules,
      filteredAbsences, filteredTrainingUnits, filteredTrials, filteredProjects,
      getCurrentViewTitle, getCurrentViewSubtitle, PROJECT_STAGES
    }
  },
  
  template: `
    <div v-if="!userStore.currentUser" class="login-container">
      <div class="lc-bg"><canvas id="loginTreeCanvas"></canvas></div>
      <div class="login-card">
        <div class="lc-brand"><div class="lc-brand-logo"><svg viewBox="0 0 110 32" fill="none"><defs><linearGradient id="ng" x1="0" y1="0" x2="110" y2="0"><stop offset="0%" stop-color="#00b4d8"/><stop offset="55%" stop-color="#0077b6"/><stop offset="100%" stop-color="#023e8a"/></linearGradient></defs><text x="0" y="26" font-family="'DM Sans'" font-weight="700" font-size="28" fill="url(#ng)">neum</text><text x="72" y="26" font-family="'DM Sans'" font-weight="800" font-size="28" fill="url(#ng)">AC</text></svg><div class="lc-brand-divider"></div><div class="lc-brand-area"><span>ÁREA SANITARIA DE</span><span>A CORUÑA Y CEE</span></div></div></div>
        <div class="lc-product"><div class="lc-product-name">Neumo<span>Care</span></div><div class="lc-product-sub">Pulmonology Management System</div></div>
        <div class="lc-sep"></div>
        <div v-if="loginError" class="login-error"><i class="fas fa-exclamation-circle"></i><span>{{ loginError }}</span></div>
        <form class="lc-form" @submit.prevent="handleLogin">
          <div class="lc-field"><label class="lc-label">Email</label><div class="lc-input-wrap"><input type="email" class="lc-input" v-model="loginForm.email" placeholder="your@email.com"></div></div>
          <div class="lc-field"><label class="lc-label">Password</label><div class="lc-input-wrap"><input :type="showPassword ? 'text' : 'password'" class="lc-input" v-model="loginForm.password" placeholder="••••••••"><button type="button" class="lc-eye" @click="showPassword = !showPassword"><i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i></button></div></div>
          <div class="lc-meta-row"><label class="lc-remember"><input type="checkbox" v-model="loginForm.remember_me"><span>Remember me</span></label><a href="#" class="lc-forgot" @click.prevent>Forgot password?</a></div>
          <button class="lc-submit" @click.prevent="handleLogin" :disabled="loginLoading"><i v-if="loginLoading" class="fas fa-spinner fa-spin"></i><span>{{ loginLoading ? 'Authenticating…' : 'Sign in' }}</span><i v-if="!loginLoading" class="fas fa-arrow-right lc-submit-arrow"></i></button>
        </form>
      </div>
    </div>
    
    <div v-else class="app-layout">
      <div class="sidebar-backdrop" :class="{ active: uiStore.mobileMenuOpen }" @click="uiStore.mobileMenuOpen = false"></div>
      <aside class="sidebar" :class="{ 'sidebar-collapsed': uiStore.sidebarCollapsed, 'mobile-open': uiStore.mobileMenuOpen }">
        <div class="sidebar-header"><div class="sidebar-logo"><svg v-if="!uiStore.sidebarCollapsed" viewBox="0 0 108 30" fill="none"><defs><linearGradient id="sbng" x1="0" y1="0" x2="108" y2="0"><stop offset="0%" stop-color="#48cae4"/><stop offset="45%" stop-color="#4d9aff"/><stop offset="100%" stop-color="#a5b4fc"/></linearGradient></defs><text x="1" y="23" font-family="'DM Sans'" font-weight="600" font-size="24" fill="url(#sbng)">neum</text><text x="62" y="23" font-family="'DM Sans'" font-weight="800" font-size="24" fill="url(#sbng)">AC</text></svg><svg v-if="uiStore.sidebarCollapsed" viewBox="0 0 30 30" fill="none"><defs><linearGradient id="sbmono" x1="0" y1="0" x2="30" y2="0"><stop offset="0%" stop-color="#48cae4"/><stop offset="100%" stop-color="#4d9aff"/></linearGradient></defs><text x="3" y="23" font-family="'DM Sans'" font-weight="800" font-size="24" fill="url(#sbmono)">n</text></svg></div><button class="sidebar-toggle" @click="uiStore.sidebarCollapsed = !uiStore.sidebarCollapsed"><i class="fas" :class="uiStore.sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i></button></div>
        <nav class="sidebar-nav">
          <div class="sidebar-dept-ctx" v-if="!uiStore.sidebarCollapsed"><div class="sidebar-dept-dot"></div><div><div class="sidebar-dept-name">Pulmonology</div><div class="sidebar-dept-sub">HUAC · Área Sanitaria A Coruña</div></div></div>
          <div class="sidebar-section"><div class="sidebar-section-title" v-if="!uiStore.sidebarCollapsed">Dashboard</div><ul class="sidebar-menu"><li class="sidebar-menu-item"><a href="#" class="sidebar-menu-link" :class="{ active: currentView === 'dashboard' }" @click.prevent="switchView('dashboard')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span v-if="!uiStore.sidebarCollapsed">Overview</span></a></li></ul></div>
          <div class="sidebar-section"><div class="sidebar-section-title" v-if="!uiStore.sidebarCollapsed">Clinical Operations</div><ul class="sidebar-menu"><li class="sidebar-menu-item"><a href="#" class="sidebar-menu-link" :class="{ active: currentView === 'medical_staff' }" @click.prevent="switchView('medical_staff')" v-if="hasPermission('medical_staff','read')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 15v5M9 18h6"/></svg><span v-if="!uiStore.sidebarCollapsed">Medical Staff</span></a></li><li class="sidebar-menu-item"><a href="#" class="sidebar-menu-link" :class="{ active: currentView === 'oncall_schedule' }" @click.prevent="switchView('oncall_schedule')" v-if="hasPermission('oncall_schedule','read')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.8A9 9 0 1111.2 3C11.2 3 9 7.5 12 11C15 14.5 21 12.8 21 12.8Z"/></svg><span v-if="!uiStore.sidebarCollapsed">On-call</span></a></li></ul></div>
          <div class="sidebar-section"><div class="sidebar-section-title" v-if="!uiStore.sidebarCollapsed">Structure</div><ul class="sidebar-menu"><li class="sidebar-menu-item"><a href="#" class="sidebar-menu-link" :class="{ active: currentView === 'training_units' }" @click.prevent="switchView('training_units')" v-if="hasPermission('training_units','read')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21H21M5 21V8L12 4L19 8V21M9 21V15H15V21M12 8V11M10.5 9.5H13.5"/></svg><span v-if="!uiStore.sidebarCollapsed">Clinical Units</span></a></li><li class="sidebar-menu-item"><a href="#" class="sidebar-menu-link" :class="{ active: currentView === 'resident_rotations' }" @click.prevent="switchView('resident_rotations')" v-if="hasPermission('resident_rotations','read')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12C4 16.4 7.6 20 12 20C16.4 20 20 16.4 20 12C20 7.6 16.4 4 12 4"/><path d="M8 4H12V8"/></svg><span v-if="!uiStore.sidebarCollapsed">Rotations</span></a></li></ul></div>
          <div class="sidebar-section"><div class="sidebar-section-title" v-if="!uiStore.sidebarCollapsed">Administration</div><ul class="sidebar-menu"><li class="sidebar-menu-item"><a href="#" class="sidebar-menu-link" :class="{ active: currentView === 'staff_absence' }" @click.prevent="switchView('staff_absence')" v-if="hasPermission('staff_absence','read')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10H21M8 3V7M16 3V7M10 14L14 18M14 14L10 18"/></svg><span v-if="!uiStore.sidebarCollapsed">Absence</span></a></li></ul></div>
          <div class="sidebar-section"><div class="sidebar-section-title" v-if="!uiStore.sidebarCollapsed">Research</div><ul class="sidebar-menu"><li class="sidebar-menu-item"><a href="#" class="sidebar-menu-link" :class="{ active: currentView === 'research_hub' }" @click.prevent="switchView('research_hub')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/><path d="M7.5 16H12"/></svg><span v-if="!uiStore.sidebarCollapsed">Research Hub</span></a></li><li class="sidebar-menu-item"><a href="#" class="sidebar-menu-link" :class="{ active: currentView === 'news' }" @click.prevent="switchView('news')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 22H20a1 1 0 001-1V5a1 1 0 00-1-1H8l-5 5v12a1 1 0 001 1z"/><path d="M8 4V9H3M12 13H16M12 17H16M8 13H9M8 17H9"/></svg><span v-if="!uiStore.sidebarCollapsed">News & Posts</span></a></li></ul></div>
        </nav>
        <div class="sidebar-footer"><div class="sidebar-user"><div class="sidebar-user-avatar">{{ userStore.currentUser ? getInitials(userStore.currentUser.full_name) : '' }}</div><div class="user-info" v-if="!uiStore.sidebarCollapsed"><div class="user-name">{{ userStore.currentUser?.full_name || '' }}</div><div class="user-role">{{ userStore.currentUser?.user_role || '' }}</div></div></div></div>
      </aside>
      
      <button class="stats-toggle-btn" @click="uiStore.statsSidebarOpen = !uiStore.statsSidebarOpen"><i class="fas" :class="uiStore.statsSidebarOpen ? 'fa-chevron-right' : 'fa-chevron-left'"></i><span class="toggle-label">Status</span></button>
      
      <div class="live-stats-sidebar" :class="{ open: uiStore.statsSidebarOpen }">
        <div class="live-stats-header"><div class="header-title"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12H7L9 6L13 18L15 12H21"/></svg><div class="title-content"><h3>Clinical Status</h3><p class="header-subtitle">Real-time department updates</p></div></div><button class="header-close" @click="uiStore.statsSidebarOpen = false"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 7L17 17M17 7L7 17"/></svg></button></div>
        <div class="status-timeline"><div class="timeline-header"><h4><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/></svg> Status Timeline</h4><button class="timeline-refresh" @click="refreshStatus"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button></div>
        <div class="timeline-items"><div class="timeline-item" v-if="clinicalStatus"><div class="timeline-marker"><div class="marker-dot dot-live"></div><div class="marker-line"></div></div><div class="status-card current"><div class="status-header"><div class="status-title"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4C7 4 5 4 5 7V13C5 17 9 19 12 19C15 19 19 17 19 13"/><circle cx="19" cy="11" r="2"/><path d="M5 9H9"/></svg> Clinical Status</div><div class="status-badge live">LIVE</div></div><div class="status-content"><div class="status-location"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21H21M3 21V7L12 3L21 7V21M9 21V15H15V21M12 7V11M10 9H14"/></svg><span>{{ clinicalStatus.status_text }}</span></div><div class="status-text">{{ clinicalStatus.status_text }}</div></div><div class="status-footer"><div class="status-author"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 15v5M9 18h6"/></svg> {{ clinicalStatus.author_name }}</div><div class="status-time"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>{{ formatRelativeTime(clinicalStatus.created_at) }}</span><span class="time-divider">•</span><span>Expires {{ formatTime(clinicalStatus.expires_at) }}</span></div></div></div></div><div class="timeline-item" v-for="status in clinicalStatusHistory" :key="status.id"><div class="timeline-marker"><div class="marker-dot dot-recent"></div><div class="marker-line"></div></div><div class="status-card"><div class="status-header"><div class="status-title"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12l2 2 4-4"/></svg> Status Update</div><div class="status-badge recent">RECENT</div></div><div class="status-content"><div class="status-location"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21H21M3 21V7L12 3L21 7V21M9 21V15H15V21M12 7V11M10 9H14"/></svg><span>{{ status.location || 'Pulmonology Department' }}</span></div><div class="status-text">{{ status.status_text }}</div></div><div class="status-footer"><div class="status-author"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 15v5M9 18h6"/></svg> {{ status.author_name }}</div><div class="status-time"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>{{ formatRelativeTime(status.created_at) }}</span></div></div></div></div><div class="empty-timeline" v-if="!clinicalStatus && (!clinicalStatusHistory || clinicalStatusHistory.length === 0)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4C7 4 5 4 5 7V13C5 17 9 19 12 19C15 19 19 17 19 13"/><circle cx="19" cy="11" r="2"/><path d="M5 9H9"/></svg><h5>No Status Updates</h5><p>No clinical status has been recorded</p></div></div></div>
        <div class="metrics-dashboard"><div class="dashboard-header"><h4><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> Key Metrics</h4><div class="dashboard-time">{{ formatTime(currentTime) }}</div></div><div class="metrics-grid"><div class="metric-card"><div class="metric-header"><div class="metric-icon"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg></div><div class="metric-title">Patient Load</div></div><div class="metric-value">{{ systemStats.activePatients || 0 }}</div><div class="metric-details"><div class="detail-item"><span class="detail-label">ICU</span><span class="detail-value">{{ systemStats.icuPatients || 0 }}</span></div><div class="detail-item"><span class="detail-label">Ward</span><span class="detail-value">{{ systemStats.wardPatients || 0 }}</span></div></div></div><div class="metric-card"><div class="metric-header"><div class="metric-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 15v5M9 18h6"/></svg></div><div class="metric-title">Staff Coverage</div></div><div class="metric-value">{{ systemStats.activeStaff || 0 }}</div><div class="metric-details"><div class="detail-item"><span class="detail-label">On Call</span><span class="detail-value">{{ systemStats.onCallNow || 0 }}</span></div><div class="detail-item"><span class="detail-label">In Surgery</span><span class="detail-value">{{ systemStats.inSurgery || 0 }}</span></div></div></div><div class="metric-card"><div class="metric-header"><div class="metric-icon"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg></div><div class="metric-title">Bed Status</div></div><div class="metric-value">{{ systemStats.availableBeds || 0 }}</div><div class="metric-details"><div class="detail-item"><span class="detail-label">ICU %</span><span class="detail-value">{{ systemStats.icuOccupancy || 0 }}%</span></div><div class="detail-item"><span class="detail-label">Ward %</span><span class="detail-value">{{ systemStats.wardOccupancy || 0 }}%</span></div></div></div><div class="metric-card"><div class="metric-header"><div class="metric-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="metric-title">Alerts</div></div><div class="metric-value">{{ uiStore.systemAlerts.length }}</div><div class="metric-details"><div class="detail-item"><span class="detail-label">Active</span><span class="detail-value">{{ uiStore.activeAlertsCount }}</span></div><div class="detail-item"><span class="detail-label">Pending</span><span class="detail-value">{{ systemStats.pendingApprovals || 0 }}</span></div></div></div></div></div>
        <div class="staff-availability"><div class="availability-header"><h4><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> Team Status</h4><div class="availability-total">{{ systemStats.totalStaff || 0 }} total</div></div><div class="availability-grid"><div class="availability-card"><div class="availability-icon attending"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 15v5M9 18h6"/></svg></div><div class="availability-content"><div class="availability-role">Attending</div><div class="availability-count">{{ systemStats.activeAttending || 0 }}</div><div class="availability-status">active</div></div></div><div class="availability-card"><div class="availability-icon resident"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6L3 11L12 16L21 11L12 6Z"/><path d="M8 13.5V17C8 17 10 19 12 19C14 19 16 17 16 13.5"/></svg></div><div class="availability-content"><div class="availability-role">Residents</div><div class="availability-count">{{ systemStats.activeResidents || 0 }}</div><div class="availability-status">active</div></div></div><div class="availability-card"><div class="availability-icon oncall"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.8A9 9 0 1 1 11.2 3C11.2 3 9 7.5 12 11C15 14.5 21 12.8 21 12.8Z"/></svg></div><div class="availability-content"><div class="availability-role">On Call</div><div class="availability-count">{{ systemStats.onCallNow || 0 }}</div><div class="availability-status">available</div></div></div><div class="availability-card"><div class="availability-icon unavailable"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8"/><path d="M16 3.13a4 4 0 0 1 0 7.75M1 1l22 22"/><circle cx="9" cy="7" r="4"/></svg></div><div class="availability-content"><div class="availability-role">Unavailable</div><div class="availability-count">{{ systemStats.onLeaveStaff || 0 }}</div><div class="availability-status">off-duty</div></div></div></div></div>
        <div class="status-actions"><div v-if="hasPermission('communications', 'create')" class="actions-section"><div class="actions-header"><h4><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg> Update Status</h4></div><div class="action-buttons"><button class="btn btn-outline btn-action" @click="showCreateStatusModal" :disabled="isLoadingStatus"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg><span>Update</span></button><button class="btn btn-ghost btn-action" @click="showCommunicationsModal" :disabled="isLoadingStatus"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg><span>Announce</span></button></div><div v-if="clinicalStatus && !isStatusExpired(clinicalStatus.expires_at)" class="status-expiry"><div class="expiry-header"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>Expires in</span></div><div class="expiry-timer">{{ calculateTimeRemaining(clinicalStatus.expires_at) }}</div></div></div></div>
      </div>
      
      <main class="main-content" :class="{ 'main-content-expanded': uiStore.sidebarCollapsed }">
        <header class="top-navbar">
          <div class="navbar-left"><button class="mobile-menu-toggle" @click="uiStore.mobileMenuOpen = !uiStore.mobileMenuOpen"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button><div class="navbar-title-block"><span class="navbar-title">{{ getCurrentViewTitle() }}</span><span class="navbar-subtitle" v-if="getCurrentViewSubtitle()">{{ getCurrentViewSubtitle() }}</span></div></div>
          <div class="navbar-right"><div class="search-container"><div class="search-box"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg><input type="text" class="search-input" placeholder="Search..." v-model="uiStore.globalSearchQuery"></div></div><div style="display:flex;align-items:center;gap:12px;"><button class="btn btn-icon btn-secondary" @click="showCommunicationsModal" v-if="hasPermission('communications', 'create')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg></button><div style="position:relative;"><button class="navbar-user-btn" @click="uiStore.userMenuOpen = !uiStore.userMenuOpen"><div class="navbar-user-avatar">{{ userStore.currentUser ? getInitials(userStore.currentUser.full_name) : '' }}</div><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9l6 6 6-6"/></svg></button><div v-if="uiStore.userMenuOpen" class="user-dropdown"><button @click="userProfileModal.show = true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>Profile Settings</span></button><button @click="handleLogout"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg><span>Logout</span></button></div></div></div></div>
        </header>
        
        <div class="content-area">
          <div v-if="uiStore.systemAlerts.length > 0" class="alert-banner" v-for="alert in uiStore.systemAlerts.slice(0, 1)" :key="alert.id"><div style="display:flex;align-items:center;gap:12px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>{{ alert.message }}<span v-if="uiStore.systemAlerts.length > 1" class="alert-more">(and {{ uiStore.systemAlerts.length - 1 }} more)</span></span></div><button @click="uiStore.dismissAlert(alert.id)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 7L17 17M17 7L7 17"/></svg></button></div>
          
          <nav class="breadcrumb" v-if="!['resident_rotations'].includes(currentView)"><button @click="switchView('dashboard')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-5v-8H10v8H5a2 2 0 0 1-2-2z"/></svg><span>Dashboard</span></button><span class="bc-sep">/</span><span class="bc-current">{{ getCurrentViewTitle() }}</span></nav>
          
          <!-- DASHBOARD VIEW -->
          <div v-if="currentView === 'dashboard'">
            <div class="db-greeting"><div class="db-greeting-left"><div class="db-greeting-time">{{ formatDate(currentTime) }}</div><div class="db-greeting-title">{{ new Date().getHours() < 12 ? 'Good morning,' : new Date().getHours() < 19 ? 'Good afternoon,' : 'Good evening,' }} <span>{{ userStore.currentUser?.full_name?.split(' ')[0] || 'Doctor' }}</span></div></div><div class="db-quick-actions"><button class="db-qa-btn" @click="showAddMedicalStaffModal" v-if="hasPermission('medical_staff', 'create')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg> Add Staff</button><div class="db-qa-divider"></div><button class="db-qa-btn" @click="showAddOnCallModal" v-if="hasPermission('oncall_schedule', 'create')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.8A9 9 0 1 1 11.2 3C11.2 3 9 7.5 12 11C15 14.5 21 12.8 21 12.8Z"/></svg> On-call</button><div class="db-qa-divider"></div><button class="db-qa-btn" @click="showAddRotationModal" v-if="hasPermission('resident_rotations', 'create')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12C4 16.4 7.6 20 12 20S20 16.4 20 12 16.4 4 12 4"/><path d="M8 4H12V8"/></svg> Rotation</button><div class="db-qa-divider"></div><button class="db-qa-btn" @click="showAddAbsenceModal" v-if="hasPermission('staff_absence', 'create')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10H21M8 3V7M16 3V7"/></svg> Absence</button><div class="db-qa-divider"></div><button class="db-qa-btn db-qa-btn--primary" @click="showCommunicationsModal" v-if="hasPermission('communications', 'create')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg> Announce</button></div></div>
            
            <div class="dbr-strip" v-if="dailyBriefing.length > 0"><div class="dbr-label"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/></svg> Today</div><div class="dbr-items"><div v-for="item in dailyBriefing" :key="item.text" class="dbr-item" :class="'dbr-item--' + item.type" @click="switchView(item.action, item.actionFilter || {})"><i class="fas dbr-icon" :class="item.icon"></i><span class="dbr-text" v-html="item.text"></span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18l6-6-6-6"/></svg></div></div></div>
            <div v-else class="dbr-strip dbr-strip--clear"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg><span>All clear — no urgent items today</span></div>
            
            <div class="db-kpi-bar"><div class="db-kpi db-kpi--teal" @click="switchView('medical_staff')"><div class="db-kpi-icon db-kpi-icon--teal"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#009999" stroke-width="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="db-kpi-body"><div class="db-kpi-val">{{ systemStats.totalStaff || 0 }}</div><div class="db-kpi-label">Medical Staff</div><div class="db-kpi-sub"><span class="db-kpi-dot db-kpi-dot--ok"></span>{{ systemStats.activeAttending || 0 }} attending<span class="db-kpi-dot db-kpi-dot--blue" style="margin-left:8px"></span>{{ systemStats.activeResidents || 0 }} residents<span v-if="systemStats.onLeaveStaff > 0" style="margin-left:8px;color:var(--warn)"><span class="db-kpi-dot db-kpi-dot--warn"></span> {{ systemStats.onLeaveStaff }} on leave</span></div></div></div><div class="db-kpi db-kpi--navy" @click="switchView('resident_rotations')"><div class="db-kpi-icon db-kpi-icon--navy"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f2d54" stroke-width="1.6"><path d="M4 12C4 16.4 7.6 20 12 20S20 16.4 20 12 16.4 4 12 4"/><path d="M8 4H12V8"/></svg></div><div class="db-kpi-body"><div class="db-kpi-val">{{ systemStats.activeRotations || 0 }}</div><div class="db-kpi-label">Active Rotations</div><div class="db-kpi-sub"><span class="db-kpi-dot" :class="systemStats.endingThisWeek > 0 ? 'db-kpi-dot--warn' : 'db-kpi-dot--ok'"></span>{{ systemStats.endingThisWeek || 0 }} ending this week<span class="db-kpi-dot db-kpi-dot--ok" style="margin-left:8px"></span>{{ systemStats.startingNextWeek || 0 }} starting</div></div></div><div class="db-kpi db-kpi--amber" @click="switchView('oncall_schedule')"><div class="db-kpi-icon db-kpi-icon--amber"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ba7517" stroke-width="1.6"><path d="M21 12.8A9 9 0 1 1 11.2 3C11.2 3 9 7.5 12 11C15 14.5 21 12.8 21 12.8Z"/></svg></div><div class="db-kpi-body"><div class="db-kpi-val">{{ todaysOnCall.length || 0 }}</div><div class="db-kpi-label">On-call Today</div><div class="db-kpi-sub" v-if="todaysOnCall.length > 0"><span class="db-kpi-dot db-kpi-dot--ok"></span>{{ (todaysOnCall[0].physicianName || '').split(' ').slice(-1)[0] }} · {{ todaysOnCall[0].startTime }}–{{ todaysOnCall[0].endTime }}</div><div class="db-kpi-sub" v-else style="color:var(--danger)"><span class="db-kpi-dot" style="background:var(--danger)"></span> No coverage today</div></div></div><div class="db-kpi db-kpi--indigo" @click="researchHubTab = 'lines'; currentView = 'research_hub'"><div class="db-kpi-icon db-kpi-icon--indigo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#534ab7" stroke-width="1.6"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/></svg></div><div class="db-kpi-body"><div class="db-kpi-val">{{ researchStore.researchLines.length || 0 }}</div><div class="db-kpi-label">Research Lines</div><div class="db-kpi-sub"><span class="db-kpi-dot db-kpi-dot--blue"></span>{{ researchStore.clinicalTrials.length || 0 }} studies<span class="db-kpi-dot db-kpi-dot--purple" style="margin-left:8px"></span>{{ researchStore.innovationProjects.length || 0 }} projects</div></div></div></div>
            
            <div class="db-content-grid"><div class="card db-content-card"><div class="db-cc-head"><span class="db-cc-title"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.8A9 9 0 1111.2 3C11.2 3 9 7.5 12 11C15 14.5 21 12.8 21 12.8Z"/></svg> On-call — Next 3 Days</span><button class="db-cc-link" @click="switchView('oncall_schedule')">Full schedule <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button></div><div v-for="day in upcomingOnCallDays.slice(0,3)" :key="day.date" class="db-oc-row"><div class="db-oc-date" :class="{ 'db-oc-date--today': day.isToday }">{{ day.label }}</div><div class="db-oc-slot" :class="day.primary ? 'db-oc-slot--ok' : 'db-oc-slot--gap'" @click="!day.primary && hasPermission('oncall_schedule','create') ? showAddOnCallModal() : null"><template v-if="day.primary"><div class="db-oc-avatar">{{ (getPhysicianName(day.primary.primary_physician_id)||'??').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase() }}</div><div class="db-oc-info"><span class="db-oc-name">{{ (n => n.split(' ').length > 1 ? n.split(' ')[0][0] + '. ' + n.split(' ').slice(-1)[0] : n)(getPhysicianName(day.primary.primary_physician_id)||'—') }}</span><span class="db-oc-time">{{ (day.primary.start_time||'').slice(0,5) }}–{{ (day.primary.end_time||'').slice(0,5) }}</span></div><span class="db-oc-badge db-oc-badge--primary">Primary</span></template><template v-else><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg><span class="db-oc-gap">No primary assigned</span><span v-if="hasPermission('oncall_schedule','create')" class="db-oc-assign" @click.stop="showAddOnCallModal()">＋ Assign</span></template></div><div class="db-oc-slot db-oc-slot--backup" :class="day.backup ? 'db-oc-slot--soft' : ''"><template v-if="day.backup"><div class="db-oc-avatar db-oc-avatar--backup">{{ (getPhysicianName(day.backup.primary_physician_id)||'??').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase() }}</div><span class="db-oc-name">{{ (n => n.split(' ').length > 1 ? n.split(' ')[0][0] + '. ' + n.split(' ').slice(-1)[0] : n)(getPhysicianName(day.backup.primary_physician_id)||'—') }}</span><span class="db-oc-badge db-oc-badge--backup">Backup</span></template><template v-else><span class="db-oc-gap db-oc-gap--warn">⚠ No backup</span></template></div></div><div v-if="upcomingOnCallDays.length === 0" class="db-cc-empty"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.8A9 9 0 1 1 11.2 3"/><line x1="1" y1="1" x2="23" y2="23"/></svg> No shifts scheduled<button v-if="hasPermission('oncall_schedule','create')" class="btn btn-sm btn-primary" style="margin-left:10px" @click="showAddOnCallModal()">Schedule</button></div></div><div class="card db-content-card"><div class="db-cc-head"><span class="db-cc-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12C4 16.4 7.6 20 12 20C16.4 20 20 16.4 20 12C20 7.6 16.4 4 12 4"/><path d="M8 4H12V8"/></svg> Rotations — This Week</span><button class="db-cc-link" @click="switchView('resident_rotations')">All rotations <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button></div><template v-if="rotationStore.rotations.filter(r => (r.rotation_status==='active'||r.rotation_status==='scheduled') && new Date(r.end_date||r.start_date) >= new Date() && new Date(r.end_date||r.start_date) <= new Date(Date.now()+7*86400000)).length > 0"><div v-for="rot in rotationStore.rotations.filter(r => r.rotation_status==='active' && new Date(r.end_date) >= new Date() && new Date(r.end_date) <= new Date(Date.now()+7*86400000)).slice(0,2)" :key="'end-'+rot.id" class="db-rot-row"><div class="db-rot-avatar">{{ (getResidentName(rot.resident_id)||'??').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase() }}</div><div class="db-rot-info"><span class="db-rot-name">{{ (n => n.split(' ').length > 1 ? n.split(' ')[0][0] + '. ' + n.split(' ').slice(-1)[0] : n)(getResidentName(rot.resident_id)||'—') }}</span><span class="db-rot-unit">{{ getTrainingUnitName(rot.training_unit_id) }}</span></div><span class="db-rot-chip db-rot-chip--ending">ends {{ formatDateShort(rot.end_date) }}</span></div><div v-for="rot in rotationStore.rotations.filter(r => r.rotation_status==='scheduled' && new Date(r.start_date) >= new Date() && new Date(r.start_date) <= new Date(Date.now()+7*86400000)).slice(0,2)" :key="'start-'+rot.id" class="db-rot-row"><div class="db-rot-avatar db-rot-avatar--start">{{ (getResidentName(rot.resident_id)||'??').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase() }}</div><div class="db-rot-info"><span class="db-rot-name">{{ (n => n.split(' ').length > 1 ? n.split(' ')[0][0] + '. ' + n.split(' ').slice(-1)[0] : n)(getResidentName(rot.resident_id)||'—') }}</span><span class="db-rot-unit">{{ getTrainingUnitName(rot.training_unit_id) }}</span></div><span class="db-rot-chip db-rot-chip--starting">starts {{ formatDateShort(rot.start_date) }}</span></div></template><div v-else class="db-cc-empty"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg> No urgent rotations this week</div></div><div class="card db-content-card db-content-card--full" v-if="residentGapWarnings.length > 0"><div class="db-cc-head"><span class="db-cc-title" style="color:var(--warn)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Residents Unassigned — Next 3 Months</span><button class="db-cc-link" @click="switchView('resident_rotations')">Assign <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button></div><div class="db-gap-grid"><div v-for="w in residentGapWarnings" :key="w.id" class="db-gap-item" @click="showAddRotationModal({ id: w.id, full_name: w.name })"><div class="db-gap-avatar">{{ (w.name||'??').split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase() }}</div><div class="db-gap-info"><span class="db-gap-name">{{ w.name || '—' }}</span><span class="db-gap-year" v-if="w.year">PGY-{{ w.year }}</span></div><div class="db-gap-pills"><span v-for="g in w.gaps" :key="g" class="db-gap-pill">{{ g }}</span></div><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg></div></div></div></div>
          </div>
          
          <!-- MEDICAL STAFF VIEW - Compact View -->
          <div v-if="currentView === 'medical_staff'">
            <div class="card mb-6"><div class="card-header"><div class="card-title"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4C7 4 5 4 5 7V13C5 17 9 19 12 19C15 19 19 17 19 13"/><circle cx="19" cy="11" r="2"/><path d="M5 9H9"/></svg> Medical Staff</div><div class="header-actions"><div class="view-toggle"><button class="btn-pill" :class="{ active: staffView === 'table' }" @click="staffView = 'table'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01"/></svg> Table</button><button class="btn-pill" :class="{ active: staffView === 'compact' }" @click="staffView = 'compact'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg> Compact</button></div><button class="btn btn-primary" @click="showAddMedicalStaffModal" v-if="hasPermission('medical_staff', 'create')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add Staff</button></div></div>
            <div class="filter-bar"><input type="text" class="form-control" v-model="staffFilters.search" placeholder="Search name…"><select class="form-select" v-model="staffFilters.staffType"><option value="">All Types</option><option v-for="st in staffStore.staffTypesList" :key="st.type_key" :value="st.type_key">{{ st.display_name }}</option></select><select v-if="staffFilters.staffType === 'medical_resident'" class="form-select" v-model="staffFilters.residentCategory"><option value="">All Residents</option><option value="department_internal">Internal</option><option value="rotating_other_dept">Rotating</option><option value="external_resident">External</option></select><select class="form-select" v-model="staffFilters.department"><option value="">All Departments</option><option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option></select><select class="form-select" v-model="staffFilters.status"><option value="">All Status</option><option value="active">Active</option><option value="on_leave">On Leave</option><option value="inactive">Inactive</option></select><button v-if="staffFilters.search || staffFilters.staffType || staffFilters.department || staffFilters.status || staffFilters.residentCategory" class="btn-pill btn-pill--clear" @click="staffFilters.search = ''; staffFilters.staffType = ''; staffFilters.department = ''; staffFilters.status = ''; staffFilters.residentCategory = ''">Clear</button></div>
            
            <div v-if="staffView === 'compact'"><div v-if="loading" class="scc-grid"><div v-for="i in 6" :key="i" class="skeleton-card" style="height:140px"></div></div><div v-else class="scc-grid"><template v-for="item in staffStore.compactStaffWithDividers" :key="item.id || item._divider"><div v-if="item._divider" class="scc-section-divider">{{ item._divider }}</div><div v-else class="scc" :class="{ 'scc--leave': item.employment_status === 'on_leave', 'scc--inactive': item.employment_status === 'inactive' }" @click="viewStaffDetails(item)"><div class="scc-avatar" :class="item.employment_status === 'on_leave' ? 'scc-avatar--leave' : (isResidentType(item.staff_type) ? 'scc-avatar--resident' : 'scc-avatar--attending')"><span class="scc-initials">{{ (item.full_name || '').split(' ').filter(Boolean).map(w => w[0]).slice(0,2).join('') }}</span><span class="scc-dot" :class="'scc-dot--' + item.employment_status" :title="formatEmploymentStatus(item.employment_status)"></span></div><div class="scc-body"><div class="scc-name-row"><span class="scc-name">{{ item.full_name }}</span><span v-if="!item.professional_email" class="scc-warn" title="Profile incomplete — missing email"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 8V12M12 16H12.01"/></svg></span></div><div v-if="item.specialization && !isResidentType(item.staff_type)" class="scc-spec-text">{{ item.specialization }}</div><div class="scc-meta-row"><span class="badge scc-type-badge" :class="getStaffTypeClass(item.staff_type)">{{ formatStaffTypeShort(item.staff_type) }}</span><span v-if="item.resident_category" class="scc-cat-pill" :class="item.resident_category === 'external_resident' ? 'scc-cat--ext' : 'scc-cat--int'">{{ item.resident_category === 'external_resident' ? 'Ext' : item.resident_category === 'rotating_other_dept' ? 'Rot' : 'Int' }}</span><span v-if="item.external_institution" class="scc-dept-text" style="color:var(--warn);">· {{ item.external_institution }}</span></div><div v-if="getCurrentRotationForStaff(item.id)" class="scc-rotation-row"><div class="staff-rotation-chip"><span class="src-dot"></span><span class="src-unit">{{ getTrainingUnitName(getCurrentRotationForStaff(item.id).training_unit_id) }}</span><span class="src-dur">{{ Utils.formatClinicalDuration(getCurrentRotationForStaff(item.id).start_date, getCurrentRotationForStaff(item.id).end_date) }}</span></div></div></div><div class="scc-actions" @click.stop><button class="rot-action-btn" @click.stop="viewStaffDetails(item)" title="View profile"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="rot-action-btn" @click.stop="editMedicalStaff(item)" v-if="hasPermission('medical_staff','update')" title="Edit"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg></button><button class="rot-action-btn rot-action-btn--danger" @click.stop="deleteMedicalStaff(item)" v-if="hasPermission('medical_staff','delete')" title="Deactivate"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button></div></div></template><div v-if="filteredMedicalStaff.length === 0" class="empty-state" style="grid-column:1/-1"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 14v4M10 16h4"/></svg><div class="empty-state-title">No staff found</div></div></div></div>
            
            <div v-if="staffView === 'table'" class="table-responsive"><table class="table table-striped table-staff"><thead><tr><th @click="sortBy('medical_staff', 'full_name')">Name <i class="fas" :class="sortIcon('medical_staff', 'full_name')"></i></th><th>Type</th><th>Specialization</th><th>Current Rotation</th><th>Status</th><th>Actions</th></tr></thead><tbody><tr v-for="staff in filteredMedicalStaff" :key="staff.id" :class="['row-' + staff.employment_status]" @click="viewStaffDetails(staff)"><td><div class="staff-name-cell"><div class="staff-table-av" :class="staff.employment_status === 'on_leave' ? 'staff-table-av--leave' : (isResidentType(staff.staff_type) ? 'staff-table-av--resident' : 'staff-table-av--attending')">{{ (staff.full_name||'').split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('').toUpperCase() }}</div><div class="staff-name-block"><div class="staff-name-primary">{{ staff.full_name }}<span v-if="!staff.professional_email || !staff.department_id" class="incomplete-flag" title="Profile incomplete"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></span></div><div v-if="isResidentType(staff.staff_type) && staff.resident_category" class="staff-name-sub"><span :class="staff.resident_category === 'external_resident' ? 'scc-cat--ext' : 'scc-cat--int'">{{ staff.resident_category === 'external_resident' ? 'External' : 'Internal' }}</span></div></div></div></td><td><span class="badge" :class="getStaffTypeClass(staff.staff_type)">{{ formatStaffTypeShort(staff.staff_type) }}</span></td><td><span v-if="staff.specialization" class="staff-spec-text">{{ staff.specialization }}</span><span v-else-if="isResidentType(staff.staff_type)" class="staff-spec-text">MIR Neumología</span><span v-else class="na-value">—</span></td><td><template v-if="getCurrentRotationForStaff(staff.id)"><div class="staff-rotation-chip"><span class="src-dot"></span><span class="src-unit">{{ getTrainingUnitName(getCurrentRotationForStaff(staff.id).training_unit_id) }}</span><span class="src-dur">{{ Utils.formatClinicalDuration(getCurrentRotationForStaff(staff.id).start_date, getCurrentRotationForStaff(staff.id).end_date) }}</span></div></template><span v-else class="na-value">None active</span></td><td><span v-if="staff.employment_status !== 'active'" class="status-indicator" :class="'status-' + staff.employment_status">{{ formatEmploymentStatus(staff.employment_status) }}</span><span v-else class="status-indicator status-active-dot" title="Active"></span></td><td><div class="table-actions"><button class="btn btn-sm btn-outline" @click.stop="viewStaffDetails(staff)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="btn btn-sm btn-outline" @click.stop="editMedicalStaff(staff)" v-if="hasPermission('medical_staff', 'update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg></button><button class="btn btn-sm btn-outline btn-outline-danger" @click.stop="deleteMedicalStaff(staff)" v-if="hasPermission('medical_staff', 'delete')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></button></div></td></tr><tr v-if="filteredMedicalStaff.length === 0"><td colspan="6" class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 14v4M10 16h4"/></svg><div class="empty-state-title">No medical staff found</div><button v-if="!staffFilters.search && !staffFilters.staffType && !staffFilters.department && !staffFilters.status && hasPermission('medical_staff', 'create')" class="btn btn-primary btn-sm" @click="showAddMedicalStaffModal">Add First Staff Member</button></td></tr></tbody></table><div class="pagination" v-if="Math.ceil(filteredMedicalStaff.length / pagination.medical_staff.size) > 1"><button class="btn-pill" @click="goToPage('medical_staff', pagination.medical_staff.page - 1)" :disabled="pagination.medical_staff.page === 1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><span class="pagination-info">Page {{ pagination.medical_staff.page }} of {{ Math.ceil(filteredMedicalStaff.length / pagination.medical_staff.size) }}</span><button class="btn-pill" @click="goToPage('medical_staff', pagination.medical_staff.page + 1)" :disabled="pagination.medical_staff.page === Math.ceil(filteredMedicalStaff.length / pagination.medical_staff.size)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div></div>
          </div></div>
          
          <!-- ROTATIONS VIEW - Compact Orb View -->
          <div v-if="currentView === 'resident_rotations'">
            <div class="card mb-6"><div class="card-header"><div class="card-title"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4"/></svg> Resident Rotations</div><div class="header-actions"><div class="view-toggle"><button class="btn-pill" :class="{ active: rotationView === 'compact' }" @click="rotationView = 'compact'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg> Compact</button><button class="btn-pill" :class="{ active: rotationView === 'detailed' }" @click="rotationView = 'detailed'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9H21M3 15H21M9 3V21M15 3V21"/></svg> Detailed</button><button class="btn-pill" :class="{ active: rotationView === 'month' }" @click="rotationView = 'month'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14H10M8 18H10M14 14H16M14 18H16"/></svg> Monthly</button></div><button class="btn btn-primary" @click="showAddRotationModal" v-if="hasPermission('resident_rotations', 'create')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add Rotation</button></div></div>
            <div class="filter-bar"><select class="form-select" v-model="rotationFilters.resident"><option value="">All Residents</option><option v-for="r in staffStore.medicalStaff.filter(s => isResidentType(s.staff_type))" :key="r.id" :value="r.id">{{ r.full_name }}</option></select><select class="form-select" v-model="rotationFilters.status"><option value="">All Status</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><select class="form-select" v-model="rotationFilters.trainingUnit"><option value="">All Units</option><option v-for="u in trainingStore.trainingUnits" :key="u.id" :value="u.id">{{ u.unit_name }}</option></select><input type="text" class="form-control" v-model="rotationFilters.search" placeholder="Search..."></div>
            
            <div v-if="rotationView === 'compact'" class="rot-compact"><div class="rot-legend"><span class="rot-legend-item"><span class="rot-legend-dot rot-legend-dot--active"></span> Active</span><span class="rot-legend-item"><span class="rot-legend-dot rot-legend-dot--scheduled"></span> Scheduled</span><span class="rot-legend-item"><span class="rot-legend-dot rot-legend-dot--done"></span> Completed</span><span class="rot-legend-item rot-legend-item--note"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v10M8 9c-2 1-3 3-3 5v3a5 5 0 0 0 10 0v-3c0-2-1-4-3-5M4 19h16"/></svg> Click orb for details · Hover to preview</span></div><div v-for="resident in rotationStore.residentsWithRotations" :key="resident.id" class="rot-row"><div class="rot-who"><div class="rot-who-avatar"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"><path d="M12 6L3 11L12 16L21 11L12 6Z"/><path d="M8 13.5V17C8 17 10 19 12 19C14 19 16 17 16 13.5"/></svg></div><div class="rot-who-info"><span class="rot-who-name">{{ resident.full_name }}</span><span class="rot-who-meta">{{ Utils.formatTrainingYear(resident.training_year) || 'PGY-?' }}</span></div></div><div class="rot-track"><div v-for="(rot, idx) in (resident.pastRotations||[]).slice(-3)" :key="rot.id" class="rot-orb rot-orb--done" @click.stop="viewRotationDetails(rot)"><span class="rot-orb-label">{{ rot.unitName ? rot.unitName.split(' ').slice(0,2).join(' ') : Utils.formatClinicalDuration(rot.start_date, rot.end_date) }}</span><div class="rot-orb-tooltip"><div class="rot-tt-unit">{{ rot.unitName }}</div><div class="rot-tt-dates">{{ formatDate(rot.start_date) }} → {{ formatDate(rot.end_date) }}</div><div class="rot-tt-tag rot-tt-tag--done">Completed</div></div></div><div v-if="(resident.pastRotations||[]).length && (resident.currentRotation || (resident.upcomingRotations||[]).length)" class="rot-connector">›</div><div v-if="resident.currentRotation" class="rot-orb rot-orb--active" @click.stop="viewRotationDetails(resident.currentRotation)"><span class="rot-orb-label">{{ resident.currentRotation.unitName ? resident.currentRotation.unitName.split(' ').slice(0,2).join(' ') : Utils.formatClinicalDuration(resident.currentRotation.start_date, resident.currentRotation.end_date) }}</span><div class="rot-orb-tooltip"><div class="rot-tt-unit">{{ resident.currentRotation.unitName }}</div><div class="rot-tt-dates">{{ formatDate(resident.currentRotation.start_date) }} → {{ formatDate(resident.currentRotation.end_date) }}</div><div class="rot-tt-remaining">{{ getDaysRemaining(resident.currentRotation.end_date) }}d remaining</div><div class="rot-tt-tag rot-tt-tag--active">● Active now</div></div></div><div v-if="resident.currentRotation && (resident.upcomingRotations||[]).length" class="rot-connector">›</div><div v-for="(rot, idx) in resident.upcomingRotations" :key="rot.id" class="rot-orb rot-orb--scheduled" @click.stop="viewRotationDetails(rot)"><span class="rot-orb-label">{{ rot.unitName ? rot.unitName.split(' ').slice(0,2).join(' ') : Utils.formatClinicalDuration(rot.start_date, rot.end_date) }}</span><div class="rot-orb-tooltip"><div class="rot-tt-unit">{{ rot.unitName }}</div><div class="rot-tt-dates">{{ formatDate(rot.start_date) }} → {{ formatDate(rot.end_date) }}</div><div class="rot-tt-tag rot-tt-tag--scheduled">Scheduled</div></div></div><div v-if="hasPermission('resident_rotations', 'create')" class="rot-orb rot-orb--add" @click.stop="showAddRotationModal(resident)" title="Add rotation"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></div><div v-if="!resident.currentRotation && !(resident.upcomingRotations||[]).length && !(resident.pastRotations||[]).length" class="rot-nil">No rotations assigned</div></div><div class="rot-row-actions"><button class="rot-action-btn" @click.stop="viewStaffDetails(resident)" title="View profile"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></button></div></div><div v-if="rotationStore.residentsWithRotations.length === 0" class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><div class="empty-state-title">No residents found</div></div></div>
            
            <div v-if="rotationView === 'month'" class="mv-view"><div class="mv-nav"><button class="mv-nav-btn" @click="monthOffset -= monthHorizon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><div class="mv-nav-center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span class="mv-nav-label">{{ getHorizonRangeLabel() }}</span><button v-if="monthOffset !== 0" class="mv-nav-today" @click="monthOffset = 0">Today</button></div><div class="mv-nav-horizon"><button v-for="h in [3, 6, 12]" :key="h" class="mv-hz-btn" :class="{ active: monthHorizon === h }" @click="monthHorizon = h">{{ h }}mo</button></div><button class="mv-nav-btn" @click="monthOffset += monthHorizon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div><div class="mv-grid" :style="{ gridTemplateColumns: '200px repeat(' + monthHorizon + ', minmax(60px, 1fr))' }"><div class="mv-name-spacer"></div><div v-for="m in getHorizonMonths(monthHorizon, monthOffset)" :key="'yr-' + m.key" class="mv-year-cell"><span v-if="m.isYearStart" class="mv-year-label">{{ m.year }}</span></div><div class="mv-name-header">Resident</div><div v-for="m in getHorizonMonths(monthHorizon, monthOffset)" :key="'hdr-' + m.key" class="mv-month-header" :class="{ 'mv-month-header--current': m.isCurrent }">{{ m.label }}</div><template v-for="resident in rotationStore.residentsWithRotations" :key="resident.id"><div class="mv-name-cell"><div class="mv-resident-icon"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"><path d="M12 6L3 11L12 16L21 11L12 6Z"/><path d="M8 13.5V17C8 17 10 19 12 19C14 19 16 17 16 13.5"/></svg></div><div class="mv-resident-text"><div class="mv-resident-name">{{ resident.full_name }}</div><div class="mv-resident-year">{{ Utils.formatTrainingYear(resident.training_year) || 'PGY-?' }}</div></div></div><div class="mv-months-area" :style="{ gridTemplateColumns: 'repeat(' + monthHorizon + ', minmax(60px, 1fr))' }"><div v-for="m in getHorizonMonths(monthHorizon, monthOffset)" :key="'bg-' + m.key" class="mv-month-bg" :class="{ 'mv-month-bg--current': m.isCurrent }"></div><div v-for="rot in getResidentRotationsInHorizon(resident)" :key="rot.id" class="mv-rot-bar" :class="{ 'mv-rot-bar--active': rot.rotation_status === 'active', 'mv-rot-bar--scheduled': rot.rotation_status === 'scheduled', 'mv-rot-bar--completed': rot.rotation_status === 'completed', 'mv-rot-bar--clipped-left': !rotationStartsInHorizon(rot), 'mv-rot-bar--clipped-right': !rotationEndsInHorizon(rot) }" :style="getRotationBarStyle(rot)" @click="viewRotationDetails(rot)" :title="getTrainingUnitName(rot.training_unit_id) + ' · ' + formatDate(rot.start_date) + ' → ' + formatDate(rot.end_date)"><span v-if="rotationStartsInHorizon(rot)" class="mv-rot-cap mv-rot-cap--start"></span><span class="mv-rot-label">{{ getTrainingUnitName(rot.training_unit_id) }}</span><span v-if="rotationEndsInHorizon(rot)" class="mv-rot-cap mv-rot-cap--end"></span></div></div></template><div v-if="rotationStore.residentsWithRotations.length === 0" class="mv-empty-state"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14H10M8 18H10M14 14H16M14 18H16"/></svg> No residents with rotations to display</div></div></div>
            
            <div v-if="rotationView === 'detailed'" class="table-responsive"><table class="table table-striped"><thead><tr><th>Resident</th><th>Unit</th><th>Period</th><th>Days Left</th><th>Status</th><th>Supervisor</th><th>Actions</th></tr></thead><tbody><tr v-for="rotation in filteredRotations" :key="rotation.id" :class="'row-' + rotation.rotation_status" @click="hasPermission('resident_rotations', 'update') && editRotation(rotation)"><td><div class="staff-name-cell"><div class="staff-table-av staff-table-av--resident">{{ (getResidentName(rotation.resident_id)||'??').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() }}</div><div class="staff-name-block"><div class="staff-name-primary">{{ getResidentName(rotation.resident_id) }}</div></div></div></td><td><div class="font-medium">{{ getTrainingUnitName(rotation.training_unit_id) }}</div></td><td><div class="rotation-period"><span class="rp-date">{{ formatDate(rotation.start_date) }}</span><span class="rp-arrow">→</span><span class="rp-date">{{ formatDate(rotation.end_date) }}</span></div></td><td><template v-if="rotation.rotation_status === 'active'"><div class="rot-progress-wrap"><div class="rot-progress-bar"><div class="rot-progress-fill" :class="{ urgent: getRotationProgress(rotation).urgent, done: getRotationProgress(rotation).done }" :style="{ width: getRotationProgress(rotation).pct + '%' }"></div></div><div class="rot-days-label" :class="{ urgent: getRotationProgress(rotation).urgent }">{{ getRotationProgress(rotation).pct }}% · {{ getRotationProgress(rotation).label }}</div></div></template><span v-else-if="rotation.rotation_status === 'scheduled'" class="days-pill days-future">in {{ getDaysUntilStart(rotation.start_date) }} days</span><span v-else class="na-value">—</span></td><td><span class="status-indicator" :class="'status-' + rotation.rotation_status">{{ formatRotationStatus(rotation.rotation_status) }}</span></td><td><span v-if="rotation.supervising_attending_id">{{ getStaffName(rotation.supervising_attending_id) }}</span><span v-else class="na-value">NA</span></td><td><div class="table-actions"><button class="btn-pill btn-pill-edit" @click.stop="editRotation(rotation)" v-if="hasPermission('resident_rotations', 'update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg></button><button class="btn-pill btn-pill-danger" @click.stop="deleteRotation(rotation)" v-if="hasPermission('resident_rotations', 'delete') && !['active','scheduled'].includes(rotation.rotation_status)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button></div></td></tr><tr v-if="filteredRotations.length === 0"><td colspan="7" class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><div class="empty-state-title">No rotations found</div><button v-if="!rotationFilters.resident && !rotationFilters.status && !rotationFilters.trainingUnit && hasPermission('resident_rotations', 'create')" class="btn btn-primary btn-sm" @click="showAddRotationModal">Add First Rotation</button></td></tr></tbody></table></div></div></div>
          
          <!-- TRAINING UNITS VIEW -->
          <div v-if="currentView === 'training_units'">
            <div class="card mb-6"><div class="card-header"><div class="card-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 21H21M5 21V8L12 4L19 8V21M9 21V15H15V21M12 8V11M10.5 9.5H13.5"/></svg> Clinical Units</div><div><button class="btn btn-primary" @click="showAddTrainingUnitModal" v-if="hasPermission('training_units', 'create')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add Unit</button></div></div>
            <div class="tu-kpi-strip"><div class="tu-kpi tu-kpi--ok"><div class="tu-kpi-num">{{ filteredTrainingUnits.filter(u => getUnitActiveRotationCount(u.id) < u.maximum_residents).length }}</div><div class="tu-kpi-label">Available</div><div class="tu-kpi-sub">slots open now</div></div><div class="tu-kpi-div"></div><div class="tu-kpi tu-kpi--warn"><div class="tu-kpi-num">{{ filteredTrainingUnits.filter(u => getUnitActiveRotationCount(u.id) > 0 && getUnitActiveRotationCount(u.id) < u.maximum_residents && getUnitActiveRotationCount(u.id) / u.maximum_residents > 0.5).length }}</div><div class="tu-kpi-label">Filling up</div><div class="tu-kpi-sub">&gt;50% occupied</div></div><div class="tu-kpi-div"></div><div class="tu-kpi tu-kpi--full"><div class="tu-kpi-num">{{ filteredTrainingUnits.filter(u => getUnitActiveRotationCount(u.id) >= u.maximum_residents).length }}</div><div class="tu-kpi-label">Full</div><div class="tu-kpi-sub">no slots now</div></div><div class="tu-kpi-div"></div><div class="tu-kpi tu-kpi--danger"><div class="tu-kpi-num">{{ filteredTrainingUnits.filter(u => !!getUnitOverlapWarning(u.id)).length }}</div><div class="tu-kpi-label">Overlap alert</div><div class="tu-kpi-sub">scheduled conflict</div></div><div style="margin-left:auto;align-self:center"><button class="btn btn-ghost" style="font-size:11px;padding:5px 10px" @click="occupancyPanel.show = true"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7L12 12L22 7L12 2Z"/><path d="M2 17L12 22L22 17"/><path d="M2 12L12 17L22 12"/></svg> Full overview</button></div></div>
            <div class="filter-bar"><input type="text" class="form-control" v-model="trainingUnitFilters.search" placeholder="Search units..."><select class="form-select" v-model="trainingUnitFilters.department"><option value="">All Departments</option><option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option></select><select class="form-select" v-model="trainingUnitFilters.status"><option value="">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><div class="tuc-view-toggle"><button class="tuc-view-btn" :class="{ active: trainingUnitView === 'timeline' }" @click="trainingUnitView = 'timeline'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6H20M4 12H20M4 18H14"/></svg></button><button class="tuc-view-btn" :class="{ active: trainingUnitView === 'detail' }" @click="trainingUnitView = 'detail'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></button></div><div v-if="trainingUnitView === 'timeline'" class="tuc-horizon-row"><span class="tuc-horizon-label">Showing</span><button v-for="m in [3,6,12]" :key="m" class="tuc-horizon-btn" :class="{ active: trainingUnitHorizon === m }" @click="trainingUnitHorizon = m">{{ m }}mo</button></div></div>
            <div v-if="loading" class="skeleton-grid"><div v-for="i in 4" :key="i" class="skeleton-card"></div></div>
            <div v-else class="training-units-grid"><div v-if="trainingUnitView === 'timeline'" class="tuc-shared-legend"><span class="tuc-tl-leg-item"><span class="tuc-tl-leg-dot tuc-tl-leg-dot--occupied"></span>Occupied</span><span class="tuc-tl-leg-item"><span class="tuc-tl-leg-dot tuc-tl-leg-dot--partial"></span>Partial</span><span class="tuc-tl-leg-item"><span class="tuc-tl-leg-dot tuc-tl-leg-dot--free"></span>Available</span><div class="tuc-shared-month-header"><div v-for="m in getTimelineMonths(trainingUnitHorizon)" :key="m.key" class="tuc-tl-month-label" :class="{ 'tuc-tl-month-label--current': m.isCurrent }">{{ m.label }}</div></div></div><div v-for="unit in filteredTrainingUnits" :key="unit.id" class="tuc" :class="{ 'tuc--full': getUnitActiveRotationCount(unit.id) >= unit.maximum_residents, 'tuc--warn': getUnitActiveRotationCount(unit.id) > 0 && getUnitActiveRotationCount(unit.id) / unit.maximum_residents > 0.5, 'tuc--active': getUnitActiveRotationCount(unit.id) > 0 && getUnitActiveRotationCount(unit.id) / unit.maximum_residents <= 0.5 }" @click="openUnitDetail(unit)"><div v-if="getUnitOverlapWarning(unit.id)" class="tuc-overlap-strip"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg> Scheduling overlap · {{ formatDateShort(getUnitOverlapWarning(unit.id).date) }}</div><template v-if="trainingUnitView === 'timeline'"><div class="tuc-head"><div class="tuc-name-row"><div><div class="tuc-name">{{ unit.unit_name }}</div><div class="tuc-sub"><span v-if="unit.specialty" class="tuc-specialty">{{ unit.specialty }}</span></div></div></div><div class="tuc-head-right"><div class="tuc-cap-block"><div class="tuc-cap-nums"><span class="tuc-cap-current" :style="getUnitActiveRotationCount(unit.id) >= unit.maximum_residents ? 'color:#e24b4a' : getUnitActiveRotationCount(unit.id)/unit.maximum_residents > 0.5 ? 'color:#ef9f27' : 'color:#009999'">{{ getUnitActiveRotationCount(unit.id) }}</span><span class="tuc-cap-sep">/</span><span class="tuc-cap-max">{{ unit.maximum_residents }}</span></div><div class="tuc-cap-bar"><div class="tuc-cap-fill" :style="{ width: Math.min(100, Math.round((getUnitActiveRotationCount(unit.id)/unit.maximum_residents)*100))+'%', background: getUnitActiveRotationCount(unit.id) >= unit.maximum_residents ? '#e24b4a' : getUnitActiveRotationCount(unit.id)/unit.maximum_residents > 0.5 ? '#ef9f27' : '#009999' }"></div></div></div></div></div><div class="tuc-timeline-body"><div v-for="(slot, idx) in getUnitSlots(unit.id, unit.maximum_residents, trainingUnitHorizon)" :key="idx" class="tuc-tl-row"><div class="tuc-tl-slot-label"><div class="tuc-tl-avatar" v-if="slot.initials">{{ slot.initials }}</div><div class="tuc-tl-slot-num" v-else>{{ idx + 1 }}</div></div><div class="tuc-tl-months"><div v-for="m in slot.months" :key="m.key" class="tuc-tl-cell" :class="{ 'tuc-tl-cell-name': m.status === 'occupied', 'tuc-tl-cell-scheduled': m.status === 'partial', 'tuc-tl-cell-free': m.status === 'free' }" :title="m.tooltip"><span v-if="m.showName" class="tuc-tl-cell-label">{{ m.initials }}</span></div></div></div></div></template><template v-else><div class="tuc-card-body"><div class="tuc-card-title-row"><div class="tuc-name">{{ unit.unit_name }}</div><span class="tuc-type-badge" :class="'tuc-type--' + (unit.unit_type || 'training_unit')">{{ { 'clinical_unit':'Ward','icu':'ICU','outpatient':'OPD','surgical':'Surgery','research':'Research','training_unit':'Training' }[unit.unit_type] || 'Unit' }}</span></div><div class="tuc-card-meta"><span v-if="unit.specialty" style="color:var(--text-3);font-size:11px">{{ unit.specialty }}</span><span v-if="unit.supervisor_id || unit.supervising_attending_id" style="color:var(--text-3);font-size:11px">· {{ (staffStore.allStaffLookup.find(s=>s.id===(unit.supervisor_id||unit.supervising_attending_id))?.full_name||'').split(' ').slice(-1)[0] }}</span></div><div class="tuc-resident-slots"><div v-for="rot in getUnitRotations(unit.id)" :key="rot.id" class="tuc-resident-row tuc-resident-row--active"><div class="tuc-res-avatar">{{ (getResidentName(rot.resident_id)||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() }}</div><div class="tuc-res-info"><span class="tuc-res-name">{{ getResidentName(rot.resident_id) || '—' }}</span><span class="tuc-res-dates">→ {{ new Date(rot.end_date+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short'}) }}</span></div><span v-if="getDaysUntilFree(rot.end_date) <= 45 && getDaysUntilFree(rot.end_date) > 0" class="tuc-free-chip">Free in {{ getDaysUntilFree(rot.end_date) }}d</span></div><div v-for="i in Math.max(0, unit.maximum_residents - getUnitActiveRotationCount(unit.id))" :key="'free-'+i" class="tuc-resident-row tuc-resident-row--free"><div class="tuc-res-avatar tuc-res-avatar--free"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg></div><span class="tuc-res-name" style="color:var(--text-4);font-style:italic">Available</span></div></div><div class="tuc-card-footer"><div class="tuc-cap-bar" style="flex:1"><div class="tuc-cap-fill" :style="{ width: Math.min(100,Math.round((getUnitActiveRotationCount(unit.id)/unit.maximum_residents)*100))+'%', background: getUnitActiveRotationCount(unit.id) >= unit.maximum_residents ? '#e24b4a' : getUnitActiveRotationCount(unit.id)/unit.maximum_residents > 0.5 ? '#ef9f27' : '#009999' }"></div></div><span class="tuc-cap-label">{{ getUnitActiveRotationCount(unit.id) }}/{{ unit.maximum_residents }}</span><span v-if="getUnitScheduledCount(unit.id) > 0" style="font-size:9.5px;color:var(--text-4);font-family:monospace">+{{ getUnitScheduledCount(unit.id) }} sched</span></div></div></template></div><div v-if="filteredTrainingUnits.length === 0" class="empty-state"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg><div class="empty-state-title">No training units found</div><button class="btn btn-primary btn-sm" @click="showAddTrainingUnitModal" v-if="hasPermission('training_units', 'create')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add First Unit</button></div></div></div></div>
          
          <!-- STAFF ABSENCE VIEW -->
          <div v-if="currentView === 'staff_absence'">
            <div class="card mb-6"><div class="card-header"><div class="card-title"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2v-2a4 4 0 0 1 4-4h3"/><circle cx="9" cy="7" r="4"/><circle cx="17" cy="17" r="4"/><path d="M17 15v2l1 1"/></svg> Staff Absence</div><button class="btn btn-primary" @click="showAddAbsenceModal" v-if="hasPermission('staff_absence', 'create')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Record Absence</button></div>
            <div class="filter-bar"><select class="form-select" v-model="absenceFilters.staff"><option value="">All Staff</option><option v-for="s in staffStore.medicalStaff" :key="s.id" :value="s.id">{{ s.full_name }}</option></select><select class="form-select" v-model="absenceFilters.status"><option value="">Active</option><option value="currently_absent">Absent Now</option><option value="planned_leave">Planned</option><option value="returned_to_duty">Returned</option><option value="cancelled">Cancelled</option></select><button class="btn btn-sm" :class="absenceFilters.hideReturned ? 'btn-ghost' : 'btn-primary'" @click="absenceFilters.hideReturned = !absenceFilters.hideReturned" style="white-space:nowrap;font-size:12px"><i class="fas" :class="absenceFilters.hideReturned ? 'fa-eye' : 'fa-eye-slash'"></i> {{ absenceFilters.hideReturned ? 'Show Past' : 'Hide Past' }}</button><select class="form-select" v-model="absenceFilters.reason"><option value="">All Reasons</option><option value="vacation">Vacation</option><option value="sick_leave">Sick Leave</option><option value="conference">Conference</option><option value="training">Training</option><option value="personal">Personal</option><option value="other">Other</option></select><input type="date" class="form-control" v-model="absenceFilters.startDate"><input type="text" class="form-control" v-model="absenceFilters.search" placeholder="Search..."></div>
            <div class="table-responsive"><table class="table table-striped"><thead><tr><th>Staff Member</th><th>Reason</th><th>Type</th><th>From</th><th>Until</th><th>Duration</th><th>Coverage</th><th>Actions</th></tr></thead><tbody><tr v-for="absence in filteredAbsences" :key="absence.id" :class="{ 'row-currently_absent': absence.current_status === 'currently_absent', 'row-planned_leave': absence.current_status === 'planned_leave', 'row-returned': absence.current_status === 'returned_to_duty' }" @click="hasPermission('staff_absence', 'update') && editAbsence(absence)"><td><div class="staff-name-cell"><div class="staff-table-av" :class="absence.current_status === 'currently_absent' ? 'staff-table-av--leave' : 'staff-table-av--attending'">{{ (getStaffName(absence.staff_member_id)||'??').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() }}</div><div class="staff-name-primary">{{ getStaffName(absence.staff_member_id) }}</div></div></td><td><span class="badge" :class="{ 'badge-primary': absence.absence_reason === 'vacation', 'badge-green': absence.absence_reason === 'conference', 'badge-red': absence.absence_reason === 'sick_leave', 'badge-purple': absence.absence_reason === 'training', 'badge-yellow': absence.absence_reason === 'personal', 'badge-gray': absence.absence_reason === 'other' }">{{ formatAbsenceReason(absence.absence_reason) }}</span></td><td><span class="status-indicator" :class="{ 'status-active': absence.current_status === 'currently_absent', 'status-scheduled': absence.current_status === 'planned_leave', 'status-completed': absence.current_status === 'returned_to_duty' }"><span v-if="absence.current_status === 'currently_absent'">Absent Now</span><span v-else-if="absence.current_status === 'planned_leave'">Planned</span><span v-else-if="absence.current_status === 'returned_to_duty'">Returned</span><span v-else>{{ absence.current_status }}</span></span></td><td>{{ formatDate(absence.start_date) }}</td><td>{{ formatDate(absence.end_date) }}</td><td><span class="absence-duration">{{ calculateAbsenceDuration(absence.start_date, absence.end_date) }}</span><span class="absence-duration-label">days</span></td><td><span v-if="absence.coverage_arranged && absence.covering_staff_id" class="coverage-ok"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg> {{ getStaffName(absence.covering_staff_id) }}</span><span v-else-if="absence.coverage_arranged" class="coverage-ok"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg> Covered</span><span v-else class="coverage-gap"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg> No coverage</span></td><td><div class="table-actions"><button v-if="absence.current_status === 'completed'" class="btn-pill btn-pill-resolve" @click.stop="openResolutionModal(absence)" title="Resolve"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12l2 2 4-4"/></svg> Resolve</button><button class="btn-pill btn-pill-edit" @click.stop="editAbsence(absence)" v-if="hasPermission('staff_absence', 'update') && absence.current_status !== 'completed'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg> Edit</button><button class="btn-pill btn-pill-danger" @click.stop="deleteAbsence(absence)" v-if="hasPermission('staff_absence', 'delete') && absence.current_status !== 'completed'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></button></div></td></tr><tr v-if="filteredAbsences.length === 0"><td colspan="8" class="empty-state"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/></svg><div class="empty-state-title">No absences found</div><button v-if="!absenceFilters.staff && !absenceFilters.reason && !absenceFilters.startDate && !absenceFilters.status && hasPermission('staff_absence', 'create')" class="btn btn-primary btn-sm" @click="showAddAbsenceModal">Record First Absence</button></td></tr></tbody></table><div class="pagination" v-if="Math.ceil(filteredAbsences.length / pagination.absences.size) > 1"><button class="btn-pill" @click="goToPage('absences', pagination.absences.page - 1)" :disabled="pagination.absences.page === 1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><span class="pagination-info">Page {{ pagination.absences.page }} of {{ Math.ceil(filteredAbsences.length / pagination.absences.size) }}</span><button class="btn-pill" @click="goToPage('absences', pagination.absences.page + 1)" :disabled="pagination.absences.page === Math.ceil(filteredAbsences.length / pagination.absences.size)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div></div></div>
          </div>
          
          <!-- RESEARCH HUB -->
          <div v-if="currentView === 'research_hub'" class="research-hub"><div v-if="researchStore.researchLines.length === 0 && loading" class="loading-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="fa-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg><span>Loading research data...</span></div><div v-else><div class="rhub-tabs"><button class="rhub-tab" :class="{ 'rhub-tab--active': researchHubTab === 'lines' }" @click="researchHubTab = 'lines'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/></svg><span>Lines</span><span class="rhub-tab-count">{{ researchStore.researchLines.length }}</span></button><button class="rhub-tab" :class="{ 'rhub-tab--active': researchHubTab === 'trials' }" @click="researchHubTab = 'trials'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/></svg><span>Studies</span><span class="rhub-tab-count">{{ researchStore.clinicalTrials.length }}</span></button><button class="rhub-tab" :class="{ 'rhub-tab--active': researchHubTab === 'projects' }" @click="researchHubTab = 'projects'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/><path d="M7.5 16H12"/></svg><span>Projects</span><span class="rhub-tab-count">{{ researchStore.innovationProjects.length }}</span></button><button class="rhub-tab" :class="{ 'rhub-tab--active': researchHubTab === 'analytics' }" @click="researchHubTab = 'analytics'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg><span>Analytics</span></button><div style="margin-left:auto"><button class="btn btn-primary btn-sm" v-if="researchHubTab === 'lines' && hasPermission('research_lines','create')" @click="showAddResearchLineModal"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add Line</button><button class="btn btn-primary btn-sm" v-if="researchHubTab === 'trials' && hasPermission('research_lines','create')" @click="showAddTrialModal"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add Study</button><button class="btn btn-primary btn-sm" v-if="researchHubTab === 'projects' && hasPermission('research_lines','create')" @click="showAddProjectModal"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> Add Project</button><button class="btn btn-outline btn-sm" v-if="researchHubTab === 'analytics' && hasPermission('analytics','export')" @click="showExportModal"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 19H19M8 14l4 5 4-5"/></svg> Export</button></div></div>
            <div v-show="researchHubTab === 'lines'" class="rhub-panel"><div class="rp-kpi-strip"><div class="rp-kpi"><div class="rp-kpi-val">{{ researchStore.portfolioKPIs.activeLines || 0 }}</div><div class="rp-kpi-label">Active Lines</div><div class="rp-kpi-sub">of {{ researchStore.portfolioKPIs.totalLines || 0 }} total</div></div><div class="rp-kpi-div"></div><div class="rp-kpi"><div class="rp-kpi-val">{{ researchStore.portfolioKPIs.activeStudies || 0 }}</div><div class="rp-kpi-label">Active Studies</div><div class="rp-kpi-sub">of {{ researchStore.portfolioKPIs.totalStudies || 0 }} total</div></div><div class="rp-kpi-div"></div><div class="rp-kpi"><div class="rp-kpi-val">{{ researchStore.portfolioKPIs.totalProjects || 0 }}</div><div class="rp-kpi-label">Projects</div><div class="rp-kpi-sub">in pipeline</div></div><div class="rp-kpi-div"></div><div class="rp-kpi"><div class="rp-kpi-val">{{ (researchStore.portfolioKPIs.totalEnrolled || 0).toLocaleString() }}</div><div class="rp-kpi-label">Participants</div></div><div class="rp-kpi-search"><input type="text" class="form-control" v-model="researchLineFilters.search" placeholder="Search lines…"></div></div><div class="rp-mc"><div class="rp-nav"><div v-for="line in filteredResearchLines" :key="line.id" class="rp-nav-item" :class="{ 'rp-nav-item--active': researchStore.activeMissionLine && researchStore.activeMissionLine.id === line.id, 'rp-nav-item--inactive': !line.active }" @click="openLineDetail(line)"><div class="rp-nav-badge">L{{ line.line_number }}</div><div class="rp-nav-info"><div class="rp-nav-name">{{ line.research_line_name || line.name }}</div><div class="rp-nav-meta"><span>{{ line.stats?.totalStudies || 0 }} studies</span><span class="rp-nav-dot"></span><span>{{ line.stats?.totalProjects || 0 }} projects</span></div><div v-if="line.coordinator_id" class="rp-nav-coord"><div class="rp-nav-coord-av">{{ (staffStore.allStaffLookup.find(s=>s.id===line.coordinator_id)?.full_name||'').split(' ').slice(0,2).map(n=>n[0]).join('') }}</div><span>{{ (staffStore.allStaffLookup.find(s=>s.id===line.coordinator_id)?.full_name||'').split(' ').slice(-1)[0] }}</span></div></div><div class="rp-nav-status"><span v-if="line.stats?.activeTrials > 0" class="rp-nav-live"></span></div></div><div v-if="filteredResearchLines.length === 0" class="rp-nav-empty"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/></svg><span>No lines found</span></div></div><div class="rp-detail" v-if="researchStore.activeMissionLine"><div class="rp-detail-head" :style="{ background: getLineAccent(researchStore.activeMissionLine.line_number).bg }"><div class="rp-detail-head-left"><span class="rp-detail-num">L{{ researchStore.activeMissionLine.line_number }}</span><h2 class="rp-detail-title">{{ researchStore.activeMissionLine.research_line_name || researchStore.activeMissionLine.name }}</h2></div><div class="rp-detail-head-actions"><button class="rp-detail-btn" @click="editResearchLine(researchStore.activeMissionLine)" v-if="hasPermission('research_lines','update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg></button><button class="rp-detail-btn rp-detail-btn--danger" @click="deleteResearchLine(researchStore.activeMissionLine)" v-if="hasPermission('research_lines','delete')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button></div></div><div class="rp-detail-body"><div class="rp-detail-stats"><div class="rp-ds-block" @click="drillToTrials(researchStore.activeMissionLine.id)"><div class="rp-ds-val">{{ researchStore.activeMissionLine.stats?.totalStudies || 0 }}</div><div class="rp-ds-label">Clinical Studies</div></div><div class="rp-ds-block" @click="drillToProjects(researchStore.activeMissionLine.id)"><div class="rp-ds-val">{{ researchStore.activeMissionLine.stats?.totalProjects || 0 }}</div><div class="rp-ds-label">Projects</div></div></div><div class="rp-detail-section" v-if="researchStore.activeMissionLine.description"><div class="rp-detail-section-label">About this line</div><p class="rp-detail-desc">{{ researchStore.activeMissionLine.description }}</p></div><div class="rp-detail-section"><div class="rp-detail-section-label">Coordinator</div><div v-if="researchStore.activeMissionLine.coordinator_id" class="rp-detail-coord"><div class="rp-detail-coord-avatar" :style="{ background: getLineAccent(researchStore.activeMissionLine.line_number).bg }">{{ (researchStore.activeMissionLine.coordinator_name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() }}</div><div><div class="rp-detail-coord-name">{{ researchStore.activeMissionLine.coordinator_name }}</div><div class="rp-detail-coord-role">Line Coordinator</div></div><button class="rp-detail-btn" style="margin-left:auto" @click="openAssignCoordinatorModal(researchStore.activeMissionLine)" v-if="hasPermission('research_lines','update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 16H3l4 4 4-4H7V4M17 8h4l-4-4-4 4h4v12"/></svg></button></div><div v-else class="rp-detail-no-coord"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8"/><path d="M16 3.13a4 4 0 0 1 0 7.75M1 1l22 22"/><circle cx="9" cy="7" r="4"/></svg> No coordinator assigned<button class="btn btn-sm btn-outline" style="margin-left:10px" @click="openAssignCoordinatorModal(researchStore.activeMissionLine)" v-if="hasPermission('research_lines','update')">Assign</button></div></div><div class="rp-detail-section" v-if="researchStore.clinicalTrials.filter(t => t.research_line_id === researchStore.activeMissionLine.id).length > 0"><div class="rp-detail-section-label">Clinical Studies</div><div class="rp-trial-list"><div v-for="trial in researchStore.clinicalTrials.filter(t => t.research_line_id === researchStore.activeMissionLine.id).slice(0,4)" :key="trial.id" class="rp-study-row"><div class="rp-trial-info"><div class="rp-trial-title">{{ trial.title }}</div><div class="rp-trial-meta">{{ trial.phase }} · {{ trial.protocol_id }}</div></div><div class="rp-trial-right"><span class="rp-trial-status" :class="{ 'rp-trial-status--recruiting': trial.status === 'Reclutando', 'rp-trial-status--active': trial.status === 'Activo', 'rp-trial-status--done': trial.status === 'Completado' }">{{ trial.status }}</span><div v-if="trial.enrollment_target > 0" class="rp-study-bar"><div class="rp-trial-bar-fill" :style="{ width: Math.min(100, Math.round(((trial.actual_enrollment||0)/trial.enrollment_target)*100)) + '%', background: getLineAccent(researchStore.activeMissionLine.line_number).color }"></div></div></div></div></div><button class="rp-view-all" @click="drillToTrials(researchStore.activeMissionLine.id)">View all studies <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button></div><div class="rp-detail-section" v-if="researchStore.innovationProjects.filter(p=>p.research_line_id===researchStore.activeMissionLine.id).length > 0"><div class="rp-detail-section-label">Innovation Projects</div><div class="rp-trial-list"><div v-for="proj in researchStore.innovationProjects.filter(p=>p.research_line_id===researchStore.activeMissionLine.id).slice(0,4)" :key="proj.id" class="rp-study-row"><div class="rp-trial-info"><div class="rp-trial-title">{{ proj.title }}</div><div class="rp-trial-meta">{{ proj.current_stage || proj.development_stage }}</div></div></div></div><button class="rp-view-all" @click="drillToProjects(researchStore.activeMissionLine.id)">View all projects <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button></div></div><div class="rp-detail-footer"><button class="btn btn-sm btn-outline" @click="drillToTrials(researchStore.activeMissionLine.id)">Studies</button><button class="btn btn-sm btn-outline" @click="drillToProjects(researchStore.activeMissionLine.id)">Projects</button><button class="btn btn-primary btn-sm" @click="showAddTrialModal(researchStore.activeMissionLine)" v-if="hasPermission('research_lines','create')" style="margin-left:auto">Add Study</button></div></div><div class="rp-detail rp-detail--empty" v-else><div class="rp-detail-empty-inner"><div class="rp-detail-empty-icon"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/></svg></div><div class="rp-detail-empty-title">Select a research line</div><div class="rp-detail-empty-sub">Click any line on the left to explore its studies, projects and team</div><button class="btn btn-primary btn-sm" @click="showAddResearchLineModal" v-if="hasPermission('research_lines','create')" style="margin-top:16px">Add First Line</button></div></div></div></div>
            <div v-show="researchHubTab === 'trials'" class="rhub-panel"><div class="rhub-filter-bar"><select class="form-select" v-model="trialFilters.line"><option value="">All Lines</option><option v-for="line in researchStore.researchLines" :key="line.id" :value="line.id">{{ line.research_line_name || line.name }}</option></select><select class="form-select" v-model="trialFilters.phase"><option value="">All Phases</option><option>Phase I</option><option>Phase II</option><option>Phase III</option><option>Phase IV</option></select><select class="form-select" v-model="trialFilters.status"><option value="">All Status</option><option value="Reclutando">Recruiting</option><option value="Activo">Active</option><option value="Completado">Completed</option></select><input type="text" class="form-control" v-model="trialFilters.search" placeholder="Search protocol or title…"></div><div class="rhub-trials-list"><div v-for="trial in filteredTrials" :key="trial.id" class="rht-row" @click="viewTrial(trial)"><div class="rht-phase-badge" :style="{ background: getPhaseColor(trial.phase) }">{{ trial.phase?.replace('Phase ','') }}</div><div class="rht-main"><div class="rht-title">{{ trial.title }}</div><div class="rht-meta"><span class="rht-protocol">{{ trial.protocol_id }}</span><span class="rht-sep">·</span><span>{{ getResearchLineName(trial.research_line_id) }}</span><span v-if="trial.principal_investigator_id" class="rht-sep">·</span><span v-if="trial.principal_investigator_id"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 15v3M10.5 17h3"/></svg> {{ getStaffName(trial.principal_investigator_id) }}</span></div></div><div class="rht-enrollment" v-if="trial.enrollment_target"><div class="rht-enroll-nums">{{ trial.actual_enrollment || 0 }}/{{ trial.enrollment_target }}</div><div class="rht-enroll-bar"><div :style="{ width: Math.min(100,(trial.actual_enrollment||0)/trial.enrollment_target*100)+'%', background: getPhaseColor(trial.phase) }"></div></div></div><div class="rht-dates" v-if="trial.start_date || trial.end_date"><span v-if="trial.start_date">{{ formatDateShort(trial.start_date) }}</span><span v-if="trial.end_date"> → {{ formatDateShort(trial.end_date) }}</span></div><span class="rht-status status-indicator" :class="{ 'status-recruiting': trial.status==='Reclutando', 'status-active': trial.status==='Activo', 'status-completed': trial.status==='Completado' }">{{ formatStudyStatus(trial.status) }}</span><div class="rht-actions" @click.stop><button class="btn-pill btn-pill-edit" @click.stop="editTrial(trial)" v-if="hasPermission('research_lines','update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg></button><button class="btn-pill btn-pill-delete" @click.stop="deleteClinicalTrial(trial)" v-if="hasPermission('research_lines','delete')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button></div></div><div v-if="filteredTrials.length === 0" class="rhub-empty"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/></svg><p>No studies match your filters</p></div></div><div class="pagination" v-if="Math.ceil(filteredTrials.length / pagination.trials.size) > 1"><button class="btn-pill" @click="goToPage('trials', pagination.trials.page - 1)" :disabled="pagination.trials.page === 1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button><span class="pagination-info">Page {{ pagination.trials.page }} of {{ Math.ceil(filteredTrials.length / pagination.trials.size) }}</span><button class="btn-pill" @click="goToPage('trials', pagination.trials.page + 1)" :disabled="pagination.trials.page === Math.ceil(filteredTrials.length / pagination.trials.size)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></button></div></div>
            <div v-show="researchHubTab === 'projects'" class="rhub-panel"><div class="pipeline-overview"><div v-for="stage in PROJECT_STAGES" :key="stage.key" class="pipeline-stage-tile" :class="{ 'pipeline-stage-tile--active': projectFilters.stage === stage.key }" @click="projectFilters.stage = projectFilters.stage === stage.key ? '' : stage.key"><div class="pst-count">{{ (researchStore.innovationProjects || []).filter(p => (p.current_stage || p.development_stage) === stage.key).length }}</div><div class="pst-label">{{ stage.label }}</div><div class="pst-dot" :style="{ background: stage.color }"></div></div></div><div class="rhub-filter-bar"><select class="form-select" v-model="projectFilters.research_line_id"><option value="">All Lines</option><option v-for="line in researchStore.researchLines" :key="line.id" :value="line.id">{{ line.research_line_name || line.name }}</option></select><select class="form-select" v-model="projectFilters.category"><option value="">All Categories</option><option value="Dispositivo">Dispositivo</option><option value="Salud Digital">Salud Digital</option><option value="IA / ML">IA / ML</option><option value="Tecnologia Quirurgica">Tecnologia Quirurgica</option></select><select class="form-select" v-model="projectFilters.funding_status"><option value="">All Funding</option><option value="seeking">Seeking</option><option value="applied">Applied</option><option value="funded">Funded ✓</option></select><input type="text" class="form-control" v-model="projectFilters.search" placeholder="Search projects…"></div><div class="inno-projects-grid"><div v-for="project in filteredProjects" :key="project.id" class="inno-card" :style="{ '--stage-color': getStageConfig(project.current_stage || project.development_stage).color, '--stage-bg': getStageConfig(project.current_stage || project.development_stage).bg }"><div class="inno-card-bar"></div><div class="inno-card-top"><span class="inno-cat-badge" :class="'inno-cat--' + (project.category || '').toLowerCase().replace(/[^a-z]/g, '-')">{{ project.category }}</span><div class="inno-card-actions"><button class="inno-action-btn" @click="editProject(project)" v-if="hasPermission('research_lines','update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg></button><button class="inno-action-btn inno-action-btn--danger" @click="deleteInnovationProject(project)" v-if="hasPermission('research_lines','delete')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button></div></div><h3 class="inno-card-title">{{ project.title }}</h3><div class="inno-stage-track"><div v-for="s in PROJECT_STAGES" :key="s.key" class="inno-stage-node" :class="{ 'inno-stage-node--done': s.step < getStageConfig(project.current_stage || project.development_stage).step, 'inno-stage-node--current': s.key === (project.current_stage || project.development_stage), 'inno-stage-node--future': s.step > getStageConfig(project.current_stage || project.development_stage).step }" :style="s.key === (project.current_stage || project.development_stage) ? { background: s.color, borderColor: s.color } : {}"><i class="fas" :class="s.key === (project.current_stage || project.development_stage) ? s.icon : 'fa-check'" v-if="s.step <= getStageConfig(project.current_stage || project.development_stage).step"></i></div><span class="inno-stage-label"><i class="fas" :class="getStageConfig(project.current_stage || project.development_stage).icon"></i> {{ project.current_stage || project.development_stage }}</span></div><p class="inno-card-description" v-if="project.description">{{ project.description }}</p><div class="inno-meta-row"><span class="inno-line-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/></svg> {{ getResearchLineName(project.research_line_id) }}</span><span v-if="project.funding_status && project.funding_status !== 'not_applicable'" class="inno-funding-badge" :class="'inno-funding--' + project.funding_status"><i class="fas" :class="{ 'fa-search-dollar': project.funding_status==='seeking', 'fa-file-alt': project.funding_status==='applied', 'fa-check-circle': project.funding_status==='funded' }"></i> {{ { seeking: 'Seeking Funding', applied: 'Applied', funded: 'Funded' }[project.funding_status] }}</span></div><div class="inno-team-section" v-if="project.lead_investigator_id"><div class="inno-team-label">EQUIPO</div><div class="inno-team-members"><div class="inno-team-member"><div class="inno-member-avatar inno-member-avatar--lead">{{ getStaffName(project.lead_investigator_id).split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() }}</div><div class="inno-member-info"><span class="inno-member-name">{{ getStaffName(project.lead_investigator_id) }}</span><span class="inno-member-role">PI / Lead</span></div></div></div></div><div class="inno-trl-row" v-if="project.trl_level"><div class="inno-trl-track"><div v-for="n in 9" :key="n" class="inno-trl-pip" :class="{ 'inno-trl-pip--filled': n <= project.trl_level, 'inno-trl-pip--current': n === project.trl_level }" :style="n <= project.trl_level ? { background: getStageConfig(project.current_stage || project.development_stage).color } : {}"></div></div><span class="inno-trl-label">TRL {{ project.trl_level }}</span></div><div class="inno-keywords" v-if="project.keywords && project.keywords.length"><span v-for="kw in project.keywords" :key="kw" class="inno-kw-chip">{{ kw }}</span></div></div><div v-if="filteredProjects.length === 0" class="rhub-empty"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/><path d="M7.5 16H12"/></svg><p>No projects found</p></div></div></div></div></div>
          
          <!-- NEWS VIEW -->
          <div v-if="currentView === 'news'" class="news-view"><div class="rhub-tabs"><button class="rhub-tab" :class="{ 'rhub-tab--active': newsFilters.status === '' }" @click="newsFilters.status = ''">All<span class="rhub-tab-count">{{ newsStore.filteredNews.length }}</span></button><button class="rhub-tab" :class="{ 'rhub-tab--active': newsFilters.status === 'published' }" @click="newsFilters.status = 'published'">Published<span class="rhub-tab-count">{{ newsStore.newsPosts.filter(p => p.status === 'published').length }}</span></button><button class="rhub-tab" :class="{ 'rhub-tab--active': newsFilters.status === 'draft' }" @click="newsFilters.status = 'draft'">Drafts<span class="rhub-tab-count">{{ newsStore.newsPosts.filter(p => p.status === 'draft').length }}</span></button><div style="margin-left:auto"><button class="btn btn-primary btn-sm" @click="showAddNewsModal" v-if="hasPermission('news_posts','create')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg> New Post</button></div></div><div class="news-filter-bar"><input type="text" class="form-control" v-model="newsFilters.search" placeholder="Search posts…"><select class="form-select" v-model="newsFilters.type"><option value="">All Types</option><option value="update">Update</option><option value="article">Article</option><option value="publication">Publication</option></select><select class="form-select" v-model="newsFilters.scope"><option value="">All Visibility</option><option value="public">Public (website)</option><option value="internal">Internal only</option></select></div><div class="news-list" v-if="!newsStore.newsLoading"><div v-if="newsStore.filteredNews.length === 0" class="news-empty"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 22H20a1 1 0 001-1V5a1 1 0 00-1-1H8l-5 5v12a1 1 0 001 1z"/><path d="M8 4V9H3M12 13H16M12 17H16M8 13H9M8 17H9"/></svg><p>No posts yet.</p><button class="btn btn-primary btn-sm" @click="showAddNewsModal" v-if="hasPermission('news_posts','create')">New Post</button></div><div v-for="post in newsStore.filteredNews" :key="post.id" class="news-card" :class="'news-card--' + post.post_type" @click.stop="openNewsDrawer(post)"><div class="news-card-left"><span class="news-type-badge" :class="'ntb--' + post.post_type"><svg v-if="post.post_type==='update'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/></svg><svg v-else-if="post.post_type==='article'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg><svg v-else-if="post.post_type==='publication'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>{{ post.post_type === 'update' ? 'Update' : post.post_type === 'article' ? 'Article' : 'Publication' }}</span></div><div class="news-card-body"><div class="news-card-title">{{ post.title }}</div><div v-if="post.post_type === 'publication'" class="news-pub-meta"><span v-if="post.journal_name" class="news-journal">{{ post.journal_name }}</span><span v-if="post.authors_text" class="news-authors">{{ post.authors_text }}</span><a v-if="post.doi" :href="'https://doi.org/' + post.doi" target="_blank" class="news-doi"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg> DOI {{ post.doi }}</a></div><div v-if="post.body && post.post_type !== 'publication'" class="news-card-excerpt">{{ post.body }}</div><div class="news-card-meta"><span v-if="post.author_id" class="news-meta-item"><span class="news-author-av">{{ newsStore.formatAuthorName(post.author_id).split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() }}</span>{{ newsStore.formatAuthorName(post.author_id) }}</span><span v-if="post.research_line_id" class="news-meta-item news-meta-line"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"><path d="M9 4H15M10 4V10L5 19H19L14 10V4"/></svg> {{ newsStore.getLineName(post.research_line_id) }}</span><span class="news-meta-item"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14H10M8 18H10M14 14H16M14 18H16"/></svg> {{ formatNewsDate(post.published_at || post.created_at) }}</span><span v-if="post.word_count && post.post_type !== 'publication'" class="news-meta-item news-wc">{{ post.word_count }}w</span></div></div><div class="news-card-right" @click.stop><span v-if="post.status !== 'published'" class="news-status-badge" :class="'nsb--' + post.status">{{ post.status === 'draft' ? 'Draft' : 'Archived' }}</span><span v-else class="news-status-dot" title="Published"></span><button class="news-vis-btn" @click="toggleNewsPublic(post)" v-if="post.status === 'published' && hasPermission('news_posts','update')"><i class="fas" :class="post.is_public ? 'fa-globe' : 'fa-lock'"></i><span>{{ post.is_public ? 'Public' : 'Internal' }}</span></button><div class="news-actions"><button class="btn-icon" @click="editNews(post)" title="Edit" v-if="hasPermission('news_posts','update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20H8L18 10L14 6L4 16V20Z"/></svg></button><button class="btn-icon btn-icon--ok" @click="publishNews(post)" title="Publish" v-if="post.status === 'draft' && hasPermission('news_posts','update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button><button class="btn-icon" @click="archiveNews(post)" title="Archive" v-if="post.status === 'published' && hasPermission('news_posts','update')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg></button><button class="btn-icon btn-icon--danger" @click="deleteNews(post)" title="Delete" v-if="hasPermission('news_posts','delete')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button></div></div></div></div><div v-if="newsStore.newsLoading" class="news-loading"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="fa-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Loading posts…</div></div>
        </div>
      </main>
      
      <nav class="mobile-bottom-nav"><button class="mobile-nav-item" :class="{ active: currentView === 'dashboard' }" @click="switchView('dashboard')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>Overview</span></button><button class="mobile-nav-item" :class="{ active: currentView === 'medical_staff' }" @click="switchView('medical_staff')" v-if="hasPermission('medical_staff','read')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 15v5M9 18h6"/></svg><span>Staff</span></button><button class="mobile-nav-item" :class="{ active: currentView === 'resident_rotations' }" @click="switchView('resident_rotations')" v-if="hasPermission('resident_rotations','read')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4"/></svg><span>Rotations</span></button><button class="mobile-nav-item" :class="{ active: currentView === 'staff_absence' }" @click="switchView('staff_absence')" v-if="hasPermission('staff_absence','read')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 0 1-2-2v-2a4 4 0 0 1 4-4h3"/><circle cx="9" cy="7" r="4"/><circle cx="17" cy="17" r="4"/><path d="M17 15v2l1 1"/></svg><span>Absences</span></button><button class="mobile-nav-item" :class="{ active: ['oncall_schedule','training_units','research_hub','news'].includes(currentView) }" @click="uiStore.mobileMenuOpen = !uiStore.mobileMenuOpen"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>More</span></button></nav>
    </div>
  `
}

// Create the app instance from the App object
const app = createApp(App)

// Use Pinia and mount
app.use(pinia)
app.mount('#app')
