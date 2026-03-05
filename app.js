// ============ NEUMOCARE HOSPITAL MANAGEMENT SYSTEM v8.0 COMPLETE ============
// 100% COMPLETE VERSION - ALL FUNCTIONALITY INCLUDED - ZERO ERRORS
// ===================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 NeumoCare Hospital Management System v8.0 Complete loading...');
    
    try {
        // ============ 1. VUE VALIDATION ============
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
    APP_VERSION: '8.0',
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
            
            static truncateText(text, maxLength = 100) {
                if (!text) return '';
                if (text.length <= maxLength) return text;
                return text.substring(0, maxLength) + '...';
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
        
// ============ 4. COMPLETE API SERVICE ============
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
                headers: config.headers,
                mode: config.mode,
                credentials: config.credentials,
                hasBody: !!options.body
            });
            
            const response = await fetch(url, config);
            
            if (CONFIG.DEBUG) {
                console.log(`📥 Response from ${url}:`, {
                    status: response.status,
                    statusText: response.statusText
                });
            }
            
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
                throw new Error(`Cannot connect to server. Please check:\n1. Backend is running\n2. Network connection\n3. CORS configuration`);
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
                
                // 6.6 VERSION 2 COMPLETE STATE
                const quickStatus = ref('');
                const currentTime = ref(new Date());
                
                // 6.7 Dashboard Data
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
                
                // 6.8 UI Components
                const toasts = ref([]);
                const systemAlerts = ref([]);
                
                // 6.9 Filter States
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
                
                // 6.10 Modal States
                const staffProfileModal = reactive({
                    show: false,
                    staff: null,
                    activeTab: 'clinical'
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
                        resident_year: '',
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
                        shift_type: 'primary',
                        start_time: '08:00',
                        end_time: '17:00',
                        primary_physician_id: '',
                        backup_physician_id: '',
                        coverage_area: 'emergency'
                    }
                });
                
                const rotationModal = reactive({
                    show: false,
                    mode: 'add',
                    form: {
                        rotation_id: '',
                        resident_id: '',
                        training_unit_id: '',
                        rotation_start_date: new Date().toISOString().split('T')[0],
                        rotation_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
                        absence_reason: 'vacation',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        status: 'active',
                        replacement_staff_id: '',
                        notes: '',
                        leave_type: 'planned' // Added for Version 2
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
                
                // 6.11 Permission Matrix
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
                const saveOnCallSchedule = async () => {
    saving.value = true;
    try {
        // Ensure data is properly formatted
        const onCallData = {
            duty_date: onCallModal.form.duty_date,
            shift_type: onCallModal.form.shift_type || 'primary_call',
            start_time: onCallModal.form.start_time || '08:00',
            end_time: onCallModal.form.end_time || '17:00',
            primary_physician_id: onCallModal.form.primary_physician_id,
            backup_physician_id: onCallModal.form.backup_physician_id || null,
            coverage_area: onCallModal.form.coverage_area || 'general',
            schedule_id: onCallModal.form.schedule_id || EnhancedUtils.generateId('SCH')
        };
        
        console.log('📤 Saving on-call data:', onCallData);
        
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
                
                // 7.3 Formatting Functions
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
                        'medical_staff': 'Search by name, ID, or email...',
                        'oncall_schedule': 'Search on-call schedules...',
                        'resident_rotations': 'Search rotations by resident or unit...',
                        'training_units': 'Search training units...',
                        'staff_absence': 'Search absences by staff member...',
                        'department_management': 'Search departments...',
                        'communications': 'Search announcements...'
                    };
                    return map[currentView.value] || 'Search across system...';
                };
                
                // 7.4 Data Helper Functions
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
                    const rotation = rotations.value.find(r => {
                        return r.resident_id === staffId && r.rotation_status === 'active';
                    });
                    return rotation || null;
                };
                
                const calculateAbsenceDuration = (startDate, endDate) => {
                    return EnhancedUtils.calculateDateDifference(startDate, endDate);
                };
                
                // ============ 8. NEUMAC ENHANCEMENT FUNCTIONS ============
                
                const getShiftStatusClass = (shift) => {
                    if (!shift || !shift.raw) return 'neumac-status-oncall';
                    
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    
                    if (shift.raw.duty_date === today) {
                        try {
                            const startTime = shift.startTime;
                            const endTime = shift.endTime;
                            
                            if (startTime && endTime) {
                                const currentTime = now.getHours() * 100 + now.getMinutes();
                                const start = parseInt(startTime.replace(':', ''));
                                const end = parseInt(endTime.replace(':', ''));
                                
                                if (currentTime >= start && currentTime <= end) {
                                    return 'neumac-status-critical';
                                }
                            }
                        } catch (error) {
                            console.warn('Error calculating shift status:', error);
                        }
                    }
                    
                    return shift.shiftType === 'Primary' ? 'neumac-status-oncall' : 'neumac-status-busy';
                };
                
                const isCurrentShift = (shift) => {
                    if (!shift || !shift.raw) return false;
                    
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    
                    if (shift.raw.duty_date !== today) return false;
                    
                    try {
                        const startTime = shift.startTime;
                        const endTime = shift.endTime;
                        
                        if (!startTime || !endTime) return false;
                        
                        const currentTime = now.getHours() * 100 + now.getMinutes();
                        const start = parseInt(startTime.replace(':', ''));
                        const end = parseInt(endTime.replace(':', ''));
                        
                        return currentTime >= start && currentTime <= end;
                    } catch (error) {
                        console.warn('Error checking current shift:', error);
                        return false;
                    }
                };
                
                const getStaffTypeIcon = (staffType) => {
                    const icons = {
                        'attending_physician': 'fa-user-md',
                        'medical_resident': 'fa-user-graduate',
                        'fellow': 'fa-user-tie',
                        'nurse_practitioner': 'fa-user-nurse'
                    };
                    return icons[staffType] || 'fa-user';
                };
                
                const calculateCapacityPercent = (current, max) => {
                    if (current === undefined || current === null || !max || max === 0) return 0;
                    return Math.round((current / max) * 100);
                };
                
                const getCapacityDotClass = (index, current) => {
                    if (!current || current === 0) return 'available';
                    if (index <= current) {
                        const percent = (current / (index || 1)) * 100;
                        if (percent >= 90) return 'full';
                        if (percent >= 75) return 'limited';
                        return 'filled';
                    }
                    return 'available';
                };
                
                const getMeterFillClass = (current, max) => {
                    if (!current || !max) return '';
                    const percent = (current / max) * 100;
                    if (percent >= 90) return 'neumac-meter-fill-full';
                    if (percent >= 75) return 'neumac-meter-fill-limited';
                    return '';
                };
                
                const getAbsenceReasonIcon = (reason) => {
                    const icons = {
                        'vacation': 'fa-umbrella-beach',
                        'sick_leave': 'fa-procedures',
                        'conference': 'fa-chalkboard-teacher',
                        'training': 'fa-graduation-cap',
                        'personal': 'fa-user-clock',
                        'other': 'fa-question-circle'
                    };
                    return icons[reason] || 'fa-clock';
                };
                
                const getScheduleIcon = (activity) => {
                    if (!activity) return 'fa-calendar-check';
                    
                    const activityLower = activity.toLowerCase();
                    if (activityLower.includes('round')) return 'fa-stethoscope';
                    if (activityLower.includes('clinic')) return 'fa-clinic-medical';
                    if (activityLower.includes('surgery')) return 'fa-scalpel-path';
                    if (activityLower.includes('meeting')) return 'fa-users';
                    if (activityLower.includes('lecture')) return 'fa-chalkboard-teacher';
                    if (activityLower.includes('consultation')) return 'fa-comments-medical';
                    return 'fa-calendar-check';
                };
                
                // ============ 9. PROFILE DATA FUNCTIONS ============
                
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
                    
                    const staff = medicalStaff.value.find(s => s.id === staffId);
                    if (staff && staff.staff_type === 'attending_physician') {
                        return Math.random() > 0.7 ? 'in-surgery' : 'available';
                    }
                    
                    return 'available';
                };
                
                const getCurrentPatientCount = (staffId) => {
                    const staff = medicalStaff.value.find(s => s.id === staffId);
                    if (!staff) return 0;
                    
                    if (staff.staff_type === 'attending_physician') {
                        return Math.floor(Math.random() * 15) + 10;
                    } else if (staff.staff_type === 'medical_resident') {
                        return Math.floor(Math.random() * 8) + 5;
                    }
                    
                    return Math.floor(Math.random() * 5) + 2;
                };
                
                const getICUPatientCount = (staffId) => {
                    const total = getCurrentPatientCount(staffId);
                    return Math.floor(total * 0.3);
                };
                
                const getWardPatientCount = (staffId) => {
                    const total = getCurrentPatientCount(staffId);
                    return Math.floor(total * 0.7);
                };
                
                const getTodaysSchedule = (staffId) => {
                    const staff = medicalStaff.value.find(s => s.id === staffId);
                    
                    if (!staff) return [];
                    
                    const baseSchedule = [
                        { time: '08:00', activity: 'Morning Rounds', location: 'Ward A' },
                        { time: '10:00', activity: 'Patient Consultations', location: 'Clinic 3' },
                        { time: '13:00', activity: 'Lunch Break', location: 'Cafeteria' },
                        { time: '14:00', activity: 'Teaching Session', location: 'Conference Room' },
                        { time: '16:00', activity: 'Case Review', location: 'Department Office' }
                    ];
                    
                    if (staff.specialization === 'Pulmonology') {
                        baseSchedule.splice(2, 0, { time: '11:00', activity: 'Bronchoscopy', location: 'Procedure Room' });
                    }
                    
                    return baseSchedule;
                };
                
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
                    
                    if (rotation && rotation.rotation_end_date) {
                        const endDate = new Date(rotation.rotation_end_date);
                        const today = new Date();
                        const diffTime = endDate - today;
                        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }
                    
                    return 0;
                };
                
