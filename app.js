// ============ NEUMOCARE HOSPITAL MANAGEMENT SYSTEM v8.2 ============
// COMPLETE REBUILD - MATCHES BACKEND API v5.2
// ===================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 NeumoCare v8.2 loading...');
    
    try {
        if (typeof Vue === 'undefined') {
            throw new Error('Vue.js not loaded');
        }
        
        console.log('✅ Vue.js loaded:', Vue.version);
        
        const { createApp, ref, reactive, computed, onMounted, watch, onUnmounted } = Vue;
        
        // ============ 1. CONFIGURATION ============
        const CONFIG = {
            API_BASE_URL: window.location.hostname.includes('localhost') 
                ? 'http://localhost:3000' 
                : 'https://neumac-manage-back-end-production.up.railway.app',
            TOKEN_KEY: 'neumocare_token',
            USER_KEY: 'neumocare_user',
            APP_VERSION: '8.2',
            DEBUG: true
        };
        
        // ============ 2. UTILITIES ============
        const Utils = {
            formatDate(date) {
                if (!date) return 'N/A';
                try {
                    const d = new Date(date);
                    if (isNaN(d.getTime())) return date;
                    return d.toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                    });
                } catch { return date; }
            },
            
            formatTime(date) {
                if (!date) return '';
                try {
                    const d = new Date(date);
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch { return date; }
            },
            
            formatDateTime(date) {
                if (!date) return 'N/A';
                try {
                    const d = new Date(date);
                    return d.toLocaleString('en-US', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });
                } catch { return date; }
            },
            
            // Specialized on-call shift formatter - ALWAYS shows both start AND end with dates if crossing midnight
            formatOnCallShift(startDate, startTime, endDate, endTime) {
                if (!startDate || !startTime || !endDate || !endTime) return 'N/A';
                
                try {
                    const startDateTime = new Date(`${startDate}T${startTime}`);
                    const endDateTime = new Date(`${endDate}T${endTime}`);
                    
                    const startDay = startDateTime.toLocaleDateString('en-US', { weekday: 'short' });
                    const endDay = endDateTime.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    const startDateStr = startDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const endDateStr = endDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    
                    // If same day, show simple format
                    if (startDate === endDate) {
                        return `${startTime} → ${endTime}`;
                    }
                    
                    // Multi-day shift - show full context
                    return `${startDay}, ${startDateStr} ${startTime} → ${endDay}, ${endDateStr} ${endTime}`;
                } catch {
                    return `${startTime} → ${endTime}`;
                }
            },
            
            formatRelativeTime(date) {
                if (!date) return 'Just now';
                try {
                    const d = new Date(date);
                    const now = new Date();
                    const diff = Math.floor((now - d) / 60000);
                    
                    if (diff < 1) return 'Just now';
                    if (diff < 60) return `${diff}m ago`;
                    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
                    return `${Math.floor(diff / 1440)}d ago`;
                } catch { return date; }
            },
            
            getInitials(name) {
                if (!name) return '??';
                return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
            },
            
            calculateDays(start, end) {
                try {
                    const s = new Date(start);
                    const e = new Date(end);
                    const diff = e - s;
                    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
                } catch { return 0; }
            },
            
            daysRemaining(endDate) {
                if (!endDate) return 0;
                try {
                    const end = new Date(endDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diff = end - today;
                    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                } catch { return 0; }
            },
            
            daysUntil(startDate) {
                if (!startDate) return 0;
                try {
                    const start = new Date(startDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diff = start - today;
                    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                } catch { return 0; }
            },
            
            generateId(prefix) {
                return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            },
            
            ensureArray(data) {
                if (Array.isArray(data)) return data;
                if (data?.data && Array.isArray(data.data)) return data.data;
                if (data && typeof data === 'object') return Object.values(data);
                return [];
            }
        };
        
        // ============ 3. API SERVICE ============
        class ApiService {
            constructor() {
                this.token = localStorage.getItem(CONFIG.TOKEN_KEY);
            }
            
            getHeaders() {
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };
                if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
                return headers;
            }
            
            async request(endpoint, options = {}) {
                const url = `${CONFIG.API_BASE_URL}${endpoint}`;
                
                try {
                    const config = {
                        method: options.method || 'GET',
                        headers: this.getHeaders(),
                        mode: 'cors',
                        credentials: 'include'
                    };
                    
                    if (options.body) config.body = JSON.stringify(options.body);
                    
                    const response = await fetch(url, config);
                    
                    if (response.status === 204) return null;
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            this.token = null;
                            localStorage.removeItem(CONFIG.TOKEN_KEY);
                            localStorage.removeItem(CONFIG.USER_KEY);
                            window.location.reload();
                        }
                        throw new Error(data.error || data.message || 'Request failed');
                    }
                    
                    return data;
                    
                } catch (error) {
                    console.error(`API ${endpoint} failed:`, error);
                    throw error;
                }
            }
            
            // ===== AUTH =====
            async login(email, password) {
                const data = await this.request('/api/auth/login', {
                    method: 'POST',
                    body: { email, password }
                });
                
                if (data.token) {
                    this.token = data.token;
                    localStorage.setItem(CONFIG.TOKEN_KEY, data.token);
                    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
                }
                
                return data;
            }
            
            async logout() {
                try {
                    await this.request('/api/auth/logout', { method: 'POST' });
                } finally {
                    this.token = null;
                    localStorage.removeItem(CONFIG.TOKEN_KEY);
                    localStorage.removeItem(CONFIG.USER_KEY);
                }
            }
            
            // ===== MEDICAL STAFF =====
            async getMedicalStaff() {
                const data = await this.request('/api/medical-staff');
                return data?.data || [];
            }
            
            async createMedicalStaff(staffData) {
                return await this.request('/api/medical-staff', {
                    method: 'POST',
                    body: staffData
                });
            }
            
            async updateMedicalStaff(id, staffData) {
                return await this.request(`/api/medical-staff/${id}`, {
                    method: 'PUT',
                    body: staffData
                });
            }
            
            async deleteMedicalStaff(id) {
                return await this.request(`/api/medical-staff/${id}`, { method: 'DELETE' });
            }
            
            // ===== DEPARTMENTS =====
            async getDepartments() {
                const data = await this.request('/api/departments');
                return Utils.ensureArray(data);
            }
            
            async createDepartment(deptData) {
                return await this.request('/api/departments', {
                    method: 'POST',
                    body: deptData
                });
            }
            
            async updateDepartment(id, deptData) {
                return await this.request(`/api/departments/${id}`, {
                    method: 'PUT',
                    body: deptData
                });
            }
            
            // ===== TRAINING UNITS =====
            async getTrainingUnits() {
                const data = await this.request('/api/training-units');
                return Utils.ensureArray(data);
            }
            
            async createTrainingUnit(unitData) {
                return await this.request('/api/training-units', {
                    method: 'POST',
                    body: unitData
                });
            }
            
            async updateTrainingUnit(id, unitData) {
                return await this.request(`/api/training-units/${id}`, {
                    method: 'PUT',
                    body: unitData
                });
            }
            
            // ===== ROTATIONS =====
            async getRotations() {
                const data = await this.request('/api/rotations');
                return data?.data || [];
            }
            
            async createRotation(rotationData) {
                return await this.request('/api/rotations', {
                    method: 'POST',
                    body: rotationData
                });
            }
            
            async updateRotation(id, rotationData) {
                return await this.request(`/api/rotations/${id}`, {
                    method: 'PUT',
                    body: rotationData
                });
            }
            
            async deleteRotation(id) {
                return await this.request(`/api/rotations/${id}`, { method: 'DELETE' });
            }
            
            // ===== ON-CALL =====
            async getOnCallSchedule() {
                const data = await this.request('/api/oncall');
                return Utils.ensureArray(data);
            }
            
            async getOnCallToday() {
                const data = await this.request('/api/oncall/today');
                return Utils.ensureArray(data);
            }
            
            async createOnCall(scheduleData) {
                return await this.request('/api/oncall', {
                    method: 'POST',
                    body: scheduleData
                });
            }
            
            async updateOnCall(id, scheduleData) {
                return await this.request(`/api/oncall/${id}`, {
                    method: 'PUT',
                    body: scheduleData
                });
            }
            
            async deleteOnCall(id) {
                return await this.request(`/api/oncall/${id}`, { method: 'DELETE' });
            }
            
            // ===== ABSENCE RECORDS (NEW) =====
            async getAbsenceRecords() {
                const data = await this.request('/api/absence-records');
                return data?.data || [];
            }
            
            async getCurrentAbsences() {
                const data = await this.request('/api/absence-records/current');
                return data?.data || [];
            }
            
            async getUpcomingAbsences() {
                const data = await this.request('/api/absence-records/upcoming');
                return data?.data || [];
            }
            
            async createAbsence(absenceData) {
                return await this.request('/api/absence-records', {
                    method: 'POST',
                    body: absenceData
                });
            }
            
            async updateAbsence(id, absenceData) {
                return await this.request(`/api/absence-records/${id}`, {
                    method: 'PUT',
                    body: absenceData
                });
            }
            
            async deleteAbsence(id) {
                return await this.request(`/api/absence-records/${id}`, { method: 'DELETE' });
            }
            
            async markAsReturned(id, returnDate, notes) {
                return await this.request(`/api/absence-records/${id}/return`, {
                    method: 'PUT',
                    body: { return_date: returnDate, notes }
                });
            }
            
            async getAbsenceAuditLog(id) {
                const data = await this.request(`/api/absence-records/${id}/audit-log`);
                return data?.data || [];
            }
            
            async getAbsenceDashboardStats() {
                const data = await this.request('/api/absence-records/dashboard/stats');
                return data?.data || {};
            }
            
            // ===== ANNOUNCEMENTS =====
            async getAnnouncements() {
                const data = await this.request('/api/announcements');
                return Utils.ensureArray(data);
            }
            
            async createAnnouncement(announcementData) {
                return await this.request('/api/announcements', {
                    method: 'POST',
                    body: announcementData
                });
            }
            
            async deleteAnnouncement(id) {
                return await this.request(`/api/announcements/${id}`, { method: 'DELETE' });
            }
            
            // ===== LIVE STATUS =====
            async getCurrentClinicalStatus() {
                try {
                    const data = await this.request('/api/live-status/current');
                    return data?.data || null;
                } catch {
                    return null;
                }
            }
            
            async createClinicalStatus(statusData) {
                return await this.request('/api/live-status', {
                    method: 'POST',
                    body: statusData
                });
            }
            
            async getClinicalStatusHistory(limit = 20) {
                const data = await this.request(`/api/live-status/history?limit=${limit}`);
                return data?.data || [];
            }
            
            // ===== SYSTEM STATS =====
            async getSystemStats() {
                try {
                    const data = await this.request('/api/system-stats');
                    return data?.data || {
                        totalStaff: 0,
                        activeAttending: 0,
                        activeResidents: 0,
                        onCallNow: 0,
                        activeRotations: 0,
                        currentlyAbsent: 0,
                        departmentStatus: 'normal'
                    };
                } catch {
                    return {
                        totalStaff: 0,
                        activeAttending: 0,
                        activeResidents: 0,
                        onCallNow: 0,
                        activeRotations: 0,
                        currentlyAbsent: 0,
                        departmentStatus: 'normal'
                    };
                }
            }
            
            // ===== AVAILABLE DATA =====
            async getAvailableData() {
                const data = await this.request('/api/available-data');
                return data?.data || {
                    departments: [],
                    residents: [],
                    attendings: [],
                    trainingUnits: []
                };
            }
        }
        
        // Initialize API
        const API = new ApiService();
        
        // ============ 4. CREATE VUE APP ============
        const app = createApp({
            setup() {
                // ============ 5. REACTIVE STATE ============
                
                // User
                const currentUser = ref(null);
                const loginForm = reactive({ email: '', password: '' });
                const loginLoading = ref(false);
                
                // UI
                const currentView = ref('login');
                const sidebarCollapsed = ref(false);
                const mobileMenuOpen = ref(false);
                const userMenuOpen = ref(false);
                const statsSidebarOpen = ref(false);
                const globalSearchQuery = ref('');
                
                // Loading
                const loading = ref(false);
                const saving = ref(false);
                const loadingSchedule = ref(false);
                const loadingStatus = ref(false);
                
                // Data Stores
                const medicalStaff = ref([]);
                const departments = ref([]);
                const trainingUnits = ref([]);
                const rotations = ref([]);
                const onCallSchedule = ref([]);
                const absenceRecords = ref([]);  // NEW: using absenceRecords not absences
                const announcements = ref([]);
                
                // Live Status
                const clinicalStatus = ref(null);
                const clinicalStatusHistory = ref([]);
                const newStatusText = ref('');
                const selectedAuthorId = ref('');
                const expiryHours = ref(8);
                const activeMedicalStaff = ref([]);
                const liveStatsEditMode = ref(false);
                
                // Dashboard
                const systemStats = ref({
                    totalStaff: 0,
                    activeAttending: 0,
                    activeResidents: 0,
                    onCallNow: 0,
                    activeRotations: 0,
                    currentlyAbsent: 0,
                    departmentStatus: 'normal'
                });
                
                const todaysOnCall = ref([]);
                const todaysOnCallCount = computed(() => todaysOnCall.value.length);
                
                // UI Components
                const toasts = ref([]);
                const systemAlerts = ref([]);
                const currentTime = ref(new Date());
                
                // Filters
                const staffFilters = reactive({
                    search: '', staffType: '', department: '', status: ''
                });
                
                const onCallFilters = reactive({
                    date: '', shiftType: '', physician: '', coverageArea: ''
                });
                
                const rotationFilters = reactive({
                    resident: '', status: '', trainingUnit: '', supervisor: ''
                });
                
                const absenceFilters = reactive({
                    staff: '', status: '', reason: '', startDate: ''
                });
                
                // ============ 6. MODAL STATES ============
                
                const staffProfileModal = reactive({
                    show: false, staff: null, activeTab: 'assignments'
                });
                
                const unitResidentsModal = reactive({
                    show: false, unit: null, rotations: []
                });
                
                const medicalStaffModal = reactive({
                    show: false, mode: 'add', activeTab: 'basic',
                    form: {
                        full_name: '', staff_type: 'medical_resident', staff_id: '',
                        employment_status: 'active', professional_email: '', department_id: '',
                        academic_degree: '', specialization: '', training_year: '',
                        clinical_certificate: '', certificate_status: 'current'
                    }
                });
                
                const onCallModal = reactive({
                    show: false, mode: 'add',
                    form: {
                        duty_date: new Date().toISOString().split('T')[0],
                        shift_type: 'primary_call',
                        start_time: '15:00',  // Default 15:00 (standard on-call start)
                        end_time: '20:00',     // Default 20:00 next day
                        primary_physician_id: '',
                        backup_physician_id: '',
                        coverage_area: 'emergency',
                        schedule_id: Utils.generateId('SCH')
                    }
                });
                
                const rotationModal = reactive({
                    show: false, mode: 'add',
                    form: {
                        rotation_id: Utils.generateId('ROT'),
                        resident_id: '', training_unit_id: '',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        rotation_status: 'scheduled',
                        rotation_category: 'clinical_rotation',
                        supervising_attending_id: ''
                    }
                });
                
                const trainingUnitModal = reactive({
                    show: false, mode: 'add',
                    form: {
                        unit_name: '', unit_code: '', department_id: '',
                        maximum_residents: 10, unit_status: 'active',
                        specialty: '', supervising_attending_id: ''
                    }
                });
                
                // NEW: Absence Modal - matches backend fields exactly
                const absenceModal = reactive({
                    show: false, mode: 'add',
                    form: {
                        staff_member_id: '',
                        absence_type: 'planned',
                        absence_reason: 'vacation',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        coverage_arranged: false,
                        covering_staff_id: '',
                        coverage_notes: '',
                        hod_notes: ''
                    }
                });
                
                const departmentModal = reactive({
                    show: false, mode: 'add',
                    form: { name: '', code: '', status: 'active', head_of_department_id: '' }
                });
                
                const communicationsModal = reactive({
                    show: false, activeTab: 'announcement',
                    form: {
                        title: '', content: '', priority: 'normal',
                        target_audience: 'all_staff'
                    }
                });
                
                const userProfileModal = reactive({
                    show: false,
                    form: { full_name: '', email: '', department_id: '' }
                });
                
                const confirmationModal = reactive({
                    show: false, title: '', message: '', icon: 'fa-question-circle',
                    confirmButtonText: 'Confirm', confirmButtonClass: 'btn-primary',
                    cancelButtonText: 'Cancel', onConfirm: null, details: ''
                });
                
                // ============ 7. PERMISSION MATRIX ============
                const PERMISSION_MATRIX = {
                    system_admin: {
                        medical_staff: ['create', 'read', 'update', 'delete'],
                        oncall_schedule: ['create', 'read', 'update', 'delete'],
                        resident_rotations: ['create', 'read', 'update', 'delete'],
                        training_units: ['create', 'read', 'update', 'delete'],
                        staff_absence: ['create', 'read', 'update', 'delete'],
                        department_management: ['create', 'read', 'update', 'delete'],
                        communications: ['create', 'read', 'update', 'delete'],
                        system: ['manage_departments', 'manage_updates']
                    },
                    department_head: {
                        medical_staff: ['read', 'update'],
                        oncall_schedule: ['create', 'read', 'update'],
                        resident_rotations: ['create', 'read', 'update'],
                        training_units: ['read', 'update'],
                        staff_absence: ['create', 'read', 'update'],
                        department_management: ['read'],
                        communications: ['create', 'read'],
                        system: ['manage_updates']
                    },
                    attending_physician: {
                        medical_staff: ['read'],
                        oncall_schedule: ['read'],
                        resident_rotations: ['read'],
                        training_units: ['read'],
                        staff_absence: ['read'],
                        department_management: ['read'],
                        communications: ['read']
                    },
                    medical_resident: {
                        medical_staff: ['read'],
                        oncall_schedule: ['read'],
                        resident_rotations: ['read'],
                        training_units: ['read'],
                        staff_absence: ['read'],
                        department_management: [],
                        communications: ['read']
                    }
                };
                
                // ============ 8. TOAST FUNCTIONS ============
                const showToast = (title, message, type = 'info', duration = 5000) => {
                    const icons = {
                        info: 'fas fa-info-circle',
                        success: 'fas fa-check-circle',
                        error: 'fas fa-exclamation-circle',
                        warning: 'fas fa-exclamation-triangle'
                    };
                    
                    const toast = {
                        id: Date.now(),
                        title, message, type,
                        icon: icons[type],
                        duration
                    };
                    
                    toasts.value.push(toast);
                    
                    if (duration > 0) {
                        setTimeout(() => {
                            const index = toasts.value.findIndex(t => t.id === toast.id);
                            if (index > -1) toasts.value.splice(index, 1);
                        }, duration);
                    }
                };
                
                const removeToast = (id) => {
                    const index = toasts.value.findIndex(t => t.id === id);
                    if (index > -1) toasts.value.splice(index, 1);
                };
                
                // ============ 9. CONFIRMATION MODAL ============
                const showConfirmation = (options) => {
                    Object.assign(confirmationModal, {
                        show: true,
                        ...options
                    });
                };
                
                const confirmAction = async () => {
                    if (confirmationModal.onConfirm) {
                        try {
                            await confirmationModal.onConfirm();
                        } catch (error) {
                            showToast('Error', error.message, 'error');
                        }
                    }
                    confirmationModal.show = false;
                };
                
                const cancelConfirmation = () => {
                    confirmationModal.show = false;
                };
                
                // ============ 10. FORMATTING FUNCTIONS ============
                const formatStaffType = (type) => {
                    const map = {
                        'medical_resident': 'Medical Resident',
                        'attending_physician': 'Attending Physician',
                        'fellow': 'Fellow',
                        'nurse_practitioner': 'Nurse Practitioner'
                    };
                    return map[type] || type;
                };
                
                const getStaffTypeClass = (type) => {
                    const map = {
                        'medical_resident': 'badge-primary',
                        'attending_physician': 'badge-success',
                        'fellow': 'badge-info',
                        'nurse_practitioner': 'badge-warning'
                    };
                    return map[type] || 'badge-secondary';
                };
                
                const formatEmploymentStatus = (status) => {
                    const map = {
                        'active': 'Active',
                        'on_leave': 'On Leave',
                        'inactive': 'Inactive'
                    };
                    return map[status] || status;
                };
                
                const formatAbsenceReason = (reason) => {
                    const map = {
                        'vacation': 'Vacation',
                        'conference': 'Conference',
                        'sick_leave': 'Sick Leave',
                        'training': 'Training',
                        'personal': 'Personal',
                        'other': 'Other'
                    };
                    return map[reason] || reason;
                };
                
                // NEW: Format absence status based on backend values
                const formatAbsenceStatus = (status) => {
                    const map = {
                        'currently_absent': 'Currently Absent',
                        'planned_leave': 'Planned Leave',
                        'returned_to_duty': 'Returned',
                        'cancelled': 'Cancelled'
                    };
                    return map[status] || status;
                };
                
                const getAbsenceStatusClass = (status) => {
                    const map = {
                        'currently_absent': 'status-danger',
                        'planned_leave': 'status-warning',
                        'returned_to_duty': 'status-success',
                        'cancelled': 'status-inactive'
                    };
                    return map[status] || 'status-inactive';
                };
                
                const formatRotationStatus = (status) => {
                    const map = {
                        'scheduled': 'Scheduled',
                        'active': 'Active',
                        'completed': 'Completed',
                        'cancelled': 'Cancelled'
                    };
                    return map[status] || status;
                };
                
                const getUserRoleDisplay = (role) => {
                    const map = {
                        'system_admin': 'System Administrator',
                        'department_head': 'Department Head',
                        'attending_physician': 'Attending Physician',
                        'medical_resident': 'Medical Resident'
                    };
                    return map[role] || role;
                };
                
                const getCurrentViewTitle = () => {
                    const map = {
                        'dashboard': 'Dashboard Overview',
                        'medical_staff': 'Medical Staff',
                        'oncall_schedule': 'On-call Schedule',
                        'resident_rotations': 'Resident Rotations',
                        'training_units': 'Training Units',
                        'staff_absence': 'Staff Absence',
                        'department_management': 'Departments',
                        'communications': 'Communications'
                    };
                    return map[currentView.value] || 'NeumoCare';
                };
                
                const getSearchPlaceholder = () => {
                    const map = {
                        'dashboard': 'Search staff, units, rotations...',
                        'medical_staff': 'Search by name or email...',
                        'oncall_schedule': 'Search on-call schedules...',
                        'resident_rotations': 'Search rotations...',
                        'training_units': 'Search training units...',
                        'staff_absence': 'Search absences...',
                        'department_management': 'Search departments...',
                        'communications': 'Search announcements...'
                    };
                    return map[currentView.value] || 'Search...';
                };
                
                // ============ 11. DATA HELPER FUNCTIONS ============
                const getDepartmentName = (deptId) => {
                    if (!deptId) return 'Not assigned';
                    const dept = departments.value.find(d => d.id === deptId);
                    return dept ? dept.name : 'Unknown';
                };
                
                const getStaffName = (staffId) => {
                    if (!staffId) return 'Not assigned';
                    const staff = medicalStaff.value.find(s => s.id === staffId);
                    return staff ? staff.full_name : 'Unknown';
                };
                
                const getTrainingUnitName = (unitId) => {
                    if (!unitId) return 'Not assigned';
                    const unit = trainingUnits.value.find(u => u.id === unitId);
                    return unit ? unit.unit_name : 'Unknown';
                };
                
                const getSupervisorName = (supervisorId) => getStaffName(supervisorId);
                const getPhysicianName = (physicianId) => getStaffName(physicianId);
                const getResidentName = (residentId) => getStaffName(residentId);
                
                const getDepartmentUnits = (deptId) => {
                    return trainingUnits.value.filter(u => u.department_id === deptId);
                };
                
                const getDepartmentStaffCount = (deptId) => {
                    return medicalStaff.value.filter(s => s.department_id === deptId).length;
                };
                
                const getCurrentRotationForStaff = (staffId) => {
                    return rotations.value.find(r => 
                        r.resident_id === staffId && r.rotation_status === 'active'
                    ) || null;
                };
                
                // ============ 12. UNIT RESIDENT FUNCTIONS ============
                const getUnitActiveRotationCount = (unitId) => {
                    if (!unitId) return 0;
                    return rotations.value.filter(r => 
                        r.training_unit_id === unitId && 
                        ['active', 'scheduled'].includes(r.rotation_status)
                    ).length;
                };
                
                const viewUnitResidents = (unit) => {
                    if (!unit) return;
                    
                    const unitRotations = rotations.value.filter(r => 
                        r.training_unit_id === unit.id && 
                        ['active', 'scheduled'].includes(r.rotation_status)
                    );
                    
                    unitRotations.sort((a, b) => {
                        if (a.rotation_status === 'active' && b.rotation_status !== 'active') return -1;
                        if (a.rotation_status !== 'active' && b.rotation_status === 'active') return 1;
                        return new Date(a.start_date) - new Date(b.start_date);
                    });
                    
                    unitResidentsModal.unit = unit;
                    unitResidentsModal.rotations = unitRotations;
                    unitResidentsModal.show = true;
                };
                
                // ============ 13. PROFILE FUNCTIONS ============
                const getCurrentUnit = (staffId) => {
                    const rotation = getCurrentRotationForStaff(staffId);
                    return rotation ? getTrainingUnitName(rotation.training_unit_id) : 'Not assigned';
                };
                
                const isOnCallToday = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    return onCallSchedule.value.some(s => 
                        s.primary_physician_id === staffId || s.backup_physician_id === staffId
                    );
                };
                
                const getOnCallShift = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    const schedule = onCallSchedule.value.find(s => 
                        s.primary_physician_id === staffId || s.backup_physician_id === staffId
                    );
                    
                    if (!schedule) return null;
                    
                    return {
                        startTime: schedule.start_time,
                        endTime: schedule.end_time,
                        startDate: schedule.duty_date,
                        endDate: schedule.duty_date, // Backend stores single date, but shifts can cross midnight
                        coverageArea: schedule.coverage_area,
                        shiftType: schedule.shift_type
                    };
                };
                
                const getOnCallDisplay = (staffId) => {
                    const shift = getOnCallShift(staffId);
                    if (!shift) return 'Not on call';
                    
                    return Utils.formatOnCallShift(
                        shift.startDate, shift.startTime,
                        shift.endDate, shift.endTime
                    );
                };
                
                const getRotationDaysLeft = (staffId) => {
                    const rotation = getCurrentRotationForStaff(staffId);
                    return rotation ? Utils.daysRemaining(rotation.end_date) : 0;
                };
                
                const getRotationSupervisor = (staffId) => {
                    const rotation = getCurrentRotationForStaff(staffId);
                    return rotation?.supervising_attending_id 
                        ? getStaffName(rotation.supervising_attending_id) 
                        : 'Not assigned';
                };
                
                // ============ 14. LIVE STATUS FUNCTIONS ============
                const getStatusLocation = (status) => {
                    if (!status?.status_text) return 'Pulmonology';
                    
                    const text = status.status_text.toLowerCase();
                    if (text.includes('icu')) return 'Respiratory ICU';
                    if (text.includes('er') || text.includes('emergency')) return 'Emergency';
                    if (text.includes('ward')) return 'Ward';
                    return 'Pulmonology';
                };
                
                const getRecentStatuses = () => clinicalStatusHistory.value;
                
                const loadClinicalStatus = async () => {
                    loadingStatus.value = true;
                    try {
                        clinicalStatus.value = await API.getCurrentClinicalStatus();
                    } catch (error) {
                        console.error('Failed to load clinical status:', error);
                    } finally {
                        loadingStatus.value = false;
                    }
                };
                
                const loadClinicalStatusHistory = async () => {
                    try {
                        clinicalStatusHistory.value = await API.getClinicalStatusHistory(10);
                    } catch (error) {
                        console.error('Failed to load status history:', error);
                    }
                };
                
                const loadActiveMedicalStaff = async () => {
                    try {
                        const staff = await API.getMedicalStaff();
                        activeMedicalStaff.value = staff.filter(s => s.employment_status === 'active');
                        
                        if (currentUser.value) {
                            const match = activeMedicalStaff.value.find(
                                s => s.professional_email === currentUser.value.email
                            );
                            if (match) selectedAuthorId.value = match.id;
                        }
                    } catch (error) {
                        console.error('Failed to load active staff:', error);
                    }
                };
                
                const saveClinicalStatus = async () => {
                    if (!newStatusText.value.trim() || !selectedAuthorId.value) {
                        showToast('Error', 'Please fill all fields', 'error');
                        return;
                    }
                    
                    loadingStatus.value = true;
                    try {
                        const response = await API.createClinicalStatus({
                            status_text: newStatusText.value.trim(),
                            author_id: selectedAuthorId.value,
                            expires_in_hours: expiryHours.value
                        });
                        
                        if (response?.data) {
                            clinicalStatusHistory.value.unshift(clinicalStatus.value);
                            if (clinicalStatusHistory.value.length > 5) {
                                clinicalStatusHistory.value = clinicalStatusHistory.value.slice(0, 5);
                            }
                            
                            clinicalStatus.value = response.data;
                            newStatusText.value = '';
                            liveStatsEditMode.value = false;
                            
                            await loadClinicalStatusHistory();
                            showToast('Success', 'Status updated', 'success');
                        }
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        loadingStatus.value = false;
                    }
                };
                
                const isStatusExpired = (expiresAt) => {
                    if (!expiresAt) return true;
                    return new Date(expiresAt) <= new Date();
                };
                
                const calculateTimeRemaining = (expiresAt) => {
                    if (!expiresAt) return 'N/A';
                    try {
                        const expiry = new Date(expiresAt);
                        const now = new Date();
                        const diff = expiry - now;
                        
                        if (diff <= 0) return 'Expired';
                        
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        
                        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                    } catch {
                        return 'N/A';
                    }
                };
                
                const refreshStatus = () => {
                    loadClinicalStatus();
                    showToast('Refreshed', 'Status updated', 'info');
                };
                
                // ============ 15. DATA LOADING FUNCTIONS ============
                const loadMedicalStaff = async () => {
                    try {
                        medicalStaff.value = await API.getMedicalStaff();
                    } catch (error) {
                        showToast('Error', 'Failed to load medical staff', 'error');
                    }
                };
                
                const loadDepartments = async () => {
                    try {
                        departments.value = await API.getDepartments();
                    } catch (error) {
                        showToast('Error', 'Failed to load departments', 'error');
                    }
                };
                
                const loadTrainingUnits = async () => {
                    try {
                        trainingUnits.value = await API.getTrainingUnits();
                    } catch (error) {
                        showToast('Error', 'Failed to load training units', 'error');
                    }
                };
                
                const loadRotations = async () => {
                    try {
                        rotations.value = await API.getRotations();
                    } catch (error) {
                        showToast('Error', 'Failed to load rotations', 'error');
                    }
                };
                
                const loadOnCallSchedule = async () => {
                    try {
                        loadingSchedule.value = true;
                        onCallSchedule.value = await API.getOnCallSchedule();
                        await loadTodaysOnCall();
                    } catch (error) {
                        showToast('Error', 'Failed to load on-call schedule', 'error');
                    } finally {
                        loadingSchedule.value = false;
                    }
                };
                
                const loadTodaysOnCall = async () => {
                    try {
                        const data = await API.getOnCallToday();
                        
                        todaysOnCall.value = data.map(item => {
                            const physicianName = item.primary_physician?.full_name || 
                                                   getStaffName(item.primary_physician_id) || 
                                                   'Unknown';
                            
                            const shiftType = item.shift_type === 'primary_call' ? 'Primary' : 'Backup';
                            
                            // Format the shift display with both start and end times
                            const shiftDisplay = Utils.formatOnCallShift(
                                item.duty_date, item.start_time,
                                item.duty_date, item.end_time
                            );
                            
                            return {
                                id: item.id,
                                physicianName,
                                shiftType,
                                shiftTypeClass: shiftType === 'Primary' ? 'badge-primary' : 'badge-secondary',
                                shiftDisplay,  // Pre-formatted display
                                startTime: item.start_time,
                                endTime: item.end_time,
                                dutyDate: item.duty_date,
                                coverageArea: item.coverage_area || 'General',
                                backupPhysician: item.backup_physician?.full_name || 
                                                (item.backup_physician_id ? getStaffName(item.backup_physician_id) : null),
                                contactInfo: item.primary_physician?.professional_email || 'No contact',
                                raw: item
                            };
                        });
                        
                    } catch (error) {
                        console.error('Failed to load today\'s on-call:', error);
                        todaysOnCall.value = [];
                    }
                };
                
                // NEW: Load absence records from new endpoint
                const loadAbsenceRecords = async () => {
                    try {
                        absenceRecords.value = await API.getAbsenceRecords();
                    } catch (error) {
                        showToast('Error', 'Failed to load absence records', 'error');
                    }
                };
                
                const loadAnnouncements = async () => {
                    try {
                        announcements.value = await API.getAnnouncements();
                    } catch (error) {
                        showToast('Error', 'Failed to load announcements', 'error');
                    }
                };
                
                const loadSystemStats = async () => {
                    try {
                        systemStats.value = await API.getSystemStats();
                    } catch (error) {
                        console.error('Failed to load system stats:', error);
                    }
                };
                
                const loadAllData = async () => {
                    loading.value = true;
                    try {
                        await Promise.all([
                            loadMedicalStaff(),
                            loadDepartments(),
                            loadTrainingUnits(),
                            loadRotations(),
                            loadOnCallSchedule(),
                            loadAbsenceRecords(),  // NEW: load absence records
                            loadAnnouncements(),
                            loadClinicalStatus(),
                            loadClinicalStatusHistory(),
                            loadSystemStats()
                        ]);
                        
                        await loadActiveMedicalStaff();
                        showToast('Success', 'Data loaded', 'success');
                    } catch (error) {
                        console.error('Failed to load data:', error);
                        showToast('Error', 'Failed to load some data', 'error');
                    } finally {
                        loading.value = false;
                    }
                };
                
                // ============ 16. AUTHENTICATION ============
                const handleLogin = async () => {
                    if (!loginForm.email || !loginForm.password) {
                        showToast('Error', 'Email and password required', 'error');
                        return;
                    }
                    
                    loginLoading.value = true;
                    try {
                        const response = await API.login(loginForm.email, loginForm.password);
                        currentUser.value = response.user;
                        
                        showToast('Success', `Welcome, ${response.user.full_name}!`, 'success');
                        await loadAllData();
                        currentView.value = 'dashboard';
                        
                    } catch (error) {
                        showToast('Error', error.message || 'Login failed', 'error');
                    } finally {
                        loginLoading.value = false;
                    }
                };
                
                const handleLogout = () => {
                    showConfirmation({
                        title: 'Logout',
                        message: 'Are you sure you want to logout?',
                        icon: 'fa-sign-out-alt',
                        confirmButtonText: 'Logout',
                        confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.logout();
                            } finally {
                                currentUser.value = null;
                                currentView.value = 'login';
                                userMenuOpen.value = false;
                                showToast('Info', 'Logged out', 'info');
                            }
                        }
                    });
                };
                
                // ============ 17. NAVIGATION ============
                const switchView = (view) => {
                    currentView.value = view;
                    mobileMenuOpen.value = false;
                };
                
                const toggleStatsSidebar = () => {
                    statsSidebarOpen.value = !statsSidebarOpen.value;
                };
                
                const handleGlobalSearch = () => {
                    if (globalSearchQuery.value.trim()) {
                        showToast('Search', `Searching for "${globalSearchQuery.value}"`, 'info');
                    }
                };
                
                const dismissAlert = (id) => {
                    const index = systemAlerts.value.findIndex(a => a.id === id);
                    if (index > -1) systemAlerts.value.splice(index, 1);
                };
                
                // ============ 18. MODAL SHOW FUNCTIONS ============
                const showAddMedicalStaffModal = () => {
                    medicalStaffModal.mode = 'add';
                    medicalStaffModal.activeTab = 'basic';
                    medicalStaffModal.form = {
                        full_name: '',
                        staff_type: 'medical_resident',
                        staff_id: Utils.generateId('MD'),
                        employment_status: 'active',
                        professional_email: '',
                        department_id: '',
                        academic_degree: '',
                        specialization: '',
                        training_year: '',
                        clinical_certificate: '',  // Note: backend uses clinical_study_certificate
                        certificate_status: 'current'
                    };
                    medicalStaffModal.show = true;
                };
                
                const showAddDepartmentModal = () => {
                    departmentModal.mode = 'add';
                    departmentModal.form = {
                        name: '', code: '', status: 'active', head_of_department_id: ''
                    };
                    departmentModal.show = true;
                };
                
                const showAddTrainingUnitModal = () => {
                    trainingUnitModal.mode = 'add';
                    trainingUnitModal.form = {
                        unit_name: '', unit_code: '', department_id: '',
                        maximum_residents: 10, unit_status: 'active',
                        specialty: '', supervising_attending_id: ''
                    };
                    trainingUnitModal.show = true;
                };
                
                const showAddRotationModal = () => {
                    rotationModal.mode = 'add';
                    rotationModal.form = {
                        rotation_id: Utils.generateId('ROT'),
                        resident_id: '', training_unit_id: '',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        rotation_status: 'scheduled',
                        rotation_category: 'clinical_rotation',
                        supervising_attending_id: ''
                    };
                    rotationModal.show = true;
                };
                
                const showAddOnCallModal = () => {
                    onCallModal.mode = 'add';
                    onCallModal.form = {
                        duty_date: new Date().toISOString().split('T')[0],
                        shift_type: 'primary_call',
                        start_time: '15:00',
                        end_time: '20:00',
                        primary_physician_id: '',
                        backup_physician_id: '',
                        coverage_area: 'emergency',
                        schedule_id: Utils.generateId('SCH')
                    };
                    onCallModal.show = true;
                };
                
                // NEW: Show add absence modal - matches backend schema
                const showAddAbsenceModal = () => {
                    absenceModal.mode = 'add';
                    absenceModal.form = {
                        staff_member_id: '',
                        absence_type: 'planned',
                        absence_reason: 'vacation',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        coverage_arranged: false,
                        covering_staff_id: '',
                        coverage_notes: '',
                        hod_notes: ''
                    };
                    absenceModal.show = true;
                };
                
                const showCommunicationsModal = () => {
                    communicationsModal.show = true;
                    communicationsModal.activeTab = 'announcement';
                    communicationsModal.form = {
                        title: '', content: '', priority: 'normal',
                        target_audience: 'all_staff'
                    };
                };
                
                const showUserProfileModal = () => {
                    userProfileModal.form = {
                        full_name: currentUser.value?.full_name || '',
                        email: currentUser.value?.email || '',
                        department_id: currentUser.value?.department_id || ''
                    };
                    userProfileModal.show = true;
                    userMenuOpen.value = false;
                };
                
                // ============ 19. VIEW/EDIT FUNCTIONS ============
                const viewStaffDetails = (staff) => {
                    staffProfileModal.staff = staff;
                    staffProfileModal.activeTab = 'assignments';
                    staffProfileModal.show = true;
                };
                
                const editMedicalStaff = (staff) => {
                    medicalStaffModal.mode = 'edit';
                    medicalStaffModal.form = { ...staff };
                    medicalStaffModal.show = true;
                };
                
                const editDepartment = (dept) => {
                    departmentModal.mode = 'edit';
                    departmentModal.form = { ...dept };
                    departmentModal.show = true;
                };
                
                const editTrainingUnit = (unit) => {
                    trainingUnitModal.mode = 'edit';
                    trainingUnitModal.form = { ...unit };
                    trainingUnitModal.show = true;
                };
                
                const editRotation = (rotation) => {
                    rotationModal.mode = 'edit';
                    rotationModal.form = { ...rotation };
                    rotationModal.show = true;
                };
                
                const editOnCallSchedule = (schedule) => {
                    onCallModal.mode = 'edit';
                    onCallModal.form = { ...schedule };
                    onCallModal.show = true;
                };
                
                const editAbsence = (absence) => {
                    absenceModal.mode = 'edit';
                    absenceModal.form = { ...absence };
                    absenceModal.show = true;
                };
                
                // ============ 20. SAVE FUNCTIONS ============
                const saveMedicalStaff = async () => {
                    if (!medicalStaffModal.form.full_name?.trim()) {
                        showToast('Error', 'Full name is required', 'error');
                        return;
                    }
                    
                    saving.value = true;
                    try {
                        // Map frontend field to backend column name
                        const staffData = {
                            ...medicalStaffModal.form,
                            clinical_study_certificate: medicalStaffModal.form.clinical_certificate
                        };
                        delete staffData.clinical_certificate;
                        
                        if (medicalStaffModal.mode === 'add') {
                            const result = await API.createMedicalStaff(staffData);
                            medicalStaff.value.unshift(result);
                            showToast('Success', 'Staff added', 'success');
                        } else {
                            const result = await API.updateMedicalStaff(medicalStaffModal.form.id, staffData);
                            const index = medicalStaff.value.findIndex(s => s.id === result.id);
                            if (index !== -1) medicalStaff.value[index] = result;
                            showToast('Success', 'Staff updated', 'success');
                        }
                        
                        medicalStaffModal.show = false;
                        await loadSystemStats();
                        
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveDepartment = async () => {
                    saving.value = true;
                    try {
                        if (departmentModal.mode === 'add') {
                            const result = await API.createDepartment(departmentModal.form);
                            departments.value.unshift(result);
                            showToast('Success', 'Department created', 'success');
                        } else {
                            const result = await API.updateDepartment(departmentModal.form.id, departmentModal.form);
                            const index = departments.value.findIndex(d => d.id === result.id);
                            if (index !== -1) departments.value[index] = result;
                            showToast('Success', 'Department updated', 'success');
                        }
                        departmentModal.show = false;
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveTrainingUnit = async () => {
                    saving.value = true;
                    try {
                        const unitData = {
                            ...trainingUnitModal.form,
                            supervising_attending_id: trainingUnitModal.form.supervising_attending_id || null
                        };
                        
                        if (trainingUnitModal.mode === 'add') {
                            const result = await API.createTrainingUnit(unitData);
                            trainingUnits.value.unshift(result);
                            showToast('Success', 'Unit created', 'success');
                        } else {
                            const result = await API.updateTrainingUnit(trainingUnitModal.form.id, unitData);
                            const index = trainingUnits.value.findIndex(u => u.id === result.id);
                            if (index !== -1) trainingUnits.value[index] = result;
                            showToast('Success', 'Unit updated', 'success');
                        }
                        
                        trainingUnitModal.show = false;
                        
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveRotation = async () => {
                    if (!rotationModal.form.resident_id || !rotationModal.form.training_unit_id) {
                        showToast('Error', 'Please select resident and unit', 'error');
                        return;
                    }
                    
                    if (!rotationModal.form.start_date || !rotationModal.form.end_date) {
                        showToast('Error', 'Please select dates', 'error');
                        return;
                    }
                    
                    if (new Date(rotationModal.form.end_date) <= new Date(rotationModal.form.start_date)) {
                        showToast('Error', 'End date must be after start date', 'error');
                        return;
                    }
                    
                    saving.value = true;
                    try {
                        const rotationData = {
                            ...rotationModal.form,
                            start_date: rotationModal.form.start_date,
                            end_date: rotationModal.form.end_date,
                            supervising_attending_id: rotationModal.form.supervising_attending_id || null
                        };
                        
                        if (rotationModal.mode === 'add') {
                            const result = await API.createRotation(rotationData);
                            rotations.value.unshift(result);
                            showToast('Success', 'Rotation scheduled', 'success');
                        } else {
                            const result = await API.updateRotation(rotationModal.form.id, rotationData);
                            const index = rotations.value.findIndex(r => r.id === result.id);
                            if (index !== -1) rotations.value[index] = result;
                            showToast('Success', 'Rotation updated', 'success');
                        }
                        
                        rotationModal.show = false;
                        await loadRotations();
                        
                    } catch (error) {
                        if (error.message.includes('overlap')) {
                            showToast('Scheduling Conflict', 'Rotation dates overlap with existing rotation', 'error');
                        } else {
                            showToast('Error', error.message, 'error');
                        }
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveOnCallSchedule = async () => {
                    if (!onCallModal.form.primary_physician_id || !onCallModal.form.duty_date) {
                        showToast('Error', 'Please select physician and date', 'error');
                        return;
                    }
                    
                    saving.value = true;
                    try {
                        if (onCallModal.mode === 'add') {
                            const result = await API.createOnCall(onCallModal.form);
                            onCallSchedule.value.unshift(result);
                            showToast('Success', 'On-call scheduled', 'success');
                        } else {
                            const result = await API.updateOnCall(onCallModal.form.id, onCallModal.form);
                            const index = onCallSchedule.value.findIndex(s => s.id === result.id);
                            if (index !== -1) onCallSchedule.value[index] = result;
                            showToast('Success', 'On-call updated', 'success');
                        }
                        
                        onCallModal.show = false;
                        await loadTodaysOnCall();
                        
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                // NEW: Save absence record - matches backend schema
                const saveAbsence = async () => {
                    if (!absenceModal.form.staff_member_id || 
                        !absenceModal.form.start_date || 
                        !absenceModal.form.end_date) {
                        showToast('Error', 'Please fill all required fields', 'error');
                        return;
                    }
                    
                    if (new Date(absenceModal.form.end_date) < new Date(absenceModal.form.start_date)) {
                        showToast('Error', 'End date must be after start date', 'error');
                        return;
                    }
                    
                    saving.value = true;
                    try {
                        if (absenceModal.mode === 'add') {
                            const result = await API.createAbsence(absenceModal.form);
                            absenceRecords.value.unshift(result);
                            showToast('Success', 'Absence recorded', 'success');
                        } else {
                            const result = await API.updateAbsence(absenceModal.form.id, absenceModal.form);
                            const index = absenceRecords.value.findIndex(a => a.id === result.id);
                            if (index !== -1) absenceRecords.value[index] = result;
                            showToast('Success', 'Absence updated', 'success');
                        }
                        
                        absenceModal.show = false;
                        await loadSystemStats();
                        
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveCommunication = async () => {
                    saving.value = true;
                    try {
                        if (communicationsModal.activeTab === 'announcement') {
                            const result = await API.createAnnouncement(communicationsModal.form);
                            announcements.value.unshift(result);
                            showToast('Success', 'Announcement posted', 'success');
                        } else {
                            await saveClinicalStatus();
                        }
                        communicationsModal.show = false;
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveUserProfile = async () => {
                    saving.value = true;
                    try {
                        if (currentUser.value) {
                            currentUser.value.full_name = userProfileModal.form.full_name;
                            currentUser.value.department_id = userProfileModal.form.department_id;
                            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(currentUser.value));
                        }
                        
                        userProfileModal.show = false;
                        showToast('Success', 'Profile updated', 'success');
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                // ============ 21. ACTION FUNCTIONS ============
                const contactPhysician = (shift) => {
                    if (shift.contactInfo && shift.contactInfo !== 'No contact') {
                        showToast('Contact', `Contacting ${shift.physicianName}`, 'info');
                    } else {
                        showToast('No Contact', 'No contact info available', 'warning');
                    }
                };
                
                const viewAnnouncement = (announcement) => {
                    showToast(announcement.title, announcement.content.substring(0, 100), 'info');
                };
                
                const viewDepartmentStaff = (dept) => {
                    showToast('Department Staff', `Viewing ${dept.name} staff`, 'info');
                };
                
                // ============ 22. DELETE FUNCTIONS ============
                const deleteMedicalStaff = async (staff) => {
                    showConfirmation({
                        title: 'Delete Staff',
                        message: `Delete ${staff.full_name}?`,
                        icon: 'fa-trash',
                        confirmButtonText: 'Delete',
                        confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteMedicalStaff(staff.id);
                                const index = medicalStaff.value.findIndex(s => s.id === staff.id);
                                if (index > -1) medicalStaff.value.splice(index, 1);
                                showToast('Success', 'Staff deleted', 'success');
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteRotation = async (rotation) => {
                    showConfirmation({
                        title: 'Cancel Rotation',
                        message: 'Cancel this rotation?',
                        icon: 'fa-trash',
                        confirmButtonText: 'Cancel',
                        confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteRotation(rotation.id);
                                const index = rotations.value.findIndex(r => r.id === rotation.id);
                                if (index > -1) rotations.value.splice(index, 1);
                                showToast('Success', 'Rotation cancelled', 'success');
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteOnCallSchedule = async (schedule) => {
                    showConfirmation({
                        title: 'Delete Schedule',
                        message: 'Delete this on-call schedule?',
                        icon: 'fa-trash',
                        confirmButtonText: 'Delete',
                        confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteOnCall(schedule.id);
                                const index = onCallSchedule.value.findIndex(s => s.id === schedule.id);
                                if (index > -1) onCallSchedule.value.splice(index, 1);
                                await loadTodaysOnCall();
                                showToast('Success', 'Schedule deleted', 'success');
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteAbsence = async (absence) => {
                    showConfirmation({
                        title: 'Cancel Absence',
                        message: 'Cancel this absence record?',
                        icon: 'fa-trash',
                        confirmButtonText: 'Cancel',
                        confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteAbsence(absence.id);
                                const index = absenceRecords.value.findIndex(a => a.id === absence.id);
                                if (index > -1) absenceRecords.value.splice(index, 1);
                                showToast('Success', 'Absence cancelled', 'success');
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteAnnouncement = async (announcement) => {
                    showConfirmation({
                        title: 'Delete Announcement',
                        message: `Delete "${announcement.title}"?`,
                        icon: 'fa-trash',
                        confirmButtonText: 'Delete',
                        confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteAnnouncement(announcement.id);
                                const index = announcements.value.findIndex(a => a.id === announcement.id);
                                if (index > -1) announcements.value.splice(index, 1);
                                showToast('Success', 'Announcement deleted', 'success');
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                // ============ 23. PERMISSION FUNCTIONS ============
                const hasPermission = (module, action = 'read') => {
                    const role = currentUser.value?.user_role;
                    if (!role) return false;
                    if (role === 'system_admin') return true;
                    
                    const permissions = PERMISSION_MATRIX[role]?.[module];
                    return permissions?.includes(action) || false;
                };
                
                // ============ 24. COMPUTED PROPERTIES ============
                const availablePhysicians = computed(() => {
                    return medicalStaff.value.filter(s => 
                        ['attending_physician', 'fellow', 'nurse_practitioner'].includes(s.staff_type) &&
                        s.employment_status === 'active'
                    );
                });
                
                const availableResidents = computed(() => {
                    return medicalStaff.value.filter(s => 
                        s.staff_type === 'medical_resident' && s.employment_status === 'active'
                    );
                });
                
                const availableAttendings = computed(() => {
                    return medicalStaff.value.filter(s => 
                        s.staff_type === 'attending_physician' && s.employment_status === 'active'
                    );
                });
                
                const filteredMedicalStaff = computed(() => {
                    let filtered = medicalStaff.value;
                    
                    if (staffFilters.search) {
                        const search = staffFilters.search.toLowerCase();
                        filtered = filtered.filter(s =>
                            s.full_name?.toLowerCase().includes(search) ||
                            s.professional_email?.toLowerCase().includes(search)
                        );
                    }
                    
                    if (staffFilters.staffType) {
                        filtered = filtered.filter(s => s.staff_type === staffFilters.staffType);
                    }
                    
                    if (staffFilters.department) {
                        filtered = filtered.filter(s => s.department_id === staffFilters.department);
                    }
                    
                    if (staffFilters.status) {
                        filtered = filtered.filter(s => s.employment_status === staffFilters.status);
                    }
                    
                    return filtered;
                });
                
                const filteredOnCallSchedules = computed(() => {
                    let filtered = onCallSchedule.value;
                    
                    if (onCallFilters.date) {
                        filtered = filtered.filter(s => s.duty_date === onCallFilters.date);
                    }
                    
                    if (onCallFilters.shiftType) {
                        filtered = filtered.filter(s => s.shift_type === onCallFilters.shiftType);
                    }
                    
                    if (onCallFilters.physician) {
                        filtered = filtered.filter(s =>
                            s.primary_physician_id === onCallFilters.physician ||
                            s.backup_physician_id === onCallFilters.physician
                        );
                    }
                    
                    return filtered;
                });
                
                const filteredRotations = computed(() => {
                    let filtered = rotations.value;
                    
                    if (rotationFilters.resident) {
                        filtered = filtered.filter(r => r.resident_id === rotationFilters.resident);
                    }
                    
                    if (rotationFilters.status) {
                        filtered = filtered.filter(r => r.rotation_status === rotationFilters.status);
                    }
                    
                    if (rotationFilters.trainingUnit) {
                        filtered = filtered.filter(r => r.training_unit_id === rotationFilters.trainingUnit);
                    }
                    
                    return filtered;
                });
                
                // NEW: Filter absence records
                const filteredAbsences = computed(() => {
                    let filtered = absenceRecords.value;
                    
                    if (absenceFilters.staff) {
                        filtered = filtered.filter(a => a.staff_member_id === absenceFilters.staff);
                    }
                    
                    if (absenceFilters.status) {
                        filtered = filtered.filter(a => a.current_status === absenceFilters.status);
                    }
                    
                    if (absenceFilters.reason) {
                        filtered = filtered.filter(a => a.absence_reason === absenceFilters.reason);
                    }
                    
                    if (absenceFilters.startDate) {
                        filtered = filtered.filter(a => a.start_date >= absenceFilters.startDate);
                    }
                    
                    return filtered;
                });
                
                const recentAnnouncements = computed(() => announcements.value.slice(0, 10));
                
                const currentTimeFormatted = computed(() => Utils.formatTime(currentTime.value));
                
                // ============ 25. LIFECYCLE ============
                onMounted(() => {
                    console.log('🚀 NeumoCare v8.2 mounted');
                    
                    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
                    const user = localStorage.getItem(CONFIG.USER_KEY);
                    
                    if (token && user) {
                        try {
                            currentUser.value = JSON.parse(user);
                            loadAllData();
                            currentView.value = 'dashboard';
                        } catch {
                            currentView.value = 'login';
                        }
                    } else {
                        currentView.value = 'login';
                    }
                    
                    // Auto-refresh intervals
                    const statusInterval = setInterval(() => {
                        if (currentUser.value) loadClinicalStatus();
                    }, 60000);
                    
                    const timeInterval = setInterval(() => {
                        currentTime.value = new Date();
                    }, 60000);
                    
                    // ESC key handler
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                            const modals = [
                                staffProfileModal, unitResidentsModal, medicalStaffModal,
                                onCallModal, rotationModal, trainingUnitModal, absenceModal,
                                departmentModal, communicationsModal, userProfileModal,
                                confirmationModal
                            ];
                            modals.forEach(m => { if (m.show) m.show = false; });
                        }
                    });
                    
                    onUnmounted(() => {
                        clearInterval(statusInterval);
                        clearInterval(timeInterval);
                    });
                });
                
                // Watch for data changes
                watch([medicalStaff, rotations, trainingUnits, absenceRecords], () => {
                    loadSystemStats();
                }, { deep: true });
                
                // ============ 26. RETURN ALL EXPOSED PROPERTIES ============
                return {
                    // User
                    currentUser,
                    loginForm,
                    loginLoading,
                    
                    // UI
                    currentView,
                    sidebarCollapsed,
                    mobileMenuOpen,
                    userMenuOpen,
                    statsSidebarOpen,
                    globalSearchQuery,
                    
                    // Loading
                    loading,
                    saving,
                    loadingSchedule,
                    loadingStatus,
                    
                    // Data
                    medicalStaff,
                    departments,
                    trainingUnits,
                    rotations,
                    onCallSchedule,
                    absenceRecords,  // NEW
                    announcements,
                    
                    // Live Status
                    clinicalStatus,
                    clinicalStatusHistory,
                    newStatusText,
                    selectedAuthorId,
                    expiryHours,
                    activeMedicalStaff,
                    liveStatsEditMode,
                    getStatusLocation,
                    getRecentStatuses,
                    
                    // Dashboard
                    systemStats,
                    todaysOnCall,
                    todaysOnCallCount,
                    
                    // UI Components
                    toasts,
                    systemAlerts,
                    currentTime,
                    
                    // Filters
                    staffFilters,
                    onCallFilters,
                    rotationFilters,
                    absenceFilters,
                    
                    // Modals
                    staffProfileModal,
                    unitResidentsModal,
                    medicalStaffModal,
                    onCallModal,
                    rotationModal,
                    trainingUnitModal,
                    absenceModal,
                    departmentModal,
                    communicationsModal,
                    userProfileModal,
                    confirmationModal,
                    
                    // Utilities
                    formatDate: Utils.formatDate,
                    formatTime: Utils.formatTime,
                    formatDateTime: Utils.formatDateTime,
                    formatOnCallShift: Utils.formatOnCallShift,
                    formatRelativeTime: Utils.formatRelativeTime,
                    getInitials: Utils.getInitials,
                    calculateDays: Utils.calculateDays,
                    
                    // Formatting Functions
                    formatStaffType,
                    getStaffTypeClass,
                    formatEmploymentStatus,
                    formatAbsenceReason,
                    formatAbsenceStatus,
                    getAbsenceStatusClass,
                    formatRotationStatus,
                    getUserRoleDisplay,
                    getCurrentViewTitle,
                    getSearchPlaceholder,
                    
                    // Helper Functions
                    getDepartmentName,
                    getStaffName,
                    getTrainingUnitName,
                    getSupervisorName,
                    getPhysicianName,
                    getResidentName,
                    getDepartmentUnits,
                    getDepartmentStaffCount,
                    getCurrentRotationForStaff,
                    
                    // Unit Resident Functions
                    getUnitActiveRotationCount,
                    viewUnitResidents,
                    
                    // Profile Functions
                    getCurrentUnit,
                    isOnCallToday,
                    getOnCallShift,
                    getOnCallDisplay,
                    getRotationDaysLeft,
                    getRotationSupervisor,
                    
                    // Live Status Functions
                    loadClinicalStatus,
                    loadClinicalStatusHistory,
                    saveClinicalStatus,
                    isStatusExpired,
                    calculateTimeRemaining,
                    refreshStatus,
                    showCreateStatusModal: () => { liveStatsEditMode.value = true; },
                    
                    // Toast Functions
                    showToast,
                    removeToast,
                    dismissAlert,
                    
                    // Confirmation Modal
                    showConfirmation,
                    confirmAction,
                    cancelConfirmation,
                    
                    // Authentication
                    handleLogin,
                    handleLogout,
                    
                    // Navigation
                    switchView,
                    toggleStatsSidebar,
                    handleGlobalSearch,
                    
                    // Modal Show Functions
                    showAddMedicalStaffModal,
                    showAddDepartmentModal,
                    showAddTrainingUnitModal,
                    showAddRotationModal,
                    showAddOnCallModal,
                    showAddAbsenceModal,
                    showCommunicationsModal,
                    showUserProfileModal,
                    
                    // View/Edit Functions
                    viewStaffDetails,
                    editMedicalStaff,
                    editDepartment,
                    editTrainingUnit,
                    editRotation,
                    editOnCallSchedule,
                    editAbsence,
                    
                    // Save Functions
                    saveMedicalStaff,
                    saveDepartment,
                    saveTrainingUnit,
                    saveRotation,
                    saveOnCallSchedule,
                    saveAbsence,
                    saveCommunication,
                    saveUserProfile,
                    
                    // Action Functions
                    contactPhysician,
                    viewAnnouncement,
                    viewDepartmentStaff,
                    
                    // Delete Functions
                    deleteMedicalStaff,
                    deleteRotation,
                    deleteOnCallSchedule,
                    deleteAbsence,
                    deleteAnnouncement,
                    
                    // Permission
                    hasPermission,
                    
                    // Computed
                    availablePhysicians,
                    availableResidents,
                    availableAttendings,
                    filteredMedicalStaff,
                    filteredOnCallSchedules,
                    filteredRotations,
                    filteredAbsences,
                    recentAnnouncements,
                    currentTimeFormatted
                };
            }
        });
        
        // Mount app
        app.mount('#app');
        console.log('✅ NeumoCare v8.2 mounted successfully');
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
        document.body.innerHTML = `
            <div style="padding:40px;text-align:center;font-family:sans-serif;">
                <h2 style="color:#dc3545;">⚠️ Application Error</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="padding:10px 20px;background:#007bff;color:white;border:none;border-radius:4px;margin-top:20px;">
                    🔄 Refresh
                </button>
            </div>
        `;
    }
});
