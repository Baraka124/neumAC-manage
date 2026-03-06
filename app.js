// ============ NEUMOCARE HOSPITAL MANAGEMENT SYSTEM v9.0 ============
// Frontend Application - Vue.js - COMPLETE WITH FULL CRUD OPERATIONS
// ===================================================================

document.addEventListener('DOMContentLoaded', function() {

    try {
        // ============ VUE VALIDATION ============
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

        const { createApp, ref, reactive, computed, onMounted, watch, onUnmounted } = Vue;

        // ============ CONFIGURATION ============
        const CONFIG = {
            API_BASE_URL: window.location.hostname.includes('localhost')
                ? 'http://localhost:3000'
                : 'https://neumac-manage-back-end-production.up.railway.app',
            TOKEN_KEY: 'neumocare_token',
            USER_KEY: 'neumocare_user',
            APP_VERSION: '9.0',
            DEBUG: false
        };

        // ============ UTILITIES ============
        class EnhancedUtils {
            static formatDate(dateString) {
                if (!dateString) return 'N/A';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return dateString;
                    return date.toLocaleDateString('en-GB', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                    });
                } catch { return dateString; }
            }

            static formatDateShort(date) {
                if (!date) return '';
                try {
                    const d = typeof date === 'string' ? new Date(date) : date;
                    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
                } catch { return ''; }
            }

            static formatDatePlusDays(dateStr, days) {
                if (!dateStr) return 'NA';
                try {
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return 'NA';
                    d.setDate(d.getDate() + days);
                    return d.toLocaleDateString('en-GB', {
                        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
                    });
                } catch { return 'NA'; }
            }

            static getTomorrow() {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                return d;
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
                    const diffMins = Math.floor((now - date) / 60000);
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
                    return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
                } catch { return 0; }
            }

            static generateId(prefix) {
                return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
            }
        }

        // ============ API SERVICE ============
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
                        try { errorText = await response.text(); }
                        catch { errorText = `HTTP ${response.status}: ${response.statusText}`; }
                        throw new Error(errorText);
                    }
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return await response.json();
                    }
                    return await response.text();
                } catch (error) {
                    if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                        throw new Error(`Cannot connect to server. Please check your network connection.`);
                    }
                    throw error;
                }
            }

            // ===== AUTHENTICATION =====
            async login(email, password) {
                try {
                    const data = await this.request('/api/auth/login', { method: 'POST', body: { email, password } });
                    if (data.token) {
                        this.token = data.token;
                        localStorage.setItem(CONFIG.TOKEN_KEY, data.token);
                        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
                    }
                    return data;
                } catch (error) { throw new Error('Login failed: ' + error.message); }
            }

            async logout() {
                try { await this.request('/api/auth/logout', { method: 'POST' }); }
                finally {
                    this.token = null;
                    localStorage.removeItem(CONFIG.TOKEN_KEY);
                    localStorage.removeItem(CONFIG.USER_KEY);
                }
            }

            // ===== MEDICAL STAFF =====
            async getMedicalStaff() {
                try { return EnhancedUtils.ensureArray(await this.request('/api/medical-staff')); }
                catch { return []; }
            }
            async createMedicalStaff(staffData) { return await this.request('/api/medical-staff', { method: 'POST', body: staffData }); }
            async updateMedicalStaff(id, staffData) { return await this.request(`/api/medical-staff/${id}`, { method: 'PUT', body: staffData }); }
            async deleteMedicalStaff(id) { return await this.request(`/api/medical-staff/${id}`, { method: 'DELETE' }); }

            // ===== DEPARTMENTS =====
            async getDepartments() {
                try { return EnhancedUtils.ensureArray(await this.request('/api/departments')); }
                catch { return []; }
            }
            async createDepartment(data) { return await this.request('/api/departments', { method: 'POST', body: data }); }
            async updateDepartment(id, data) { return await this.request(`/api/departments/${id}`, { method: 'PUT', body: data }); }

            // ===== TRAINING UNITS =====
            async getTrainingUnits() {
                try { return EnhancedUtils.ensureArray(await this.request('/api/training-units')); }
                catch { return []; }
            }
            async createTrainingUnit(data) { return await this.request('/api/training-units', { method: 'POST', body: data }); }
            async updateTrainingUnit(id, data) { return await this.request(`/api/training-units/${id}`, { method: 'PUT', body: data }); }

            // ===== ROTATIONS =====
            async getRotations() {
                try { return EnhancedUtils.ensureArray(await this.request('/api/rotations')); }
                catch { return []; }
            }
            async createRotation(data) { return await this.request('/api/rotations', { method: 'POST', body: data }); }
            async updateRotation(id, data) { return await this.request(`/api/rotations/${id}`, { method: 'PUT', body: data }); }
            async deleteRotation(id) { return await this.request(`/api/rotations/${id}`, { method: 'DELETE' }); }

            // ===== ON-CALL SCHEDULE =====
            async getOnCallSchedule() {
                try { return EnhancedUtils.ensureArray(await this.request('/api/oncall')); }
                catch { return []; }
            }
            async getOnCallToday() {
                try { return EnhancedUtils.ensureArray(await this.request('/api/oncall/today')); }
                catch { return []; }
            }
            async createOnCall(data) { return await this.request('/api/oncall', { method: 'POST', body: data }); }
            async updateOnCall(id, data) { return await this.request(`/api/oncall/${id}`, { method: 'PUT', body: data }); }
            async deleteOnCall(id) { return await this.request(`/api/oncall/${id}`, { method: 'DELETE' }); }

            // ===== ABSENCE RECORDS =====
            async getAbsences() {
                try {
                    const response = await this.request('/api/absence-records');
                    if (response && response.success && Array.isArray(response.data)) return response.data;
                    return EnhancedUtils.ensureArray(response);
                }
                catch { return []; }
            }
            async createAbsence(data) { return await this.request('/api/absence-records', { method: 'POST', body: data }); }
            async updateAbsence(id, data) { return await this.request(`/api/absence-records/${id}`, { method: 'PUT', body: data }); }
            async deleteAbsence(id) { return await this.request(`/api/absence-records/${id}`, { method: 'DELETE' }); }

            // ===== ANNOUNCEMENTS =====
            async getAnnouncements() {
                try { return EnhancedUtils.ensureArray(await this.request('/api/announcements')); }
                catch { return []; }
            }
            async createAnnouncement(data) { return await this.request('/api/announcements', { method: 'POST', body: data }); }
            async updateAnnouncement(id, data) { return await this.request(`/api/announcements/${id}`, { method: 'PUT', body: data }); }
            async deleteAnnouncement(id) { return await this.request(`/api/announcements/${id}`, { method: 'DELETE' }); }

            // ===== LIVE STATUS =====
            async getClinicalStatus() {
                try { return await this.request('/api/live-status/current'); }
                catch (error) { return { success: false, data: null, error: error.message }; }
            }
            async createClinicalStatus(data) { return await this.request('/api/live-status', { method: 'POST', body: data }); }
            async updateClinicalStatus(id, data) { return await this.request(`/api/live-status/${id}`, { method: 'PUT', body: data }); }
            async deleteClinicalStatus(id) { return await this.request(`/api/live-status/${id}`, { method: 'DELETE' }); }
            async getClinicalStatusHistory(limit = 10) {
                try { return EnhancedUtils.ensureArray(await this.request(`/api/live-status/history?limit=${limit}`)); }
                catch { return []; }
            }

            // ===== SYSTEM STATS =====
            async getSystemStats() {
                try { return await this.request('/api/system-stats') || {}; }
                catch {
                    return {
                        activeAttending: 0, activeResidents: 0, onCallNow: 0, inSurgery: 0,
                        nextShiftChange: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
                        pendingApprovals: 0
                    };
                }
            }

            // ===== RESEARCH LINES =====
            async getResearchLines() {
                try {
                    const response = await this.request('/api/research-lines');
                    return response?.data || EnhancedUtils.ensureArray(response);
                } catch { return []; }
            }

            async createResearchLine(data) {
                return await this.request('/api/research-lines', { method: 'POST', body: data });
            }

            async updateResearchLine(id, data) {
                return await this.request(`/api/research-lines/${id}`, { method: 'PUT', body: data });
            }

            async deleteResearchLine(id) {
                return await this.request(`/api/research-lines/${id}`, { method: 'DELETE' });
            }

            async assignCoordinator(researchLineId, coordinatorId) {
                return await this.request(`/api/research-lines/${researchLineId}/coordinator`, {
                    method: 'PUT',
                    body: { coordinator_id: coordinatorId }
                });
            }

            // ===== CLINICAL TRIALS =====
            async getClinicalTrialsForWebsite(filters = {}) {
                try {
                    const params = new URLSearchParams();
                    if (filters.line) params.append('line', filters.line);
                    if (filters.phase) params.append('phase', filters.phase);
                    if (filters.status) params.append('status', filters.status);
                    if (filters.search) params.append('search', filters.search);
                    
                    const query = params.toString() ? `?${params.toString()}` : '';
                    const response = await this.request(`/api/clinical-trials/website${query}`);
                    return response?.data || [];
                } catch { return []; }
            }

            async getAllClinicalTrials() {
                try {
                    const response = await this.request('/api/clinical-trials');
                    return response?.data || EnhancedUtils.ensureArray(response);
                } catch { return []; }
            }

            async createClinicalTrial(data) {
                return await this.request('/api/clinical-trials', { method: 'POST', body: data });
            }

            async updateClinicalTrial(id, data) {
                return await this.request(`/api/clinical-trials/${id}`, { method: 'PUT', body: data });
            }

            async deleteClinicalTrial(id) {
                return await this.request(`/api/clinical-trials/${id}`, { method: 'DELETE' });
            }

            // ===== INNOVATION PROJECTS =====
            async getInnovationProjectsForWebsite() {
                try {
                    const response = await this.request('/api/innovation-projects/website');
                    return response?.data || [];
                } catch { return []; }
            }

            async getAllInnovationProjects() {
                try {
                    const response = await this.request('/api/innovation-projects');
                    return response?.data || EnhancedUtils.ensureArray(response);
                } catch { return []; }
            }

            async createInnovationProject(data) {
                return await this.request('/api/innovation-projects', { method: 'POST', body: data });
            }

            async updateInnovationProject(id, data) {
                return await this.request(`/api/innovation-projects/${id}`, { method: 'PUT', body: data });
            }

            async deleteInnovationProject(id) {
                return await this.request(`/api/innovation-projects/${id}`, { method: 'DELETE' });
            }
        }

        const API = new ApiService();

        // ============ VUE APP ============
        const app = createApp({
            setup() {
                // ============ ANIMATION UTILITIES ============
                const animateCountUp = (targetRef, endValue, duration = 600) => {
                    if (!endValue || endValue === 0) return;
                    const start = 0;
                    const startTime = performance.now();
                    const step = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        targetRef.value = Math.round(start + (endValue - start) * eased);
                        if (progress < 1) requestAnimationFrame(step);
                        else targetRef.value = endValue;
                    };
                    requestAnimationFrame(step);
                };

                // ============ REACTIVE STATE ============
                
                // User State
                const currentUser = ref(null);
                const loginForm = reactive({ email: '', password: '', remember_me: false });
                const loginLoading = ref(false);

                // UI State
                const currentView = ref('login');
                const sidebarCollapsed = ref(false);
                const mobileMenuOpen = ref(false);
                const userMenuOpen = ref(false);
                const statsSidebarOpen = ref(false);
                const globalSearchQuery = ref('');

                // Loading States
                const loading = ref(false);
                const saving = ref(false);
                const loadingSchedule = ref(false);
                const isLoadingStatus = ref(false);

                // Data Stores - Core
                const medicalStaff = ref([]);
                const departments = ref([]);
                const trainingUnits = ref([]);
                const rotations = ref([]);
                const absences = ref([]);
                const onCallSchedule = ref([]);
                const announcements = ref([]);

                // Data Stores - Research
                const researchLines = ref([]);
                const clinicalTrials = ref([]);
                const innovationProjects = ref([]);

                // Live Status
                const clinicalStatus = ref(null);
                const clinicalStatusHistory = ref([]);
                const newStatusText = ref('');
                const selectedAuthorId = ref('');
                const expiryHours = ref(8);
                const activeMedicalStaff = ref([]);
                const liveStatsEditMode = ref(false);

                // UI State
                const quickStatus = ref('');
                const currentTime = ref(new Date());

                // Dashboard Stats
                const systemStats = ref({
                    totalStaff: 0, activeAttending: 0, activeResidents: 0,
                    onCallNow: 0, inSurgery: 0, activeRotations: 0,
                    endingThisWeek: 0, startingNextWeek: 0, onLeaveStaff: 0,
                    departmentStatus: 'normal', activePatients: 0,
                    icuOccupancy: 0, wardOccupancy: 0, pendingApprovals: 0,
                    nextShiftChange: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
                });

                // Today's Data
                const todaysOnCall = ref([]);
                const todaysOnCallCount = computed(() => todaysOnCall.value.length);
                
                // UI Components
                const toasts = ref([]);
                const systemAlerts = ref([]);

                // ============ FILTERS ============
                const staffFilters = reactive({ search: '', staffType: '', department: '', status: '' });
                const onCallFilters = reactive({ date: '', shiftType: '', physician: '', coverageArea: '' });
                const rotationFilters = reactive({ resident: '', status: '', trainingUnit: '', supervisor: '' });
                const absenceFilters = reactive({ staff: '', status: '', reason: '', startDate: '' });
                
                // Research Filters
                const trialFilters = reactive({
                    line: '',
                    phase: '',
                    status: '',
                    search: ''
                });

                const projectFilters = reactive({
                    research_line_id: '',
                    category: '',
                    search: ''
                });

                // ============ MODALS ============
                const staffProfileModal = reactive({ show: false, staff: null, activeTab: 'assignments' });
                const unitResidentsModal = reactive({ show: false, unit: null, rotations: [] });

                // Research Line Modal
                const researchLineModal = reactive({
                    show: false,
                    mode: 'add',
                    form: {
                        line_number: null,
                        name: '',
                        description: '',
                        capabilities: '',
                        sort_order: 0,
                        active: true
                    }
                });

                // Clinical Trial Modal
                const clinicalTrialModal = reactive({
                    show: false,
                    mode: 'add',
                    form: {
                        protocol_id: '',
                        title: '',
                        research_line_id: '',
                        phase: 'Phase III',
                        status: 'Reclutando',
                        description: '',
                        inclusion_criteria: '',
                        exclusion_criteria: '',
                        principal_investigator_id: '',
                        contact_email: '',
                        featured_in_website: true,
                        display_order: 0
                    }
                });

                // Innovation Project Modal
                const innovationProjectModal = reactive({
                    show: false,
                    mode: 'add',
                    form: {
                        title: '',
                        category: 'Dispositivo',
                        development_stage: 'En Desarrollo',
                        description: '',
                        research_line_id: '',
                        lead_investigator_id: '',
                        partner_needs: [],
                        featured_in_website: true,
                        display_order: 0
                    }
                });

                const medicalStaffModal = reactive({
                    show: false, mode: 'add', activeTab: 'basic',
                    form: {
                        full_name: '', staff_type: 'medical_resident', staff_id: '',
                        employment_status: 'active', professional_email: '', department_id: '',
                        academic_degree: '', specialization: '', training_year: '',
                        clinical_certificate: '', certificate_status: ''
                    }
                });

                const communicationsModal = reactive({
                    show: false, activeTab: 'announcement',
                    form: {
                        title: '', content: '', priority: 'normal', target_audience: 'all_staff',
                        updateType: 'daily', dailySummary: '', highlight1: '', highlight2: '',
                        alerts: { erBusy: false, icuFull: false, wardFull: false, staffShortage: false },
                        metricName: '', metricValue: '', metricTrend: 'stable', metricChange: '',
                        metricNote: '', alertLevel: 'low', alertMessage: '',
                        affectedAreas: { er: false, icu: false, ward: false, surgery: false }
                    }
                });

                const onCallModal = reactive({
                    show: false, mode: 'add',
                    form: {
                        duty_date: new Date().toISOString().split('T')[0],
                        shift_type: 'primary_call', start_time: '08:00', end_time: '17:00',
                        primary_physician_id: '', backup_physician_id: '',
                        coverage_area: 'emergency', coverage_notes: ''
                    }
                });

                const rotationModal = reactive({
                    show: false, mode: 'add',
                    form: {
                        rotation_id: '', resident_id: '', training_unit_id: '',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        rotation_status: 'scheduled', rotation_category: 'clinical_rotation',
                        supervising_attending_id: ''
                    }
                });

                const trainingUnitModal = reactive({
                    show: false, mode: 'add',
                    form: {
                        unit_name: '', unit_code: '', department_id: '', maximum_residents: 10,
                        unit_status: 'active', specialty: '', supervising_attending_id: ''
                    }
                });

                const absenceModal = reactive({
                    show: false, mode: 'add',
                    form: {
                        staff_member_id: '', absence_type: 'planned', absence_reason: 'vacation',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        covering_staff_id: '', coverage_notes: '', coverage_arranged: false, hod_notes: ''
                    }
                });

                const departmentModal = reactive({
                    show: false, mode: 'add',
                    form: { name: '', code: '', status: 'active', head_of_department_id: '' }
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

                const assignCoordinatorModal = reactive({
                    show: false,
                    lineId: null,
                    lineName: '',
                    selectedCoordinatorId: ''
                });

                // ============ PERMISSION MATRIX ============
                const PERMISSION_MATRIX = {
                    system_admin: {
                        medical_staff: ['create', 'read', 'update', 'delete'],
                        oncall_schedule: ['create', 'read', 'update', 'delete'],
                        resident_rotations: ['create', 'read', 'update', 'delete'],
                        training_units: ['create', 'read', 'update', 'delete'],
                        staff_absence: ['create', 'read', 'update', 'delete'],
                        department_management: ['create', 'read', 'update', 'delete'],
                        communications: ['create', 'read', 'update', 'delete'],
                        research_lines: ['create', 'read', 'update', 'delete'],
                        clinical_trials: ['create', 'read', 'update', 'delete'],
                        innovation_projects: ['create', 'read', 'update', 'delete'],
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
                        research_lines: ['read', 'update'],
                        clinical_trials: ['read', 'create', 'update'],
                        innovation_projects: ['read', 'create', 'update'],
                        system: ['manage_updates']
                    },
                    attending_physician: {
                        medical_staff: ['read'], oncall_schedule: ['read'],
                        resident_rotations: ['read'], training_units: ['read'],
                        staff_absence: ['read'], department_management: ['read'],
                        communications: ['read'], research_lines: ['read'],
                        clinical_trials: ['read'], innovation_projects: ['read']
                    },
                    medical_resident: {
                        medical_staff: ['read'], oncall_schedule: ['read'],
                        resident_rotations: ['read'], training_units: ['read'],
                        staff_absence: ['read'], department_management: [],
                        communications: ['read'], research_lines: ['read'],
                        clinical_trials: ['read'], innovation_projects: ['read']
                    }
                };

                // ============ TOAST SYSTEM ============
                const showToast = (title, message, type = 'info', duration = 5000) => {
                    const icons = {
                        info: 'fas fa-info-circle', success: 'fas fa-check-circle',
                        error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle'
                    };
                    const toast = { id: Date.now(), title, message, type, icon: icons[type], duration };
                    toasts.value.push(toast);
                    if (duration > 0) setTimeout(() => removeToast(toast.id), duration);
                };

                const removeToast = (id) => {
                    const index = toasts.value.findIndex(t => t.id === id);
                    if (index > -1) toasts.value.splice(index, 1);
                };

                // ============ CONFIRMATION MODAL ============
                const showConfirmation = (options) => { Object.assign(confirmationModal, { show: true, ...options }); };

                const confirmAction = async () => {
                    if (confirmationModal.onConfirm) {
                        try { await confirmationModal.onConfirm(); }
                        catch (error) { showToast('Error', error.message, 'error'); }
                    }
                    confirmationModal.show = false;
                };

                const cancelConfirmation = () => { confirmationModal.show = false; };

                // ============ DATE/TIME HELPERS ============
                const formatDate = (dateString) => EnhancedUtils.formatDate(dateString);
                const formatDateShort = (date) => EnhancedUtils.formatDateShort(date);
                const formatDatePlusDays = (dateStr, days) => EnhancedUtils.formatDatePlusDays(dateStr, days);
                const getTomorrow = () => EnhancedUtils.getTomorrow();
                const formatTime = (dateString) => EnhancedUtils.formatTime(dateString);
                const formatRelativeTime = (dateString) => EnhancedUtils.formatRelativeTime(dateString);
                const formatTimeAgo = (dateString) => EnhancedUtils.formatRelativeTime(dateString);
                const getInitials = (name) => EnhancedUtils.getInitials(name);

                // ============ FORMATTING FUNCTIONS ============
                const formatStaffType = (type) => {
                    const map = {
                        'medical_resident': 'Medical Resident', 'attending_physician': 'Attending Physician',
                        'fellow': 'Fellow', 'nurse_practitioner': 'Nurse Practitioner'
                    };
                    return map[type] || type;
                };

                const getStaffTypeClass = (type) => {
                    const map = {
                        'medical_resident': 'badge-primary', 'attending_physician': 'badge-success',
                        'fellow': 'badge-info', 'nurse_practitioner': 'badge-warning'
                    };
                    return map[type] || 'badge-secondary';
                };

                const formatEmploymentStatus = (status) => {
                    const map = { 'active': 'Active', 'on_leave': 'On Leave', 'inactive': 'Inactive' };
                    return map[status] || status;
                };

                const formatAbsenceReason = (reason) => {
                    const map = {
                        'vacation': 'Vacation', 'sick_leave': 'Sick Leave', 'conference': 'Conference',
                        'training': 'Training', 'personal': 'Personal', 'other': 'Other'
                    };
                    return map[reason] || reason;
                };

                const formatAbsenceStatus = (status) => {
                    const map = { 'active': 'Active', 'upcoming': 'Upcoming', 'completed': 'Completed' };
                    return map[status] || status;
                };

                const formatRotationStatus = (status) => {
                    const map = {
                        'scheduled': 'Scheduled', 'active': 'Active',
                        'completed': 'Completed', 'cancelled': 'Cancelled'
                    };
                    return map[status] || status;
                };

                const formatTrialPhase = (phase) => {
                    const map = {
                        'Phase I': 'Phase I', 'Phase II': 'Phase II',
                        'Phase III': 'Phase III', 'Phase IV': 'Phase IV'
                    };
                    return map[phase] || phase;
                };

                const formatTrialStatus = (status) => {
                    const map = {
                        'Reclutando': 'Reclutando',
                        'Activo': 'Activo',
                        'Completado': 'Completado',
                        'En preparación': 'En preparación'
                    };
                    return map[status] || status;
                };

                const getUserRoleDisplay = (role) => {
                    const map = {
                        'system_admin': 'System Administrator', 'department_head': 'Department Head',
                        'attending_physician': 'Attending Physician', 'medical_resident': 'Medical Resident'
                    };
                    return map[role] || role;
                };

                const getCurrentViewTitle = () => {
                    const map = {
                        'dashboard': 'Dashboard Overview', 'medical_staff': 'Medical Staff Management',
                        'oncall_schedule': 'On-call Schedule', 'resident_rotations': 'Resident Rotations',
                        'training_units': 'Training Units', 'staff_absence': 'Staff Absence Management',
                        'department_management': 'Department Management', 'communications': 'Communications Center',
                        'research_lines': 'Research Lines', 'clinical_trials': 'Clinical Trials',
                        'innovation_projects': 'Innovation Projects'
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
                        'communications': 'Department announcements and capacity updates',
                        'research_lines': 'Research groups and coordinator assignments',
                        'clinical_trials': 'Active clinical trials and studies',
                        'innovation_projects': 'Innovation and development projects'
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
                        'communications': 'Search announcements...',
                        'research_lines': 'Search research lines...',
                        'clinical_trials': 'Search trials by protocol or title...',
                        'innovation_projects': 'Search innovation projects...'
                    };
                    return map[currentView.value] || 'Search across system...';
                };

                // ============ DATA HELPERS ============
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

                const getSupervisorName = (supervisorId) => getStaffName(supervisorId);
                const getPhysicianName = (physicianId) => getStaffName(physicianId);
                const getResidentName = (residentId) => getStaffName(residentId);

                const getDepartmentUnits = (departmentId) =>
                    trainingUnits.value.filter(unit => unit.department_id === departmentId);

                const getDepartmentStaffCount = (departmentId) =>
                    medicalStaff.value.filter(staff => staff.department_id === departmentId).length;

                const getCurrentRotationForStaff = (staffId) =>
                    rotations.value.find(r => r.resident_id === staffId && r.rotation_status === 'active') || null;

                const calculateAbsenceDuration = (startDate, endDate) =>
                    EnhancedUtils.calculateDateDifference(startDate, endDate);

                // ============ RESEARCH LINES HELPERS ============
                const getResearchLineName = (lineId) => {
                    if (!lineId) return 'Not assigned';
                    const line = researchLines.value.find(l => l.id === lineId);
                    return line ? line.research_line_name || line.name : 'Unknown Research Line';
                };

                const getCoordinatorName = (line) => {
                    if (!line) return 'Not assigned';
                    return line.coordinator_name || (line.coordinator_id ? 'Coordinator assigned' : 'Not assigned');
                };

                const getClinicianResearchLines = (clinicianId) => {
                    if (!clinicianId || !researchLines.value.length) return [];
                    return researchLines.value
                        .filter(l => l.coordinator_id === clinicianId)
                        .map(line => ({
                            line_number: line.line_number,
                            name: line.research_line_name || line.name,
                            role: 'Coordinador/a',
                            coordinator: true
                        }));
                };

                const formatResearchRole = (role) => {
                    const roles = {
                        'coordinator': 'Coordinador/a',
                        'member': 'Miembro',
                        'collaborator': 'Colaborador/a',
                        'investigator': 'Investigador'
                    };
                    return roles[role] || role;
                };

                // ============ UNIT RESIDENTS HELPERS ============
                const getUnitActiveRotationCount = (unitId) => {
                    return rotations.value.filter(r =>
                        r.training_unit_id === unitId &&
                        (r.rotation_status === 'active' || r.rotation_status === 'scheduled')
                    ).length;
                };

                const getDaysRemaining = (endDate) => {
                    if (!endDate) return 0;
                    const end = new Date(endDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
                };

                const getDaysUntilStart = (startDate) => {
                    if (!startDate) return 0;
                    const start = new Date(startDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return Math.max(0, Math.ceil((start - today) / (1000 * 60 * 60 * 24)));
                };

                // ============ UI HELPERS ============
                const getShiftStatusClass = (shift) => {
                    if (!shift || !shift.raw) return 'neumac-status-oncall';
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    if (shift.raw.duty_date === today) {
                        try {
                            if (shift.startTime && shift.endTime) {
                                const currentTime = now.getHours() * 100 + now.getMinutes();
                                const start = parseInt(shift.startTime.replace(':', ''));
                                const end = parseInt(shift.endTime.replace(':', ''));
                                if (currentTime >= start && currentTime <= end) return 'neumac-status-critical';
                            }
                        } catch {}
                    }
                    return shift.shiftType === 'Primary' ? 'neumac-status-oncall' : 'neumac-status-busy';
                };

                const isCurrentShift = (shift) => {
                    if (!shift || !shift.raw) return false;
                    const now = new Date();
                    const today = now.toISOString().split('T')[0];
                    if (shift.raw.duty_date !== today) return false;
                    try {
                        if (!shift.startTime || !shift.endTime) return false;
                        const currentTime = now.getHours() * 100 + now.getMinutes();
                        const start = parseInt(shift.startTime.replace(':', ''));
                        const end = parseInt(shift.endTime.replace(':', ''));
                        return currentTime >= start && currentTime <= end;
                    } catch { return false; }
                };

                const getStaffTypeIcon = (staffType) => {
                    const icons = {
                        'attending_physician': 'fa-user-md', 'medical_resident': 'fa-user-graduate',
                        'fellow': 'fa-user-tie', 'nurse_practitioner': 'fa-user-nurse'
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
                        'vacation': 'fa-umbrella-beach', 'sick_leave': 'fa-procedures',
                        'conference': 'fa-chalkboard-teacher', 'training': 'fa-graduation-cap',
                        'personal': 'fa-user-clock', 'other': 'fa-question-circle'
                    };
                    return icons[reason] || 'fa-clock';
                };

                const getScheduleIcon = (activity) => {
                    if (!activity) return 'fa-calendar-check';
                    const a = activity.toLowerCase();
                    if (a.includes('round')) return 'fa-stethoscope';
                    if (a.includes('clinic')) return 'fa-clinic-medical';
                    if (a.includes('surgery')) return 'fa-scalpel-path';
                    if (a.includes('meeting')) return 'fa-users';
                    if (a.includes('lecture')) return 'fa-chalkboard-teacher';
                    if (a.includes('consultation')) return 'fa-comments-medical';
                    return 'fa-calendar-check';
                };

                // ============ PROFILE FUNCTIONS ============
                const getCurrentUnit = (staffId) => {
                    const rotation = rotations.value.find(r =>
                        r.resident_id === staffId && r.rotation_status === 'active');
                    return rotation ? getTrainingUnitName(rotation.training_unit_id) : 'Not assigned';
                };

                const getCurrentWard = (staffId) => {
                    const rotation = rotations.value.find(r =>
                        r.resident_id === staffId && r.rotation_status === 'active');
                    if (rotation && rotation.training_unit_id) {
                        const unit = trainingUnits.value.find(u => u.id === rotation.training_unit_id);
                        if (unit) return unit.unit_name;
                    }
                    return 'Not assigned';
                };

                const getCurrentActivityStatus = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    const onCall = onCallSchedule.value.find(s =>
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date === today);
                    return onCall ? 'oncall' : 'available';
                };

                const isOnCallToday = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    return onCallSchedule.value.some(s =>
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date === today);
                };

                const getOnCallShiftTime = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    const schedule = onCallSchedule.value.find(s =>
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date === today);
                    return schedule ? `${schedule.start_time} - ${schedule.end_time}` : 'N/A';
                };

                const getOnCallCoverage = (staffId) => {
                    const today = new Date().toISOString().split('T')[0];
                    const schedule = onCallSchedule.value.find(s =>
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date === today);
                    return schedule ? schedule.coverage_area : 'N/A';
                };

                const getRotationSupervisor = (staffId) => {
                    const rotation = rotations.value.find(r =>
                        r.resident_id === staffId && r.rotation_status === 'active');
                    return rotation?.supervising_attending_id
                        ? getStaffName(rotation.supervising_attending_id)
                        : 'Not assigned';
                };

                const getRotationDaysLeft = (staffId) => {
                    const rotation = rotations.value.find(r =>
                        r.resident_id === staffId && r.rotation_status === 'active');
                    return rotation?.rotation_end_date
                        ? getDaysRemaining(rotation.rotation_end_date)
                        : 0;
                };

                const getUpcomingOnCall = (staffId) => {
                    if (!staffId) return [];
                    const today = new Date().toISOString().split('T')[0];
                    return onCallSchedule.value.filter(s =>
                        (s.primary_physician_id === staffId || s.backup_physician_id === staffId) &&
                        s.duty_date >= today
                    ).sort((a, b) => a.duty_date.localeCompare(b.duty_date));
                };

                const getUpcomingLeave = (staffId) => {
                    if (!staffId) return [];
                    const today = new Date().toISOString().split('T')[0];
                    return absences.value.filter(a =>
                        a.staff_member_id === staffId &&
                        a.start_date >= today &&
                        a.current_status !== 'cancelled'
                    ).sort((a, b) => a.start_date.localeCompare(b.start_date));
                };

                const getRotationHistory = (staffId) => {
                    if (!staffId) return [];
                    return rotations.value.filter(r =>
                        r.resident_id === staffId &&
                        r.rotation_status !== 'active' &&
                        r.rotation_status !== 'scheduled'
                    ).sort((a, b) =>
                        new Date(b.end_date || b.rotation_end_date) -
                        new Date(a.end_date || a.rotation_end_date)
                    );
                };

                const hasProfessionalCredentials = (staff) =>
                    !!(staff?.academic_degree || staff?.specialization || staff?.training_year ||
                       staff?.clinical_certificate || staff?.medical_license);

                // ============ STATUS LOCATION PARSER ============
                const getStatusLocation = (status) => {
                    if (!status || !status.status_text) return 'Pulmonology Department';
                    if (status.location) return status.location;
                    if (status.department) return status.department;
                    if (status.coverage_area) return status.coverage_area;
                    const text = status.status_text.toLowerCase();
                    if (text.includes('icu') || text.includes('intensive care')) return 'Respiratory ICU';
                    if (text.includes('respiratory') || text.includes('pulmonology') || text.includes('lung')) return 'Pulmonology Department';
                    if (text.includes('bronchoscopy') || text.includes('pft') || text.includes('pulmonary function')) return 'Pulmonary Procedure Unit';
                    if (text.includes('sleep') || text.includes('cpap') || text.includes('bipap')) return 'Sleep Medicine Lab';
                    if (text.includes('ventilator') || text.includes('mech vent') || text.includes('respiratory therapy')) return 'Respiratory Therapy Unit';
                    if (text.includes('oxygen') || text.includes('o2') || text.includes('gas exchange')) return 'Oxygen Therapy Unit';
                    if (text.includes('interstitial') || text.includes('ild') || text.includes('pulmonary fibrosis')) return 'Interstitial Lung Disease Clinic';
                    if (text.includes('asthma') || text.includes('copd') || text.includes('chronic obstructive')) return 'Chronic Airways Clinic';
                    if (text.includes('tuberculosis') || text.includes('tb') || text.includes('mycobacterium')) return 'TB/Respiratory Infections Unit';
                    if (text.includes('er') || text.includes('emergency') || text.includes('triage')) return 'Emergency Department';
                    if (text.includes('ward') || text.includes('floor') || text.includes('bed')) return 'General Ward';
                    if (text.includes('surgery') || text.includes('operating room') || text.includes('thoracic')) return 'Thoracic Surgery';
                    return 'Pulmonology Department';
                };

                const getRecentStatuses = () => clinicalStatusHistory.value;
                const recentStatuses = computed(() => clinicalStatusHistory.value);

                // ============ LIVE STATUS ============
                const getStatusBadgeClass = (status) => {
                    if (!status) return 'badge-gray';
                    return isStatusExpired(status.expires_at) ? 'badge-warning' : 'badge-success';
                };

                const calculateTimeRemaining = (expiryTime) => {
                    if (!expiryTime) return 'N/A';
                    try {
                        const diff = new Date(expiryTime) - new Date();
                        if (diff <= 0) return 'Expired';
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                    } catch { return 'N/A'; }
                };

                const refreshStatus = () => {
                    loadClinicalStatus();
                    loadSystemStats();
                    showToast('Status Refreshed', 'Live status updated', 'info');
                };

                const setQuickStatus = (status) => {
                    quickStatus.value = status;
                    switch (status) {
                        case 'normal':
                            communicationsModal.form.dailySummary = 'All systems normal. No critical issues.';
                            Object.assign(communicationsModal.form.alerts, { erBusy: false, icuFull: false, wardFull: false, staffShortage: false });
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
                        'all_staff': 'All Staff', 'medical_staff': 'Medical Staff',
                        'residents': 'Residents', 'attendings': 'Attending Physicians'
                    };
                    return audiences[audience] || audience;
                };

                const getPreviewCardClass = () => {
                    const t = absenceModal.form.absence_type;
                    if (t === 'planned') return 'planned';
                    if (t === 'unplanned') return 'unplanned';
                    return 'active';
                };

                const getPreviewIcon = () => {
                    const icons = {
                        'vacation': 'fas fa-umbrella-beach text-blue-500',
                        'conference': 'fas fa-chalkboard-teacher text-green-500',
                        'sick_leave': 'fas fa-heartbeat text-red-500',
                        'training': 'fas fa-graduation-cap text-purple-500',
                        'personal': 'fas fa-home text-yellow-500',
                        'other': 'fas fa-ellipsis-h text-gray-500'
                    };
                    return icons[absenceModal.form.absence_reason] || 'fas fa-clock text-gray-500';
                };

                const getPreviewReasonText = () => formatAbsenceReason(absenceModal.form.absence_reason);

                const getPreviewStatusClass = () => {
                    const t = absenceModal.form.absence_type;
                    if (t === 'planned') return 'status-planned';
                    if (t === 'unplanned') return 'status-unplanned';
                    return 'status-active';
                };

                const getPreviewStatusText = () => {
                    const t = absenceModal.form.absence_type;
                    return t === 'planned' ? 'Planned' : t === 'unplanned' ? 'Unplanned' : 'Active';
                };

                const updatePreview = () => {};

                const isStatusExpired = (expiresAt) => {
                    if (!expiresAt) return true;
                    try { return new Date() > new Date(expiresAt); }
                    catch { return true; }
                };

                const showCreateStatusModal = () => {
                    liveStatsEditMode.value = true;
                    newStatusText.value = '';
                    selectedAuthorId.value = '';
                    expiryHours.value = 8;
                };

                // ============ CLINICAL STATUS LOADERS ============
                const loadClinicalStatus = async () => {
                    isLoadingStatus.value = true;
                    try {
                        const response = await API.getClinicalStatus();
                        clinicalStatus.value = (response && response.success) ? response.data : null;
                    } catch { clinicalStatus.value = null; }
                    finally { isLoadingStatus.value = false; }
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
                                    try { return now < new Date(status.expires_at); }
                                    catch { return true; }
                                }
                                return true;
                            })
                            .slice(0, 5);
                    } catch { clinicalStatusHistory.value = []; }
                };

                const loadActiveMedicalStaff = async () => {
                    try {
                        const data = await API.getMedicalStaff();
                        activeMedicalStaff.value = data.filter(s => s.employment_status === 'active');
                        if (currentUser.value) {
                            const found = activeMedicalStaff.value.find(
                                s => s.professional_email === currentUser.value.email);
                            if (found) selectedAuthorId.value = found.id;
                        }
                    } catch { activeMedicalStaff.value = []; }
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
                                if (clinicalStatusHistory.value.length > 5)
                                    clinicalStatusHistory.value = clinicalStatusHistory.value.slice(0, 5);
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
                        showToast('Error', error.message || 'Could not update status. Please try again.', 'error');
                    } finally { isLoadingStatus.value = false; }
                };

                // ============ DELETE FUNCTIONS ============
                const deleteMedicalStaff = async (staff) => {
                    showConfirmation({
                        title: 'Delete Medical Staff',
                        message: `Are you sure you want to delete ${staff.full_name}?`,
                        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
                        details: 'This action cannot be undone.',
                        onConfirm: async () => {
                            try {
                                await API.deleteMedicalStaff(staff.id);
                                const index = medicalStaff.value.findIndex(s => s.id === staff.id);
                                if (index > -1) medicalStaff.value.splice(index, 1);
                                showToast('Success', 'Medical staff deleted successfully', 'success');
                                updateDashboardStats();
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                const deleteRotation = async (rotation) => {
                    showConfirmation({
                        title: 'Delete Rotation',
                        message: 'Are you sure you want to delete this rotation?',
                        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
                        details: `Resident: ${getResidentName(rotation.resident_id)}`,
                        onConfirm: async () => {
                            try {
                                await API.deleteRotation(rotation.id);
                                const index = rotations.value.findIndex(r => r.id === rotation.id);
                                if (index > -1) rotations.value.splice(index, 1);
                                showToast('Success', 'Rotation deleted successfully', 'success');
                                updateDashboardStats();
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                const deleteOnCallSchedule = async (schedule) => {
                    showConfirmation({
                        title: 'Delete On-Call Schedule',
                        message: 'Are you sure you want to delete this on-call schedule?',
                        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
                        details: `Physician: ${getPhysicianName(schedule.primary_physician_id)}`,
                        onConfirm: async () => {
                            try {
                                await API.deleteOnCall(schedule.id);
                                const index = onCallSchedule.value.findIndex(s => s.id === schedule.id);
                                if (index > -1) onCallSchedule.value.splice(index, 1);
                                showToast('Success', 'On-call schedule deleted successfully', 'success');
                                loadTodaysOnCall();
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                const deleteAbsence = async (absence) => {
                    showConfirmation({
                        title: 'Delete Absence',
                        message: 'Are you sure you want to delete this absence record?',
                        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
                        details: `Staff: ${getStaffName(absence.staff_member_id)}`,
                        onConfirm: async () => {
                            try {
                                await API.deleteAbsence(absence.id);
                                const index = absences.value.findIndex(a => a.id === absence.id);
                                if (index > -1) absences.value.splice(index, 1);
                                showToast('Success', 'Absence deleted successfully', 'success');
                                updateDashboardStats();
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                const deleteAnnouncement = async (announcement) => {
                    showConfirmation({
                        title: 'Delete Announcement',
                        message: `Are you sure you want to delete "${announcement.title}"?`,
                        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteAnnouncement(announcement.id);
                                const index = announcements.value.findIndex(a => a.id === announcement.id);
                                if (index > -1) announcements.value.splice(index, 1);
                                showToast('Success', 'Announcement deleted successfully', 'success');
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                const deleteClinicalStatus = async () => {
                    if (!clinicalStatus.value) return;
                    showConfirmation({
                        title: 'Clear Live Status',
                        message: 'Are you sure you want to clear the current live status?',
                        icon: 'fa-trash', confirmButtonText: 'Clear', confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try {
                                await API.deleteClinicalStatus(clinicalStatus.value.id);
                                clinicalStatus.value = null;
                                showToast('Success', 'Live status cleared', 'success');
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                // Research Delete Functions
                const deleteResearchLine = async (line) => {
                    showConfirmation({
                        title: 'Delete Research Line',
                        message: `Are you sure you want to delete "${line.research_line_name || line.name}"?`,
                        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
                        details: 'This will remove the research line and all associated data.',
                        onConfirm: async () => {
                            try {
                                await API.deleteResearchLine(line.id);
                                await loadResearchLines();
                                showToast('Success', 'Research line deleted successfully', 'success');
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                const deleteClinicalTrial = async (trial) => {
                    showConfirmation({
                        title: 'Delete Clinical Trial',
                        message: `Are you sure you want to delete "${trial.title}"?`,
                        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
                        details: `Protocol: ${trial.protocol_id}`,
                        onConfirm: async () => {
                            try {
                                await API.deleteClinicalTrial(trial.id);
                                await loadClinicalTrials();
                                showToast('Success', 'Clinical trial deleted successfully', 'success');
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                const deleteInnovationProject = async (project) => {
                    showConfirmation({
                        title: 'Delete Innovation Project',
                        message: `Are you sure you want to delete "${project.title}"?`,
                        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
                        details: 'This action cannot be undone.',
                        onConfirm: async () => {
                            try {
                                await API.deleteInnovationProject(project.id);
                                await loadInnovationProjects();
                                showToast('Success', 'Innovation project deleted successfully', 'success');
                            } catch (error) { showToast('Error', error.message, 'error'); }
                        }
                    });
                };

                // ============ DATA LOADING ============
                const loadMedicalStaff = async () => {
                    try { medicalStaff.value = await API.getMedicalStaff(); }
                    catch { showToast('Error', 'Failed to load medical staff', 'error'); }
                };

                const loadDepartments = async () => {
                    try { departments.value = await API.getDepartments(); }
                    catch { showToast('Error', 'Failed to load departments', 'error'); }
                };

                const loadTrainingUnits = async () => {
                    try { trainingUnits.value = await API.getTrainingUnits(); }
                    catch { showToast('Error', 'Failed to load training units', 'error'); }
                };

                const loadRotations = async () => {
                    try { rotations.value = await API.getRotations(); }
                    catch { showToast('Error', 'Failed to load rotations', 'error'); }
                };

                const loadAbsences = async () => {
                    try { absences.value = await API.getAbsences(); }
                    catch { showToast('Error', 'Failed to load absences', 'error'); }
                };

                const loadOnCallSchedule = async () => {
                    try {
                        loadingSchedule.value = true;
                        onCallSchedule.value = await API.getOnCallSchedule();
                    } catch { showToast('Error', 'Failed to load on-call schedule', 'error'); }
                    finally { loadingSchedule.value = false; }
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
                            if (item.shift_type === 'primary_call' || item.shift_type === 'primary') shiftTypeDisplay = 'Primary';
                            else if (item.shift_type === 'backup_call' || item.shift_type === 'backup' || item.shift_type === 'secondary') shiftTypeDisplay = 'Backup';
                            const matchingStaff = medicalStaff.value.find(s => s.id === item.primary_physician_id);
                            return {
                                id: item.id, startTime, endTime, physicianName,
                                staffType: matchingStaff ? formatStaffType(matchingStaff.staff_type) : 'Physician',
                                shiftType: shiftTypeDisplay,
                                coverageArea: item.coverage_area || 'General Coverage',
                                backupPhysician: item.backup_physician?.full_name || null,
                                contactInfo: item.primary_physician?.professional_email || 'No contact info',
                                raw: item
                            };
                        });
                    } catch {
                        showToast('Error', "Failed to load today's on-call schedule", 'error');
                        todaysOnCall.value = [];
                    } finally { loadingSchedule.value = false; }
                };

                const loadAnnouncements = async () => {
                    try { announcements.value = await API.getAnnouncements(); }
                    catch { showToast('Error', 'Failed to load announcements', 'error'); }
                };

                const loadSystemStats = async () => {
                    try {
                        const data = await API.getSystemStats();
                        if (data && data.success) Object.assign(systemStats.value, data.data);
                    } catch {}
                };

                // ============ RESEARCH LINES LOADERS ============
                const loadResearchLines = async () => {
                    try {
                        const data = await API.getResearchLines();
                        researchLines.value = data;
                    } catch (error) {
                        showToast('Error', 'Failed to load research lines', 'error');
                    }
                };

                const loadClinicalTrials = async () => {
                    try {
                        const data = await API.getAllClinicalTrials();
                        clinicalTrials.value = data;
                    } catch (error) {}
                };

                const loadInnovationProjects = async () => {
                    try {
                        const data = await API.getAllInnovationProjects();
                        innovationProjects.value = data;
                    } catch (error) {}
                };

                // ============ COORDINATOR ASSIGNMENT ============
                const assignCoordinator = async (researchLineId, coordinatorId) => {
                    try {
                        const result = await API.assignCoordinator(researchLineId, coordinatorId);
                        await loadResearchLines();
                        showToast('Success', 
                            coordinatorId ? 'Coordinator assigned successfully' : 'Coordinator removed',
                            'success'
                        );
                        return result;
                    } catch (error) {
                        showToast('Error', error.message || 'Failed to assign coordinator', 'error');
                        throw error;
                    }
                };

                // ============ RESEARCH CRUD FUNCTIONS ============

                // Research Lines
                const saveResearchLine = async () => {
                    saving.value = true;
                    try {
                        if (researchLineModal.mode === 'add') {
                            const result = await API.createResearchLine(researchLineModal.form);
                            researchLines.value.unshift(result);
                            showToast('Success', 'Research line created successfully', 'success');
                        } else {
                            const result = await API.updateResearchLine(researchLineModal.form.id, researchLineModal.form);
                            const index = researchLines.value.findIndex(l => l.id === result.id);
                            if (index !== -1) researchLines.value[index] = result;
                            showToast('Success', 'Research line updated successfully', 'success');
                        }
                        researchLineModal.show = false;
                        await loadResearchLines();
                    } catch (error) {
                        showToast('Error', error.message || 'Failed to save research line', 'error');
                    } finally { saving.value = false; }
                };

                const showAddResearchLineModal = () => {
                    researchLineModal.mode = 'add';
                    researchLineModal.form = {
                        line_number: researchLines.value.length + 1,
                        name: '',
                        description: '',
                        capabilities: 'Alcance y capacidades',
                        sort_order: researchLines.value.length + 1,
                        active: true
                    };
                    researchLineModal.show = true;
                };

                const editResearchLine = (line) => {
                    researchLineModal.mode = 'edit';
                    researchLineModal.form = { ...line };
                    researchLineModal.show = true;
                };

                // Clinical Trials
                const saveClinicalTrial = async () => {
                    saving.value = true;
                    try {
                        if (clinicalTrialModal.mode === 'add') {
                            const result = await API.createClinicalTrial(clinicalTrialModal.form);
                            clinicalTrials.value.unshift(result);
                            showToast('Success', 'Clinical trial created successfully', 'success');
                        } else {
                            const result = await API.updateClinicalTrial(clinicalTrialModal.form.id, clinicalTrialModal.form);
                            const index = clinicalTrials.value.findIndex(t => t.id === result.id);
                            if (index !== -1) clinicalTrials.value[index] = result;
                            showToast('Success', 'Clinical trial updated successfully', 'success');
                        }
                        clinicalTrialModal.show = false;
                        await loadClinicalTrials();
                    } catch (error) {
                        showToast('Error', error.message || 'Failed to save clinical trial', 'error');
                    } finally { saving.value = false; }
                };

                const showAddTrialModal = () => {
                    clinicalTrialModal.mode = 'add';
                    clinicalTrialModal.form = {
                        protocol_id: `HUAC-${Date.now().toString().slice(-6)}`,
                        title: '',
                        research_line_id: '',
                        phase: 'Phase III',
                        status: 'Reclutando',
                        description: '',
                        inclusion_criteria: '',
                        exclusion_criteria: '',
                        principal_investigator_id: '',
                        contact_email: '',
                        featured_in_website: true,
                        display_order: clinicalTrials.value.length + 1
                    };
                    clinicalTrialModal.show = true;
                };

                const editTrial = (trial) => {
                    clinicalTrialModal.mode = 'edit';
                    clinicalTrialModal.form = { ...trial };
                    clinicalTrialModal.show = true;
                };

                // Innovation Projects
                const saveInnovationProject = async () => {
                    saving.value = true;
                    try {
                        if (innovationProjectModal.mode === 'add') {
                            const result = await API.createInnovationProject(innovationProjectModal.form);
                            innovationProjects.value.unshift(result);
                            showToast('Success', 'Innovation project created successfully', 'success');
                        } else {
                            const result = await API.updateInnovationProject(innovationProjectModal.form.id, innovationProjectModal.form);
                            const index = innovationProjects.value.findIndex(p => p.id === result.id);
                            if (index !== -1) innovationProjects.value[index] = result;
                            showToast('Success', 'Innovation project updated successfully', 'success');
                        }
                        innovationProjectModal.show = false;
                        await loadInnovationProjects();
                    } catch (error) {
                        showToast('Error', error.message || 'Failed to save innovation project', 'error');
                    } finally { saving.value = false; }
                };

                const showAddProjectModal = () => {
                    innovationProjectModal.mode = 'add';
                    innovationProjectModal.form = {
                        title: '',
                        category: 'Dispositivo',
                        development_stage: 'En Desarrollo',
                        description: '',
                        research_line_id: '',
                        lead_investigator_id: '',
                        partner_needs: [],
                        featured_in_website: true,
                        display_order: innovationProjects.value.length + 1
                    };
                    innovationProjectModal.show = true;
                };

                const editProject = (project) => {
                    innovationProjectModal.mode = 'edit';
                    innovationProjectModal.form = { ...project };
                    innovationProjectModal.show = true;
                };

                const requestFullDossier = () => {
                    showToast('Info', 'Dossier request sent. Our team will contact you shortly.', 'info');
                };

                // ============ UPDATE DASHBOARD STATS ============
                const updateDashboardStats = () => {
                    const newTotalStaff = medicalStaff.value.length;
                    const newAttending = medicalStaff.value.filter(s =>
                        s.staff_type === 'attending_physician' && s.employment_status === 'active').length;
                    const newResidents = medicalStaff.value.filter(s =>
                        s.staff_type === 'medical_resident' && s.employment_status === 'active').length;

                    if (systemStats.value.totalStaff === 0 && newTotalStaff > 0) {
                        const totalRef = { value: 0 };
                        const attendingRef = { value: 0 };
                        const residentsRef = { value: 0 };
                        animateCountUp(totalRef,    newTotalStaff, 700);
                        animateCountUp(attendingRef, newAttending,  600);
                        animateCountUp(residentsRef, newResidents,  650);
                        const syncInterval = setInterval(() => {
                            systemStats.value.totalStaff     = totalRef.value;
                            systemStats.value.activeAttending = attendingRef.value;
                            systemStats.value.activeResidents = residentsRef.value;
                            if (totalRef.value >= newTotalStaff) clearInterval(syncInterval);
                        }, 16);
                    } else {
                        systemStats.value.totalStaff     = newTotalStaff;
                        systemStats.value.activeAttending = newAttending;
                        systemStats.value.activeResidents = newResidents;
                    }

                    const today = new Date().toISOString().split('T')[0];
                    systemStats.value.onLeaveStaff = absences.value.filter(absence => {
                        const { start_date, end_date } = absence;
                        if (!start_date || !end_date) return false;
                        if (!(start_date <= today && today <= end_date)) return false;
                        if (absence.current_status) {
                            const activeStatuses = ['currently_absent', 'active', 'on_leave', 'approved'];
                            return activeStatuses.includes(absence.current_status.toLowerCase());
                        }
                        return true;
                    }).length;

                    systemStats.value.activeRotations = rotations.value.filter(r => r.rotation_status === 'active').length;

                    const todayDate = new Date();
                    const nextWeek = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    systemStats.value.endingThisWeek = rotations.value.filter(r => {
                        if (r.rotation_status !== 'active') return false;
                        const end = new Date(r.rotation_end_date);
                        return !isNaN(end.getTime()) && end >= todayDate && end <= nextWeek;
                    }).length;

                    const twoWeeks = new Date(todayDate.getTime() + 14 * 24 * 60 * 60 * 1000);
                    systemStats.value.startingNextWeek = rotations.value.filter(r => {
                        if (r.rotation_status !== 'scheduled') return false;
                        const start = new Date(r.rotation_start_date || r.start_date);
                        return !isNaN(start.getTime()) && start >= nextWeek && start <= twoWeeks;
                    }).length;

                    const todayStr = todayDate.toISOString().split('T')[0];
                    const unique = new Set();
                    onCallSchedule.value.filter(s => s.duty_date === todayStr).forEach(s => {
                        if (s.primary_physician_id) unique.add(s.primary_physician_id);
                        if (s.backup_physician_id) unique.add(s.backup_physician_id);
                    });
                    systemStats.value.onCallNow = unique.size;
                };

                // ============ LOAD ALL DATA ============
                const loadAllData = async () => {
                    loading.value = true;
                    try {
                        await Promise.all([
                            loadMedicalStaff(), loadDepartments(), loadTrainingUnits(),
                            loadRotations(), loadAbsences(), loadOnCallSchedule(),
                            loadTodaysOnCall(), loadAnnouncements(), loadClinicalStatus(), 
                            loadSystemStats(), loadResearchLines(), loadClinicalTrials(),
                            loadInnovationProjects()
                        ]);
                        await loadActiveMedicalStaff();
                        updateDashboardStats();
                        showToast('Success', 'System data loaded successfully', 'success');
                    } catch { 
                        showToast('Error', 'Failed to load some data', 'error'); 
                    }
                    finally { loading.value = false; }
                };

                // ============ AUTHENTICATION ============
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
                    } catch (error) { showToast('Error', error.message || 'Login failed', 'error'); }
                    finally { loginLoading.value = false; }
                };

                const handleLogout = () => {
                    showConfirmation({
                        title: 'Logout', message: 'Are you sure you want to logout?',
                        icon: 'fa-sign-out-alt', confirmButtonText: 'Logout', confirmButtonClass: 'btn-danger',
                        onConfirm: async () => {
                            try { await API.logout(); }
                            finally {
                                currentUser.value = null;
                                currentView.value = 'login';
                                userMenuOpen.value = false;
                                showToast('Info', 'Logged out successfully', 'info');
                            }
                        }
                    });
                };

                // ============ NAVIGATION ============
                const switchView = (view) => { currentView.value = view; mobileMenuOpen.value = false; };
                const toggleStatsSidebar = () => { statsSidebarOpen.value = !statsSidebarOpen.value; };
                const handleGlobalSearch = () => {};
                const dismissAlert = (id) => {
                    const index = systemAlerts.value.findIndex(a => a.id === id);
                    if (index > -1) systemAlerts.value.splice(index, 1);
                };

                // ============ MODAL SHOW FUNCTIONS ============
                const showAddMedicalStaffModal = () => {
                    medicalStaffModal.mode = 'add';
                    medicalStaffModal.activeTab = 'basic';
                    medicalStaffModal.form = {
                        full_name: '', staff_type: 'medical_resident',
                        staff_id: `MD-${Date.now().toString().slice(-6)}`,
                        employment_status: 'active', professional_email: '', department_id: '',
                        academic_degree: '', specialization: '', training_year: '',
                        clinical_certificate: '', certificate_status: '', resident_category: '',
                        primary_clinic: '', work_phone: '', medical_license: '',
                        can_supervise_residents: false, special_notes: '', resident_type: '',
                        home_department: '', external_institution: '', years_experience: null,
                        biography: '', date_of_birth: null, mobile_phone: '', office_phone: '', training_level: ''
                    };
                    medicalStaffModal.show = true;
                };

                const showAddDepartmentModal = () => {
                    departmentModal.mode = 'add';
                    departmentModal.form = { name: '', code: '', status: 'active', head_of_department_id: '' };
                    departmentModal.show = true;
                };

                const showAddTrainingUnitModal = () => {
                    trainingUnitModal.mode = 'add';
                    trainingUnitModal.form = {
                        unit_name: '', unit_code: '', department_id: '', maximum_residents: 10,
                        unit_status: 'active', specialty: '', supervising_attending_id: ''
                    };
                    trainingUnitModal.show = true;
                };

                const showAddRotationModal = () => {
                    rotationModal.mode = 'add';
                    rotationModal.form = {
                        rotation_id: `ROT-${Date.now().toString().slice(-6)}`,
                        resident_id: '', training_unit_id: '',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        rotation_status: 'scheduled', rotation_category: 'clinical_rotation',
                        supervising_attending_id: ''
                    };
                    rotationModal.show = true;
                };

                const showAddOnCallModal = () => {
                    onCallModal.mode = 'add';
                    onCallModal.form = {
                        duty_date: new Date().toISOString().split('T')[0],
                        shift_type: 'primary_call', start_time: '08:00', end_time: '17:00',
                        primary_physician_id: '', backup_physician_id: '',
                        coverage_area: 'emergency', coverage_notes: '',
                        schedule_id: `SCH-${Date.now().toString().slice(-6)}`
                    };
                    onCallModal.show = true;
                };

                const showAddAbsenceModal = () => {
                    absenceModal.mode = 'add';
                    absenceModal.form = {
                        staff_member_id: '', absence_type: 'planned', absence_reason: 'vacation',
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        covering_staff_id: '', coverage_notes: '', coverage_arranged: false, hod_notes: ''
                    };
                    absenceModal.show = true;
                };

                const showCommunicationsModal = () => {
                    communicationsModal.show = true;
                    communicationsModal.activeTab = 'announcement';
                    communicationsModal.form = {
                        title: '', content: '', priority: 'normal', target_audience: 'all_staff',
                        updateType: 'daily', dailySummary: '', highlight1: '', highlight2: '',
                        alerts: { erBusy: false, icuFull: false, wardFull: false, staffShortage: false },
                        metricName: '', metricValue: '', metricTrend: 'stable', metricChange: '',
                        metricNote: '', alertLevel: 'low', alertMessage: '',
                        affectedAreas: { er: false, icu: false, ward: false, surgery: false }
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

                const openAssignCoordinatorModal = (line) => {
                    assignCoordinatorModal.lineId = line.id;
                    assignCoordinatorModal.lineName = line.research_line_name || line.name;
                    assignCoordinatorModal.selectedCoordinatorId = line.coordinator_id || '';
                    assignCoordinatorModal.show = true;
                };

                const saveCoordinatorAssignment = async () => {
                    try {
                        await assignCoordinator(
                            assignCoordinatorModal.lineId,
                            assignCoordinatorModal.selectedCoordinatorId || null
                        );
                        assignCoordinatorModal.show = false;
                        showToast('Success', 'Coordinator assigned successfully', 'success');
                    } catch (error) {
                        showToast('Error', error.message || 'Failed to assign coordinator', 'error');
                    }
                };

                // ============ VIEW/EDIT FUNCTIONS ============
                const viewStaffDetails = (staff) => {
                    staffProfileModal.staff = staff;
                    staffProfileModal.activeTab = 'assignments';
                    staffProfileModal.show = true;
                };

                const viewUnitResidents = (unit) => {
                    const activeRotations = rotations.value.filter(r =>
                        r.training_unit_id === unit.id &&
                        (r.rotation_status === 'active' || r.rotation_status === 'scheduled')
                    );
                    unitResidentsModal.unit = unit;
                    unitResidentsModal.rotations = activeRotations;
                    unitResidentsModal.show = true;
                };

                const editMedicalStaff = (staff) => { medicalStaffModal.mode = 'edit'; medicalStaffModal.form = { ...staff }; medicalStaffModal.show = true; };
                const editDepartment = (department) => { departmentModal.mode = 'edit'; departmentModal.form = { ...department }; departmentModal.show = true; };
                const editTrainingUnit = (unit) => { trainingUnitModal.mode = 'edit'; trainingUnitModal.form = { ...unit }; trainingUnitModal.show = true; };
                const editRotation = (rotation) => { rotationModal.mode = 'edit'; rotationModal.form = { ...rotation }; rotationModal.show = true; };
                const editOnCallSchedule = (schedule) => {
                    onCallModal.mode = 'edit';
                    const rawShift = schedule.shift_type || 'primary_call';
                    const normalizedShift = (rawShift === 'primary' || rawShift === 'primary_call') ? 'primary_call' : 'backup_call';
                    onCallModal.form = {
                        ...schedule,
                        shift_type: normalizedShift,
                        coverage_area: schedule.coverage_area || 'emergency',
                        coverage_notes: schedule.coverage_notes || ''
                    };
                    onCallModal.show = true;
                };
                const editAbsence = (absence) => {
                    absenceModal.mode = 'edit';
                    absenceModal.form = {
                        id: absence.id,
                        staff_member_id: absence.staff_member_id || '',
                        absence_type: absence.absence_type || 'planned',
                        absence_reason: absence.absence_reason || 'vacation',
                        start_date: absence.start_date || '',
                        end_date: absence.end_date || '',
                        covering_staff_id: absence.covering_staff_id || '',
                        coverage_notes: absence.coverage_notes || '',
                        coverage_arranged: absence.coverage_arranged || false,
                        hod_notes: absence.hod_notes || '',
                        current_status: absence.current_status || null
                    };
                    absenceModal.show = true;
                };

                // ============ SAVE FUNCTIONS ============
                const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

                const saveMedicalStaff = async () => {
                    saving.value = true;
                    if (!medicalStaffModal.form.full_name?.trim()) {
                        showToast('Error', 'Full name is required', 'error');
                        saving.value = false;
                        return;
                    }
                    try {
                        const clean = (v) => (v === null || v === undefined) ? '' : String(v).trim();
                        const staffData = {
                            full_name: medicalStaffModal.form.full_name.trim(),
                            staff_type: medicalStaffModal.form.staff_type || 'medical_resident',
                            staff_id: medicalStaffModal.form.staff_id || EnhancedUtils.generateId('MD'),
                            employment_status: medicalStaffModal.form.employment_status || 'active',
                            professional_email: medicalStaffModal.form.professional_email || '',
                            department_id: medicalStaffModal.form.department_id || null,
                            academic_degree: clean(medicalStaffModal.form.academic_degree),
                            specialization: clean(medicalStaffModal.form.specialization),
                            training_year: clean(medicalStaffModal.form.training_year),
                            clinical_certificate: clean(medicalStaffModal.form.clinical_certificate),
                            certificate_status: clean(medicalStaffModal.form.certificate_status),
                            resident_category: clean(medicalStaffModal.form.resident_category),
                            primary_clinic: clean(medicalStaffModal.form.primary_clinic),
                            work_phone: clean(medicalStaffModal.form.work_phone),
                            medical_license: clean(medicalStaffModal.form.medical_license),
                            can_supervise_residents: medicalStaffModal.form.can_supervise_residents || false,
                            special_notes: clean(medicalStaffModal.form.special_notes),
                            resident_type: clean(medicalStaffModal.form.resident_type),
                            home_department: clean(medicalStaffModal.form.home_department),
                            external_institution: clean(medicalStaffModal.form.external_institution),
                            years_experience: medicalStaffModal.form.years_experience || null,
                            biography: clean(medicalStaffModal.form.biography),
                            date_of_birth: medicalStaffModal.form.date_of_birth || null,
                            mobile_phone: clean(medicalStaffModal.form.mobile_phone),
                            office_phone: clean(medicalStaffModal.form.office_phone),
                            training_level: clean(medicalStaffModal.form.training_level)
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
                        showToast('Error', error.message || 'Failed to save medical staff', 'error');
                    } finally { saving.value = false; }
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
                    } catch (error) { showToast('Error', error.message, 'error'); }
                    finally { saving.value = false; }
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
                    } catch (error) { showToast('Error', error.message, 'error'); }
                    finally { saving.value = false; }
                };
const saveRotation = async () => {
    // ============ VALIDATION ============
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

    // ============ DATE PARSING - STABLE VERSION ============
    let startDate, endDate;
    
    try {
        // Helper function to parse date safely
        const parseDateSafely = (dateStr, isEndDate = false) => {
            // If it's already YYYY-MM-DD format
            if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return isEndDate 
                    ? new Date(dateStr + 'T23:59:59')
                    : new Date(dateStr + 'T00:00:00');
            }
            
            // Try to parse any date string
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            return date;
        };

        startDate = parseDateSafely(startDateStr, false);
        endDate = parseDateSafely(endDateStr, true);

        // Format dates to YYYY-MM-DD for the backend
        rotationModal.form.start_date = startDate.toISOString().split('T')[0];
        rotationModal.form.end_date = endDate.toISOString().split('T')[0];

    } catch (error) {
        showToast('Error', 'Invalid date format. Please use YYYY-MM-DD', 'error');
        return;
    }

    // ============ DATE VALIDATION ============
    if (endDate <= startDate) { 
        showToast('Error', 'End date must be after start date', 'error'); 
        return; 
    }

    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (duration > 365) { 
        showToast('Error', `Rotation cannot exceed 365 days. Current: ${duration} days`, 'error'); 
        return; 
    }

    // ============ OVERLAP CHECK ============
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date(NaN);
        // Handle YYYY-MM-DD format
        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return new Date(dateStr + 'T00:00:00');
        }
        return new Date(dateStr);
    };

    const newStart = parseDate(rotationModal.form.start_date);
    const newEnd = parseDate(rotationModal.form.end_date);
    newEnd.setHours(23, 59, 59, 999);

    const excludeId = rotationModal.mode === 'edit' ? rotationModal.form.id : null;
    
    const hasOverlap = rotations.value.some(r => {
        if (r.resident_id !== rotationModal.form.resident_id) return false;
        if (r.rotation_status === 'cancelled') return false;
        if (excludeId && r.id === excludeId) return false;
        
        const eStart = parseDate(r.rotation_start_date || r.start_date);
        const eEnd = parseDate(r.rotation_end_date || r.end_date);
        
        if (isNaN(eStart.getTime()) || isNaN(eEnd.getTime())) return false;
        
        eEnd.setHours(23, 59, 59, 999);
        return newStart <= eEnd && newEnd >= eStart;
    });

    if (hasOverlap) {
        showToast('Scheduling Conflict',
            `${getResidentName(rotationModal.form.resident_id)} already has a rotation during these dates.`,
            'error');
        return;
    }

    // ============ SAVE ROTATION ============
    saving.value = true;
    
    try {
        // Prepare data for API - ensure dates are in YYYY-MM-DD format
        const rotationData = {
            rotation_id: rotationModal.form.rotation_id || EnhancedUtils.generateId('ROT'),
            resident_id: rotationModal.form.resident_id,
            training_unit_id: rotationModal.form.training_unit_id,
            supervising_attending_id: rotationModal.form.supervising_attending_id || null,
            start_date: rotationModal.form.start_date, // Already in YYYY-MM-DD
            end_date: rotationModal.form.end_date,     // Already in YYYY-MM-DD
            rotation_category: rotationModal.form.rotation_category || 'clinical_rotation',
            rotation_status: (rotationModal.form.rotation_status || 'scheduled').toLowerCase()
        };

        console.log('📤 Sending rotation data:', rotationData); // For debugging

        if (rotationModal.mode === 'add') {
            const result = await API.createRotation(rotationData);
            rotations.value.unshift(result);
            showToast('Success', 'Rotation scheduled successfully', 'success');
        } else {
            const result = await API.updateRotation(rotationModal.form.id, rotationData);
            const index = rotations.value.findIndex(r => r.id === result.id);
            if (index !== -1) rotations.value[index] = result;
            showToast('Success', 'Rotation updated successfully', 'success');
        }
        
        rotationModal.show = false;
        await loadRotations();
        updateDashboardStats();
        
    } catch (error) {
        console.error('❌ Rotation save error:', error);
        let msg = error.message || 'Failed to save rotation';
        
        // User-friendly error messages
        if (msg.includes('overlapping')) {
            msg = 'Rotation dates conflict with existing schedule.';
        } else if (msg.includes('date')) {
            msg = 'Invalid date format. Please use YYYY-MM-DD.';
        } else if (msg.includes('resident_id')) {
            msg = 'Invalid resident selected. Please try again.';
        } else if (msg.includes('training_unit_id')) {
            msg = 'Invalid training unit selected. Please try again.';
        }
        
        showToast('Error', msg, 'error');
    } finally { 
        saving.value = false; 
    }
};

                const saveOnCallSchedule = async () => {
                    saving.value = true;
                    try {
                        const onCallData = {
                            duty_date: onCallModal.form.duty_date,
                            shift_type: onCallModal.form.shift_type || 'primary_call',
                            start_time: onCallModal.form.start_time || '08:00',
                            end_time: onCallModal.form.end_time || '17:00',
                            primary_physician_id: onCallModal.form.primary_physician_id,
                            backup_physician_id: onCallModal.form.backup_physician_id || null,
                            coverage_notes: onCallModal.form.coverage_notes || '',
                            schedule_id: onCallModal.form.schedule_id || EnhancedUtils.generateId('SCH')
                        };
                        if (onCallModal.mode === 'add') {
                            const result = await API.createOnCall(onCallData);
                            onCallSchedule.value.unshift({ ...result, coverage_area: onCallModal.form.coverage_area });
                            showToast('Success', 'On-call scheduled successfully', 'success');
                        } else {
                            const result = await API.updateOnCall(onCallModal.form.id, onCallData);
                            const index = onCallSchedule.value.findIndex(s => s.id === result.id);
                            if (index !== -1) onCallSchedule.value[index] = { ...result, coverage_area: onCallModal.form.coverage_area };
                            showToast('Success', 'On-call updated successfully', 'success');
                        }
                        onCallModal.show = false;
                        loadTodaysOnCall();
                    } catch (error) { showToast('Error', error.message || 'Failed to save on-call schedule', 'error'); }
                    finally { saving.value = false; }
                };

                const saveAbsence = async () => {
                    saving.value = true;
                    try {
                        const absenceData = {
                            staff_member_id: absenceModal.form.staff_member_id,
                            absence_type: absenceModal.form.absence_type || 'planned',
                            absence_reason: absenceModal.form.absence_reason || 'vacation',
                            start_date: absenceModal.form.start_date,
                            end_date: absenceModal.form.end_date,
                            coverage_arranged: absenceModal.form.coverage_arranged || false,
                            covering_staff_id: absenceModal.form.covering_staff_id || null,
                            coverage_notes: absenceModal.form.coverage_notes || '',
                            hod_notes: absenceModal.form.hod_notes || ''
                        };
                        if (absenceModal.mode === 'add') {
                            const result = await API.createAbsence(absenceData);
                            const record = result?.data || result;
                            absences.value.unshift(record);
                            showToast('Success', 'Absence recorded successfully', 'success');
                        } else {
                            const result = await API.updateAbsence(absenceModal.form.id, absenceData);
                            const record = result?.data || result;
                            const index = absences.value.findIndex(a => a.id === (record.id || absenceModal.form.id));
                            if (index !== -1) absences.value[index] = record;
                            showToast('Success', 'Absence updated successfully', 'success');
                        }
                        absenceModal.show = false;
                        await loadAbsences();
                        updateDashboardStats();
                    } catch (error) { showToast('Error', error.message || 'Failed to save absence record', 'error'); }
                    finally { saving.value = false; }
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
                    } catch (error) { showToast('Error', error.message, 'error'); }
                    finally { saving.value = false; }
                };

                const saveUserProfile = async () => {
                    saving.value = true;
                    try {
                        currentUser.value.full_name = userProfileModal.form.full_name;
                        currentUser.value.department_id = userProfileModal.form.department_id;
                        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(currentUser.value));
                        userProfileModal.show = false;
                        showToast('Success', 'Profile updated successfully', 'success');
                    } catch (error) { showToast('Error', error.message, 'error'); }
                    finally { saving.value = false; }
                };

                // ============ ACTION FUNCTIONS ============
                const contactPhysician = (shift) => {
                    if (shift.contactInfo && shift.contactInfo !== 'No contact info') {
                        showToast('Contact Physician',
                            `Would contact ${shift.physicianName} via ${shift.contactInfo.includes('@') ? 'email' : 'phone'}`,
                            'info');
                    } else {
                        showToast('No Contact Info', `No contact information available for ${shift.physicianName}`, 'warning');
                    }
                };

                const viewAnnouncement = (announcement) => {
                    showToast(announcement.title, EnhancedUtils.truncateText(announcement.content, 100), 'info');
                };

                const viewDepartmentStaff = (department) => {
                    showToast('Department Staff', `Viewing staff for ${department.name}`, 'info');
                };

                // ============ PERMISSIONS ============
                const hasPermission = (module, action = 'read') => {
                    const role = currentUser.value?.user_role;
                    if (!role) return false;
                    if (role === 'system_admin') return true;
                    const permissions = PERMISSION_MATRIX[role]?.[module];
                    if (!permissions) return false;
                    return permissions.includes(action) || permissions.includes('*');
                };

                // ============ COMPUTED PROPERTIES ============
                const authToken = computed(() => localStorage.getItem(CONFIG.TOKEN_KEY));
                const unreadAnnouncements = computed(() => announcements.value.filter(a => !a.read).length);
                const unreadLiveUpdates = computed(() => {
                    if (!clinicalStatus.value) return 0;
                    return localStorage.getItem('lastSeenStatusId') !== clinicalStatus.value.id ? 1 : 0;
                });
                const formattedExpiry = computed(() => {
                    if (!clinicalStatus.value?.expires_at) return '';
                    const diffHours = Math.ceil((new Date(clinicalStatus.value.expires_at) - new Date()) / (1000 * 60 * 60));
                    if (diffHours <= 1) return 'Expires soon';
                    if (diffHours <= 4) return `Expires in ${diffHours}h`;
                    return `Expires ${EnhancedUtils.formatTime(clinicalStatus.value.expires_at)}`;
                });
                const availablePhysicians = computed(() =>
                    medicalStaff.value.filter(s =>
                        (s.staff_type === 'attending_physician' || s.staff_type === 'fellow' || s.staff_type === 'nurse_practitioner') &&
                        s.employment_status === 'active'));
                const availableResidents = computed(() =>
                    medicalStaff.value.filter(s => s.staff_type === 'medical_resident' && s.employment_status === 'active'));
                const availableAttendings = computed(() =>
                    medicalStaff.value.filter(s => s.staff_type === 'attending_physician' && s.employment_status === 'active'));
                const availableHeadsOfDepartment = computed(() => availableAttendings.value);
                const availableReplacementStaff = computed(() =>
                    medicalStaff.value.filter(s => s.employment_status === 'active' && s.staff_type === 'medical_resident'));

                const filteredMedicalStaff = computed(() => {
                    let filtered = medicalStaff.value;
                    if (staffFilters.search) {
                        const search = staffFilters.search.toLowerCase();
                        filtered = filtered.filter(s =>
                            s.full_name?.toLowerCase().includes(search) ||
                            s.staff_id?.toLowerCase().includes(search) ||
                            s.professional_email?.toLowerCase().includes(search));
                    }
                    if (staffFilters.staffType) filtered = filtered.filter(s => s.staff_type === staffFilters.staffType);
                    if (staffFilters.department) filtered = filtered.filter(s => s.department_id === staffFilters.department);
                    if (staffFilters.status) filtered = filtered.filter(s => s.employment_status === staffFilters.status);
                    return filtered;
                });

                const filteredOnCallSchedules = computed(() => {
                    let filtered = onCallSchedule.value;
                    if (onCallFilters.date) filtered = filtered.filter(s => s.duty_date === onCallFilters.date);
                    if (onCallFilters.shiftType) filtered = filtered.filter(s => s.shift_type === onCallFilters.shiftType);
                    if (onCallFilters.physician) filtered = filtered.filter(s =>
                        s.primary_physician_id === onCallFilters.physician ||
                        s.backup_physician_id === onCallFilters.physician);
                    if (onCallFilters.coverageArea) filtered = filtered.filter(s => s.coverage_area === onCallFilters.coverageArea);
                    return filtered;
                });

                const filteredRotations = computed(() => {
                    let filtered = rotations.value;
                    if (rotationFilters.resident) filtered = filtered.filter(r => r.resident_id === rotationFilters.resident);
                    if (rotationFilters.status) filtered = filtered.filter(r => r.rotation_status === rotationFilters.status);
                    if (rotationFilters.trainingUnit) filtered = filtered.filter(r => r.training_unit_id === rotationFilters.trainingUnit);
                    if (rotationFilters.supervisor) filtered = filtered.filter(r => r.supervising_attending_id === rotationFilters.supervisor);
                    return filtered;
                });

                const filteredAbsences = computed(() => {
                    let filtered = absences.value;
                    if (absenceFilters.staff) filtered = filtered.filter(a => a.staff_member_id === absenceFilters.staff);
                    if (absenceFilters.status) filtered = filtered.filter(a => {
                        const status = a.current_status || a.status || a.absence_status;
                        return status === absenceFilters.status;
                    });
                    if (absenceFilters.reason) filtered = filtered.filter(a => a.absence_reason === absenceFilters.reason);
                    if (absenceFilters.startDate) filtered = filtered.filter(a => a.start_date >= absenceFilters.startDate);
                    return filtered;
                });

                const filteredTrials = computed(() => {
                    if (!clinicalTrials.value.length) return [];
                    return clinicalTrials.value.filter(trial => {
                        if (trialFilters.line && trial.research_line_id !== trialFilters.line) return false;
                        if (trialFilters.phase && trial.phase !== trialFilters.phase) return false;
                        if (trialFilters.status && trial.status !== trialFilters.status) return false;
                        if (trialFilters.search) {
                            const search = trialFilters.search.toLowerCase();
                            const matchesProtocol = trial.protocol_id?.toLowerCase().includes(search);
                            const matchesTitle = trial.title?.toLowerCase().includes(search);
                            if (!matchesProtocol && !matchesTitle) return false;
                        }
                        return true;
                    });
                });

                const filteredProjects = computed(() => {
                    if (!innovationProjects.value.length) return [];
                    return innovationProjects.value.filter(project => {
                        if (projectFilters.research_line_id && project.research_line_id !== projectFilters.research_line_id) return false;
                        if (projectFilters.category && project.category !== projectFilters.category) return false;
                        if (projectFilters.search) {
                            const search = projectFilters.search.toLowerCase();
                            return project.title?.toLowerCase().includes(search) ||
                                   project.description?.toLowerCase().includes(search);
                        }
                        return true;
                    });
                });

                const recentAnnouncements = computed(() => announcements.value.slice(0, 10));
                const activeAlertsCount = computed(() =>
                    systemAlerts.value.filter(a => a.status === 'active' || !a.status).length);
                const currentTimeFormatted = computed(() => EnhancedUtils.formatTime(currentTime.value));

                // ============ LIFECYCLE ============
                onMounted(() => {
                    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
                    const user = localStorage.getItem(CONFIG.USER_KEY);
                    if (token && user) {
                        try {
                            currentUser.value = JSON.parse(user);
                            loadAllData();
                            currentView.value = 'dashboard';
                        } catch { currentView.value = 'login'; }
                    } else {
                        currentView.value = 'login';
                    }

                    const statusRefreshInterval = setInterval(() => {
                        if (currentUser.value && !isLoadingStatus.value) loadClinicalStatus();
                    }, 60000);

                    const timeInterval = setInterval(() => { currentTime.value = new Date(); }, 60000);

                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                            [medicalStaffModal, departmentModal, trainingUnitModal, rotationModal,
                             onCallModal, absenceModal, communicationsModal, staffProfileModal,
                             userProfileModal, confirmationModal, unitResidentsModal,
                             researchLineModal, clinicalTrialModal, innovationProjectModal,
                             assignCoordinatorModal
                            ].forEach(modal => { if (modal.show) modal.show = false; });
                        }
                    });

                    onUnmounted(() => {
                        clearInterval(statusRefreshInterval);
                        clearInterval(timeInterval);
                    });
                });

                watch([medicalStaff, rotations, trainingUnits, absences], () => {
                    updateDashboardStats();
                }, { deep: true });

                // ============ RETURN ============
                return {
                    // State
                    currentUser, loginForm, loginLoading, loading, saving, loadingSchedule, isLoadingStatus,
                    currentView, sidebarCollapsed, mobileMenuOpen, userMenuOpen, statsSidebarOpen, globalSearchQuery,
                    
                    // Data
                    medicalStaff, departments, trainingUnits, rotations, absences, onCallSchedule, announcements,
                    
                    // Research Data
                    researchLines, clinicalTrials, innovationProjects,
                    
                    // Live Status
                    clinicalStatus, recentStatuses, newStatusText, selectedAuthorId, expiryHours, 
                    activeMedicalStaff, liveStatsEditMode,
                    
                    // UI State
                    quickStatus, currentTime, getStatusLocation, getRecentStatuses,
                    
                    // Dashboard
                    systemStats, todaysOnCall, todaysOnCallCount,
                    
                    // UI Components
                    toasts, systemAlerts,
                    
                    // Filters
                    staffFilters, onCallFilters, rotationFilters, absenceFilters, trialFilters, projectFilters,

                    // Modals
                    staffProfileModal, unitResidentsModal, medicalStaffModal, communicationsModal,
                    onCallModal, rotationModal, trainingUnitModal, absenceModal, departmentModal,
                    userProfileModal, confirmationModal, assignCoordinatorModal,
                    researchLineModal, clinicalTrialModal, innovationProjectModal,
                    
                    // Date/Time Helpers
                    formatDate, formatDateShort, formatDatePlusDays, getTomorrow,
                    formatTime, formatRelativeTime, formatTimeAgo, getInitials,
                    formatDateTime: EnhancedUtils.formatDateTime,
                    
                    // Formatting
                    formatStaffType, getStaffTypeClass, formatEmploymentStatus, formatAbsenceReason,
                    formatAbsenceStatus, formatRotationStatus, formatTrialPhase, formatTrialStatus,
                    getUserRoleDisplay, getCurrentViewTitle, getCurrentViewSubtitle, getSearchPlaceholder,
                    
                    // Core Helpers
                    getDepartmentName, getStaffName, getTrainingUnitName, getSupervisorName,
                    getPhysicianName, getResidentName, getDepartmentUnits, getDepartmentStaffCount,
                    getCurrentRotationForStaff, calculateAbsenceDuration,
                    
                    // Research Helpers
                    getResearchLineName, getCoordinatorName, getClinicianResearchLines, formatResearchRole,
                    
                    // Unit Residents
                    getUnitActiveRotationCount, getDaysRemaining, getDaysUntilStart,
                    
                    // UI Helpers
                    getShiftStatusClass, isCurrentShift, getStaffTypeIcon, calculateCapacityPercent,
                    getCapacityDotClass, getMeterFillClass, getAbsenceReasonIcon, getScheduleIcon,
                    
                    // Profile Functions
                    getCurrentUnit, getCurrentWard, getCurrentActivityStatus,
                    isOnCallToday, getOnCallShiftTime, getOnCallCoverage,
                    getRotationSupervisor, getRotationDaysLeft,
                    hasProfessionalCredentials, getUpcomingOnCall, getUpcomingLeave, getRotationHistory,
                    
                    // Status Functions
                    getStatusBadgeClass, calculateTimeRemaining, refreshStatus, setQuickStatus,
                    formatAudience, getPreviewCardClass, getPreviewIcon, getPreviewReasonText,
                    getPreviewStatusClass, getPreviewStatusText, updatePreview,
                    
                    // Live Status Functions
                    loadClinicalStatus, loadActiveMedicalStaff, saveClinicalStatus, isStatusExpired, showCreateStatusModal,
                    
                    // Delete Functions
                    deleteMedicalStaff, deleteRotation, deleteOnCallSchedule, deleteAbsence,
                    deleteAnnouncement, deleteClinicalStatus, deleteResearchLine,
                    deleteClinicalTrial, deleteInnovationProject,
                    
                    // Toast/Confirmation
                    showToast, removeToast, dismissAlert, showConfirmation, confirmAction, cancelConfirmation,
                    
                    // Auth
                    handleLogin, handleLogout,
                    
                    // Navigation
                    switchView, toggleStatsSidebar, handleGlobalSearch,
                    
                    // Modal Show Functions
                    showAddMedicalStaffModal, showAddDepartmentModal, showAddTrainingUnitModal,
                    showAddRotationModal, showAddOnCallModal, showAddAbsenceModal,
                    showCommunicationsModal, showUserProfileModal,
                    
                    // Research Modal Functions
                    openAssignCoordinatorModal, saveCoordinatorAssignment,
                    showAddResearchLineModal, editResearchLine, saveResearchLine,
                    showAddTrialModal, editTrial, saveClinicalTrial,
                    showAddProjectModal, editProject, saveInnovationProject,
                    requestFullDossier,
                    
                    // View/Edit Functions
                    viewStaffDetails, viewUnitResidents, viewDepartmentStaff,
                    editMedicalStaff, editDepartment, editTrainingUnit, editRotation,
                    editOnCallSchedule, editAbsence,
                    
                    // Action Functions
                    contactPhysician, viewAnnouncement,
                    
                    // Research Action
                    assignCoordinator,
                    
                    // Save Functions
                    saveMedicalStaff, saveDepartment, saveTrainingUnit, saveRotation,
                    saveOnCallSchedule, saveAbsence, saveCommunication, saveUserProfile,
                    
                    // Permissions
                    hasPermission,
                    
                    // Computed Properties
                    authToken, unreadAnnouncements, unreadLiveUpdates, formattedExpiry,
                    availablePhysicians, availableResidents, availableAttendings,
                    availableHeadsOfDepartment, availableReplacementStaff,
                    filteredMedicalStaff, filteredOnCallSchedules, filteredRotations,
                    filteredTrials, filteredProjects,
                    filteredAbsences, recentAnnouncements, activeAlertsCount, currentTimeFormatted
                };
            }
        });

        app.mount('#app');

    } catch (error) {
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; margin-top: 100px; color: #333; font-family: Arial, sans-serif;">
                <h2 style="color: #dc3545;">⚠️ Application Error</h2>
                <p style="margin: 20px 0; color: #666;">The application failed to load properly. Please try refreshing the page.</p>
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