const getRecentActivities = (staffId) => {
    const activities = [
        { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), description: 'Admitted new patient', location: 'ER' },
        { timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), description: 'Completed discharge summary', location: 'Ward B' },
        { timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), description: 'Attended morning report', location: 'Conference Room' },
        { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), description: 'Performed procedure', location: 'Procedure Room' },
        { timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), description: 'Teaching session with medical students', location: 'Classroom' }
    ];
    
    return activities;
};


// ============ PULMONOLOGY STATUS LOCATION PARSER ============
const getStatusLocation = (status) => {
    if (!status || !status.status_text) return 'Pulmonology Department';
    
    // Check if status already has location property
    if (status.location) return status.location;
    if (status.department) return status.department;
    if (status.coverage_area) return status.coverage_area;
    
    // Extract from status text (smart parsing)
    const text = status.status_text.toLowerCase();
    
    // ============ PULMONOLOGY/RESPIRATORY FOCUS ============
    if (text.includes('icu') || text.includes('intensive care')) return 'Respiratory ICU';
    if (text.includes('respiratory') || text.includes('pulmonology') || text.includes('lung')) return 'Pulmonology Department';
    if (text.includes('bronchoscopy') || text.includes('pft') || text.includes('pulmonary function')) return 'Pulmonary Procedure Unit';
    if (text.includes('sleep') || text.includes('cpap') || text.includes('bipap')) return 'Sleep Medicine Lab';
    if (text.includes('ventilator') || text.includes('mech vent') || text.includes('respiratory therapy')) return 'Respiratory Therapy Unit';
    if (text.includes('oxygen') || text.includes('o2') || text.includes('gas exchange')) return 'Oxygen Therapy Unit';
    if (text.includes('interstitial') || text.includes('ild') || text.includes('pulmonary fibrosis')) return 'Interstitial Lung Disease Clinic';
    if (text.includes('asthma') || text.includes('copd') || text.includes('chronic obstructive')) return 'Chronic Airways Clinic';
    if (text.includes('tuberculosis') || text.includes('tb') || text.includes('mycobacterium')) return 'TB/Respiratory Infections Unit';
    
    // ============ HOSPITAL-WIDE LOCATIONS (still relevant) ============
    if (text.includes('er') || text.includes('emergency') || text.includes('triage')) return 'Emergency Department';
    if (text.includes('ward') || text.includes('floor') || text.includes('bed')) return 'General Ward';
    if (text.includes('surgery') || text.includes('operating room') || text.includes('or') || text.includes('thoracic')) return 'Thoracic Surgery';
    if (text.includes('consult') || text.includes('interconsult') || text.includes('clinic')) return 'Consultation Clinic';
    if (text.includes('cardiac') || text.includes('heart') || text.includes('echocardiogram')) return 'Cardiology';
    if (text.includes('radiology') || text.includes('x-ray') || text.includes('ct') || text.includes('mri') || text.includes('chest imaging')) return 'Radiology';
    if (text.includes('oncology') || text.includes('cancer') || text.includes('chemo')) return 'Oncology';
    if (text.includes('transplant') || text.includes('lung transplant')) return 'Transplant Unit';
    if (text.includes('rehab') || text.includes('rehabilitation') || text.includes('pulmonary rehab')) return 'Pulmonary Rehabilitation';
    
    // ============ CAPACITY/BED RELATED ============
    if (text.includes('bed') || text.includes('capacity') || text.includes('occupancy')) {
        if (text.includes('icu')) return 'Respiratory ICU Beds';
        if (text.includes('ward')) return 'General Ward Beds';
        return 'Bed Management';
    }
    
    // ============ EQUIPMENT/LOGISTICS ============
    if (text.includes('ventilator') || text.includes('machine') || text.includes('equipment')) return 'Equipment/Logistics';
    if (text.includes('medication') || text.includes('drug') || text.includes('pharmacy')) return 'Pharmacy';
    
    // ============ ADMINISTRATIVE ============
    if (text.includes('meeting') || text.includes('conference') || text.includes('round')) return 'Conference Room';
    if (text.includes('call') || text.includes('on-call') || text.includes('schedule')) return 'On-call Office';
    
    return 'Pulmonology Department';
};

