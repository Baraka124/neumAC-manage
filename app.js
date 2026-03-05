// ============ NEUMOCARE HOSPITAL MANAGEMENT SYSTEM v8.1 ============
// UPDATED FOR UI ENHANCEMENTS - REAL DATA ONLY, NO PLACEHOLDERS
// ==================================================////=================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 NeumoCare Hospital Management System v8.1 loading...');
    
    try {
        if (typeof Vue === 'undefined') {
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center; margin-top: 100px; color: #333;">
                    <h2 style="color: #dc3545;">⚠️ Critical Error</h2>
                    <p>Vue.js failed to load. Please refresh the page.</p>
                    <button onclick="window.location.reload()" 
                            style="padding: 12px 24px; background: #007bff; color: white; 
                                   border: none; border-radius: 6px; cursor: pointer; margin-top: 20px;">
                        🔄 Refresh Page
                    </button>
                </div>
            `;
            throw new Error('Vue.js not loaded');
        }
        
        console.log('✅ Vue.js loaded successfully:', Vue.version);
        
        const { createApp, ref, reactive, computed, onMounted, watch, onUnmounted } = Vue;
        
        // ============ 2. CONFIGURATION ============
        const CONFIG = {
            API_BASE_URL: window.location.hostname.includes('localhost') 
                ? 'http://localhost:3000' 
                : 'https://neumac-manage-back-end-production.up.railway.app',
            TOKEN_KEY: 'neumocare_token',
            USER_KEY: 'neumocare_user',
            APP_VERSION: '8.1',
            DEBUG: window.location.hostname.includes('localhost')
        };
        
        // ============ 3. ENHANCED UTILITIES ============
        class EnhancedUtils {
            static formatDate(dateString) {
                if (!dateString) return 'N/A';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return dateString;
                    return date.toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                    });
                } catch { return dateString; }
            }
            
            static formatDateTime(dateString) {
                if (!dateString) return 'N/A';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return dateString;
                    return date.toLocaleString('en-US', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    });
                } catch { return dateString; }
            }
            
            static getInitials(name) {
                if (!name || typeof name !== 'string') return '??';
                return name.split(' ')
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
            }
            
            static ensureArray(data) {
                if (Array.isArray(data)) return data;
                if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
                if (data && typeof data === 'object') return Object.values(data);
                return [];
            }
            
            static formatTime(dateString) {
                if (!dateString) return '';
                try {
                    const date = new Date(dateString);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch { return dateString; }
            }
            
            static formatRelativeTime(dateString) {
                if (!dateString) return 'Just now';
                try {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now - date;
                    const diffMins = Math.floor(diffMs / 60000);
                    
                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
                    return `${Math.floor(diffMins / 1440)}d ago`;
                } catch { return 'Just now'; }
            }
            
            static calculateDateDifference(startDate, endDate) {
                try {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
                    const diffTime = Math.abs(end - start);
                    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } catch { return 0; }
            }
            
            static generateId(prefix) {
                return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
            }
        }
        
        // ============ 4. API SERVICE ============
        class ApiService {
            constructor() {
                this.token = localStorage.getItem(CONFIG.TOKEN_KEY) || null;
            }
            
            getHeaders() {
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };
                
                const token = localStorage.getItem(CONFIG.TOKEN_KEY);
                if (token && token.trim()) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                return headers;
            }
            
            async request(endpoint, options = {}) {
                const url = `${CONFIG.API_BASE_URL}${endpoint}`;
                
                try {
                    const config = {
                        method: options.method || 'GET',
                        headers: this.getHeaders(),
                        mode: 'cors',
                        cache: 'no-cache',
                        credentials: 'include'
                    };
                    
                    if (options.body && typeof options.body === 'object') {
                        config.body = JSON.stringify(options.body);
                    }
                    
                    console.log(`📡 API Request to ${url}:`, {
                        method: config.method,
                        hasBody: !!options.body
                    });
                    
                    const response = await fetch(url, config);
                    
                    if (response.status === 204) return null;
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            this.token = null;
                            localStorage.removeItem(CONFIG.TOKEN_KEY);
                            localStorage.removeItem(CONFIG.USER_KEY);
                            throw new Error('Session expired. Please login again.');
                        }
                        
                        let errorText;
                        try {
                            errorText = await response.text();
                        } catch {
                            errorText = `HTTP ${response.status}: ${response.statusText}`;
                        }
                        
                        throw new Error(errorText);
                    }
                    
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return await response.json();
                    }
                    
                    return await response.text();
                    
                } catch (error) {
                    if (CONFIG.DEBUG) console.error(`API ${endpoint} failed:`, error);
                    
                    if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                        throw new Error(`Cannot connect to server. Please check connection.`);
                    }
                    
                    throw error;
                }
            }
            
            // ===== AUTHENTICATION ENDPOINTS =====
            async login(email, password) {
                try {
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
                } catch (error) {
                    throw new Error('Login failed: ' + error.message);
                }
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
            
            // ===== MEDICAL STAFF ENDPOINTS =====
            async getMedicalStaff() {
                try {
                    const data = await this.request('/api/medical-staff');
                    return EnhancedUtils.ensureArray(data);
                } catch { return []; }
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
            
            // ===== DEPARTMENT ENDPOINTS =====
            async getDepartments() {
                try {
                    const data = await this.request('/api/departments');
                    return EnhancedUtils.ensureArray(data);
                } catch { return []; }
            }
            
            async createDepartment(departmentData) {
                return await this.request('/api/departments', {
                    method: 'POST',
                    body: departmentData
                });
            }
            
            async updateDepartment(id, departmentData) {
                return await this.request(`/api/departments/${id}`, {
                    method: 'PUT',
                    body: departmentData
                });
            }
            
            // ===== TRAINING UNIT ENDPOINTS =====
            async getTrainingUnits() {
                try {
                    const data = await this.request('/api/training-units');
                    return EnhancedUtils.ensureArray(data);
                } catch { return []; }
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
            
            // ===== ROTATION ENDPOINTS =====
            async getRotations() {
                try {
                    const data = await this.request('/api/rotations');
                    return EnhancedUtils.ensureArray(data);
                } catch { return []; }
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
            
            // ===== ON-CALL ENDPOINTS =====
            async getOnCallSchedule() {
                try {
                    const data = await this.request('/api/oncall');
                    return EnhancedUtils.ensureArray(data);
                } catch { return []; }
            }
            
            async getOnCallToday() {
                try {
                    const data = await this.request('/api/oncall/today');
                    return EnhancedUtils.ensureArray(data);
                } catch { return []; }
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
            
            // ===== ABSENCE ENDPOINTS =====
            async getAbsences() {
                try {
                    const data = await this.request('/api/absence-records');
                    return EnhancedUtils.ensureArray(data);
                } catch (error) {
                    console.error('Failed to load absences:', error);
                    return [];
                }
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
                return await this.request(`/api/absence-records/${id}`, { 
                    method: 'DELETE' 
                });
            }
            
            // ===== ANNOUNCEMENT ENDPOINTS =====
            async getAnnouncements() {
                try {
                    const data = await this.request('/api/announcements');
                    return EnhancedUtils.ensureArray(data);
                } catch { return []; }
            }
            
            async createAnnouncement(announcementData) {
                return await this.request('/api/announcements', {
                    method: 'POST',
                    body: announcementData
                });
            }
            
            async updateAnnouncement(id, announcementData) {
                return await this.request(`/api/announcements/${id}`, {
                    method: 'PUT',
                    body: announcementData
                });
            }
            
            async deleteAnnouncement(id) {
                return await this.request(`/api/announcements/${id}`, { method: 'DELETE' });
            }
            
            // ===== LIVE STATUS ENDPOINTS =====
            async getClinicalStatus() {
                try {
                    const data = await this.request('/api/live-status/current');
                    return data;
                } catch (error) {
                    console.error('Clinical status API error:', error);
                    return {
                        success: false,
                        data: null,
                        error: error.message
                    };
                }
            }
            
            async createClinicalStatus(statusData) {
                return await this.request('/api/live-status', {
                    method: 'POST',
                    body: statusData
                });
            }
            
            async updateClinicalStatus(id, statusData) {
                return await this.request(`/api/live-status/${id}`, {
                    method: 'PUT',
                    body: statusData
                });
            }
            
            async deleteClinicalStatus(id) {
                return await this.request(`/api/live-status/${id}`, { method: 'DELETE' });
            }
            
            async getClinicalStatusHistory(limit = 10) {
                try {
                    const data = await this.request(`/api/live-status/history?limit=${limit}`);
                    return EnhancedUtils.ensureArray(data);
                } catch (error) {
                    console.error('Clinical status history API error:', error);
                    return [];
                }
            }
            
            // ===== SYSTEM STATS ENDPOINT =====
            async getSystemStats() {
                try {
                    const data = await this.request('/api/system-stats');
                    return data || {};
                } catch {
                    return {
                        activeAttending: 0,
                        activeResidents: 0,
                        onCallNow: 0,
                        inSurgery: 0,
                        nextShiftChange: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
                        pendingApprovals: 0
                    };
                }
            }
        }
        
        // Initialize API Service
        const API = new ApiService();
        
        // ============ 5. CREATE VUE APP ============
        const app = createApp({
            setup() {
                // ============ 6. REACTIVE STATE ============
                
                // 6.1 User State
                const currentUser = ref(null);
                const loginForm = reactive({
                    email: '',
                    password: '',
                    remember_me: false
                });
                const loginLoading = ref(false);
                
                // 6.2 UI State
                const currentView = ref('login');
                const sidebarCollapsed = ref(false);
                const mobileMenuOpen = ref(false);
                const userMenuOpen = ref(false);
                const statsSidebarOpen = ref(false);
                const globalSearchQuery = ref('');
                
                // 6.3 Loading States
                const loading = ref(false);
                const saving = ref(false);
                const loadingSchedule = ref(false);
                const isLoadingStatus = ref(false);
                
                // 6.4 Data Stores
                const medicalStaff = ref([]);
                const departments = ref([]);
                const trainingUnits = ref([]);
                const rotations = ref([]);
                const absences = ref([]);
                const onCallSchedule = ref([]);
                const announcements = ref([]);
                
                // 6.5 LIVE STATUS DATA
                const clinicalStatus = ref(null);
                const clinicalStatusHistory = ref([]);
                const newStatusText = ref('');
                const selectedAuthorId = ref('');
                const expiryHours = ref(8);
                const activeMedicalStaff = ref([]);
                const liveStatsEditMode = ref(false);
                
                // 6.6 Dashboard Data
                const systemStats = ref({
                    totalStaff: 0,
                    activeAttending: 0,
                    activeResidents: 0,
                    onCallNow: 0,
                    inSurgery: 0,
                    activeRotations: 0,
                    endingThisWeek: 0,
                    startingNextWeek: 0,
                    onLeaveStaff: 0,
                    departmentStatus: 'normal',
                    activePatients: 0,
                    icuOccupancy: 0,
                    wardOccupancy: 0,
                    pendingApprovals: 0,
                    nextShiftChange: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
                });
                
                const todaysOnCall = ref([]);
                const todaysOnCallCount = computed(() => todaysOnCall.value.length);
                
                // 6.7 UI Components
                const toasts = ref([]);
                const systemAlerts = ref([]);
                
                // 6.8 Filter States
                const staffFilters = reactive({
                    search: '',
                    staffType: '',
                    department: '',
                    status: ''
                });
                
                const onCallFilters = reactive({
                    date: '',
                    shiftType: '',
                    physician: '',
                    coverageArea: ''
                });
                
                const rotationFilters = reactive({
                    resident: '',
                    status: '',
                    trainingUnit: '',
                    supervisor: ''
                });
                
                const absenceFilters = reactive({
                    staff: '',
                    status: '',
                    reason: '',
                    startDate: ''
                });
                
                // 6.9 Modal States
                const staffProfileModal = reactive({
                    show: false,
                    staff: null,
                    activeTab: 'assignments'  // Default to assignments tab
                });
                
                // NEW: Unit Residents Modal
                const unitResidentsModal = reactive({
                    show: false,
                    unit: null,
                    rotations: []
                });
                
                const medicalStaffModal = reactive({
                    show: false,
                    mode: 'add',
                    activeTab: 'basic',
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
                        certificate_status: 'current'
                    }
                });
                
                const communicationsModal = reactive({
                    show: false,
                    activeTab: 'announcement',
                    form: {
                        title: '',
                        content: '',
                        priority: 'normal',
                        target_audience: 'all_staff',
                        updateType: 'daily',
                        dailySummary: '',
                        highlight1: '',
                        highlight2: '',
                        alerts: {
                            erBusy: false,
                            icuFull: false,
                            wardFull: false,
                            staffShortage: false
                        },
                        metricName: '',
                        metricValue: '',
                        metricTrend: 'stable',
                        metricChange: '',
                        metricNote: '',
                        alertLevel: 'low',
                        alertMessage: '',
                        affectedAreas: {
                            er: false,
                            icu: false,
                            ward: false,
                            surgery: false
                        }
                    }
                });
                
                const onCallModal = reactive({
                    show: false,
                    mode: 'add',
                    form: {
                        duty_date: new Date().toISOString().split('T')[0],
                        shift_type: 'primary_call',
                        start_time: '08:00',
                        end_time: '17:00',
                        primary_physician_id: '',
                        backup_physician_id: '',
                        coverage_area: 'emergency',
                        schedule_id: `SCH-${Date.now().toString().slice(-6)}`
                    }
                });
                
                const rotationModal = reactive({
                    show: false,
                    mode: 'add',
                    form: {
                        rotation_id: '',
                        resident_id: '',
                        training_unit_id: '',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        rotation_status: 'scheduled',
                        rotation_category: 'clinical_rotation',
                        supervising_attending_id: ''
                    }
                });
                
                const trainingUnitModal = reactive({
                    show: false,
                    mode: 'add',
                    form: {
                        unit_name: '',
                        unit_code: '',
                        department_id: '',
                        maximum_residents: 10,
                        unit_status: 'active',
                        specialty: '',
                        supervising_attending_id: ''
                    }
                });
                
                const absenceModal = reactive({
                    show: false,
                    mode: 'add',
                    activeTab: 'basic',
                    form: {
                        staff_member_id: '',
                        absence_type: 'planned',
                        absence_reason: 'vacation',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        current_status: 'pending',
                        covering_staff_id: '',
                        coverage_notes: '',
                        coverage_arranged: false,
                        hod_notes: ''
                    }
                });
                
                const departmentModal = reactive({
                    show: false,
                    mode: 'add',
                    form: {
                        name: '',
                        code: '',
                        status: 'active',
                        head_of_department_id: ''
                    }
                });
                
                const userProfileModal = reactive({
                    show: false,
                    form: {
                        full_name: '',
                        email: '',
                        department_id: ''
                    }
                });
                
                const confirmationModal = reactive({
                    show: false,
                    title: '',
                    message: '',
                    icon: 'fa-question-circle',
                    confirmButtonText: 'Confirm',
                    confirmButtonClass: 'btn-primary',
                    cancelButtonText: 'Cancel',
                    onConfirm: null,
                    details: ''
                });
                
                // 6.10 Permission Matrix
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
                
                // ============ 7. CORE FUNCTIONS ============
                
                // 7.1 Toast System
                const showToast = (title, message, type = 'info', duration = 5000) => {
                    const icons = {
                        info: 'fas fa-info-circle',
                        success: 'fas fa-check-circle',
                        error: 'fas fa-exclamation-circle',
                        warning: 'fas fa-exclamation-triangle'
                    };
                    
                    const toast = {
                        id: Date.now(),
                        title,
                        message,
                        type,
                        icon: icons[type],
                        duration
                    };
                    
                    toasts.value.push(toast);
                    
                    if (duration > 0) {
                        setTimeout(() => removeToast(toast.id), duration);
                    }
                };
                
                const removeToast = (id) => {
                    const index = toasts.value.findIndex(t => t.id === id);
                    if (index > -1) toasts.value.splice(index, 1);
                };
                
                // 7.2 Confirmation Modal
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
                
                // ============ 8. FORMATTING FUNCTIONS ============
                
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
                        'sick_leave': 'Sick Leave',
                        'conference': 'Conference',
                        'training': 'Training',
                        'personal': 'Personal',
                        'other': 'Other'
                    };
                    return map[reason] || reason;
                };
                
                const formatAbsenceStatus = (status) => {
                    const map = {
                        'active': 'Active',
                        'upcoming': 'Upcoming',
                        'completed': 'Completed'
                    };
                    return map[status] || status;
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
                        'medical_staff': 'Medical Staff Management',
                        'oncall_schedule': 'On-call Schedule',
                        'resident_rotations': 'Resident Rotations',
                        'training_units': 'Training Units',
                        'staff_absence': 'Staff Absence Management',
                        'department_management': 'Department Management',
                        'communications': 'Communications Center'
                    };
                    return map[currentView.value] || 'NeumoCare Dashboard';
                };
                
                const getCurrentViewSubtitle = () => {
                    const map = {
                        'dashboard': 'Real-time department overview and analytics',
                        'medical_staff': 'Manage physicians, residents, and clinical staff',
                        'oncall_schedule': 'View and manage on-call physician schedules',
                        'resident_rotations': 'Track and manage resident training rotations',
                        'training_units': 'Clinical training units and resident assignments',
                        'staff_absence': 'Track staff absences and coverage assignments',
                        'department_management': 'Organizational structure and clinical units',
                        'communications': 'Department announcements and capacity updates'
                    };
                    return map[currentView.value] || 'Hospital Management System';
                };
                
                const getSearchPlaceholder = () => {
                    const map = {
                        'dashboard': 'Search staff, units, rotations...',
                        'medical_staff': 'Search by name or email...',
                        'oncall_schedule': 'Search on-call schedules...',
                        'resident_rotations': 'Search rotations by resident or unit...',
                        'training_units': 'Search training units...',
                        'staff_absence': 'Search absences by staff member...',
                        'department_management': 'Search departments...',
                        'communications': 'Search announcements...'
                    };
                    return map[currentView.value] || 'Search across system...';
                };
                
                // ============ 9. DATA HELPER FUNCTIONS ============
                
                const getDepartmentName = (departmentId) => {
                    if (!departmentId) return 'Not assigned';
                    const dept = departments.value.find(d => d.id === departmentId);
                    return dept ? dept.name : 'Unknown Department';
                };
                
                const getStaffName = (staffId) => {
                    if (!staffId) return 'Not assigned';
                    const staff = medicalStaff.value.find(s => s.id === staffId);
                    return staff ? staff.full_name : 'Unknown Staff';
                };
                
                const getTrainingUnitName = (unitId) => {
                    if (!unitId) return 'Not assigned';
                    const unit = trainingUnits.value.find(u => u.id === unitId);
                    return unit ? unit.unit_name : 'Unknown Unit';
                };
                
                const getSupervisorName = (supervisorId) => {
                    return getStaffName(supervisorId);
                };
                
                const getPhysicianName = (physicianId) => {
                    return getStaffName(physicianId);
                };
                
                const getResidentName = (residentId) => {
                    return getStaffName(residentId);
                };
                
                const getDepartmentUnits = (departmentId) => {
                    return trainingUnits.value.filter(unit => unit.department_id === departmentId);
                };
                
                const getDepartmentStaffCount = (departmentId) => {
                    return medicalStaff.value.filter(staff => staff.department_id === departmentId).length;
                };
                
                const getCurrentRotationForStaff = (staffId) => {
                    const rotation = rotations.value.find(r => 
                        r.resident_id === staffId && r.rotation_status === 'active'
                    );
                    return rotation || null;
                };
                
                const calculateAbsenceDuration = (startDate, endDate) => {
                    return EnhancedUtils.calculateDateDifference(startDate, endDate);
                };
                
                // ============ 10. UNIT RESIDENT FUNCTIONS (NEW) ============
                
                const getUnitActiveRotationCount = (unitId) => {
                    if (!unitId || !rotations.value.length) return 0;
                    
                    // Count only active and scheduled rotations (not completed/cancelled)
                    return rotations.value.filter(r => 
                        r.training_unit_id === unitId && 
                        (r.rotation_status === 'active' || r.rotation_status === 'scheduled')
                    ).length;
                };
                
                const getDaysRemaining = (endDate) => {
                    if (!endDate) return 0;
                    try {
                        const end = new Date(endDate);
                        const today = new Date();
                        const diffTime = end - today;
                        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    } catch {
                        return 0;
                    }
                };
                
                const getDaysUntilStart = (startDate) => {
                    if (!startDate) return 0;
                    try {
                        const start = new Date(startDate);
                        const today = new Date();
                        const diffTime = start - today;
                        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                    } catch {
                        return 0;
                    }
                };
                
                const viewUnitResidents = (unit) => {
                    if (!unit) return;
                    
                    // Get all active and scheduled rotations for this unit
                    const unitRotations = rotations.value.filter(r => 
                        r.training_unit_id === unit.id && 
                        (r.rotation_status === 'active' || r.rotation_status === 'scheduled')
                    );
                    
                    // Sort: active first, then scheduled by start date
                    unitRotations.sort((a, b) => {
                        if (a.rotation_status === 'active' && b.rotation_status !== 'active') return -1;
                        if (a.rotation_status !== 'active' && b.rotation_status === 'active') return 1;
                        
                        // Both same status, sort by date
                        const dateA = new Date(a.start_date);
                        const dateB = new Date(b.start_date);
                        return dateA - dateB;
                    });
                    
                    unitResidentsModal.unit = unit;
                    unitResidentsModal.rotations = unitRotations;
                    unitResidentsModal.show = true;
                };
                
                // ============ 11. PROFILE FUNCTIONS (REAL DATA ONLY) ============
                
                const getCurrentUnit = (staffId) => {
                    const rotation = rotations.value.find(r => 
                        r.resident_id === staffId && r.rotation_status === 'active'
                    );
                    return rotation ? getTrainingUnitName(rotation.training_unit_id) : 'Not assigned';
                };
                
                const getCurrentWard = (staffId) => {
                    const rotation = rotations.value.find(r => 
                        r.resident_id === staffId && r.rotation_status === 'active'
                    );
                    
                    if (rotation && rotation.training_unit_id) {
                        const unit = trainingUnits.value.find(u => u.id === rotation.training_unit_id);
                        if (unit) {
                            return unit.unit_name;
                        }
                    }
                    
                    return 'Not assigned';
                };
                
                const getCurrentActivityStatus = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    const onCall = onCallSchedule.value.find(s => 
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date === today
                    );
                    
                    if (onCall) return 'oncall';
                    return 'available';  // Default, no random generation
                };
                
                // REMOVED: getCurrentPatientCount, getICUPatientCount, getWardPatientCount - all fake data
                // REMOVED: getTodaysSchedule - fake schedule
                // REMOVED: getRecentActivities - fake activities
                
                const isOnCallToday = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    return onCallSchedule.value.some(s => 
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date === today
                    );
                };
                
                const getOnCallShiftTime = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    const schedule = onCallSchedule.value.find(s => 
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date === today
                    );
                    
                    return schedule ? `${schedule.start_time} - ${schedule.end_time}` : 'N/A';
                };
                
                const getOnCallCoverage = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    const schedule = onCallSchedule.value.find(s => 
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date === today
                    );
                    
                    return schedule ? schedule.coverage_area : 'N/A';
                };
                
                const getRotationSupervisor = (staffId) => {
                    const rotation = rotations.value.find(r => 
                        r.resident_id === staffId && r.rotation_status === 'active'
                    );
                    
                    if (rotation && rotation.supervising_attending_id) {
                        return getStaffName(rotation.supervising_attending_id);
                    }
                    
                    return 'Not assigned';
                };
                
                const getRotationDaysLeft = (staffId) => {
                    const rotation = rotations.value.find(r => 
                        r.resident_id === staffId && r.rotation_status === 'active'
                    );
                    
                    if (rotation && rotation.end_date) {
                        return getDaysRemaining(rotation.end_date);
                    }
                    
                    return 0;
                };
                
                // ============ 12. LIVE STATUS FUNCTIONS ============
                
                const getStatusLocation = (status) => {
                    if (!status || !status.status_text) return 'Pulmonology Department';
                    
                    if (status.location) return status.location;
                    if (status.department) return status.department;
                    if (status.coverage_area) return status.coverage_area;
                    
                    const text = status.status_text.toLowerCase();
                    
                    if (text.includes('icu')) return 'Respiratory ICU';
                    if (text.includes('respiratory') || text.includes('pulmonology')) return 'Pulmonology Department';
                    if (text.includes('bronchoscopy')) return 'Pulmonary Procedure Unit';
                    if (text.includes('sleep')) return 'Sleep Medicine Lab';
                    if (text.includes('ventilator')) return 'Respiratory Therapy Unit';
                    if (text.includes('er') || text.includes('emergency')) return 'Emergency Department';
                    if (text.includes('ward')) return 'General Ward';
                    
                    return 'Pulmonology Department';
                };
                
                const getRecentStatuses = () => {
                    return clinicalStatusHistory.value;
                };
                
                const loadClinicalStatus = async () => {
                    isLoadingStatus.value = true;
                    try {
                        const response = await API.getClinicalStatus();
                        
                        if (response && response.success) {
                            clinicalStatus.value = response.data;
                        } else {
                            clinicalStatus.value = null;
                        }
                    } catch (error) {
                        console.error('Failed to load clinical status:', error);
                        clinicalStatus.value = null;
                    } finally {
                        isLoadingStatus.value = false;
                    }
                };
                
                const loadClinicalStatusHistory = async () => {
                    try {
                        const history = await API.getClinicalStatusHistory(20);
                        
                        const currentStatusId = clinicalStatus.value?.id;
                        const now = new Date();
                        
                        clinicalStatusHistory.value = history
                            .filter(status => {
                                if (status.id === currentStatusId) return false;
                                
                                if (status.expires_at) {
                                    try {
                                        const expires = new Date(status.expires_at);
                                        return now < expires;
                                    } catch {
                                        return true;
                                    }
                                }
                                return true;
                            })
                            .slice(0, 5);
                    } catch (error) {
                        console.error('Failed to load clinical status history:', error);
                        clinicalStatusHistory.value = [];
                    }
                };
                
                const loadActiveMedicalStaff = async () => {
                    try {
                        const data = await API.getMedicalStaff();
                        activeMedicalStaff.value = data.filter(staff => 
                            staff.employment_status === 'active'
                        );
                        
                        if (currentUser.value) {
                            const currentUserStaff = activeMedicalStaff.value.find(
                                staff => staff.professional_email === currentUser.value.email
                            );
                            if (currentUserStaff) {
                                selectedAuthorId.value = currentUserStaff.id;
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load active medical staff:', error);
                        activeMedicalStaff.value = [];
                    }
                };
                
                const saveClinicalStatus = async () => {
                    if (!newStatusText.value.trim() || !selectedAuthorId.value) {
                        showToast('Error', 'Please fill all required fields', 'error');
                        return;
                    }
                    
                    isLoadingStatus.value = true;
                    try {
                        const response = await API.createClinicalStatus({
                            status_text: newStatusText.value.trim(),
                            author_id: selectedAuthorId.value,
                            expires_in_hours: expiryHours.value
                        });
                        
                        if (response && response.success && response.data) {
                            if (clinicalStatus.value) {
                                clinicalStatusHistory.value.unshift(clinicalStatus.value);
                                if (clinicalStatusHistory.value.length > 5) {
                                    clinicalStatusHistory.value = clinicalStatusHistory.value.slice(0, 5);
                                }
                            }
                            
                            clinicalStatus.value = response.data;
                            newStatusText.value = '';
                            selectedAuthorId.value = '';
                            liveStatsEditMode.value = false;
                            
                            await loadClinicalStatusHistory();
                            
                            showToast('Success', 'Live status has been updated for all staff', 'success');
                            await loadSystemStats();
                        } else {
                            throw new Error(response?.error || 'Failed to save status');
                        }
                    } catch (error) {
                        console.error('❌ Failed to save clinical status:', error);
                        showToast('Error', error.message || 'Could not update status. Please try again.', 'error');
                    } finally {
                        isLoadingStatus.value = false;
                    }
                };
                
                const isStatusExpired = (expiresAt) => {
                    if (!expiresAt) return true;
                    try {
                        const expires = new Date(expiresAt);
                        const now = new Date();
                        return now > expires;
                    } catch {
                        return true;
                    }
                };
                
                const showCreateStatusModal = () => {
                    liveStatsEditMode.value = true;
                    newStatusText.value = '';
                    selectedAuthorId.value = '';
                    expiryHours.value = 8;
                };
                
                const calculateTimeRemaining = (expiryTime) => {
                    if (!expiryTime) return 'N/A';
                    try {
                        const expiry = new Date(expiryTime);
                        const now = new Date();
                        const diff = expiry - now;
                        
                        if (diff <= 0) return 'Expired';
                        
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        
                        if (hours > 0) return `${hours}h ${minutes}m`;
                        return `${minutes}m`;
                    } catch {
                        return 'N/A';
                    }
                };
                
                const refreshStatus = () => {
                    loadClinicalStatus();
                    loadSystemStats();
                    showToast('Status Refreshed', 'Live status updated', 'info');
                };
                
                // ============ 13. DELETE FUNCTIONS ============
                
                const deleteMedicalStaff = async (staff) => {
                    showConfirmation({
                        title: 'Delete Medical Staff',
                        message: `Are you sure you want to delete ${staff.full_name}?`,
                        icon: 'fa-trash',
                        confirmButtonText: 'Delete',
                        confirmButtonClass: 'btn-danger',
                        details: 'This action cannot be undone.',
                        onConfirm: async () => {
                            try {
                                await API.deleteMedicalStaff(staff.id);
                                const index = medicalStaff.value.findIndex(s => s.id === staff.id);
                                if (index > -1) medicalStaff.value.splice(index, 1);
                                showToast('Success', 'Medical staff deleted successfully', 'success');
                                updateDashboardStats();
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteRotation = async (rotation) => {
                    showConfirmation({
                        title: 'Delete Rotation',
                        message: `Are you sure you want to delete this rotation?`,
                        icon: 'fa-trash',
                        confirmButtonText: 'Delete',
                        confirmButtonClass: 'btn-danger',
                        details: `Resident: ${getResidentName(rotation.resident_id)}`,
                        onConfirm: async () => {
                            try {
                                await API.deleteRotation(rotation.id);
                                const index = rotations.value.findIndex(r => r.id === rotation.id);
                                if (index > -1) rotations.value.splice(index, 1);
                                showToast('Success', 'Rotation deleted successfully', 'success');
                                updateDashboardStats();
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteOnCallSchedule = async (schedule) => {
                    showConfirmation({
                        title: 'Delete On-Call Schedule',
                        message: `Are you sure you want to delete this on-call schedule?`,
                        icon: 'fa-trash',
                        confirmButtonText: 'Delete',
                        confirmButtonClass: 'btn-danger',
                        details: `Physician: ${getPhysicianName(schedule.primary_physician_id)}`,
                        onConfirm: async () => {
                            try {
                                await API.deleteOnCall(schedule.id);
                                const index = onCallSchedule.value.findIndex(s => s.id === schedule.id);
                                if (index > -1) onCallSchedule.value.splice(index, 1);
                                showToast('Success', 'On-call schedule deleted successfully', 'success');
                                loadTodaysOnCall();
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteAbsence = async (absence) => {
                    showConfirmation({
                        title: 'Delete Absence',
                        message: `Are you sure you want to delete this absence record?`,
                        icon: 'fa-trash',
                        confirmButtonText: 'Delete',
                        confirmButtonClass: 'btn-danger',
                        details: `Staff: ${getStaffName(absence.staff_member_id)}`,
                        onConfirm: async () => {
                            try {
                                await API.deleteAbsence(absence.id);
                                const index = absences.value.findIndex(a => a.id === absence.id);
                                if (index > -1) absences.value.splice(index, 1);
                                showToast('Success', 'Absence deleted successfully', 'success');
                                updateDashboardStats();
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteAnnouncement = async (announcement) => {
                    showConfirmation({
                        title: 'Delete Announcement',
                        message: `Are you sure you want to delete "${announcement.title}"?`,
                        icon: 'fa-trash',
                        confirmButtonText: 'Delete',
                        confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteAnnouncement(announcement.id);
                                const index = announcements.value.findIndex(a => a.id === announcement.id);
                                if (index > -1) announcements.value.splice(index, 1);
                                showToast('Success', 'Announcement deleted successfully', 'success');
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                const deleteClinicalStatus = async () => {
                    if (!clinicalStatus.value) return;
                    
                    showConfirmation({
                        title: 'Clear Live Status',
                        message: 'Are you sure you want to clear the current live status?',
                        icon: 'fa-trash',
                        confirmButtonText: 'Clear',
                        confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteClinicalStatus(clinicalStatus.value.id);
                                clinicalStatus.value = null;
                                showToast('Success', 'Live status cleared', 'success');
                            } catch (error) {
                                showToast('Error', error.message, 'error');
                            }
                        }
                    });
                };
                
                // ============ 14. DATA LOADING FUNCTIONS ============
                
                const loadMedicalStaff = async () => {
                    try {
                        const data = await API.getMedicalStaff();
                        medicalStaff.value = data;
                    } catch (error) {
                        console.error('Failed to load medical staff:', error);
                        showToast('Error', 'Failed to load medical staff', 'error');
                    }
                };
                
                const loadDepartments = async () => {
                    try {
                        const data = await API.getDepartments();
                        departments.value = data;
                    } catch (error) {
                        console.error('Failed to load departments:', error);
                        showToast('Error', 'Failed to load departments', 'error');
                    }
                };
                
                const loadTrainingUnits = async () => {
                    try {
                        const data = await API.getTrainingUnits();
                        trainingUnits.value = data;
                    } catch (error) {
                        console.error('Failed to load training units:', error);
                        showToast('Error', 'Failed to load training units', 'error');
                    }
                };
                
                const loadRotations = async () => {
                    try {
                        const data = await API.getRotations();
                        rotations.value = data;
                    } catch (error) {
                        console.error('Failed to load rotations:', error);
                        showToast('Error', 'Failed to load rotations', 'error');
                    }
                };
                
                const loadAbsences = async () => {
                    try {
                        const data = await API.getAbsences();
                        absences.value = data;
                    } catch (error) {
                        console.error('Failed to load absences:', error);
                        showToast('Error', 'Failed to load absences', 'error');
                    }
                };
                
                const loadOnCallSchedule = async () => {
                    try {
                        loadingSchedule.value = true;
                        const data = await API.getOnCallSchedule();
                        onCallSchedule.value = data;
                    } catch (error) {
                        console.error('Failed to load on-call schedule:', error);
                        showToast('Error', 'Failed to load on-call schedule', 'error');
                    } finally {
                        loadingSchedule.value = false;
                    }
                };
                
                const loadTodaysOnCall = async () => {
                    try {
                        loadingSchedule.value = true;
                        const data = await API.getOnCallToday();
                        
                        todaysOnCall.value = data.map(item => {
                            const startTime = item.start_time ? item.start_time.substring(0, 5) : 'N/A';
                            const endTime = item.end_time ? item.end_time.substring(0, 5) : 'N/A';
                            const physicianName = item.primary_physician?.full_name || getStaffName(item.primary_physician_id) || 'Unknown Physician';
                            
                            let shiftTypeDisplay = 'Unknown';
                            if (item.shift_type === 'primary_call' || item.shift_type === 'primary') {
                                shiftTypeDisplay = 'Primary';
                            } else if (item.shift_type === 'backup_call' || item.shift_type === 'backup' || item.shift_type === 'secondary') {
                                shiftTypeDisplay = 'Backup';
                            }
                            
                            const coverageArea = item.coverage_area || 'General Coverage';
                            const backupPhysician = item.backup_physician?.full_name || (item.backup_physician_id ? getStaffName(item.backup_physician_id) : null);
                            const contactInfo = item.primary_physician?.professional_email || 'No contact info';
                            
                            let staffType = 'Physician';
                            const matchingStaff = medicalStaff.value.find(staff => 
                                staff.id === item.primary_physician_id
                            );
                            
                            if (matchingStaff) {
                                staffType = formatStaffType(matchingStaff.staff_type);
                            }
                            
                            return {
                                id: item.id,
                                startTime,
                                endTime,
                                physicianName,
                                staffType,
                                shiftType: shiftTypeDisplay,
                                shiftTypeClass: shiftTypeDisplay === 'Primary' ? 'badge-primary' : 'badge-secondary',
                                coverageArea,
                                backupPhysician,
                                contactInfo,
                                raw: item
                            };
                        });
                        
                    } catch (error) {
                        console.error('Failed to load today\'s on-call:', error);
                        showToast('Error', 'Failed to load today\'s on-call schedule', 'error');
                        todaysOnCall.value = [];
                    } finally {
                        loadingSchedule.value = false;
                    }
                };
                
                const loadAnnouncements = async () => {
                    try {
                        const data = await API.getAnnouncements();
                        announcements.value = data;
                    } catch (error) {
                        console.error('Failed to load announcements:', error);
                        showToast('Error', 'Failed to load announcements', 'error');
                    }
                };
                
                const loadSystemStats = async () => {
                    try {
                        const data = await API.getSystemStats();
                        if (data && data.success) {
                            Object.assign(systemStats.value, data.data);
                        }
                    } catch (error) {
                        console.error('Failed to load system stats:', error);
                    }
                };
                
                const updateDashboardStats = () => {
                    systemStats.value.totalStaff = medicalStaff.value.length;
                    
                    systemStats.value.activeAttending = medicalStaff.value.filter(s => 
                        s.staff_type === 'attending_physician' && s.employment_status === 'active'
                    ).length;
                    
                    systemStats.value.activeResidents = medicalStaff.value.filter(s => 
                        s.staff_type === 'medical_resident' && s.employment_status === 'active'
                    ).length;
                    
                    const today = new Date().toISOString().split('T')[0];
                    
                    systemStats.value.onLeaveStaff = absences.value.filter(absence => {
                        const startDate = absence.start_date;
                        const endDate = absence.end_date;
                        
                        if (!startDate || !endDate) return false;
                        
                        const isCurrentlyAbsent = startDate <= today && today <= endDate;
                        
                        if (!isCurrentlyAbsent) return false;
                        
                        if (absence.current_status) {
                            const activeStatuses = ['currently_absent', 'active', 'on_leave', 'approved'];
                            return activeStatuses.includes(absence.current_status.toLowerCase());
                        }
                        
                        return true;
                    }).length;
                    
                    systemStats.value.activeRotations = rotations.value.filter(r => 
                        r.rotation_status === 'active'
                    ).length;
                    
                    const todayDate = new Date();
                    const nextWeek = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    
                    systemStats.value.endingThisWeek = rotations.value.filter(r => {
                        if (r.rotation_status !== 'active') return false;
                        
                        const endDate = new Date(r.end_date);
                        if (isNaN(endDate.getTime())) return false;
                        
                        return endDate >= todayDate && endDate <= nextWeek;
                    }).length;
                    
                    const nextWeekStart = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const twoWeeks = new Date(todayDate.getTime() + 14 * 24 * 60 * 60 * 1000);
                    
                    systemStats.value.startingNextWeek = rotations.value.filter(r => {
                        if (r.rotation_status !== 'scheduled') return false;
                        
                        const startDate = new Date(r.start_date);
                        if (isNaN(startDate.getTime())) return false;
                        
                        return startDate >= nextWeekStart && startDate <= twoWeeks;
                    }).length;
                    
                    const todayStr = todayDate.toISOString().split('T')[0];
                    const onCallToday = onCallSchedule.value.filter(schedule => 
                        schedule.duty_date === todayStr
                    );
                    
                    const uniquePhysiciansToday = new Set();
                    onCallToday.forEach(schedule => {
                        if (schedule.primary_physician_id) {
                            uniquePhysiciansToday.add(schedule.primary_physician_id);
                        }
                        if (schedule.backup_physician_id) {
                            uniquePhysiciansToday.add(schedule.backup_physician_id);
                        }
                    });
                    
                    systemStats.value.onCallNow = uniquePhysiciansToday.size;
                };
                
                const loadAllData = async () => {
                    loading.value = true;
                    try {
                        await Promise.all([
                            loadMedicalStaff(),
                            loadDepartments(),
                            loadTrainingUnits(),
                            loadRotations(),
                            loadAbsences(),
                            loadOnCallSchedule(),
                            loadTodaysOnCall(),
                            loadAnnouncements(),
                            loadClinicalStatus(),
                            loadSystemStats()
                        ]);
                        
                        await loadActiveMedicalStaff();
                        updateDashboardStats();
                        showToast('Success', 'System data loaded successfully', 'success');
                    } catch (error) {
                        console.error('Failed to load data:', error);
                        showToast('Error', 'Failed to load some data', 'error');
                    } finally {
                        loading.value = false;
                    }
                };
                
                // ============ 15. AUTHENTICATION FUNCTIONS ============
                
                const handleLogin = async () => {
                    if (!loginForm.email || !loginForm.password) {
                        showToast('Error', 'Email and password are required', 'error');
                        return;
                    }
                    
                    loginLoading.value = true;
                    try {
                        const response = await API.login(loginForm.email, loginForm.password);
                        
                        currentUser.value = response.user;
                        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.user));
                        
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
                                showToast('Info', 'Logged out successfully', 'info');
                            }
                        }
                    });
                };
                
                // ============ 16. NAVIGATION & UI FUNCTIONS ============
                
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
                    const index = systemAlerts.value.findIndex(alert => alert.id === id);
                    if (index > -1) systemAlerts.value.splice(index, 1);
                };
                
                // ============ 17. MODAL SHOW FUNCTIONS ============
                
                const showAddMedicalStaffModal = () => {
                    medicalStaffModal.mode = 'add';
                    medicalStaffModal.activeTab = 'basic';
                    medicalStaffModal.form = {
                        full_name: '',
                        staff_type: 'medical_resident',
                        staff_id: `MD-${Date.now().toString().slice(-6)}`,
                        employment_status: 'active',
                        professional_email: '',
                        department_id: '',
                        academic_degree: '',
                        specialization: '',
                        training_year: '',
                        clinical_certificate: '',
                        certificate_status: 'current'
                    };
                    medicalStaffModal.show = true;
                };
                
                const showAddDepartmentModal = () => {
                    departmentModal.mode = 'add';
                    departmentModal.form = {
                        name: '',
                        code: '',
                        status: 'active',
                        head_of_department_id: ''
                    };
                    departmentModal.show = true;
                };
                
                const showAddTrainingUnitModal = () => {
                    trainingUnitModal.mode = 'add';
                    trainingUnitModal.form = {
                        unit_name: '',
                        unit_code: '',
                        department_id: '',
                        maximum_residents: 10,
                        unit_status: 'active',
                        specialty: '',
                        supervising_attending_id: ''
                    };
                    trainingUnitModal.show = true;
                };
                
                const showAddRotationModal = () => {
                    rotationModal.mode = 'add';
                    rotationModal.form = {
                        rotation_id: `ROT-${Date.now().toString().slice(-6)}`,
                        resident_id: '',
                        training_unit_id: '',
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
                        start_time: '08:00',
                        end_time: '17:00',
                        primary_physician_id: '',
                        backup_physician_id: '',
                        coverage_area: 'emergency',
                        schedule_id: `SCH-${Date.now().toString().slice(-6)}`
                    };
                    onCallModal.show = true;
                };
                
                const showAddAbsenceModal = () => {
                    absenceModal.mode = 'add';
                    absenceModal.form = {
                        staff_member_id: '',
                        absence_type: 'planned',
                        absence_reason: 'vacation',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        current_status: 'pending',
                        covering_staff_id: '',
                        coverage_notes: '',
                        coverage_arranged: false,
                        hod_notes: ''
                    };
                    absenceModal.show = true;
                };
                
                const showCommunicationsModal = () => {
                    communicationsModal.show = true;
                    communicationsModal.activeTab = 'announcement';
                    communicationsModal.form = {
                        title: '',
                        content: '',
                        priority: 'normal',
                        target_audience: 'all_staff',
                        updateType: 'daily',
                        dailySummary: '',
                        highlight1: '',
                        highlight2: '',
                        alerts: {
                            erBusy: false,
                            icuFull: false,
                            wardFull: false,
                            staffShortage: false
                        },
                        metricName: '',
                        metricValue: '',
                        metricTrend: 'stable',
                        metricChange: '',
                        metricNote: '',
                        alertLevel: 'low',
                        alertMessage: '',
                        affectedAreas: {
                            er: false,
                            icu: false,
                            ward: false,
                            surgery: false
                        }
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
                
                // ============ 18. VIEW/EDIT FUNCTIONS ============
                
                const viewStaffDetails = (staff) => {
                    staffProfileModal.staff = staff;
                    staffProfileModal.activeTab = 'assignments';  // Default to assignments tab
                    staffProfileModal.show = true;
                };
                
                const editMedicalStaff = (staff) => {
                    medicalStaffModal.mode = 'edit';
                    medicalStaffModal.form = { ...staff };
                    medicalStaffModal.show = true;
                };
                
                const editDepartment = (department) => {
                    departmentModal.mode = 'edit';
                    departmentModal.form = { ...department };
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
                
                // ============ 19. SAVE FUNCTIONS ============
                
                const saveMedicalStaff = async () => {
                    saving.value = true;
                    
                    if (!medicalStaffModal.form.full_name || !medicalStaffModal.form.full_name.trim()) {
                        showToast('Error', 'Full name is required', 'error');
                        saving.value = false;
                        return;
                    }
                    
                    try {
                        const cleanStringField = (value) => {
                            if (value === null || value === undefined) return '';
                            if (typeof value === 'string') return value.trim();
                            return String(value);
                        };
                        
                        const staffData = {
                            full_name: medicalStaffModal.form.full_name.trim(),
                            staff_type: medicalStaffModal.form.staff_type || 'medical_resident',
                            staff_id: medicalStaffModal.form.staff_id || EnhancedUtils.generateId('MD'),
                            employment_status: medicalStaffModal.form.employment_status || 'active',
                            professional_email: medicalStaffModal.form.professional_email || '',
                            department_id: medicalStaffModal.form.department_id || null,
                            academic_degree: cleanStringField(medicalStaffModal.form.academic_degree),
                            specialization: cleanStringField(medicalStaffModal.form.specialization),
                            training_year: cleanStringField(medicalStaffModal.form.training_year),
                            clinical_certificate: cleanStringField(medicalStaffModal.form.clinical_certificate),
                            certificate_status: cleanStringField(medicalStaffModal.form.certificate_status)
                        };
                        
                        if (staffData.professional_email && !isValidEmail(staffData.professional_email)) {
                            showToast('Error', 'Please enter a valid email address', 'error');
                            saving.value = false;
                            return;
                        }
                        
                        if (medicalStaffModal.mode === 'add') {
                            const result = await API.createMedicalStaff(staffData);
                            medicalStaff.value.unshift(result);
                            showToast('Success', 'Medical staff added successfully', 'success');
                        } else {
                            const result = await API.updateMedicalStaff(medicalStaffModal.form.id, staffData);
                            const index = medicalStaff.value.findIndex(s => s.id === result.id);
                            if (index !== -1) medicalStaff.value[index] = result;
                            showToast('Success', 'Medical staff updated successfully', 'success');
                        }
                        
                        medicalStaffModal.show = false;
                        updateDashboardStats();
                        
                    } catch (error) {
                        console.error('❌ Save medical staff error:', error);
                        showToast('Error', error.message || 'Failed to save medical staff', 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const isValidEmail = (email) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    return emailRegex.test(email);
                };
                
                const saveDepartment = async () => {
                    saving.value = true;
                    try {
                        if (departmentModal.mode === 'add') {
                            const result = await API.createDepartment(departmentModal.form);
                            departments.value.unshift(result);
                            showToast('Success', 'Department created successfully', 'success');
                        } else {
                            const result = await API.updateDepartment(departmentModal.form.id, departmentModal.form);
                            const index = departments.value.findIndex(d => d.id === result.id);
                            if (index !== -1) departments.value[index] = result;
                            showToast('Success', 'Department updated successfully', 'success');
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
                            unit_name: trainingUnitModal.form.unit_name,
                            unit_code: trainingUnitModal.form.unit_code,
                            department_id: trainingUnitModal.form.department_id,
                            supervisor_id: trainingUnitModal.form.supervising_attending_id || null,
                            maximum_residents: trainingUnitModal.form.maximum_residents,
                            unit_status: trainingUnitModal.form.unit_status,
                            description: trainingUnitModal.form.specialty || ''
                        };
                        
                        if (trainingUnitModal.mode === 'add') {
                            const result = await API.createTrainingUnit(unitData);
                            trainingUnits.value.unshift(result);
                            showToast('Success', 'Training unit created successfully', 'success');
                        } else {
                            const result = await API.updateTrainingUnit(trainingUnitModal.form.id, unitData);
                            const index = trainingUnits.value.findIndex(u => u.id === result.id);
                            if (index !== -1) trainingUnits.value[index] = result;
                            showToast('Success', 'Training unit updated successfully', 'success');
                        }
                        
                        trainingUnitModal.show = false;
                        updateDashboardStats();
                        
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveRotation = async () => {
                    if (!rotationModal.form.resident_id) {
                        showToast('Error', 'Please select a resident', 'error');
                        return;
                    }
                    
                    if (!rotationModal.form.training_unit_id) {
                        showToast('Error', 'Please select a training unit', 'error');
                        return;
                    }
                    
                    const startDateStr = rotationModal.form.start_date;
                    const endDateStr = rotationModal.form.end_date;
                    
                    if (!startDateStr || !endDateStr) {
                        showToast('Error', 'Please enter both start and end dates', 'error');
                        return;
                    }
                    
                    let startDate, endDate;
                    try {
                        startDate = new Date(startDateStr);
                        endDate = new Date(endDateStr);
                        
                        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                            throw new Error('Invalid date format');
                        }
                        
                        rotationModal.form.start_date = startDate.toISOString().split('T')[0];
                        rotationModal.form.end_date = endDate.toISOString().split('T')[0];
                        
                    } catch (error) {
                        showToast('Error', 'Invalid date format. Please use YYYY-MM-DD format.', 'error');
                        return;
                    }
                    
                    if (endDate <= startDate) {
                        showToast('Error', 'End date must be after start date', 'error');
                        return;
                    }
                    
                    saving.value = true;
                    
                    try {
                        const rotationData = {
                            rotation_id: rotationModal.form.rotation_id || EnhancedUtils.generateId('ROT'),
                            resident_id: rotationModal.form.resident_id,
                            training_unit_id: rotationModal.form.training_unit_id,
                            supervising_attending_id: rotationModal.form.supervising_attending_id || null,
                            start_date: rotationModal.form.start_date,
                            end_date: rotationModal.form.end_date,
                            rotation_category: (rotationModal.form.rotation_category || 'clinical_rotation').toLowerCase(),
                            rotation_status: (rotationModal.form.rotation_status || 'scheduled').toLowerCase()
                        };
                        
                        let result;
                        if (rotationModal.mode === 'add') {
                            result = await API.createRotation(rotationData);
                            rotations.value.unshift(result);
                            showToast('Success', 'Rotation scheduled successfully', 'success');
                        } else {
                            result = await API.updateRotation(rotationModal.form.id, rotationData);
                            const index = rotations.value.findIndex(r => r.id === result.id);
                            if (index !== -1) rotations.value[index] = result;
                            showToast('Success', 'Rotation updated successfully', 'success');
                        }
                        
                        rotationModal.show = false;
                        await loadRotations();
                        updateDashboardStats();
                        
                    } catch (error) {
                        console.error('❌ Rotation save error:', error);
                        
                        let userMessage = error.message || 'Failed to save rotation';
                        
                        if (error.message.includes('overlapping rotations')) {
                            userMessage = 'This rotation conflicts with an existing rotation. Please adjust dates.';
                        } else if (error.message.includes('Resident cannot have overlapping rotations')) {
                            userMessage = 'Dates conflict with existing rotation';
                        }
                        
                        showToast('Error', userMessage, 'error');
                        
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveOnCallSchedule = async () => {
                    if (!onCallModal.form.primary_physician_id || !onCallModal.form.duty_date) {
                        showToast('Error', 'Please fill all required fields', 'error');
                        return;
                    }
                    
                    saving.value = true;
                    
                    try {
                        const onCallData = {
                            duty_date: onCallModal.form.duty_date,
                            shift_type: onCallModal.form.shift_type || 'primary_call',
                            start_time: onCallModal.form.start_time || '08:00',
                            end_time: onCallModal.form.end_time || '17:00',
                            primary_physician_id: onCallModal.form.primary_physician_id,
                            backup_physician_id: onCallModal.form.backup_physician_id || null,
                            coverage_area: onCallModal.form.coverage_area || 'emergency',
                            schedule_id: onCallModal.form.schedule_id || EnhancedUtils.generateId('SCH')
                        };
                        
                        if (onCallModal.mode === 'add') {
                            const result = await API.createOnCall(onCallData);
                            onCallSchedule.value.unshift(result);
                            showToast('Success', 'On-call scheduled successfully', 'success');
                        } else {
                            const result = await API.updateOnCall(onCallModal.form.id, onCallData);
                            const index = onCallSchedule.value.findIndex(s => s.id === result.id);
                            if (index !== -1) onCallSchedule.value[index] = result;
                            showToast('Success', 'On-call updated successfully', 'success');
                        }
                        
                        onCallModal.show = false;
                        loadTodaysOnCall();
                        
                    } catch (error) {
                        console.error('❌ Save on-call error:', error);
                        showToast('Error', error.message || 'Failed to save on-call schedule', 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveAbsence = async () => {
                    if (!absenceModal.form.staff_member_id || !absenceModal.form.start_date || !absenceModal.form.end_date) {
                        showToast('Error', 'Please fill all required fields', 'error');
                        return;
                    }
                    
                    saving.value = true;
                    
                    try {
                        const absenceData = {
                            staff_member_id: absenceModal.form.staff_member_id,
                            absence_type: absenceModal.form.absence_type || 'planned',
                            absence_reason: absenceModal.form.absence_reason,
                            start_date: absenceModal.form.start_date,
                            end_date: absenceModal.form.end_date,
                            current_status: absenceModal.form.current_status || 'pending',
                            covering_staff_id: absenceModal.form.covering_staff_id || null,
                            coverage_notes: absenceModal.form.coverage_notes || '',
                            coverage_arranged: absenceModal.form.coverage_arranged || false,
                            hod_notes: absenceModal.form.hod_notes || '',
                            recorded_by: currentUser.value?.id || null
                        };
                        
                        if (absenceModal.mode === 'add') {
                            const result = await API.createAbsence(absenceData);
                            absences.value.unshift(result);
                            showToast('Success', 'Absence recorded successfully', 'success');
                        } else {
                            const result = await API.updateAbsence(absenceModal.form.id, absenceData);
                            const index = absences.value.findIndex(a => a.id === result.id);
                            if (index !== -1) absences.value[index] = result;
                            showToast('Success', 'Absence updated successfully', 'success');
                        }
                        
                        absenceModal.show = false;
                        await loadAbsences();
                        updateDashboardStats();
                        
                    } catch (error) {
                        console.error('❌ Save absence error:', error);
                        showToast('Error', error.message || 'Failed to save absence record', 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                const saveCommunication = async () => {
                    saving.value = true;
                    try {
                        if (communicationsModal.activeTab === 'announcement') {
                            const result = await API.createAnnouncement({
                                title: communicationsModal.form.title,
                                content: communicationsModal.form.content,
                                priority_level: communicationsModal.form.priority,
                                target_audience: communicationsModal.form.target_audience,
                                type: 'announcement'
                            });
                            
                            announcements.value.unshift(result);
                            showToast('Success', 'Announcement posted successfully', 'success');
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
                        currentUser.value.full_name = userProfileModal.form.full_name;
                        currentUser.value.department_id = userProfileModal.form.department_id;
                        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(currentUser.value));
                        
                        userProfileModal.show = false;
                        showToast('Success', 'Profile updated successfully', 'success');
                    } catch (error) {
                        showToast('Error', error.message, 'error');
                    } finally {
                        saving.value = false;
                    }
                };
                
                // ============ 20. ACTION FUNCTIONS ============
                
                const contactPhysician = (shift) => {
                    if (shift.contactInfo && shift.contactInfo !== 'No contact info') {
                        showToast('Contact Physician', 
                            `Would contact ${shift.physicianName} via ${shift.contactInfo.includes('@') ? 'email' : 'phone'}`, 
                            'info');
                    } else {
                        showToast('No Contact Info', 
                            `No contact information available for ${shift.physicianName}`, 
                            'warning');
                    }
                };
                
                const viewAnnouncement = (announcement) => {
                    showToast(announcement.title, EnhancedUtils.truncateText(announcement.content, 100), 'info');
                };
                
                const viewDepartmentStaff = (department) => {
                    showToast('Department Staff', `Viewing staff for ${department.name}`, 'info');
                };
                
                // ============ 21. PERMISSION FUNCTIONS ============
                
                const hasPermission = (module, action = 'read') => {
                    const role = currentUser.value?.user_role;
                    if (!role) return false;
                    
                    if (role === 'system_admin') return true;
                    
                    const permissions = PERMISSION_MATRIX[role]?.[module];
                    if (!permissions) return false;
                    
                    return permissions.includes(action) || permissions.includes('*');
                };
                
                // ============ 22. COMPUTED PROPERTIES ============
                
                const authToken = computed(() => {
                    return localStorage.getItem(CONFIG.TOKEN_KEY);
                });
                
                const unreadAnnouncements = computed(() => {
                    return announcements.value.filter(a => !a.read).length;
                });
                
                const unreadLiveUpdates = computed(() => {
                    if (!clinicalStatus.value) return 0;
                    const lastSeen = localStorage.getItem('lastSeenStatusId');
                    return lastSeen !== clinicalStatus.value.id ? 1 : 0;
                });
                
                const formattedExpiry = computed(() => {
                    if (!clinicalStatus.value || !clinicalStatus.value.expires_at) return '';
                    const expires = new Date(clinicalStatus.value.expires_at);
                    const now = new Date();
                    const diffHours = Math.ceil((expires - now) / (1000 * 60 * 60));
                    
                    if (diffHours <= 1) return 'Expires soon';
                    if (diffHours <= 4) return `Expires in ${diffHours}h`;
                    return `Expires ${EnhancedUtils.formatTime(clinicalStatus.value.expires_at)}`;
                });
                
                const availablePhysicians = computed(() => {
                    return medicalStaff.value.filter(staff => 
                        (staff.staff_type === 'attending_physician' || 
                         staff.staff_type === 'fellow' || 
                         staff.staff_type === 'nurse_practitioner') && 
                        staff.employment_status === 'active'
                    );
                });
                
                const availableResidents = computed(() => {
                    return medicalStaff.value.filter(staff => 
                        staff.staff_type === 'medical_resident' && 
                        staff.employment_status === 'active'
                    );
                });
                
                const availableAttendings = computed(() => {
                    return medicalStaff.value.filter(staff => 
                        staff.staff_type === 'attending_physician' && 
                        staff.employment_status === 'active'
                    );
                });
                
                const availableHeadsOfDepartment = computed(() => {
                    return availableAttendings.value;
                });
                
                const availableReplacementStaff = computed(() => {
                    return medicalStaff.value.filter(staff => 
                        staff.employment_status === 'active' && 
                        staff.staff_type === 'medical_resident'
                    );
                });
                
                const filteredMedicalStaff = computed(() => {
                    let filtered = medicalStaff.value;
                    
                    if (staffFilters.search) {
                        const search = staffFilters.search.toLowerCase();
                        filtered = filtered.filter(staff =>
                            staff.full_name?.toLowerCase().includes(search) ||
                            staff.professional_email?.toLowerCase().includes(search)
                        );
                    }
                    
                    if (staffFilters.staffType) {
                        filtered = filtered.filter(staff => staff.staff_type === staffFilters.staffType);
                    }
                    
                    if (staffFilters.department) {
                        filtered = filtered.filter(staff => staff.department_id === staffFilters.department);
                    }
                    
                    if (staffFilters.status) {
                        filtered = filtered.filter(staff => staff.employment_status === staffFilters.status);
                    }
                    
                    return filtered;
                });
                
                const filteredOnCallSchedules = computed(() => {
                    let filtered = onCallSchedule.value;
                    
                    if (onCallFilters.date) {
                        filtered = filtered.filter(schedule => schedule.duty_date === onCallFilters.date);
                    }
                    
                    if (onCallFilters.shiftType) {
                        filtered = filtered.filter(schedule => schedule.shift_type === onCallFilters.shiftType);
                    }
                    
                    if (onCallFilters.physician) {
                        filtered = filtered.filter(schedule =>
                            schedule.primary_physician_id === onCallFilters.physician ||
                            schedule.backup_physician_id === onCallFilters.physician
                        );
                    }
                    
                    if (onCallFilters.coverageArea) {
                        filtered = filtered.filter(schedule => schedule.coverage_area === onCallFilters.coverageArea);
                    }
                    
                    return filtered;
                });
                
                const filteredRotations = computed(() => {
                    let filtered = rotations.value;
                    
                    if (rotationFilters.resident) {
                        filtered = filtered.filter(rotation => rotation.resident_id === rotationFilters.resident);
                    }
                    
                    if (rotationFilters.status) {
                        filtered = filtered.filter(rotation => rotation.rotation_status === rotationFilters.status);
                    }
                    
                    if (rotationFilters.trainingUnit) {
                        filtered = filtered.filter(rotation => rotation.training_unit_id === rotationFilters.trainingUnit);
                    }
                    
                    if (rotationFilters.supervisor) {
                        filtered = filtered.filter(rotation => rotation.supervising_attending_id === rotationFilters.supervisor);
                    }
                    
                    return filtered;
                });
                
                const filteredAbsences = computed(() => {
                    let filtered = absences.value;
                    
                    if (absenceFilters.staff) {
                        filtered = filtered.filter(absence => 
                            absence.staff_member_id === absenceFilters.staff
                        );
                    }
                    
                    if (absenceFilters.status) {
                        filtered = filtered.filter(absence => {
                            const status = absence.current_status || absence.status || absence.absence_status;
                            return status === absenceFilters.status;
                        });
                    }
                    
                    if (absenceFilters.reason) {
                        filtered = filtered.filter(absence => 
                            absence.absence_reason === absenceFilters.reason
                        );
                    }
                    
                    if (absenceFilters.startDate) {
                        filtered = filtered.filter(absence => 
                            absence.start_date >= absenceFilters.startDate
                        );
                    }
                    
                    return filtered;
                });
                
                const recentAnnouncements = computed(() => {
                    return announcements.value.slice(0, 10);
                });
                
                const activeAlertsCount = computed(() => {
                    return systemAlerts.value.filter(alert => 
                        alert.status === 'active' || !alert.status
                    ).length;
                });
                
                const currentTime = ref(new Date());
                
                const currentTimeFormatted = computed(() => {
                    return EnhancedUtils.formatTime(currentTime.value);
                });
                
                // ============ 23. LIFECYCLE ============
                
                onMounted(() => {
                    console.log('🚀 Vue app mounted - v8.1 (Real Data Only)');
                    
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
                    
                    const statusRefreshInterval = setInterval(() => {
                        if (currentUser.value && !isLoadingStatus.value) {
                            loadClinicalStatus();
                        }
                    }, 60000);
                    
                    const timeInterval = setInterval(() => {
                        currentTime.value = new Date();
                    }, 60000);
                    
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                            const openModals = [
                                medicalStaffModal,
                                departmentModal,
                                trainingUnitModal,
                                rotationModal,
                                onCallModal,
                                absenceModal,
                                communicationsModal,
                                staffProfileModal,
                                userProfileModal,
                                unitResidentsModal,
                                confirmationModal
                            ];
                            
                            openModals.forEach(modal => {
                                if (modal.show) modal.show = false;
                            });
                        }
                    });
                    
                    onUnmounted(() => {
                        clearInterval(statusRefreshInterval);
                        clearInterval(timeInterval);
                        document.removeEventListener('keydown', () => {});
                    });
                });
                
                watch([medicalStaff, rotations, trainingUnits, absences], 
                    () => {
                        updateDashboardStats();
                    }, 
                    { deep: true }
                );
                
                // ============ 24. RETURN EXPOSED DATA/METHODS ============
                return {
                    // State
                    currentUser,
                    loginForm,
                    loginLoading,
                    loading,
                    saving,
                    loadingSchedule,
                    isLoadingStatus,
                    
                    currentView,
                    sidebarCollapsed,
                    mobileMenuOpen,
                    userMenuOpen,
                    statsSidebarOpen,
                    globalSearchQuery,
                    
                    // Data
                    medicalStaff,
                    departments,
                    trainingUnits,
                    rotations,
                    absences,
                    onCallSchedule,
                    announcements,
                    
                    // Live Status Data
                    clinicalStatus,
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
                    
                    // UI
                    toasts,
                    systemAlerts,
                    
                    // Filters
                    staffFilters,
                    onCallFilters,
                    rotationFilters,
                    absenceFilters,
                    
                    // Modals
                    staffProfileModal,
                    medicalStaffModal,
                    communicationsModal,
                    onCallModal,
                    rotationModal,
                    trainingUnitModal,
                    absenceModal,
                    departmentModal,
                    userProfileModal,
                    unitResidentsModal,
                    confirmationModal,
                    
                    // Core Functions
                    formatDate: EnhancedUtils.formatDate,
                    formatDateTime: EnhancedUtils.formatDateTime,
                    formatTime: EnhancedUtils.formatTime,
                    formatRelativeTime: EnhancedUtils.formatRelativeTime,
                    getInitials: EnhancedUtils.getInitials,
                    formatStaffType,
                    getStaffTypeClass,
                    formatEmploymentStatus,
                    formatAbsenceReason,
                    formatAbsenceStatus,
                    formatRotationStatus,
                    getUserRoleDisplay,
                    getCurrentViewTitle,
                    getCurrentViewSubtitle,
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
                    calculateAbsenceDuration,
                    
                    // Unit Resident Functions (NEW)
                    getUnitActiveRotationCount,
                    getDaysRemaining,
                    getDaysUntilStart,
                    viewUnitResidents,
                    
                    // Profile Functions (Real Data Only)
                    getCurrentUnit,
                    getCurrentWard,
                    getCurrentActivityStatus,
                    isOnCallToday,
                    getOnCallShiftTime,
                    getOnCallCoverage,
                    getRotationSupervisor,
                    getRotationDaysLeft,
                    
                    // Live Status Functions
                    loadClinicalStatus,
                    loadActiveMedicalStaff,
                    saveClinicalStatus,
                    isStatusExpired,
                    showCreateStatusModal,
                    calculateTimeRemaining,
                    refreshStatus,
                    
                    // Delete Functions
                    deleteMedicalStaff,
                    deleteRotation,
                    deleteOnCallSchedule,
                    deleteAbsence,
                    deleteAnnouncement,
                    deleteClinicalStatus,
                    
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
                    
                    // UI Functions
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
                    
                    // Action Functions
                    contactPhysician,
                    viewAnnouncement,
                    viewDepartmentStaff,
                    
                    // Save Functions
                    saveMedicalStaff,
                    saveDepartment,
                    saveTrainingUnit,
                    saveRotation,
                    saveOnCallSchedule,
                    saveAbsence,
                    saveCommunication,
                    saveUserProfile,
                    
                    // Permission Functions
                    hasPermission,
                    
                    // Computed Properties
                    authToken,
                    unreadAnnouncements,
                    unreadLiveUpdates,
                    formattedExpiry,
                    availablePhysicians,
                    availableResidents,
                    availableAttendings,
                    availableHeadsOfDepartment,
                    availableReplacementStaff,
                    filteredMedicalStaff,
                    filteredOnCallSchedules,
                    filteredRotations,
                    filteredAbsences,
                    recentAnnouncements,
                    activeAlertsCount,
                    currentTime,
                    currentTimeFormatted
                };
            }
        });
        
        app.mount('#app');
        
        console.log('✅ NeumoCare v8.1 mounted successfully - Real Data Only');
        
    } catch (error) {
        console.error('💥 FATAL ERROR mounting app:', error);
        
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; margin-top: 100px; color: #333; font-family: Arial, sans-serif;">
                <h2 style="color: #dc3545;">⚠️ Application Error</h2>
                <p style="margin: 20px 0; color: #666;">
                    The application failed to load properly. Please try refreshing the page.
                </p>
                <button onclick="window.location.reload()" 
                        style="padding: 12px 24px; background: #007bff; color: white; 
                               border: none; border-radius: 6px; cursor: pointer; margin-top: 20px;">
                    🔄 Refresh Page
                </button>
            </div>
        `;
        
        throw error;
    }
});
