document.addEventListener('DOMContentLoaded', function() {

    try {
        if (typeof Vue === 'undefined') {
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center; margin-top: 100px; color: #333;">
                    <h2 style="color: #dc3545;">⚠️ Critical Error</h2>
                    <p>Vue.js failed to load. Please refresh the page.</p>
                    <button onclick="window.location.reload()"
                            style="padding: 12px 24px; background: #007bff; color: white;
                                   border: none; border-radius: 6px; cursor: pointer; margin-top: 20px;">
                        Refresh Page
                    </button>
                </div>
            `;
            throw new Error('Vue.js not loaded');
        }

        const { createApp, ref, reactive, computed, onMounted, watch, onUnmounted } = Vue;

        const CONFIG = {
            API_BASE_URL: 'https://neumac.up.railway.app',
            TOKEN_KEY: 'neumocare_token',
            USER_KEY: 'neumocare_user',
            APP_VERSION: '8.0',
            DEBUG: false
        };

        class EnhancedUtils {
            static formatDate(dateString) {
                if (!dateString) return 'N/A';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return dateString;
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } catch { return dateString; }
            }
            static formatDateTime(dateString) {
                if (!dateString) return 'N/A';
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) return dateString;
                    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                } catch { return dateString; }
            }
            static getInitials(name) {
                if (!name || typeof name !== 'string') return '??';
                return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
            }
            static ensureArray(data) {
                if (Array.isArray(data)) return data;
                if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) return data.data;
                if (data && typeof data === 'object') return Object.values(data);
                return [];
            }
            static truncateText(text, maxLength = 100) {
                if (!text) return '';
                return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
            }
            static formatTime(dateString) {
                if (!dateString) return '';
                try { return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
                catch { return dateString; }
            }
            static formatRelativeTime(dateString) {
                if (!dateString) return 'Just now';
                try {
                    const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
                    if (diffMins < 1) return 'Just now';
                    if (diffMins < 60) return `${diffMins}m ago`;
                    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
                    return `${Math.floor(diffMins / 1440)}d ago`;
                } catch { return 'Just now'; }
            }
            static calculateDateDifference(startDate, endDate) {
                try {
                    const s = new Date(startDate), e = new Date(endDate);
                    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
                    return Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24));
                } catch { return 0; }
            }
            static generateId(prefix) {
                return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
            }
        }

        class ApiService {
            constructor() { this.token = localStorage.getItem(CONFIG.TOKEN_KEY) || null; }
            getHeaders() {
                const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
                const token = localStorage.getItem(CONFIG.TOKEN_KEY);
                if (token && token.trim()) headers['Authorization'] = `Bearer ${token}`;
                return headers;
            }
            async request(endpoint, options = {}) {
                const url = `${CONFIG.API_BASE_URL}${endpoint}`;
                try {
                    const config = { method: options.method || 'GET', headers: this.getHeaders(), mode: 'cors', cache: 'no-cache', credentials: 'include' };
                    if (options.body && typeof options.body === 'object') config.body = JSON.stringify(options.body);
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
                        try { errorText = await response.text(); } catch { errorText = `HTTP ${response.status}`; }
                        throw new Error(errorText);
                    }
                    const ct = response.headers.get('content-type');
                    return ct && ct.includes('application/json') ? await response.json() : await response.text();
                } catch (error) {
                    if (error.message.includes('CORS') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))
                        throw new Error('Cannot connect to server. Please check your network connection.');
                    throw error;
                }
            }
            async login(email, password) {
                try {
                    const data = await this.request('/api/auth/login', { method: 'POST', body: { email, password } });
                    if (data.token) { this.token = data.token; localStorage.setItem(CONFIG.TOKEN_KEY, data.token); localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user)); }
                    return data;
                } catch (error) { throw new Error('Login failed: ' + error.message); }
            }
            async logout() { try { await this.request('/api/auth/logout', { method: 'POST' }); } finally { this.token = null; localStorage.removeItem(CONFIG.TOKEN_KEY); localStorage.removeItem(CONFIG.USER_KEY); } }
            async getMedicalStaff() { try { return EnhancedUtils.ensureArray(await this.request('/api/medical-staff')); } catch { return []; } }
            async createMedicalStaff(d) { return this.request('/api/medical-staff', { method: 'POST', body: d }); }
            async updateMedicalStaff(id, d) { return this.request(`/api/medical-staff/${id}`, { method: 'PUT', body: d }); }
            async deleteMedicalStaff(id) { return this.request(`/api/medical-staff/${id}`, { method: 'DELETE' }); }
            async getDepartments() { try { return EnhancedUtils.ensureArray(await this.request('/api/departments')); } catch { return []; } }
            async createDepartment(d) { return this.request('/api/departments', { method: 'POST', body: d }); }
            async updateDepartment(id, d) { return this.request(`/api/departments/${id}`, { method: 'PUT', body: d }); }
            async getTrainingUnits() { try { return EnhancedUtils.ensureArray(await this.request('/api/training-units')); } catch { return []; } }
            async createTrainingUnit(d) { return this.request('/api/training-units', { method: 'POST', body: d }); }
            async updateTrainingUnit(id, d) { return this.request(`/api/training-units/${id}`, { method: 'PUT', body: d }); }
            async getRotations() { try { return EnhancedUtils.ensureArray(await this.request('/api/rotations')); } catch { return []; } }
            async createRotation(d) { return this.request('/api/rotations', { method: 'POST', body: d }); }
            async updateRotation(id, d) { return this.request(`/api/rotations/${id}`, { method: 'PUT', body: d }); }
            async deleteRotation(id) { return this.request(`/api/rotations/${id}`, { method: 'DELETE' }); }
            async getOnCallSchedule() { try { return EnhancedUtils.ensureArray(await this.request('/api/oncall')); } catch { return []; } }
            async getOnCallToday() { try { return EnhancedUtils.ensureArray(await this.request('/api/oncall/today')); } catch { return []; } }
            async createOnCall(d) { return this.request('/api/oncall', { method: 'POST', body: d }); }
            async updateOnCall(id, d) { return this.request(`/api/oncall/${id}`, { method: 'PUT', body: d }); }
            async deleteOnCall(id) { return this.request(`/api/oncall/${id}`, { method: 'DELETE' }); }
            async getAbsences() { try { return EnhancedUtils.ensureArray(await this.request('/api/absence-records')); } catch { return []; } }
            async createAbsence(d) { return this.request('/api/absence-records', { method: 'POST', body: d }); }
            async updateAbsence(id, d) { return this.request(`/api/absence-records/${id}`, { method: 'PUT', body: d }); }
            async deleteAbsence(id) { return this.request(`/api/absence-records/${id}`, { method: 'DELETE' }); }
            async getAnnouncements() { try { return EnhancedUtils.ensureArray(await this.request('/api/announcements')); } catch { return []; } }
            async createAnnouncement(d) { return this.request('/api/announcements', { method: 'POST', body: d }); }
            async updateAnnouncement(id, d) { return this.request(`/api/announcements/${id}`, { method: 'PUT', body: d }); }
            async deleteAnnouncement(id) { return this.request(`/api/announcements/${id}`, { method: 'DELETE' }); }
            async getClinicalStatus() { try { return await this.request('/api/live-status/current'); } catch (e) { return { success: false, data: null, error: e.message }; } }
            async createClinicalStatus(d) { return this.request('/api/live-status', { method: 'POST', body: d }); }
            async updateClinicalStatus(id, d) { return this.request(`/api/live-status/${id}`, { method: 'PUT', body: d }); }
            async deleteClinicalStatus(id) { return this.request(`/api/live-status/${id}`, { method: 'DELETE' }); }
            async getClinicalStatusHistory(limit = 10) { try { return EnhancedUtils.ensureArray(await this.request(`/api/live-status/history?limit=${limit}`)); } catch { return []; } }
            async getSystemStats() { try { return await this.request('/api/system-stats') || {}; } catch { return { activeAttending: 0, activeResidents: 0, onCallNow: 0, inSurgery: 0, nextShiftChange: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), pendingApprovals: 0 }; } }
        }

        const API = new ApiService();

        const app = createApp({
            setup() {

                const currentUser = ref(null);
                const loginForm = reactive({ email: '', password: '', remember_me: false });
                const loginLoading = ref(false);
                const currentView = ref('login');
                const sidebarCollapsed = ref(false);
                const mobileMenuOpen = ref(false);
                const userMenuOpen = ref(false);
                const statsSidebarOpen = ref(false);
                const globalSearchQuery = ref('');
                const loading = ref(false);
                const saving = ref(false);
                const loadingSchedule = ref(false);
                const isLoadingStatus = ref(false);
                const medicalStaff = ref([]);
                const departments = ref([]);
                const trainingUnits = ref([]);
                const rotations = ref([]);
                const absences = ref([]);
                const onCallSchedule = ref([]);
                const announcements = ref([]);
                const clinicalStatus = ref(null);
                const clinicalStatusHistory = ref([]);
                const newStatusText = ref('');
                const selectedAuthorId = ref('');
                const expiryHours = ref(8);
                const activeMedicalStaff = ref([]);
                const liveStatsEditMode = ref(false);
                const quickStatus = ref('');
                const currentTime = ref(new Date());
                const systemStats = ref({
                    totalStaff: 0, activeAttending: 0, activeResidents: 0, onCallNow: 0, inSurgery: 0,
                    activeRotations: 0, endingThisWeek: 0, startingNextWeek: 0, onLeaveStaff: 0,
                    departmentStatus: 'normal', activePatients: 0, icuOccupancy: 0, wardOccupancy: 0,
                    pendingApprovals: 0, nextShiftChange: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
                });
                const todaysOnCall = ref([]);
                const todaysOnCallCount = computed(() => todaysOnCall.value.length);
                const toasts = ref([]);
                const systemAlerts = ref([]);

                const staffFilters = reactive({ search: '', staffType: '', department: '', status: '' });
                const onCallFilters = reactive({ date: '', shiftType: '', physician: '', coverageArea: '' });
                const rotationFilters = reactive({ resident: '', status: '', trainingUnit: '', supervisor: '' });
                const absenceFilters = reactive({ staff: '', status: '', reason: '', startDate: '' });

                // Modals
                const staffProfileModal = reactive({ show: false, staff: null, activeTab: 'assignments' });
                const unitResidentsModal = reactive({ show: false, unit: null, rotations: [] });
                const medicalStaffModal = reactive({ show: false, mode: 'add', activeTab: 'basic', form: { full_name: '', staff_type: 'medical_resident', staff_id: '', employment_status: 'active', professional_email: '', department_id: '', academic_degree: '', specialization: '', resident_year: '', clinical_certificate: '', certificate_status: 'current' } });
                const communicationsModal = reactive({ show: false, activeTab: 'announcement', form: { title: '', content: '', priority: 'normal', target_audience: 'all_staff', updateType: 'daily', dailySummary: '', highlight1: '', highlight2: '', alerts: { erBusy: false, icuFull: false, wardFull: false, staffShortage: false }, metricName: '', metricValue: '', metricTrend: 'stable', metricChange: '', metricNote: '', alertLevel: 'low', alertMessage: '', affectedAreas: { er: false, icu: false, ward: false, surgery: false } } });
                const onCallModal = reactive({ show: false, mode: 'add', form: { duty_date: new Date().toISOString().split('T')[0], shift_type: 'primary', start_time: '08:00', end_time: '17:00', primary_physician_id: '', backup_physician_id: '', coverage_area: 'emergency' } });
                const rotationModal = reactive({ show: false, mode: 'add', form: { rotation_id: '', resident_id: '', training_unit_id: '', rotation_start_date: new Date().toISOString().split('T')[0], rotation_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rotation_status: 'scheduled', rotation_category: 'clinical_rotation', supervising_attending_id: '' } });
                const trainingUnitModal = reactive({ show: false, mode: 'add', form: { unit_name: '', unit_code: '', department_id: '', maximum_residents: 10, unit_status: 'active', specialty: '', supervising_attending_id: '' } });
                const absenceModal = reactive({ show: false, mode: 'add', activeTab: 'basic', form: { staff_member_id: '', absence_reason: 'vacation', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'active', replacement_staff_id: '', notes: '', leave_type: 'planned' } });
                const departmentModal = reactive({ show: false, mode: 'add', form: { name: '', code: '', status: 'active', head_of_department_id: '' } });
                const userProfileModal = reactive({ show: false, form: { full_name: '', email: '', department_id: '' } });
                const confirmationModal = reactive({ show: false, title: '', message: '', icon: 'fa-question-circle', confirmButtonText: 'Confirm', confirmButtonClass: 'btn-primary', cancelButtonText: 'Cancel', onConfirm: null, details: '' });

                const PERMISSION_MATRIX = {
                    system_admin: { medical_staff: ['create','read','update','delete'], oncall_schedule: ['create','read','update','delete'], resident_rotations: ['create','read','update','delete'], training_units: ['create','read','update','delete'], staff_absence: ['create','read','update','delete'], department_management: ['create','read','update','delete'], communications: ['create','read','update','delete'], system: ['manage_departments','manage_updates'] },
                    department_head: { medical_staff: ['read','update'], oncall_schedule: ['create','read','update'], resident_rotations: ['create','read','update'], training_units: ['read','update'], staff_absence: ['create','read','update'], department_management: ['read'], communications: ['create','read'], system: ['manage_updates'] },
                    attending_physician: { medical_staff: ['read'], oncall_schedule: ['read'], resident_rotations: ['read'], training_units: ['read'], staff_absence: ['read'], department_management: ['read'], communications: ['read'] },
                    medical_resident: { medical_staff: ['read'], oncall_schedule: ['read'], resident_rotations: ['read'], training_units: ['read'], staff_absence: ['read'], department_management: [], communications: ['read'] }
                };

                // Toast
                const showToast = (title, message, type = 'info', duration = 5000) => {
                    const icons = { info: 'fas fa-info-circle', success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle' };
                    const toast = { id: Date.now(), title, message, type, icon: icons[type], duration };
                    toasts.value.push(toast);
                    if (duration > 0) setTimeout(() => removeToast(toast.id), duration);
                };
                const removeToast = (id) => { const i = toasts.value.findIndex(t => t.id === id); if (i > -1) toasts.value.splice(i, 1); };

                // Confirmation
                const showConfirmation = (options) => { Object.assign(confirmationModal, { show: true, ...options }); };
                const confirmAction = async () => { if (confirmationModal.onConfirm) { try { await confirmationModal.onConfirm(); } catch (e) { showToast('Error', e.message, 'error'); } } confirmationModal.show = false; };
                const cancelConfirmation = () => { confirmationModal.show = false; };

                // Formatters
                const formatStaffType = (type) => ({ medical_resident: 'Medical Resident', attending_physician: 'Attending Physician', fellow: 'Fellow', nurse_practitioner: 'Nurse Practitioner' }[type] || type);
                const getStaffTypeClass = (type) => ({ medical_resident: 'badge-primary', attending_physician: 'badge-success', fellow: 'badge-info', nurse_practitioner: 'badge-warning' }[type] || 'badge-secondary');
                const formatEmploymentStatus = (s) => ({ active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' }[s] || s);
                const formatAbsenceReason = (r) => ({ vacation: 'Vacation', sick_leave: 'Sick Leave', conference: 'Conference', training: 'Training', personal: 'Personal', other: 'Other' }[r] || r);
                const formatAbsenceStatus = (s) => ({ active: 'Active', upcoming: 'Upcoming', completed: 'Completed' }[s] || s);
                const formatRotationStatus = (s) => ({ scheduled: 'Scheduled', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' }[s] || s);
                const getUserRoleDisplay = (r) => ({ system_admin: 'System Administrator', department_head: 'Department Head', attending_physician: 'Attending Physician', medical_resident: 'Medical Resident' }[r] || r);
                const getCurrentViewTitle = () => ({ dashboard: 'Dashboard Overview', medical_staff: 'Medical Staff Management', oncall_schedule: 'On-call Schedule', resident_rotations: 'Resident Rotations', training_units: 'Training Units', staff_absence: 'Staff Absence Management', department_management: 'Department Management', communications: 'Communications Center' }[currentView.value] || 'NeumoCare Dashboard');
                const getCurrentViewSubtitle = () => ({ dashboard: 'Real-time department overview and analytics', medical_staff: 'Manage physicians, residents, and clinical staff', oncall_schedule: 'View and manage on-call physician schedules', resident_rotations: 'Track and manage resident training rotations', training_units: 'Clinical training units and resident assignments', staff_absence: 'Track staff absences and coverage assignments', department_management: 'Organizational structure and clinical units', communications: 'Department announcements and capacity updates' }[currentView.value] || 'Hospital Management System');
                const getSearchPlaceholder = () => ({ dashboard: 'Search staff, units, rotations...', medical_staff: 'Search by name, ID, or email...', oncall_schedule: 'Search on-call schedules...', resident_rotations: 'Search rotations by resident or unit...', training_units: 'Search training units...', staff_absence: 'Search absences by staff member...', department_management: 'Search departments...', communications: 'Search announcements...' }[currentView.value] || 'Search across system...');

                // Data helpers
                const getDepartmentName = (id) => { if (!id) return 'Not assigned'; const d = departments.value.find(x => x.id === id); return d ? d.name : 'Unknown Department'; };
                const getStaffName = (id) => { if (!id) return 'Not assigned'; const s = medicalStaff.value.find(x => x.id === id); return s ? s.full_name : 'Unknown Staff'; };
                const getTrainingUnitName = (id) => { if (!id) return 'Not assigned'; const u = trainingUnits.value.find(x => x.id === id); return u ? u.unit_name : 'Unknown Unit'; };
                const getSupervisorName = (id) => getStaffName(id);
                const getPhysicianName = (id) => getStaffName(id);
                const getResidentName = (id) => getStaffName(id);
                const getDepartmentUnits = (id) => trainingUnits.value.filter(u => u.department_id === id);
                const getDepartmentStaffCount = (id) => medicalStaff.value.filter(s => s.department_id === id).length;
                const getCurrentRotationForStaff = (id) => rotations.value.find(r => r.resident_id === id && r.rotation_status === 'active') || null;
                const calculateAbsenceDuration = (s, e) => EnhancedUtils.calculateDateDifference(s, e);

                // Unit residents helpers
                const getUnitActiveRotationCount = (unitId) =>
                    rotations.value.filter(r => r.training_unit_id === unitId && (r.rotation_status === 'active' || r.rotation_status === 'scheduled')).length;

                const getDaysRemaining = (endDate) => {
                    if (!endDate) return 0;
                    const today = new Date(); today.setHours(0,0,0,0);
                    return Math.max(0, Math.ceil((new Date(endDate) - today) / (1000 * 60 * 60 * 24)));
                };

                const getDaysUntilStart = (startDate) => {
                    if (!startDate) return 0;
                    const today = new Date(); today.setHours(0,0,0,0);
                    return Math.max(0, Math.ceil((new Date(startDate) - today) / (1000 * 60 * 60 * 24)));
                };

                // UI helpers
                const getShiftStatusClass = (shift) => {
                    if (!shift || !shift.raw) return 'neumac-status-oncall';
                    const now = new Date();
                    if (shift.raw.duty_date === now.toISOString().split('T')[0] && shift.startTime && shift.endTime) {
                        try {
                            const cur = now.getHours() * 100 + now.getMinutes();
                            if (cur >= parseInt(shift.startTime.replace(':','')) && cur <= parseInt(shift.endTime.replace(':',''))) return 'neumac-status-critical';
                        } catch {}
                    }
                    return shift.shiftType === 'Primary' ? 'neumac-status-oncall' : 'neumac-status-busy';
                };
                const isCurrentShift = (shift) => {
                    if (!shift || !shift.raw) return false;
                    const now = new Date();
                    if (shift.raw.duty_date !== now.toISOString().split('T')[0]) return false;
                    try {
                        if (!shift.startTime || !shift.endTime) return false;
                        const cur = now.getHours() * 100 + now.getMinutes();
                        return cur >= parseInt(shift.startTime.replace(':','')) && cur <= parseInt(shift.endTime.replace(':',''));
                    } catch { return false; }
                };
                const getStaffTypeIcon = (t) => ({ attending_physician: 'fa-user-md', medical_resident: 'fa-user-graduate', fellow: 'fa-user-tie', nurse_practitioner: 'fa-user-nurse' }[t] || 'fa-user');
                const calculateCapacityPercent = (cur, max) => (!cur && cur !== 0 || !max) ? 0 : Math.round((cur / max) * 100);
                const getCapacityDotClass = (index, cur) => { if (!cur) return 'available'; if (index <= cur) { const p = (cur/(index||1))*100; return p>=90?'full':p>=75?'limited':'filled'; } return 'available'; };
                const getMeterFillClass = (cur, max) => { if (!cur || !max) return ''; const p=(cur/max)*100; return p>=90?'neumac-meter-fill-full':p>=75?'neumac-meter-fill-limited':''; };
                const getAbsenceReasonIcon = (r) => ({ vacation:'fa-umbrella-beach', sick_leave:'fa-procedures', conference:'fa-chalkboard-teacher', training:'fa-graduation-cap', personal:'fa-user-clock', other:'fa-question-circle' }[r] || 'fa-clock');
                const getScheduleIcon = (a) => { if (!a) return 'fa-calendar-check'; const l=a.toLowerCase(); if(l.includes('round')) return 'fa-stethoscope'; if(l.includes('clinic')) return 'fa-clinic-medical'; if(l.includes('surgery')) return 'fa-scalpel-path'; if(l.includes('meeting')) return 'fa-users'; if(l.includes('lecture')) return 'fa-chalkboard-teacher'; if(l.includes('consultation')) return 'fa-comments-medical'; return 'fa-calendar-check'; };

                // Profile helpers
                const getCurrentUnit = (id) => { const r = rotations.value.find(x => x.resident_id===id && x.rotation_status==='active'); return r ? getTrainingUnitName(r.training_unit_id) : 'Not assigned'; };
                const getCurrentWard = (id) => { const r = rotations.value.find(x => x.resident_id===id && x.rotation_status==='active'); if (r?.training_unit_id) { const u = trainingUnits.value.find(x => x.id===r.training_unit_id); if (u) return u.unit_name; } return 'Not assigned'; };
                const getCurrentActivityStatus = (id) => { const today=new Date().toISOString().split('T')[0]; return onCallSchedule.value.some(s=>(s.primary_physician_id===id||s.backup_physician_id===id)&&s.duty_date===today) ? 'oncall' : 'available'; };
                const isOnCallToday = (id) => { const today=new Date().toISOString().split('T')[0]; return onCallSchedule.value.some(s=>(s.primary_physician_id===id||s.backup_physician_id===id)&&s.duty_date===today); };
                const getOnCallShiftTime = (id) => { const today=new Date().toISOString().split('T')[0]; const s=onCallSchedule.value.find(x=>(x.primary_physician_id===id||x.backup_physician_id===id)&&x.duty_date===today); return s?`${s.start_time} - ${s.end_time}`:'N/A'; };
                const getOnCallCoverage = (id) => { const today=new Date().toISOString().split('T')[0]; const s=onCallSchedule.value.find(x=>(x.primary_physician_id===id||x.backup_physician_id===id)&&x.duty_date===today); return s?s.coverage_area:'N/A'; };
                const getRotationSupervisor = (id) => { const r=rotations.value.find(x=>x.resident_id===id&&x.rotation_status==='active'); return r?.supervising_attending_id ? getStaffName(r.supervising_attending_id) : 'Not assigned'; };
                const getRotationDaysLeft = (id) => { const r=rotations.value.find(x=>x.resident_id===id&&x.rotation_status==='active'); return r?.rotation_end_date ? getDaysRemaining(r.rotation_end_date) : 0; };

                // Status location parser
                const getStatusLocation = (status) => {
                    if (!status || !status.status_text) return 'Pulmonology Department';
                    if (status.location) return status.location;
                    if (status.department) return status.department;
                    if (status.coverage_area) return status.coverage_area;
                    const t = status.status_text.toLowerCase();
                    if (t.includes('icu')||t.includes('intensive care')) return 'Respiratory ICU';
                    if (t.includes('respiratory')||t.includes('pulmonology')||t.includes('lung')) return 'Pulmonology Department';
                    if (t.includes('bronchoscopy')||t.includes('pft')||t.includes('pulmonary function')) return 'Pulmonary Procedure Unit';
                    if (t.includes('sleep')||t.includes('cpap')||t.includes('bipap')) return 'Sleep Medicine Lab';
                    if (t.includes('ventilator')||t.includes('mech vent')||t.includes('respiratory therapy')) return 'Respiratory Therapy Unit';
                    if (t.includes('oxygen')||t.includes('o2')||t.includes('gas exchange')) return 'Oxygen Therapy Unit';
                    if (t.includes('interstitial')||t.includes('ild')||t.includes('pulmonary fibrosis')) return 'Interstitial Lung Disease Clinic';
                    if (t.includes('asthma')||t.includes('copd')||t.includes('chronic obstructive')) return 'Chronic Airways Clinic';
                    if (t.includes('tuberculosis')||t.includes('tb')||t.includes('mycobacterium')) return 'TB/Respiratory Infections Unit';
                    if (t.includes('er')||t.includes('emergency')||t.includes('triage')) return 'Emergency Department';
                    if (t.includes('ward')||t.includes('floor')||t.includes('bed')) return 'General Ward';
                    if (t.includes('surgery')||t.includes('operating room')||t.includes('thoracic')) return 'Thoracic Surgery';
                    if (t.includes('consult')||t.includes('interconsult')||t.includes('clinic')) return 'Consultation Clinic';
                    if (t.includes('cardiac')||t.includes('heart')||t.includes('echocardiogram')) return 'Cardiology';
                    if (t.includes('radiology')||t.includes('x-ray')||t.includes('ct')||t.includes('mri')) return 'Radiology';
                    if (t.includes('oncology')||t.includes('cancer')||t.includes('chemo')) return 'Oncology';
                    if (t.includes('transplant')) return 'Transplant Unit';
                    if (t.includes('rehab')||t.includes('rehabilitation')) return 'Pulmonary Rehabilitation';
                    if (t.includes('meeting')||t.includes('conference')||t.includes('round')) return 'Conference Room';
                    if (t.includes('call')||t.includes('on-call')||t.includes('schedule')) return 'On-call Office';
                    return 'Pulmonology Department';
                };
                const getRecentStatuses = () => clinicalStatusHistory.value;
                const formatTimeAgo = (d) => EnhancedUtils.formatRelativeTime(d);

                // Live status
                const isStatusExpired = (e) => { if (!e) return true; try { return new Date() > new Date(e); } catch { return true; } };
                const getStatusBadgeClass = (s) => (!s || isStatusExpired(s.expires_at)) ? 'badge-warning' : 'badge-success';
                const calculateTimeRemaining = (t) => {
                    if (!t) return 'N/A';
                    try { const diff=new Date(t)-new Date(); if(diff<=0) return 'Expired'; const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000); return h>0?`${h}h ${m}m`:`${m}m`; }
                    catch { return 'N/A'; }
                };
                const refreshStatus = () => { loadClinicalStatus(); loadSystemStats(); showToast('Status Refreshed','Live status updated','info'); };
                const setQuickStatus = (s) => { quickStatus.value=s; switch(s){ case 'normal': communicationsModal.form.dailySummary='All systems normal. No critical issues.'; Object.assign(communicationsModal.form.alerts,{erBusy:false,icuFull:false,wardFull:false,staffShortage:false}); break; case 'busy': communicationsModal.form.dailySummary='ICU at high capacity. Please triage admissions.'; communicationsModal.form.alerts.icuFull=true; break; case 'shortage': communicationsModal.form.dailySummary='Staff shortage affecting multiple areas.'; communicationsModal.form.alerts.staffShortage=true; break; case 'equipment': communicationsModal.form.dailySummary='Equipment issues reported. Using backup systems.'; break; } };
                const formatAudience = (a) => ({ all_staff:'All Staff', medical_staff:'Medical Staff', residents:'Residents', attendings:'Attending Physicians' }[a] || a);
                const getPreviewCardClass = () => { const t=absenceModal.form.leave_type; return t==='planned'?'planned':t==='unplanned'?'unplanned':'active'; };
                const getPreviewIcon = () => ({ vacation:'fas fa-umbrella-beach text-blue-500', conference:'fas fa-chalkboard-teacher text-green-500', sick_leave:'fas fa-heartbeat text-red-500', training:'fas fa-graduation-cap text-purple-500', personal:'fas fa-home text-yellow-500', other:'fas fa-ellipsis-h text-gray-500' }[absenceModal.form.absence_reason] || 'fas fa-clock text-gray-500');
                const getPreviewReasonText = () => formatAbsenceReason(absenceModal.form.absence_reason);
                const getPreviewStatusClass = () => { const t=absenceModal.form.leave_type; return t==='planned'?'status-planned':t==='unplanned'?'status-unplanned':'status-active'; };
                const getPreviewStatusText = () => { const t=absenceModal.form.leave_type; return t==='planned'?'Planned':t==='unplanned'?'Unplanned':'Active'; };
                const updatePreview = () => {};
                const showCreateStatusModal = () => { liveStatsEditMode.value=true; newStatusText.value=''; selectedAuthorId.value=''; expiryHours.value=8; };

                // Clinical status loaders
                const loadClinicalStatus = async () => {
                    isLoadingStatus.value = true;
                    try { const r=await API.getClinicalStatus(); clinicalStatus.value=(r&&r.success)?r.data:null; }
                    catch { clinicalStatus.value=null; } finally { isLoadingStatus.value=false; }
                };
                const loadClinicalStatusHistory = async () => {
                    try {
                        const history=await API.getClinicalStatusHistory(20);
                        const currentId=clinicalStatus.value?.id; const now=new Date();
                        clinicalStatusHistory.value=history.filter(s=>{ if(s.id===currentId) return false; if(s.expires_at){try{return now<new Date(s.expires_at);}catch{return true;}} return true; }).slice(0,5);
                    } catch { clinicalStatusHistory.value=[]; }
                };
                const loadActiveMedicalStaff = async () => {
                    try {
                        const data=await API.getMedicalStaff();
                        activeMedicalStaff.value=data.filter(s=>s.employment_status==='active');
                        if(currentUser.value){const found=activeMedicalStaff.value.find(s=>s.professional_email===currentUser.value.email); if(found) selectedAuthorId.value=found.id;}
                    } catch { activeMedicalStaff.value=[]; }
                };
                const saveClinicalStatus = async () => {
                    if(!newStatusText.value.trim()||!selectedAuthorId.value){showToast('Error','Please fill all required fields','error');return;}
                    isLoadingStatus.value=true;
                    try {
                        const r=await API.createClinicalStatus({status_text:newStatusText.value.trim(),author_id:selectedAuthorId.value,expires_in_hours:expiryHours.value});
                        if(r&&r.success&&r.data){
                            if(clinicalStatus.value){clinicalStatusHistory.value.unshift(clinicalStatus.value);if(clinicalStatusHistory.value.length>5) clinicalStatusHistory.value=clinicalStatusHistory.value.slice(0,5);}
                            clinicalStatus.value=r.data; newStatusText.value=''; selectedAuthorId.value=''; liveStatsEditMode.value=false;
                            await loadClinicalStatusHistory(); showToast('Success','Live status has been updated for all staff','success'); await loadSystemStats();
                        } else throw new Error(r?.error||'Failed to save status');
                    } catch(e){showToast('Error',e.message||'Could not update status. Please try again.','error');}
                    finally{isLoadingStatus.value=false;}
                };

                // Delete functions
                const deleteMedicalStaff = (staff) => showConfirmation({ title:'Delete Medical Staff', message:`Are you sure you want to delete ${staff.full_name}?`, icon:'fa-trash', confirmButtonText:'Delete', confirmButtonClass:'btn-danger', details:'This action cannot be undone.', onConfirm:async()=>{ try{await API.deleteMedicalStaff(staff.id);const i=medicalStaff.value.findIndex(s=>s.id===staff.id);if(i>-1)medicalStaff.value.splice(i,1);showToast('Success','Medical staff deleted successfully','success');updateDashboardStats();}catch(e){showToast('Error',e.message,'error');} } });
                const deleteRotation = (rotation) => showConfirmation({ title:'Delete Rotation', message:'Are you sure you want to delete this rotation?', icon:'fa-trash', confirmButtonText:'Delete', confirmButtonClass:'btn-danger', details:`Resident: ${getResidentName(rotation.resident_id)}`, onConfirm:async()=>{ try{await API.deleteRotation(rotation.id);const i=rotations.value.findIndex(r=>r.id===rotation.id);if(i>-1)rotations.value.splice(i,1);showToast('Success','Rotation deleted successfully','success');updateDashboardStats();}catch(e){showToast('Error',e.message,'error');} } });
                const deleteOnCallSchedule = (schedule) => showConfirmation({ title:'Delete On-Call Schedule', message:'Are you sure you want to delete this on-call schedule?', icon:'fa-trash', confirmButtonText:'Delete', confirmButtonClass:'btn-danger', details:`Physician: ${getPhysicianName(schedule.primary_physician_id)}`, onConfirm:async()=>{ try{await API.deleteOnCall(schedule.id);const i=onCallSchedule.value.findIndex(s=>s.id===schedule.id);if(i>-1)onCallSchedule.value.splice(i,1);showToast('Success','On-call schedule deleted successfully','success');loadTodaysOnCall();}catch(e){showToast('Error',e.message,'error');} } });
                const deleteAbsence = (absence) => showConfirmation({ title:'Delete Absence', message:'Are you sure you want to delete this absence record?', icon:'fa-trash', confirmButtonText:'Delete', confirmButtonClass:'btn-danger', details:`Staff: ${getStaffName(absence.staff_member_id)}`, onConfirm:async()=>{ try{await API.deleteAbsence(absence.id);const i=absences.value.findIndex(a=>a.id===absence.id);if(i>-1)absences.value.splice(i,1);showToast('Success','Absence deleted successfully','success');updateDashboardStats();}catch(e){showToast('Error',e.message,'error');} } });
                const deleteAnnouncement = (announcement) => showConfirmation({ title:'Delete Announcement', message:`Are you sure you want to delete "${announcement.title}"?`, icon:'fa-trash', confirmButtonText:'Delete', confirmButtonClass:'btn-danger', onConfirm:async()=>{ try{await API.deleteAnnouncement(announcement.id);const i=announcements.value.findIndex(a=>a.id===announcement.id);if(i>-1)announcements.value.splice(i,1);showToast('Success','Announcement deleted successfully','success');}catch(e){showToast('Error',e.message,'error');} } });
                const deleteClinicalStatus = async () => { if(!clinicalStatus.value) return; showConfirmation({ title:'Clear Live Status', message:'Are you sure you want to clear the current live status?', icon:'fa-trash', confirmButtonText:'Clear', confirmButtonClass:'btn-danger', onConfirm:async()=>{ try{await API.deleteClinicalStatus(clinicalStatus.value.id);clinicalStatus.value=null;showToast('Success','Live status cleared','success');}catch(e){showToast('Error',e.message,'error');} } }); };

                // Data loading
                const loadMedicalStaff = async () => { try{medicalStaff.value=await API.getMedicalStaff();}catch{showToast('Error','Failed to load medical staff','error');} };
                const loadDepartments = async () => { try{departments.value=await API.getDepartments();}catch{showToast('Error','Failed to load departments','error');} };
                const loadTrainingUnits = async () => { try{trainingUnits.value=await API.getTrainingUnits();}catch{showToast('Error','Failed to load training units','error');} };
                const loadRotations = async () => { try{rotations.value=await API.getRotations();}catch{showToast('Error','Failed to load rotations','error');} };
                const loadAbsences = async () => { try{absences.value=await API.getAbsences();}catch{showToast('Error','Failed to load absences','error');} };
                const loadOnCallSchedule = async () => { try{loadingSchedule.value=true;onCallSchedule.value=await API.getOnCallSchedule();}catch{showToast('Error','Failed to load on-call schedule','error');}finally{loadingSchedule.value=false;} };
                const loadTodaysOnCall = async () => {
                    try {
                        loadingSchedule.value=true;
                        const data=await API.getOnCallToday();
                        todaysOnCall.value=data.map(item=>{ const st=item.start_time?item.start_time.substring(0,5):'N/A'; const et=item.end_time?item.end_time.substring(0,5):'N/A'; let shiftType='Unknown'; if(item.shift_type==='primary_call'||item.shift_type==='primary') shiftType='Primary'; else if(item.shift_type==='backup_call'||item.shift_type==='backup'||item.shift_type==='secondary') shiftType='Backup'; const ms=medicalStaff.value.find(s=>s.id===item.primary_physician_id); return {id:item.id,startTime:st,endTime:et,physicianName:item.primary_physician?.full_name||'Unknown Physician',staffType:ms?formatStaffType(ms.staff_type):'Physician',shiftType,coverageArea:item.coverage_area||'General Coverage',backupPhysician:item.backup_physician?.full_name||null,contactInfo:item.primary_physician?.professional_email||'No contact info',raw:item}; });
                    } catch{showToast('Error',"Failed to load today's on-call schedule",'error');todaysOnCall.value=[];}
                    finally{loadingSchedule.value=false;}
                };
                const loadAnnouncements = async () => { try{announcements.value=await API.getAnnouncements();}catch{showToast('Error','Failed to load announcements','error');} };
                const loadSystemStats = async () => { try{const d=await API.getSystemStats();if(d&&d.success) Object.assign(systemStats.value,d.data);}catch{} };

                const updateDashboardStats = () => {
                    systemStats.value.totalStaff=medicalStaff.value.length;
                    systemStats.value.activeAttending=medicalStaff.value.filter(s=>s.staff_type==='attending_physician'&&s.employment_status==='active').length;
                    systemStats.value.activeResidents=medicalStaff.value.filter(s=>s.staff_type==='medical_resident'&&s.employment_status==='active').length;
                    const today=new Date().toISOString().split('T')[0];
                    systemStats.value.onLeaveStaff=absences.value.filter(a=>{if(!a.start_date||!a.end_date) return false;if(!(a.start_date<=today&&today<=a.end_date)) return false;if(a.current_status){const as=['currently_absent','active','on_leave','approved'];return as.includes(a.current_status.toLowerCase());}return true;}).length;
                    systemStats.value.activeRotations=rotations.value.filter(r=>r.rotation_status==='active').length;
                    const now=new Date(),nw=new Date(now.getTime()+7*24*60*60*1000),tw=new Date(now.getTime()+14*24*60*60*1000);
                    systemStats.value.endingThisWeek=rotations.value.filter(r=>{if(r.rotation_status!=='active') return false;const e=new Date(r.rotation_end_date);return !isNaN(e.getTime())&&e>=now&&e<=nw;}).length;
                    systemStats.value.startingNextWeek=rotations.value.filter(r=>{if(r.rotation_status!=='scheduled') return false;const s=new Date(r.rotation_start_date);return !isNaN(s.getTime())&&s>=nw&&s<=tw;}).length;
                    const todayStr=now.toISOString().split('T')[0],uniq=new Set();
                    onCallSchedule.value.filter(s=>s.duty_date===todayStr).forEach(s=>{if(s.primary_physician_id) uniq.add(s.primary_physician_id);if(s.backup_physician_id) uniq.add(s.backup_physician_id);});
                    systemStats.value.onCallNow=uniq.size;
                };

                const loadAllData = async () => {
                    loading.value=true;
                    try {
                        await Promise.all([loadMedicalStaff(),loadDepartments(),loadTrainingUnits(),loadRotations(),loadAbsences(),loadOnCallSchedule(),loadTodaysOnCall(),loadAnnouncements(),loadClinicalStatus(),loadSystemStats()]);
                        await loadActiveMedicalStaff(); updateDashboardStats(); showToast('Success','System data loaded successfully','success');
                    } catch{showToast('Error','Failed to load some data','error');}
                    finally{loading.value=false;}
                };

                // Auth
                const handleLogin = async () => {
                    if(!loginForm.email||!loginForm.password){showToast('Error','Email and password are required','error');return;}
                    loginLoading.value=true;
                    try{const r=await API.login(loginForm.email,loginForm.password);currentUser.value=r.user;localStorage.setItem(CONFIG.USER_KEY,JSON.stringify(r.user));showToast('Success',`Welcome, ${r.user.full_name}!`,'success');await loadAllData();currentView.value='dashboard';}
                    catch(e){showToast('Error',e.message||'Login failed','error');}
                    finally{loginLoading.value=false;}
                };
                const handleLogout = () => showConfirmation({ title:'Logout', message:'Are you sure you want to logout?', icon:'fa-sign-out-alt', confirmButtonText:'Logout', confirmButtonClass:'btn-danger', onConfirm:async()=>{ try{await API.logout();}finally{currentUser.value=null;currentView.value='login';userMenuOpen.value=false;showToast('Info','Logged out successfully','info');} } });

                // Navigation
                const switchView = (v) => { currentView.value=v; mobileMenuOpen.value=false; };
                const toggleStatsSidebar = () => { statsSidebarOpen.value=!statsSidebarOpen.value; };
                const handleGlobalSearch = () => {};
                const dismissAlert = (id) => { const i=systemAlerts.value.findIndex(a=>a.id===id);if(i>-1) systemAlerts.value.splice(i,1); };

                // Modal show
                const showAddMedicalStaffModal = () => { medicalStaffModal.mode='add';medicalStaffModal.activeTab='basic';medicalStaffModal.form={full_name:'',staff_type:'medical_resident',staff_id:`MD-${Date.now().toString().slice(-6)}`,employment_status:'active',professional_email:'',department_id:'',academic_degree:'',specialization:'',training_year:'',clinical_certificate:'',certificate_status:'',resident_category:'',primary_clinic:'',work_phone:'',medical_license:'',can_supervise_residents:false,special_notes:'',resident_type:'',home_department:'',external_institution:'',years_experience:null,biography:'',date_of_birth:null,mobile_phone:'',office_phone:'',training_level:''};medicalStaffModal.show=true; };
                const showAddDepartmentModal = () => { departmentModal.mode='add';departmentModal.form={name:'',code:'',status:'active',head_of_department_id:''};departmentModal.show=true; };
                const showAddTrainingUnitModal = () => { trainingUnitModal.mode='add';trainingUnitModal.form={unit_name:'',unit_code:'',department_id:'',maximum_residents:10,unit_status:'active',specialty:'',supervising_attending_id:''};trainingUnitModal.show=true; };
                const showAddRotationModal = () => { rotationModal.mode='add';rotationModal.form={rotation_id:`ROT-${Date.now().toString().slice(-6)}`,resident_id:'',training_unit_id:'',rotation_start_date:new Date().toISOString().split('T')[0],rotation_end_date:new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0],rotation_status:'scheduled',rotation_category:'clinical_rotation',supervising_attending_id:''};rotationModal.show=true; };
                const showAddOnCallModal = () => { onCallModal.mode='add';onCallModal.form={duty_date:new Date().toISOString().split('T')[0],shift_type:'primary_call',start_time:'08:00',end_time:'17:00',primary_physician_id:'',backup_physician_id:'',coverage_notes:'emergency',schedule_id:`SCH-${Date.now().toString().slice(-6)}`};onCallModal.show=true; };
                const showAddAbsenceModal = () => { absenceModal.mode='add';absenceModal.form={staff_member_id:'',absence_type:'planned',absence_reason:'vacation',start_date:new Date().toISOString().split('T')[0],end_date:new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0],current_status:'pending',covering_staff_id:'',coverage_notes:'',coverage_arranged:false,hod_notes:''};absenceModal.show=true; };
                const showCommunicationsModal = () => { communicationsModal.show=true;communicationsModal.activeTab='announcement';communicationsModal.form={title:'',content:'',priority:'normal',target_audience:'all_staff',updateType:'daily',dailySummary:'',highlight1:'',highlight2:'',alerts:{erBusy:false,icuFull:false,wardFull:false,staffShortage:false},metricName:'',metricValue:'',metricTrend:'stable',metricChange:'',metricNote:'',alertLevel:'low',alertMessage:'',affectedAreas:{er:false,icu:false,ward:false,surgery:false}}; };
                const showUserProfileModal = () => { userProfileModal.form={full_name:currentUser.value?.full_name||'',email:currentUser.value?.email||'',department_id:currentUser.value?.department_id||''};userProfileModal.show=true;userMenuOpen.value=false; };

                // View / Edit
                const viewStaffDetails = (staff) => { staffProfileModal.staff=staff; staffProfileModal.activeTab='assignments'; staffProfileModal.show=true; };

                const viewUnitResidents = (unit) => {
                    unitResidentsModal.unit = unit;
                    unitResidentsModal.rotations = rotations.value.filter(r =>
                        r.training_unit_id === unit.id &&
                        (r.rotation_status === 'active' || r.rotation_status === 'scheduled')
                    );
                    unitResidentsModal.show = true;
                };

                const editMedicalStaff = (s) => { medicalStaffModal.mode='edit';medicalStaffModal.form={...s};medicalStaffModal.show=true; };
                const editDepartment = (d) => { departmentModal.mode='edit';departmentModal.form={...d};departmentModal.show=true; };
                const editTrainingUnit = (u) => { trainingUnitModal.mode='edit';trainingUnitModal.form={...u};trainingUnitModal.show=true; };
                const editRotation = (r) => { rotationModal.mode='edit';rotationModal.form={...r};rotationModal.show=true; };
                const editOnCallSchedule = (s) => { onCallModal.mode='edit';onCallModal.form={...s};onCallModal.show=true; };
                const editAbsence = (a) => { absenceModal.mode='edit';absenceModal.form={...a};absenceModal.show=true; };

                // Save functions
                const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

                const saveMedicalStaff = async () => {
                    saving.value=true;
                    if(!medicalStaffModal.form.full_name?.trim()){showToast('Error','Full name is required','error');saving.value=false;return;}
                    try {
                        const clean=(v)=>(v===null||v===undefined)?'':String(v).trim();
                        const staffData={full_name:medicalStaffModal.form.full_name.trim(),staff_type:medicalStaffModal.form.staff_type||'medical_resident',staff_id:medicalStaffModal.form.staff_id||EnhancedUtils.generateId('MD'),employment_status:medicalStaffModal.form.employment_status||'active',professional_email:medicalStaffModal.form.professional_email||'',department_id:medicalStaffModal.form.department_id||null,academic_degree:clean(medicalStaffModal.form.academic_degree),specialization:clean(medicalStaffModal.form.specialization),training_year:clean(medicalStaffModal.form.training_year),clinical_certificate:clean(medicalStaffModal.form.clinical_certificate),certificate_status:clean(medicalStaffModal.form.certificate_status),resident_category:clean(medicalStaffModal.form.resident_category),primary_clinic:clean(medicalStaffModal.form.primary_clinic),work_phone:clean(medicalStaffModal.form.work_phone),medical_license:clean(medicalStaffModal.form.medical_license),can_supervise_residents:medicalStaffModal.form.can_supervise_residents||false,special_notes:clean(medicalStaffModal.form.special_notes),resident_type:clean(medicalStaffModal.form.resident_type),home_department:clean(medicalStaffModal.form.home_department),external_institution:clean(medicalStaffModal.form.external_institution),years_experience:medicalStaffModal.form.years_experience||null,biography:clean(medicalStaffModal.form.biography),date_of_birth:medicalStaffModal.form.date_of_birth||null,mobile_phone:clean(medicalStaffModal.form.mobile_phone),office_phone:clean(medicalStaffModal.form.office_phone),training_level:clean(medicalStaffModal.form.training_level)};
                        if(staffData.professional_email&&!isValidEmail(staffData.professional_email)){showToast('Error','Please enter a valid email address','error');saving.value=false;return;}
                        if(medicalStaffModal.mode==='add'){const r=await API.createMedicalStaff(staffData);medicalStaff.value.unshift(r);showToast('Success','Medical staff added successfully','success');}
                        else{const r=await API.updateMedicalStaff(medicalStaffModal.form.id,staffData);const i=medicalStaff.value.findIndex(s=>s.id===r.id);if(i!==-1) medicalStaff.value[i]=r;showToast('Success','Medical staff updated successfully','success');}
                        medicalStaffModal.show=false;updateDashboardStats();
                    } catch(e){showToast('Error',e.message||'Failed to save medical staff','error');}
                    finally{saving.value=false;}
                };

                const saveDepartment = async () => {
                    saving.value=true;
                    try{if(departmentModal.mode==='add'){const r=await API.createDepartment(departmentModal.form);departments.value.unshift(r);showToast('Success','Department created successfully','success');}else{const r=await API.updateDepartment(departmentModal.form.id,departmentModal.form);const i=departments.value.findIndex(d=>d.id===r.id);if(i!==-1) departments.value[i]=r;showToast('Success','Department updated successfully','success');}departmentModal.show=false;}
                    catch(e){showToast('Error',e.message,'error');}finally{saving.value=false;}
                };

                const saveTrainingUnit = async () => {
                    saving.value=true;
                    try{const d={unit_name:trainingUnitModal.form.unit_name,unit_code:trainingUnitModal.form.unit_code,department_id:trainingUnitModal.form.department_id,supervisor_id:trainingUnitModal.form.supervising_attending_id||null,maximum_residents:trainingUnitModal.form.maximum_residents,unit_status:trainingUnitModal.form.unit_status,description:trainingUnitModal.form.specialty||''};if(trainingUnitModal.mode==='add'){const r=await API.createTrainingUnit(d);trainingUnits.value.unshift(r);showToast('Success','Training unit created successfully','success');}else{const r=await API.updateTrainingUnit(trainingUnitModal.form.id,d);const i=trainingUnits.value.findIndex(u=>u.id===r.id);if(i!==-1) trainingUnits.value[i]=r;showToast('Success','Training unit updated successfully','success');}trainingUnitModal.show=false;updateDashboardStats();}
                    catch(e){showToast('Error',e.message,'error');}finally{saving.value=false;}
                };

                const saveRotation = async () => {
                    if(!rotationModal.form.resident_id){showToast('Error','Please select a resident','error');return;}
                    if(!rotationModal.form.training_unit_id){showToast('Error','Please select a training unit','error');return;}
                    const ss=rotationModal.form.rotation_start_date, es=rotationModal.form.rotation_end_date;
                    if(!ss||!es){showToast('Error','Please enter both start and end dates','error');return;}
                    let startDate,endDate;
                    try {
                        const isDDMM=(s)=>s.includes('/')&&s.split('/')[0].length===2;
                        const parse=(s,eod=false)=>{if(isDDMM(s)){const[d,m,y]=s.split('/');return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${eod?'23:59:59':'00:00:00'}`);}return new Date(s);};
                        startDate=parse(ss,false);endDate=parse(es,true);
                        if(isNaN(startDate.getTime())||isNaN(endDate.getTime())) throw new Error('Invalid date');
                        rotationModal.form.rotation_start_date=startDate.toISOString().split('T')[0];
                        rotationModal.form.rotation_end_date=endDate.toISOString().split('T')[0];
                    } catch{showToast('Error','Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY','error');return;}
                    if(endDate<=startDate){showToast('Error','End date must be after start date','error');return;}
                    const dur=Math.ceil((endDate-startDate)/(1000*60*60*24));
                    if(dur>365){showToast('Error',`Rotation cannot exceed 365 days. Current: ${dur}`,'error');return;}
                    const pd=(s)=>{if(!s) return new Date(NaN);if(s.match(/^\d{4}-\d{2}-\d{2}$/)) return new Date(s+'T00:00:00');if(s.match(/^\d{2}\/\d{2}\/\d{4}$/)){const[d,m,y]=s.split('/');return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00`);}return new Date(s);};
                    const ns=pd(rotationModal.form.rotation_start_date),ne=pd(rotationModal.form.rotation_end_date);ne.setHours(23,59,59,999);
                    const excl=rotationModal.mode==='edit'?rotationModal.form.id:null;
                    const overlap=rotations.value.some(r=>{if(r.resident_id!==rotationModal.form.resident_id||r.rotation_status==='cancelled'||(excl&&r.id===excl)) return false;const es=pd(r.rotation_start_date||r.start_date),ee=pd(r.rotation_end_date||r.end_date);if(isNaN(es.getTime())||isNaN(ee.getTime())) return false;ee.setHours(23,59,59,999);return ns<=ee&&ne>=es;});
                    if(overlap){showToast('Scheduling Conflict',`${getResidentName(rotationModal.form.resident_id)} already has a rotation during these dates.`,'error');return;}
                    saving.value=true;
                    try {
                        const d={rotation_id:rotationModal.form.rotation_id||EnhancedUtils.generateId('ROT'),resident_id:rotationModal.form.resident_id,training_unit_id:rotationModal.form.training_unit_id,supervising_attending_id:rotationModal.form.supervising_attending_id||null,start_date:rotationModal.form.rotation_start_date,end_date:rotationModal.form.rotation_end_date,rotation_category:rotationModal.form.rotation_category||'clinical_rotation',rotation_status:(rotationModal.form.rotation_status||'scheduled').toLowerCase()};
                        if(rotationModal.mode==='add'){const r=await API.createRotation(d);rotations.value.unshift(r);showToast('Success','Rotation scheduled successfully','success');}
                        else{const r=await API.updateRotation(rotationModal.form.id,d);const i=rotations.value.findIndex(x=>x.id===r.id);if(i!==-1) rotations.value[i]=r;showToast('Success','Rotation updated successfully','success');}
                        rotationModal.show=false;await loadRotations();updateDashboardStats();
                    }catch(e){let msg=e.message||'Failed to save rotation';if(msg.includes('overlapping')) msg='Rotation dates conflict with existing schedule.';showToast('Error',msg,'error');}
                    finally{saving.value=false;}
                };

                const saveOnCallSchedule = async () => {
                    saving.value=true;
                    try{const d={duty_date:onCallModal.form.duty_date,shift_type:onCallModal.form.shift_type||'primary_call',start_time:onCallModal.form.start_time||'08:00',end_time:onCallModal.form.end_time||'17:00',primary_physician_id:onCallModal.form.primary_physician_id,backup_physician_id:onCallModal.form.backup_physician_id||null,coverage_area:onCallModal.form.coverage_area||'general',schedule_id:onCallModal.form.schedule_id||EnhancedUtils.generateId('SCH')};if(onCallModal.mode==='add'){const r=await API.createOnCall(d);onCallSchedule.value.unshift(r);showToast('Success','On-call scheduled successfully','success');}else{const r=await API.updateOnCall(onCallModal.form.id,d);const i=onCallSchedule.value.findIndex(s=>s.id===r.id);if(i!==-1) onCallSchedule.value[i]=r;showToast('Success','On-call updated successfully','success');}onCallModal.show=false;loadTodaysOnCall();}
                    catch(e){showToast('Error',e.message||'Failed to save on-call schedule','error');}finally{saving.value=false;}
                };

                const saveAbsence = async () => {
                    saving.value=true;
                    try{const d={staff_member_id:absenceModal.form.staff_member_id,absence_type:absenceModal.form.absence_type||'planned',absence_reason:absenceModal.form.absence_reason,start_date:absenceModal.form.start_date,end_date:absenceModal.form.end_date,current_status:absenceModal.form.current_status||'planned_leave',covering_staff_id:absenceModal.form.covering_staff_id||null,coverage_notes:absenceModal.form.coverage_notes||'',coverage_arranged:absenceModal.form.coverage_arranged||false,hod_notes:absenceModal.form.hod_notes||'',recorded_by:currentUser.value?.id||null};if(absenceModal.mode==='add'){const r=await API.createAbsence(d);absences.value.unshift(r);showToast('Success','Absence recorded successfully','success');}else{const r=await API.updateAbsence(absenceModal.form.id,d);const i=absences.value.findIndex(a=>a.id===r.id);if(i!==-1) absences.value[i]=r;showToast('Success','Absence updated successfully','success');}absenceModal.show=false;await loadAbsences();updateDashboardStats();}
                    catch(e){showToast('Error',e.message||'Failed to save absence record','error');}finally{saving.value=false;}
                };

                const saveCommunication = async () => {
                    saving.value=true;
                    try{if(communicationsModal.activeTab==='announcement'){const r=await API.createAnnouncement({title:communicationsModal.form.title,content:communicationsModal.form.content,priority_level:communicationsModal.form.priority,target_audience:communicationsModal.form.target_audience,type:'announcement'});announcements.value.unshift(r);showToast('Success','Announcement posted successfully','success');}else{await saveClinicalStatus();}communicationsModal.show=false;}
                    catch(e){showToast('Error',e.message,'error');}finally{saving.value=false;}
                };

                const saveUserProfile = async () => {
                    saving.value=true;
                    try{currentUser.value.full_name=userProfileModal.form.full_name;currentUser.value.department_id=userProfileModal.form.department_id;localStorage.setItem(CONFIG.USER_KEY,JSON.stringify(currentUser.value));userProfileModal.show=false;showToast('Success','Profile updated successfully','success');}
                    catch(e){showToast('Error',e.message,'error');}finally{saving.value=false;}
                };

                // Actions
                const contactPhysician = (shift) => { if(shift.contactInfo&&shift.contactInfo!=='No contact info') showToast('Contact Physician',`Would contact ${shift.physicianName} via ${shift.contactInfo.includes('@')?'email':'phone'}`,'info'); else showToast('No Contact Info',`No contact information available for ${shift.physicianName}`,'warning'); };
                const viewAnnouncement = (a) => showToast(a.title,EnhancedUtils.truncateText(a.content,100),'info');
                const viewDepartmentStaff = (d) => showToast('Department Staff',`Viewing staff for ${d.name}`,'info');

                const hasPermission = (module, action='read') => { const role=currentUser.value?.user_role; if(!role) return false; if(role==='system_admin') return true; const perms=PERMISSION_MATRIX[role]?.[module]; return perms?(perms.includes(action)||perms.includes('*')):false; };

                // Computed
                const authToken = computed(() => localStorage.getItem(CONFIG.TOKEN_KEY));
                const unreadAnnouncements = computed(() => announcements.value.filter(a=>!a.read).length);
                const unreadLiveUpdates = computed(() => { if(!clinicalStatus.value) return 0; return localStorage.getItem('lastSeenStatusId')!==clinicalStatus.value.id?1:0; });
                const formattedExpiry = computed(() => { if(!clinicalStatus.value?.expires_at) return ''; const h=Math.ceil((new Date(clinicalStatus.value.expires_at)-new Date())/(1000*60*60)); if(h<=1) return 'Expires soon'; if(h<=4) return `Expires in ${h}h`; return `Expires ${EnhancedUtils.formatTime(clinicalStatus.value.expires_at)}`; });
                const availablePhysicians = computed(() => medicalStaff.value.filter(s=>(s.staff_type==='attending_physician'||s.staff_type==='fellow'||s.staff_type==='nurse_practitioner')&&s.employment_status==='active'));
                const availableResidents = computed(() => medicalStaff.value.filter(s=>s.staff_type==='medical_resident'&&s.employment_status==='active'));
                const availableAttendings = computed(() => medicalStaff.value.filter(s=>s.staff_type==='attending_physician'&&s.employment_status==='active'));
                const availableHeadsOfDepartment = computed(() => availableAttendings.value);
                const availableReplacementStaff = computed(() => medicalStaff.value.filter(s=>s.employment_status==='active'&&s.staff_type==='medical_resident'));
                const filteredMedicalStaff = computed(() => { let f=medicalStaff.value; if(staffFilters.search){const s=staffFilters.search.toLowerCase();f=f.filter(x=>x.full_name?.toLowerCase().includes(s)||x.staff_id?.toLowerCase().includes(s)||x.professional_email?.toLowerCase().includes(s));} if(staffFilters.staffType) f=f.filter(x=>x.staff_type===staffFilters.staffType); if(staffFilters.department) f=f.filter(x=>x.department_id===staffFilters.department); if(staffFilters.status) f=f.filter(x=>x.employment_status===staffFilters.status); return f; });
                const filteredOnCallSchedules = computed(() => { let f=onCallSchedule.value; if(onCallFilters.date) f=f.filter(x=>x.duty_date===onCallFilters.date); if(onCallFilters.shiftType) f=f.filter(x=>x.shift_type===onCallFilters.shiftType); if(onCallFilters.physician) f=f.filter(x=>x.primary_physician_id===onCallFilters.physician||x.backup_physician_id===onCallFilters.physician); if(onCallFilters.coverageArea) f=f.filter(x=>x.coverage_area===onCallFilters.coverageArea); return f; });
                const filteredRotations = computed(() => { let f=rotations.value; if(rotationFilters.resident) f=f.filter(x=>x.resident_id===rotationFilters.resident); if(rotationFilters.status) f=f.filter(x=>x.rotation_status===rotationFilters.status); if(rotationFilters.trainingUnit) f=f.filter(x=>x.training_unit_id===rotationFilters.trainingUnit); if(rotationFilters.supervisor) f=f.filter(x=>x.supervising_attending_id===rotationFilters.supervisor); return f; });
                const filteredAbsences = computed(() => { let f=absences.value; if(absenceFilters.staff) f=f.filter(x=>x.staff_member_id===absenceFilters.staff); if(absenceFilters.status) f=f.filter(x=>{const s=x.current_status||x.status||x.absence_status;return s===absenceFilters.status;}); if(absenceFilters.reason) f=f.filter(x=>x.absence_reason===absenceFilters.reason); if(absenceFilters.startDate) f=f.filter(x=>x.start_date>=absenceFilters.startDate); return f; });
                const recentAnnouncements = computed(() => announcements.value.slice(0,10));
                const activeAlertsCount = computed(() => systemAlerts.value.filter(a=>a.status==='active'||!a.status).length);
                const currentTimeFormatted = computed(() => EnhancedUtils.formatTime(currentTime.value));

                // Lifecycle
                onMounted(() => {
                    const token=localStorage.getItem(CONFIG.TOKEN_KEY),user=localStorage.getItem(CONFIG.USER_KEY);
                    if(token&&user){try{currentUser.value=JSON.parse(user);loadAllData();currentView.value='dashboard';}catch{currentView.value='login';}}
                    else{currentView.value='login';}
                    const si=setInterval(()=>{if(currentUser.value&&!isLoadingStatus.value) loadClinicalStatus();},60000);
                    const ti=setInterval(()=>{currentTime.value=new Date();},60000);
                    document.addEventListener('keydown',(e)=>{if(e.key==='Escape')[medicalStaffModal,departmentModal,trainingUnitModal,rotationModal,onCallModal,absenceModal,communicationsModal,staffProfileModal,userProfileModal,confirmationModal,unitResidentsModal].forEach(m=>{if(m.show) m.show=false;});});
                    onUnmounted(()=>{clearInterval(si);clearInterval(ti);});
                });

                watch([medicalStaff,rotations,trainingUnits,absences],()=>{updateDashboardStats();},{deep:true});

                return {
                    currentUser,loginForm,loginLoading,loading,saving,loadingSchedule,isLoadingStatus,
                    currentView,sidebarCollapsed,mobileMenuOpen,userMenuOpen,statsSidebarOpen,globalSearchQuery,
                    medicalStaff,departments,trainingUnits,rotations,absences,onCallSchedule,announcements,
                    clinicalStatus,newStatusText,selectedAuthorId,expiryHours,activeMedicalStaff,liveStatsEditMode,
                    quickStatus,currentTime,getStatusLocation,getRecentStatuses,
                    systemStats,todaysOnCall,todaysOnCallCount,
                    toasts,systemAlerts,
                    staffFilters,onCallFilters,rotationFilters,absenceFilters,
                    staffProfileModal,unitResidentsModal,medicalStaffModal,communicationsModal,
                    onCallModal,rotationModal,trainingUnitModal,absenceModal,departmentModal,
                    userProfileModal,confirmationModal,
                    formatDate:EnhancedUtils.formatDate,formatDateTime:EnhancedUtils.formatDateTime,
                    formatTime:EnhancedUtils.formatTime,formatRelativeTime:EnhancedUtils.formatRelativeTime,
                    getInitials:EnhancedUtils.getInitials,formatStaffType,getStaffTypeClass,
                    formatEmploymentStatus,formatAbsenceReason,formatAbsenceStatus,formatRotationStatus,
                    getUserRoleDisplay,getCurrentViewTitle,getCurrentViewSubtitle,getSearchPlaceholder,
                    getDepartmentName,getStaffName,getTrainingUnitName,getSupervisorName,
                    getPhysicianName,getResidentName,getDepartmentUnits,getDepartmentStaffCount,
                    getCurrentRotationForStaff,calculateAbsenceDuration,
                    getUnitActiveRotationCount,getDaysRemaining,getDaysUntilStart,
                    getShiftStatusClass,isCurrentShift,getStaffTypeIcon,calculateCapacityPercent,
                    getCapacityDotClass,getMeterFillClass,getAbsenceReasonIcon,getScheduleIcon,
                    getCurrentUnit,getCurrentWard,getCurrentActivityStatus,
                    isOnCallToday,getOnCallShiftTime,getOnCallCoverage,
                    getRotationSupervisor,getRotationDaysLeft,formatTimeAgo,
                    getStatusBadgeClass,calculateTimeRemaining,refreshStatus,setQuickStatus,
                    formatAudience,getPreviewCardClass,getPreviewIcon,getPreviewReasonText,
                    getPreviewStatusClass,getPreviewStatusText,updatePreview,
                    loadClinicalStatus,loadActiveMedicalStaff,saveClinicalStatus,isStatusExpired,showCreateStatusModal,
                    deleteMedicalStaff,deleteRotation,deleteOnCallSchedule,deleteAbsence,
                    deleteAnnouncement,deleteClinicalStatus,
                    showToast,removeToast,dismissAlert,showConfirmation,confirmAction,cancelConfirmation,
                    handleLogin,handleLogout,
                    switchView,toggleStatsSidebar,handleGlobalSearch,
                    showAddMedicalStaffModal,showAddDepartmentModal,showAddTrainingUnitModal,
                    showAddRotationModal,showAddOnCallModal,showAddAbsenceModal,
                    showCommunicationsModal,showUserProfileModal,
                    viewStaffDetails,viewUnitResidents,viewDepartmentStaff,
                    editMedicalStaff,editDepartment,editTrainingUnit,editRotation,
                    editOnCallSchedule,editAbsence,
                    contactPhysician,viewAnnouncement,
                    saveMedicalStaff,saveDepartment,saveTrainingUnit,saveRotation,
                    saveOnCallSchedule,saveAbsence,saveCommunication,saveUserProfile,
                    hasPermission,
                    authToken,unreadAnnouncements,unreadLiveUpdates,formattedExpiry,
                    availablePhysicians,availableResidents,availableAttendings,
                    availableHeadsOfDepartment,availableReplacementStaff,
                    filteredMedicalStaff,filteredOnCallSchedules,filteredRotations,
                    filteredAbsences,recentAnnouncements,activeAlertsCount,currentTimeFormatted
                };
            }
        });

        app.mount('#app');

    } catch (error) {
        document.body.innerHTML = `<div style="padding: 40px; text-align: center; margin-top: 100px; color: #333; font-family: Arial, sans-serif;"><h2 style="color: #dc3545;">⚠️ Application Error</h2><p style="margin: 20px 0; color: #666;">The application failed to load properly. Please try refreshing the page.</p><button onclick="window.location.reload()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 20px;">🔄 Refresh Page</button></div>`;
        throw error;
    }
});