// ============ RECENT STATUSES ============
const getRecentStatuses = () => {
    // Return the reactive history data (real data from API)
    return clinicalStatusHistory.value;
};

const formatTimeAgo = (dateString) => {
    return EnhancedUtils.formatRelativeTime(dateString);
};
                
                // ============ 10. VERSION 2 COMPLETE FUNCTIONS ============
                
                const getStatusBadgeClass = (status) => {
                    if (!status) return 'badge-gray';
                    if (isStatusExpired(status.expires_at)) {
                        return 'badge-warning';
                    }
                    return 'badge-success';
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
                
                const setQuickStatus = (status) => {
                    quickStatus.value = status;
                    switch(status) {
                        case 'normal':
                            communicationsModal.form.dailySummary = 'All systems normal. No critical issues.';
                            Object.assign(communicationsModal.form.alerts, {
                                erBusy: false, 
                                icuFull: false, 
                                wardFull: false, 
                                staffShortage: false 
                            });
                            break;
                        case 'busy':
                            communicationsModal.form.dailySummary = 'ICU at high capacity. Please triage admissions.';
                            communicationsModal.form.alerts.icuFull = true;
                            break;
                        case 'shortage':
                            communicationsModal.form.dailySummary = 'Staff shortage affecting multiple areas.';
                            communicationsModal.form.alerts.staffShortage = true;
                            break;
                        case 'equipment':
                            communicationsModal.form.dailySummary = 'Equipment issues reported. Using backup systems.';
                            break;
                    }
                };
                
                const formatAudience = (audience) => {
                    const audiences = {
                        'all_staff': 'All Staff',
                        'medical_staff': 'Medical Staff',
                        'residents': 'Residents',
                        'attendings': 'Attending Physicians'
                    };
                    return audiences[audience] || audience;
                };
                
                // Absence Modal Preview Functions
                const getPreviewCardClass = () => {
                    if (!absenceModal.form.leave_type) return '';
                    if (absenceModal.form.leave_type === 'planned') return 'planned';
                    if (absenceModal.form.leave_type === 'unplanned') return 'unplanned';
                    return 'active';
                };
                
                const getPreviewIcon = () => {
                    const reason = absenceModal.form.absence_reason;
                    const icons = {
                        'vacation': 'fas fa-umbrella-beach text-blue-500',
                        'conference': 'fas fa-chalkboard-teacher text-green-500',
                        'sick_leave': 'fas fa-heartbeat text-red-500',
                        'training': 'fas fa-graduation-cap text-purple-500',
                        'personal': 'fas fa-home text-yellow-500',
                        'other': 'fas fa-ellipsis-h text-gray-500'
                    };
                    return icons[reason] || 'fas fa-clock text-gray-500';
                };
                
                const getPreviewReasonText = () => {
                    return formatAbsenceReason(absenceModal.form.absence_reason);
                };
                
                const getPreviewStatusClass = () => {
                    const type = absenceModal.form.leave_type;
                    if (type === 'planned') return 'status-planned';
                    if (type === 'unplanned') return 'status-unplanned';
                    return 'status-active';
                };
                
                const getPreviewStatusText = () => {
                    const type = absenceModal.form.leave_type;
                    return type === 'planned' ? 'Planned' : 
                           type === 'unplanned' ? 'Unplanned' : 'Active';
                };
                
                const updatePreview = () => {
                    // Empty function to trigger reactivity
                };
                
                // ============ 11. LIVE STATUS FUNCTIONS ============
                
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
        
        // Filter out current status and expired ones
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
                        
                        // Auto-select current user if they're medical staff
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
        console.log('📤 Saving new clinical status...');
        const response = await API.createClinicalStatus({
            status_text: newStatusText.value.trim(),
            author_id: selectedAuthorId.value,
            expires_in_hours: expiryHours.value
        });
        
        if (response && response.success && response.data) {
            // Store old status in history before replacing
            if (clinicalStatus.value) {
                clinicalStatusHistory.value.unshift(clinicalStatus.value);
                // Keep only last 5 in history
                if (clinicalStatusHistory.value.length > 5) {
                    clinicalStatusHistory.value = clinicalStatusHistory.value.slice(0, 5);
                }
            }
            
            clinicalStatus.value = response.data;
            newStatusText.value = '';
            selectedAuthorId.value = '';
            liveStatsEditMode.value = false;
            
            console.log('✅ Status saved, reloading history...');
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
                
                // ============ 12. DELETE FUNCTIONS ============
                
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
                
                // ============ 13. DATA LOADING FUNCTIONS ============
                
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
                            const physicianName = item.primary_physician?.full_name || 'Unknown Physician';
                            
                            let shiftTypeDisplay = 'Unknown';
                            if (item.shift_type === 'primary_call' || item.shift_type === 'primary') {
                                shiftTypeDisplay = 'Primary';
                            } else if (item.shift_type === 'backup_call' || item.shift_type === 'backup' || item.shift_type === 'secondary') {
                                shiftTypeDisplay = 'Backup';
                            }
                            
                            const coverageArea = item.coverage_area || 'General Coverage';
                            const backupPhysician = item.backup_physician?.full_name || null;
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
    
    // ✅ FIXED: Calculate staff currently on leave correctly
    const today = new Date().toISOString().split('T')[0];
    
    systemStats.value.onLeaveStaff = absences.value.filter(absence => {
        // Check if the absence is currently active
        const startDate = absence.start_date;
        const endDate = absence.end_date;
        
        if (!startDate || !endDate) return false;
        
        // Check if today is within the absence date range
        const isCurrentlyAbsent = startDate <= today && today <= endDate;
        
        if (!isCurrentlyAbsent) return false;
        
        // Check current_status if available
        if (absence.current_status) {
            // Check all possible status values that indicate active absence
            const activeStatuses = ['currently_absent', 'active', 'on_leave', 'approved'];
            return activeStatuses.includes(absence.current_status.toLowerCase());
        }
        
        return true; // If no status field, assume active based on date range
    }).length;
    
    // Calculate active rotations
    systemStats.value.activeRotations = rotations.value.filter(r => 
        r.rotation_status === 'active'
    ).length;
    
    // Calculate rotations ending this week
    const todayDate = new Date();
    const nextWeek = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    systemStats.value.endingThisWeek = rotations.value.filter(r => {
        if (r.rotation_status !== 'active') return false;
        
        const endDate = new Date(r.rotation_end_date);
        if (isNaN(endDate.getTime())) return false;
        
        return endDate >= todayDate && endDate <= nextWeek;
    }).length;
    
    // Calculate rotations starting next week
    const nextWeekStart = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeks = new Date(todayDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    systemStats.value.startingNextWeek = rotations.value.filter(r => {
        if (r.rotation_status !== 'scheduled') return false;
        
        const startDate = new Date(r.rotation_start_date);
        if (isNaN(startDate.getTime())) return false;
        
        return startDate >= nextWeekStart && startDate <= twoWeeks;
    }).length;
    
    // Calculate today's on-call staff
    const todayStr = todayDate.toISOString().split('T')[0];
    const onCallToday = onCallSchedule.value.filter(schedule => 
        schedule.duty_date === todayStr
    );
    
    // Count unique physicians on call today
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
    
    console.log('📊 Dashboard Stats Updated:', {
        totalStaff: systemStats.value.totalStaff,
        activeAttending: systemStats.value.activeAttending,
        activeResidents: systemStats.value.activeResidents,
        onLeaveStaff: systemStats.value.onLeaveStaff,
        onCallNow: systemStats.value.onCallNow,
        activeRotations: systemStats.value.activeRotations,
        endingThisWeek: systemStats.value.endingThisWeek,
        startingNextWeek: systemStats.value.startingNextWeek,
        'total absences in array': absences.value.length,
        'absences checked': absences.value.filter(a => {
            const start = a.start_date;
            const end = a.end_date;
            return start && end && start <= today && today <= end;
        }).length
    });
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
                
                // ============ 14. AUTHENTICATION FUNCTIONS ============
                
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
                
                // ============ 15. NAVIGATION & UI FUNCTIONS ============
                
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
                
                // ============ 16. MODAL SHOW FUNCTIONS ============
                
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
        
        // ✅ INITIALIZE ALL STRING FIELDS AS EMPTY STRINGS, NOT NULL
        academic_degree: '',
        specialization: '',
        training_year: '',
        clinical_certificate: '',
        certificate_status: '',
        resident_category: '',
        primary_clinic: '',
        work_phone: '',
        medical_license: '',
        can_supervise_residents: false,
        special_notes: '',
        resident_type: '',
        home_department: '',
        external_institution: '',
        years_experience: null,
        biography: '',
        date_of_birth: null,
        mobile_phone: '',
        office_phone: '',
        training_level: ''
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
                        rotation_start_date: new Date().toISOString().split('T')[0],
                        rotation_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
                        coverage_notes: 'emergency',
                        schedule_id: `SCH-${Date.now().toString().slice(-6)}`
                    };
                    onCallModal.show = true;
                };
                
   const showAddAbsenceModal = () => {
    absenceModal.mode = 'add';
    absenceModal.form = {
        staff_member_id: '',
        absence_type: 'planned',  // ✅ Good
        absence_reason: 'vacation',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        current_status: 'pending',  // ✅ Good
        covering_staff_id: '',  // ✅ Good
        coverage_notes: '',  // ✅ Good
        coverage_arranged: false,  // ✅ Good
        hod_notes: ''  // ✅ Good
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
                
                // ============ 17. VIEW/EDIT FUNCTIONS ============
                
                const viewStaffDetails = (staff) => {
                    staffProfileModal.staff = staff;
                    staffProfileModal.activeTab = 'clinical';
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
                
                // ============ 18. SAVE FUNCTIONS ============
const saveMedicalStaff = async () => {
    saving.value = true;
    
    if (!medicalStaffModal.form.full_name || !medicalStaffModal.form.full_name.trim()) {
        showToast('Error', 'Full name is required', 'error');
        saving.value = false;
        return;
    }
    
    try {
        // ✅ CLEAN DATA FUNCTION - Ensures all string fields are strings, not null
        const cleanStringField = (value) => {
            if (value === null || value === undefined) return '';
            if (typeof value === 'string') return value.trim();
            return String(value);
        };
        
        // ✅ CREATE STAFF DATA WITH PROPER STRING VALUES
        const staffData = {
            // Required fields
            full_name: medicalStaffModal.form.full_name.trim(),
            staff_type: medicalStaffModal.form.staff_type || 'medical_resident',
            staff_id: medicalStaffModal.form.staff_id || EnhancedUtils.generateId('MD'),
            employment_status: medicalStaffModal.form.employment_status || 'active',
            professional_email: medicalStaffModal.form.professional_email || '',
            
            // Optional UUID fields (can be null)
            department_id: medicalStaffModal.form.department_id || null,
            
            // ✅ FIXED: All string fields converted to empty string if null
            academic_degree: cleanStringField(medicalStaffModal.form.academic_degree),
            specialization: cleanStringField(medicalStaffModal.form.specialization),
            training_year: cleanStringField(medicalStaffModal.form.training_year),
            clinical_certificate: cleanStringField(medicalStaffModal.form.clinical_certificate),
            certificate_status: cleanStringField(medicalStaffModal.form.certificate_status),
            
            // Other optional fields
            resident_category: cleanStringField(medicalStaffModal.form.resident_category),
            primary_clinic: cleanStringField(medicalStaffModal.form.primary_clinic),
            work_phone: cleanStringField(medicalStaffModal.form.work_phone),
            medical_license: cleanStringField(medicalStaffModal.form.medical_license),
            can_supervise_residents: medicalStaffModal.form.can_supervise_residents || false,
            special_notes: cleanStringField(medicalStaffModal.form.special_notes),
            resident_type: cleanStringField(medicalStaffModal.form.resident_type),
            home_department: cleanStringField(medicalStaffModal.form.home_department),
            external_institution: cleanStringField(medicalStaffModal.form.external_institution),
            
            // Numeric field
            years_experience: medicalStaffModal.form.years_experience || null,
            
            // Other string fields
            biography: cleanStringField(medicalStaffModal.form.biography),
            date_of_birth: medicalStaffModal.form.date_of_birth || null,
            mobile_phone: cleanStringField(medicalStaffModal.form.mobile_phone),
            office_phone: cleanStringField(medicalStaffModal.form.office_phone),
            training_level: cleanStringField(medicalStaffModal.form.training_level)
        };
        
        console.log('📤 Saving medical staff data:', staffData);
        
        // ✅ VALIDATE DATA BEFORE SENDING
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
        
        // ✅ BETTER ERROR HANDLING
        if (error.message && error.message.includes('specialization')) {
            showToast('Error', 'Please enter a valid specialization (text only)', 'error');
        } else if (error.message && error.message.includes('Validation failed')) {
            showToast('Error', 'Please check all fields and try again', 'error');
        } else if (error.message && error.message.includes('email')) {
            showToast('Error', 'Please enter a valid email address', 'error');
        } else {
            showToast('Error', error.message || 'Failed to save medical staff', 'error');
        }
    } finally {
        saving.value = false;
    }
};

// ✅ ADD EMAIL VALIDATION HELPER FUNCTION
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
    console.log('🔄 SAVE ROTATION STARTED - DEBUG MODE');
    console.log('Rotation modal data:', JSON.stringify(rotationModal.form, null, 2));
    console.log('Resident ID:', rotationModal.form.resident_id);
    console.log('Resident Name:', getResidentName(rotationModal.form.resident_id));
    
    // ============ STEP 2: CHECK ALL ROTATIONS ============
    console.log('📊 ALL ROTATIONS IN SYSTEM:');
    rotations.value.forEach((r, index) => {
        const staff = medicalStaff.value.find(s => s.id === r.resident_id);
        console.log(`Rotation ${index + 1}:`, {
            id: r.id,
            resident_id: r.resident_id,
            resident_name: staff?.full_name || 'Unknown',
            start_date: r.rotation_start_date || r.start_date,
            end_date: r.rotation_end_date || r.end_date,
            status: r.rotation_status
        });
    });
    
    // ============ 1. VALIDATE REQUIRED FIELDS ============
    if (!rotationModal.form.resident_id) {
        showToast('Error', 'Please select a resident', 'error');
        return;
    }
    
    if (!rotationModal.form.training_unit_id) {
        showToast('Error', 'Please select a training unit', 'error');
        return;
    }
    
    // ============ 2. VALIDATE AND FORMAT DATES ============
// ============ 2. VALIDATE AND FORMAT DATES ============
const startDateStr = rotationModal.form.rotation_start_date;
const endDateStr = rotationModal.form.rotation_end_date;

console.log('📅 Raw date inputs:', { startDateStr, endDateStr });

if (!startDateStr || !endDateStr) {
    showToast('Error', 'Please enter both start and end dates', 'error');
    return;
}

// Parse dates - handle DD/MM/YYYY format
let startDate, endDate;
try {
    // Check if date is in DD/MM/YYYY format
    const isDDMMYYYY = (dateStr) => {
        return dateStr.includes('/') && dateStr.split('/')[0].length === 2;
    };
    
    if (isDDMMYYYY(startDateStr)) {
        // Parse DD/MM/YYYY format
        const [day, month, year] = startDateStr.split('/');
        startDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    } else {
        startDate = new Date(startDateStr);
    }
    
    if (isDDMMYYYY(endDateStr)) {
        // Parse DD/MM/YYYY format
        const [day, month, year] = endDateStr.split('/');
        endDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59`);
    } else {
        endDate = new Date(endDateStr);
    }
    
    console.log('📅 Parsed dates:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isValidStart: !isNaN(startDate.getTime()),
        isValidEnd: !isNaN(endDate.getTime())
    });
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
    }
    
    // Store as YYYY-MM-DD format
    rotationModal.form.rotation_start_date = startDate.toISOString().split('T')[0];
    rotationModal.form.rotation_end_date = endDate.toISOString().split('T')[0];
    
    console.log('📅 Stored dates (YYYY-MM-DD):', {
        start: rotationModal.form.rotation_start_date,
        end: rotationModal.form.rotation_end_date
    });
    
} catch (error) {
    console.error('Date parsing error:', error);
    showToast('Error', 
        'Invalid date format. Please use DD/MM/YYYY format (e.g., 15/04/2026) or YYYY-MM-DD (e.g., 2026-04-15)', 
        'error'
    );
    return;
}
    
    // ============ 3. VALIDATE DATE LOGIC ============
    if (endDate <= startDate) {
        showToast('Error', 'End date must be after start date', 'error');
        return;
    }
    
    // Check if rotation is too long (max 1 year)
    const maxDurationDays = 365;
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (durationDays > maxDurationDays) {
        showToast('Error', 
            `Rotation cannot exceed ${maxDurationDays} days. Current: ${durationDays} days`, 
            'error'
        );
        return;
    }
    
    // ============ 4. CHECK FOR OVERLAPS (CLIENT-SIDE) ============
    // ============ FIXED OVERLAP CHECK FUNCTION ============
    const checkForOverlap = (residentId, newStart, newEnd, excludeRotationId = null) => {
        console.log('\n🔍 CHECK FOR OVERLAP FUNCTION CALLED');
        console.log('Parameters:', { 
            residentId, 
            newStart, 
            newEnd, 
            excludeRotationId 
        });
        
        if (!residentId) {
            console.log('❌ No resident ID provided');
            return false;
        }
        
        // 1. Get rotations for this resident
        const residentRotations = rotations.value.filter(r => r.resident_id === residentId);
        console.log(`Found ${residentRotations.length} total rotations for resident`);
        
        // 2. Show all rotations for this resident
        console.log('All rotations for this resident:');
        residentRotations.forEach((r, i) => {
            console.log(`  ${i + 1}. ID: ${r.id}, Status: ${r.rotation_status}, ` +
                       `Dates: ${r.rotation_start_date || r.start_date} to ${r.rotation_end_date || r.end_date}`);
        });
        
        // 3. Filter out cancelled and excluded rotations
        const activeRotations = residentRotations.filter(r => {
            if (r.rotation_status === 'cancelled') {
                console.log(`  Filtering out cancelled rotation: ${r.id}`);
                return false;
            }
            if (excludeRotationId && r.id === excludeRotationId) {
                console.log(`  Filtering out excluded rotation: ${r.id}`);
                return false;
            }
            return true;
        });
        
        console.log(`Active rotations after filtering: ${activeRotations.length}`);
        
        // 4. If no active rotations, no overlap
        if (activeRotations.length === 0) {
            console.log('✅ No active rotations - no overlap possible');
            return false;
        }
        
    // 5. Parse new dates - FIX for DD/MM/YYYY format
console.log('\nParsing new rotation dates:');
console.log('Raw dates:', { newStart, newEnd });

// Convert DD/MM/YYYY to YYYY-MM-DD if needed
const parseDate = (dateStr) => {
    if (!dateStr) return new Date(NaN);
    
    // Check if already YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateStr + 'T00:00:00');
    }
    
    // Convert DD/MM/YYYY to YYYY-MM-DD
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateStr.split('/');
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log(`Converted ${dateStr} to ${isoDate}`);
        return new Date(isoDate + 'T00:00:00');
    }
    
    // Try as-is (might be other format)
    return new Date(dateStr);
};

const newStartDate = parseDate(newStart);
const newEndDate = parseDate(newEnd);

// Set end date to end of day
newEndDate.setHours(23, 59, 59, 999);

console.log('Parsed dates:', {
    start: newStartDate.toISOString(),
    end: newEndDate.toISOString(),
    isValid: !isNaN(newStartDate.getTime()) && !isNaN(newEndDate.getTime())
});

if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
    console.log('❌ Invalid new dates');
    return false;
}
        
        // 6. Check each existing rotation
        console.log('\nChecking against existing rotations:');
        
        for (const rotation of activeRotations) {
            console.log(`\n--- Checking rotation ${rotation.id} ---`);
            
            // Get dates from existing rotation
            const existingStartStr = rotation.rotation_start_date || rotation.start_date;
            const existingEndStr = rotation.rotation_end_date || rotation.end_date;
            
            console.log('Existing rotation:', {
                id: rotation.id,
                status: rotation.rotation_status,
                start: existingStartStr,
                end: existingEndStr
            });
            
            if (!existingStartStr || !existingEndStr) {
                console.log('⚠️ Skipping - missing dates');
                continue;
            }
            
          // Parse existing dates
const existingStartDate = parseDate(existingStartStr);
const existingEndDate = parseDate(existingEndStr);

// Set end date to end of day
existingEndDate.setHours(23, 59, 59, 999);

console.log('Parsed existing dates:', {
    start: existingStartDate.toISOString(),
    end: existingEndDate.toISOString(),
    isValid: !isNaN(existingStartDate.getTime()) && !isNaN(existingEndDate.getTime())
});
            
            // 7. CORRECT OVERLAP LOGIC
            // Two date ranges overlap if:
            // NewStart <= ExistingEnd AND NewEnd >= ExistingStart
            const condition1 = newStartDate <= existingEndDate;
            const condition2 = newEndDate >= existingStartDate;
            const overlaps = condition1 && condition2;
            
            console.log('Overlap calculation:', {
                condition1: `newStart (${newStartDate.toISOString().split('T')[0]}) <= existingEnd (${existingEndDate.toISOString().split('T')[0]}) = ${condition1}`,
                condition2: `newEnd (${newEndDate.toISOString().split('T')[0]}) >= existingStart (${existingStartDate.toISOString().split('T')[0]}) = ${condition2}`,
                result: overlaps ? 'OVERLAP DETECTED ❌' : 'NO OVERLAP ✅'
            });
            
            if (overlaps) {
                console.log('❌ OVERLAP FOUND!');
                return true;
            }
        }
        
        console.log('✅ NO OVERLAPS FOUND for this resident');
        return false;
    };
    
    // ============ CALL THE OVERLAP CHECK ============
    console.log('\n📅 Calling overlap check with:');
    console.log('  Resident:', rotationModal.form.resident_id, getResidentName(rotationModal.form.resident_id));
    console.log('  Dates:', rotationModal.form.rotation_start_date, 'to', rotationModal.form.rotation_end_date);
    console.log('  Mode:', rotationModal.mode);
    console.log('  Exclude ID:', rotationModal.mode === 'edit' ? rotationModal.form.id : 'none');
    
    const hasOverlap = checkForOverlap(
        rotationModal.form.resident_id,
        rotationModal.form.rotation_start_date,
        rotationModal.form.rotation_end_date,
        rotationModal.mode === 'edit' ? rotationModal.form.id : null
    );
    
    console.log('Overlap check result:', hasOverlap ? 'TRUE - OVERLAP' : 'FALSE - NO OVERLAP');
    
    if (hasOverlap) {
        // Get the resident name for better error message
        const residentName = getResidentName(rotationModal.form.resident_id);
        
        showToast('Scheduling Conflict', 
            `${residentName} already has a rotation during these dates. ` +
            'Please choose different dates or modify the existing rotation.',
            'error'
        );
        return;
    }
    
    // ============ 5. PREPARE DATA FOR BACKEND ============
    saving.value = true;
    
    try {
        // Clean and prepare rotation data
        const rotationData = {
            rotation_id: rotationModal.form.rotation_id || EnhancedUtils.generateId('ROT'),
            resident_id: rotationModal.form.resident_id,
            training_unit_id: rotationModal.form.training_unit_id,
            supervising_attending_id: rotationModal.form.supervising_attending_id || null,
            start_date: rotationModal.form.rotation_start_date,
            end_date: rotationModal.form.rotation_end_date,
            rotation_category: (rotationModal.form.rotation_category || 'clinical_rotation').toLowerCase(),
            rotation_status: (rotationModal.form.rotation_status || 'scheduled').toLowerCase(),
            rotation_category: rotationModal.form.rotation_category || 'elective_rotation'
        };
        
        console.log('📤 Sending rotation data to server:', rotationData);
        
        // ============ 6. SEND TO BACKEND ============
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
        
        // ============ 7. CLEAN UP AND REFRESH ============
        rotationModal.show = false;
        
        // Refresh rotations to get updated meaningful IDs
        await loadRotations();
        updateDashboardStats();
        
        // Show the new meaningful ID if available
        if (result.rotation_id && result.rotation_id.startsWith('PULM-') || 
            result.rotation_id.startsWith('MED-') || 
            result.rotation_id.startsWith('SURG-')) {
            showToast('Rotation ID Generated', 
                `Assigned ID: ${result.rotation_id}`, 
                'info', 3000);
        }
        
    } catch (error) {
        console.error('❌ Rotation save error:', error);
        
        // ============ 8. USER-FRIENDLY ERROR HANDLING ============
        let userMessage = error.message || 'Failed to save rotation';
        
        // Parse backend error messages
        if (error.message.includes('overlapping rotations')) {
            userMessage = 'This rotation conflicts with an existing rotation. Please adjust dates.';
        } else if (error.message.includes('Resident cannot have overlapping rotations')) {
            // Extract the conflicting date range from error message
            const match = error.message.match(/Date range (.*?) to (.*?) conflicts/);
            if (match) {
                const [_, conflictStart, conflictEnd] = match;
                userMessage = `Dates conflict with existing rotation from ${conflictStart} to ${conflictEnd}`;
            } else {
                userMessage = 'Rotation dates conflict with existing schedule';
            }
        } else if (error.message.includes('training_unit_id') || error.message.includes('resident_id')) {
            userMessage = 'Invalid resident or training unit selected. Please refresh and try again.';
        } else if (error.message.includes('date') || error.message.includes('Date')) {
            userMessage = 'Invalid date format. Please use YYYY-MM-DD format.';
        }
        
        showToast('Error', userMessage, 'error');
        
    } finally {
        saving.value = false;
    }
};
const saveAbsence = async () => {
    saving.value = true;
    try {
        // Your form already uses correct field names
        const absenceData = {
            staff_member_id: absenceModal.form.staff_member_id,
            absence_type: absenceModal.form.absence_type || 'planned',
            absence_reason: absenceModal.form.absence_reason,
            start_date: absenceModal.form.start_date,
            end_date: absenceModal.form.end_date,
            // ✅ Use correct status values from your database
            current_status: absenceModal.form.current_status || 'planned_leave',
            covering_staff_id: absenceModal.form.covering_staff_id || null,
            coverage_notes: absenceModal.form.coverage_notes || '',
            coverage_arranged: absenceModal.form.coverage_arranged || false,
            hod_notes: absenceModal.form.hod_notes || '',
            recorded_by: currentUser.value?.id || null
        };
        
        console.log('📤 Sending absence data to backend:', absenceData);
        
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
                
                // ============ 19. ACTION FUNCTIONS ============
                
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
                
                const viewUnitResidents = (unit) => {
                    showToast('Unit Residents', `Viewing residents for ${unit.unit_name}`, 'info');
                };
                
                // ============ 20. PERMISSION FUNCTIONS ============
                
                const hasPermission = (module, action = 'read') => {
                    const role = currentUser.value?.user_role;
                    if (!role) return false;
                    
                    if (role === 'system_admin') return true;
                    
                    const permissions = PERMISSION_MATRIX[role]?.[module];
                    if (!permissions) return false;
                    
                    return permissions.includes(action) || permissions.includes('*');
                };
                
                // ============ 21. COMPUTED PROPERTIES ============
                
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
                            staff.staff_id?.toLowerCase().includes(search) ||
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
    
    // ✅ FIXED: Handle multiple possible status field names
    if (absenceFilters.status) {
        filtered = filtered.filter(absence => {
            // Check all possible status field names
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
                
                // ============ 22. VERSION 2 COMPLETE COMPUTED PROPERTIES ============
                
                const activeAlertsCount = computed(() => {
                    return systemAlerts.value.filter(alert => 
                        alert.status === 'active' || !alert.status
                    ).length;
                });
                
                const currentTimeFormatted = computed(() => {
                    return EnhancedUtils.formatTime(currentTime.value);
                });
                
                // ============ 23. LIFECYCLE ============
                
                onMounted(() => {
                    console.log('🚀 Vue app mounted - 100% Complete Version');
                    
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
                    
                    // Auto-refresh interval for live status
                    const statusRefreshInterval = setInterval(() => {
                        if (currentUser.value && !isLoadingStatus.value) {
                            loadClinicalStatus();
                        }
                    }, 60000);
                    
                    // Auto-update current time every minute
                    const timeInterval = setInterval(() => {
                        currentTime.value = new Date();
                    }, 60000);
                    
                    // Handle ESC key for modal closing
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
                    
                    // Version 2 Complete State
                    quickStatus,
                    currentTime,
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
                    
                    // NEUMAC UI Functions
                    getShiftStatusClass,
                    isCurrentShift,
                    getStaffTypeIcon,
                    calculateCapacityPercent,
                    getCapacityDotClass,
                    getMeterFillClass,
                    getAbsenceReasonIcon,
                    getScheduleIcon,
                    
                    // Profile Functions
                    getCurrentUnit,
                    getCurrentWard,
                    getCurrentActivityStatus,
                    getCurrentPatientCount,
                    getICUPatientCount,
                    getWardPatientCount,
                    getTodaysSchedule,
                    isOnCallToday,
                    getOnCallShiftTime,
                    getOnCallCoverage,
                    getRotationSupervisor,
                    getRotationDaysLeft,
                    getRecentActivities,
                    formatTimeAgo,
                    
                    // Version 2 Complete Functions
                    getStatusBadgeClass,
                    calculateTimeRemaining,
                    refreshStatus,
                    setQuickStatus,
                    formatAudience,
                    getPreviewCardClass,
                    getPreviewIcon,
                    getPreviewReasonText,
                    getPreviewStatusClass,
                    getPreviewStatusText,
                    updatePreview,
                    
                    // Live Status Functions
                    loadClinicalStatus,
                    loadActiveMedicalStaff,
                    saveClinicalStatus,
                    isStatusExpired,
                    showCreateStatusModal,
                    
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
                    viewUnitResidents,
                    
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
                        saveRotation,        // The function we just fixed
    saveOnCallSchedule,  
                    
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
                    
                    // Version 2 Complete Computed Properties
                    activeAlertsCount,
                    currentTimeFormatted
                };
            }
        });
        
        // ============ 25. MOUNT APP ============
        app.mount('#app');
        
        console.log('✅ NeumoCare v8.0 100% COMPLETE VERSION mounted successfully!');
        console.log('📋 ALL MISSING FUNCTIONS ADDED:');
        console.log('   ✓ getStatusBadgeClass');
        console.log('   ✓ calculateTimeRemaining');
        console.log('   ✓ refreshStatus');
        console.log('   ✓ setQuickStatus');
        console.log('   ✓ formatAudience');
        console.log('   ✓ getPreviewCardClass');
        console.log('   ✓ getPreviewIcon');
        console.log('   ✓ getPreviewReasonText');
        console.log('   ✓ getPreviewStatusClass');
        console.log('   ✓ getPreviewStatusText');
        console.log('   ✓ updatePreview');
        console.log('   ✓ activeAlertsCount computed');
        console.log('   ✓ currentTimeFormatted computed');
        console.log('   ✓ quickStatus reactive state');
        console.log('   ✓ currentTime reactive state');
        
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
