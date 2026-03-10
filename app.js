document.addEventListener('DOMContentLoaded', () => {
  try {
    if (typeof Vue === 'undefined') throw new Error('Vue.js not loaded')

    const { createApp, ref, reactive, computed, onMounted, watch, onUnmounted } = Vue

    // ============ 1. CONFIGURATION =======-====-=
    const CONFIG = {
      API_BASE_URL: window.location.hostname.includes('localhost')
        ? 'http://localhost:3000'
        : 'https://neumac-manage-back-end-production.up.railway.app',
      TOKEN_KEY: 'neumocare_token',
      USER_KEY: 'neumocare_user',
      CACHE_TTL: 300000
    }

    // ============ 2. CONSTANTS ====-========
    const ROLES = {
      ADMIN: 'system_admin',
      HEAD: 'department_head',
      ATTENDING: 'attending_physician',
      RESIDENT: 'medical_resident'
    }

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
        analytics: ['read', 'export'], 
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
        analytics: ['read'], 
        system: ['manage_updates']
      },
      attending_physician: {
        medical_staff: ['read'], 
        oncall_schedule: ['read'], 
        resident_rotations: ['read'],
        training_units: ['read'], 
        staff_absence: ['read'], 
        department_management: ['read'],
        communications: ['read'], 
        research_lines: ['read'], 
        clinical_trials: ['read'],
        innovation_projects: ['read'], 
        analytics: ['read']
      },
      medical_resident: {
        medical_staff: ['read'], 
        oncall_schedule: ['read'], 
        resident_rotations: ['read'],
        training_units: ['read'], 
        staff_absence: ['read'], 
        department_management: [],
        communications: ['read'], 
        research_lines: ['read'], 
        clinical_trials: ['read'],
        innovation_projects: ['read'], 
        analytics: []
      }
    }

    const STAFF_TYPE_LABELS = {
      medical_resident: 'Medical Resident', 
      attending_physician: 'Attending Physician',
      fellow: 'Fellow', 
      nurse_practitioner: 'Nurse Practitioner'
    }
    
    const STAFF_TYPE_CLASSES = {
      medical_resident: 'badge-primary', 
      attending_physician: 'badge-success',
      fellow: 'badge-info', 
      nurse_practitioner: 'badge-warning'
    }
    
    const ABSENCE_REASON_LABELS = {
      vacation: 'Vacation', 
      sick_leave: 'Sick Leave', 
      conference: 'Conference',
      training: 'Training', 
      personal: 'Personal', 
      other: 'Other'
    }
    
    const ROTATION_STATUS_LABELS = {
      scheduled: 'Scheduled', 
      active: 'Active', 
      completed: 'Completed', 
      cancelled: 'Cancelled'
    }
    
    const USER_ROLE_LABELS = {
      system_admin: 'System Administrator', 
      department_head: 'Department Head',
      attending_physician: 'Attending Physician', 
      medical_resident: 'Medical Resident'
    }
    
    const VIEW_TITLES = {
      dashboard: 'Dashboard Overview', 
      medical_staff: 'Medical Staff Management',
      oncall_schedule: 'On-call Schedule', 
      resident_rotations: 'Resident Rotations',
      training_units: 'Training Units', 
      staff_absence: 'Staff Absence Management',
      department_management: 'Department Management', 
      communications: 'Communications Center',
      research_lines: 'Research Lines', 
      clinical_trials: 'Clinical Trials',
      innovation_projects: 'Innovation Projects', 
      analytics_dashboard: 'Research Analytics Dashboard',
      analytics_performance: 'Research Lines Performance', 
      analytics_partners: 'Partner Collaborations'
    }
    
    const VIEW_SUBTITLES = {
      dashboard: 'Real-time department overview and analytics',
      medical_staff: 'Manage physicians, residents, and clinical staff',
      oncall_schedule: 'View and manage on-call physician schedules',
      resident_rotations: 'Track and manage resident training rotations',
      training_units: 'Clinical training units and resident assignments',
      staff_absence: 'Track staff absences and coverage assignments',
      department_management: 'Organizational structure and clinical units',
      communications: 'Department announcements and capacity updates',
      research_lines: 'Research groups and coordinator assignments',
      clinical_trials: 'Active clinical trials and studies',
      innovation_projects: 'Innovation and development projects',
      analytics_dashboard: 'Comprehensive research metrics and KPIs',
      analytics_performance: 'Detailed performance by research line',
      analytics_partners: 'Partner collaboration insights'
    }

    // ============ 3. ENHANCED UTILS CLASS ============
    const PROJECT_STAGES_DATA = [
      { key: 'Idea',             label: 'Idea',            icon: 'fa-lightbulb',    color: '#94a3b8', bg: 'rgba(148,163,184,.12)', step: 1 },
      { key: 'Prototipo',        label: 'Prototipo',       icon: 'fa-cube',         color: '#60a5fa', bg: 'rgba(96,165,250,.12)',  step: 2 },
      { key: 'Piloto',           label: 'Piloto',          icon: 'fa-play-circle',  color: '#34d399', bg: 'rgba(52,211,153,.12)',  step: 3 },
      { key: 'Validación',       label: 'Validación',      icon: 'fa-check-double', color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  step: 4 },
      { key: 'Escalamiento',     label: 'Escalamiento',    icon: 'fa-chart-line',   color: '#f97316', bg: 'rgba(249,115,22,.12)',  step: 5 },
      { key: 'Comercialización', label: 'Comercialización',icon: 'fa-rocket',       color: '#10b981', bg: 'rgba(16,185,129,.12)',  step: 6 }
    ]
    class Utils {
      // Date utilities
      static normalizeDate(d) {
        if (!d) return ''
        if (d instanceof Date) return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
        const s = String(d).trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
        if (s.includes('T')) return s.split('T')[0]
        if (s.includes('/')) {
          const [dd, mm, yyyy] = s.split('/')
          if (yyyy?.length === 4) return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
        }
        if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
          const [dd, mm, yyyy] = s.split('-')
          return `${yyyy}-${mm}-${dd}`
        }
        try { const dt = new Date(s); if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0] } catch { }
        return s
      }

      // ============ 3.1 RESIDENT FORMATTING ============
      
      static formatTrainingYear(year) {
        if (!year && year !== 0) return null;
        const yearStr = String(year).trim();
        if (/^\d+$/.test(yearStr)) return `PGY-${yearStr}`;
        if (yearStr.toUpperCase().startsWith('PGY')) {
          const parts = yearStr.split(/[- ]/);
          if (parts.length > 1) return `PGY-${parts[1]}`;
          return yearStr.toUpperCase();
        }
        return yearStr;
      }

      static getResidentCategoryInfo(category, staff = {}) {
        const categories = {
          'department_internal': {
            icon: 'fa-user-md', text: 'Internal Resident', shortText: 'Internal',
            color: '#4d9aff', bgColor: 'rgba(77, 154, 255, 0.1)'
          },
          'rotating_other_dept': {
            icon: 'fa-sync-alt',
            text: staff.home_department ? `Rotating from ${staff.home_department}` : 'Rotating Resident',
            shortText: 'Rotating', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)'
          },
          'external_resident': {
            icon: 'fa-globe',
            text: staff.external_institution ? `External (${staff.external_institution})` : 'External Resident',
            shortText: 'External', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)'
          }
        };
        return categories[category] || {
          icon: 'fa-user', text: 'Not categorized', shortText: 'Unknown',
          color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.1)'
        };
      }

      static formatResidentCategorySimple(category) {
        const map = { 'department_internal': 'Internal', 'rotating_other_dept': 'Rotating', 'external_resident': 'External' };
        return map[category] || 'Unknown';
      }

      static formatResidentCategoryDetailed(staff) {
        if (!staff?.resident_category) return null;
        return Utils.getResidentCategoryInfo(staff.resident_category, staff).text;
      }

      static getResidentCategoryIcon(category) { return Utils.getResidentCategoryInfo(category).icon; }

      static getResidentCategoryTooltip(staff) {
        if (!staff?.resident_category) return '';
        switch(staff.resident_category) {
          case 'department_internal': return 'Department internal resident';
          case 'rotating_other_dept': return staff.home_department ? `Rotating from ${staff.home_department} department` : 'Resident from another department';
          case 'external_resident': return staff.external_institution ? `External resident from ${staff.external_institution}` : 'External resident from another institution';
          default: return '';
        }
      }

      // ============ 3.2 PROFESSIONAL FORMATTING ============

      static formatSpecialization(spec) {
        if (!spec) return null;
        const abbreviations = ['ICU', 'ER', 'OR', 'PICU', 'NICU', 'PFT', 'CPAP', 'BiPAP', 'COPD', 'OSA'];
        return spec.split(' ').map(word => {
          const upperWord = word.toUpperCase();
          if (abbreviations.includes(upperWord)) return upperWord;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
      }

      static formatPhone(phone) {
        if (!phone) return null;
        const cleaned = String(phone).replace(/\D/g, '');
        if (cleaned.length === 9) return `+34 ${cleaned.slice(0,3)} ${cleaned.slice(3,6)} ${cleaned.slice(6)}`;
        if (cleaned.length === 12) return `+${cleaned.slice(0,2)} ${cleaned.slice(2,5)} ${cleaned.slice(5,8)} ${cleaned.slice(8)}`;
        return phone;
      }

      static formatLicense(license) {
        if (!license) return null;
        return license.toUpperCase();
      }

      // ============ 3.3 ROLE FORMATTING ============

      static getRoleInfo(role) {
        const roles = {
          'chief_of_department': { icon: 'fa-crown', color: 'gold', bgColor: 'rgba(255, 215, 0, 0.1)', label: 'Chief of Department' },
          'research_coordinator': { icon: 'fa-flask', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)', label: 'Research Coordinator' },
          'resident_manager': { icon: 'fa-user-graduate', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', label: 'Resident Manager' },
          'oncall_manager': { icon: 'fa-phone-alt', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', label: 'On-Call Manager' }
        };
        return roles[role] || null;
      }

      static getStaffRoles(staff) {
        const roles = [];
        if (staff?.is_chief_of_department) roles.push({ key: 'chief_of_department', ...Utils.getRoleInfo('chief_of_department') });
        if (staff?.is_research_coordinator) roles.push({ key: 'research_coordinator', ...Utils.getRoleInfo('research_coordinator') });
        if (staff?.is_resident_manager) roles.push({ key: 'resident_manager', ...Utils.getRoleInfo('resident_manager') });
        if (staff?.is_oncall_manager) roles.push({ key: 'oncall_manager', ...Utils.getRoleInfo('oncall_manager') });
        return roles;
      }

      // ============ 3.4 LEAVE BALANCE FORMATTING ============

      static calculateLeaveBalance(staff) {
        return {
          vacation: { used: 5, total: 20, remaining: 15 },
          sick: { used: 2, total: 10, remaining: 8 },
          conference: { used: 3, total: 10, remaining: 7 },
          personal: { used: 1, total: 5, remaining: 4 }
        };
      }

      static getDaysRemainingColor(days) {
        if (days <= 0) return '#ef4444';
        if (days < 5) return '#f59e0b';
        return '#10b981';
      }

      // ============ 3.5 EXISTING UTILITIES ============
      
      static formatDate(d) {
        if (!d) return 'N/A'
        try {
          const date = new Date(Utils.normalizeDate(d) + 'T00:00:00')
          if (isNaN(date.getTime())) return d
          return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        } catch { return d }
      }

      static formatDateShort(d) {
        if (!d) return ''
        try {
          const date = typeof d === 'string' ? new Date(Utils.normalizeDate(d) + 'T00:00:00') : d
          return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
        } catch { return '' }
      }

      static formatRelativeDate(d) {
        if (!d) return ''
        try {
          const date = new Date(Utils.normalizeDate(d) + 'T00:00:00')
          const today = new Date(); today.setHours(0, 0, 0, 0)
          const diff = Math.ceil((date - today) / 86400000)
          if (diff === 0) return 'Today'
          if (diff === 1) return 'Tomorrow'
          if (diff === -1) return 'Yesterday'
          if (diff > 1 && diff <= 7) return `In ${diff} days`
          if (diff > 7 && diff <= 30) return `In ${Math.ceil(diff / 7)}w`
          if (diff < -1 && diff >= -7) return `${Math.abs(diff)}d ago`
          return Utils.formatDate(d)
        } catch { return Utils.formatDate(d) }
      }

      static formatDatePlusDays(d, n) {
        if (!d) return 'NA'
        try {
          const date = new Date(Utils.normalizeDate(d) + 'T00:00:00')
          if (isNaN(date.getTime())) return 'NA'
          date.setDate(date.getDate() + n)
          return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
        } catch { return 'NA' }
      }

      static formatTime(d) {
        if (!d) return ''
        try { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        catch { return d }
      }

      static formatRelativeTime(d) {
        if (!d) return 'Just now'
        try {
          const diff = Math.floor((new Date() - new Date(d)) / 60000)
          if (diff < 1) return 'Just now'
          if (diff < 60) return `${diff}m ago`
          if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
          return `${Math.floor(diff / 1440)}d ago`
        } catch { return 'Just now' }
      }

      static dateDiff(start, end) {
        try {
          const s = new Date(Utils.normalizeDate(start) + 'T00:00:00')
          const e = new Date(Utils.normalizeDate(end) + 'T23:59:59')
          if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
          return Math.ceil(Math.abs(e - s) / 86400000)
        } catch { return 0 }
      }

      static daysUntil(d) {
        if (!d) return 0
        const date = new Date(Utils.normalizeDate(d) + 'T00:00:00')
        const today = new Date(); today.setHours(0, 0, 0, 0)
        return Math.max(0, Math.ceil((date - today) / 86400000))
      }

      static ensureArray(data) {
        if (Array.isArray(data)) return data
        if (data?.data && Array.isArray(data.data)) return data.data
        if (data && typeof data === 'object') return Object.values(data)
        return []
      }

      static truncateText(text, max = 100) {
        if (!text) return ''
        return text.length <= max ? text : text.substring(0, max) + '...'
      }

      static generateId(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`
      }

      static formatPercentage(value, total) {
        if (!total) return '0%'
        return `${Math.round((value / total) * 100)}%`
      }

      static getPhaseColor(phase) {
        return { 'Phase I': '#4d9aff', 'Phase II': '#00e5a0', 'Phase III': '#ffbe3d', 'Phase IV': '#ff5566' }[phase] || '#7a90b0'
      }

      static getStageConfig(stage) {
        return PROJECT_STAGES_DATA.find(s => s.key === stage) || { key: stage, label: stage, icon: 'fa-circle', color: '#7a90b0', bg: 'rgba(122,144,176,.1)', step: 0 }
      }
      static getStageColor(stage) {
        return Utils.getStageConfig(stage).color
      }

      static getTomorrow() {
        const d = new Date(); d.setDate(d.getDate() + 1); return d
      }

      static formatClinicalDuration(startDate, endDate) {
        if (!startDate || !endDate) return 'N/A'
        try {
          const s = new Date(Utils.normalizeDate(startDate) + 'T00:00:00')
          const e = new Date(Utils.normalizeDate(endDate) + 'T00:00:00')
          const days = Math.round((e - s) / 86400000)
          if (days < 0) return 'N/A'
          if (days < 7) return `${days}d`
          const weeks = Math.floor(days / 7)
          const rem = days % 7
          if (weeks < 5) return rem > 0 ? `${weeks}w ${rem}d` : `${weeks}w`
          const months = Math.round(days / 30.44)
          return `${months}mo`
        } catch { return 'N/A' }
      }

      static getInitials(name) {
        if (!name || typeof name !== 'string') return '??'
        return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
      }
    }

    // ============ 4. ENHANCED API SERVICE ============
    class ApiService {
      constructor() { this.cache = new Map() }

      get token() { return localStorage.getItem(CONFIG.TOKEN_KEY) }

      headers() {
        const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        const t = this.token
        if (t?.trim()) h['Authorization'] = `Bearer ${t}`
        return h
      }

      getCached(key) {
        const entry = this.cache.get(key)
        if (!entry) return null
        if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL) { this.cache.delete(key); return null }
        return entry.data
      }

      setCached(key, data) { this.cache.set(key, { data, timestamp: Date.now() }) }

      invalidate(path) {
        for (const key of this.cache.keys()) {
          if (key.includes(path)) this.cache.delete(key)
        }
      }

      clearCache() { this.cache.clear() }

      async request(endpoint, options = {}) {
        const method = options.method || 'GET'
        const isGet = method === 'GET'
        const cacheKey = `${method}:${endpoint}`

        if (isGet && !options.skipCache) {
          const cached = this.getCached(cacheKey)
          if (cached) return cached
        }

        const config = { method, headers: this.headers(), mode: 'cors', cache: 'no-cache', credentials: 'include' }
        if (options.body) config.body = JSON.stringify(options.body)

        try {
          const res = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config)
          if (res.status === 204) return null
          if (!res.ok) {
            if (res.status === 401) {
              localStorage.removeItem(CONFIG.TOKEN_KEY)
              localStorage.removeItem(CONFIG.USER_KEY)
              throw new Error('Session expired. Please login again.')
            }
            const err = await res.text().catch(() => `HTTP ${res.status}`)
            throw new Error(err)
          }
          const ct = res.headers.get('content-type')
          const result = ct?.includes('application/json') ? await res.json() : await res.text()
          if (isGet && !options.skipCache) this.setCached(cacheKey, result)
          return result
        } catch (e) {
          if (e.message.includes('fetch') || e.message.includes('NetworkError'))
            throw new Error('Cannot connect to server. Check your network connection.')
          throw e
        }
      }

      async getList(path) {
        try { return Utils.ensureArray(await this.request(path)) } catch { return [] }
      }

      async login(email, password) {
        const data = await this.request('/api/auth/login', { method: 'POST', body: { email, password } })
        if (data.token) {
          localStorage.setItem(CONFIG.TOKEN_KEY, data.token)
          localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user))
          this.clearCache()
        }
        return data
      }

      async logout() {
        try { await this.request('/api/auth/logout', { method: 'POST' }) } finally {
          localStorage.removeItem(CONFIG.TOKEN_KEY)
          localStorage.removeItem(CONFIG.USER_KEY)
          this.clearCache()
        }
      }

      // ============ 4.1 MEDICAL STAFF ENDPOINTS ============
      
      async getMedicalStaff() { 
        const data = await this.getList('/api/medical-staff');
        return data
          .filter(staff => staff.employment_status !== 'inactive')
          .map(staff => ({
          ...staff,
          resident_category: staff.resident_category || null,
          home_department: staff.home_department || null,
          external_institution: staff.external_institution || null,
          can_supervise_residents: staff.can_supervise_residents || false,
          training_year: staff.training_year || null,
          training_level: staff.training_level || null,
          is_chief_of_department: staff.is_chief_of_department || false,
          is_research_coordinator: staff.is_research_coordinator || false,
          is_resident_manager: staff.is_resident_manager || false,
          is_oncall_manager: staff.is_oncall_manager || false
        }));
      }
      
      async createMedicalStaff(d) { this.invalidate('/api/medical-staff'); return this.request('/api/medical-staff', { method: 'POST', body: d }) }
      async updateMedicalStaff(id, d) { this.invalidate('/api/medical-staff'); return this.request(`/api/medical-staff/${id}`, { method: 'PUT', body: d }) }
      async deleteMedicalStaff(id) { this.invalidate('/api/medical-staff'); return this.request(`/api/medical-staff/${id}`, { method: 'DELETE' }) }

      // ============ 4.2 SUPERVISION ENDPOINTS ============
      
      async getSupervisedResidents(attendingId) {
        try {
          const rotations = await this.getRotations();
          const medicalStaff = await this.getMedicalStaff();
          const trainingUnits = await this.getTrainingUnits();
          
          const active = rotations
            .filter(r => r.supervising_attending_id === attendingId && r.rotation_status === 'active')
            .map(r => {
              const resident = medicalStaff.find(s => s.id === r.resident_id);
              const unit = trainingUnits.find(u => u.id === r.training_unit_id);
              return {
                id: r.id, residentId: r.resident_id,
                residentName: resident?.full_name || 'Unknown', residentYear: resident?.training_year || null,
                unitId: r.training_unit_id, unitName: unit?.unit_name || 'Unknown',
                startDate: r.start_date, endDate: r.end_date,
                daysLeft: Utils.daysUntil(r.end_date), evaluation: r.mid_evaluation || null
              };
            });
          
          const past = rotations.filter(r => r.supervising_attending_id === attendingId && r.rotation_status === 'completed').length;
          const evaluations = rotations.filter(r => r.supervising_attending_id === attendingId && r.final_evaluation).map(r => r.final_evaluation);
          const avgEvaluation = evaluations.length > 0 ? Math.round((evaluations.reduce((a, b) => a + b, 0) / evaluations.length) * 10) / 10 : 4.7;
          
          return { current: active, currentCount: active.length, pastCount: past, avgEvaluation };
        } catch (error) {
          console.error('Failed to load supervision data:', error);
          return { current: [], currentCount: 0, pastCount: 0, avgEvaluation: 0 };
        }
      }

      // ============ 4.3 LEAVE BALANCE ENDPOINTS ============
      
      async getLeaveBalance(staffId) {
        try {
          const staff = (await this.getMedicalStaff()).find(s => s.id === staffId);
          const isAttending = staff?.staff_type === 'attending_physician';
          return {
            vacation: { used: 5, total: isAttending ? 25 : 20, remaining: isAttending ? 20 : 15 },
            sick: { used: 2, total: 12, remaining: 10 },
            conference: { used: 3, total: isAttending ? 15 : 10, remaining: isAttending ? 12 : 7 },
            personal: { used: 1, total: 5, remaining: 4 }
          };
        } catch {
          return { vacation: { used: 5, total: 20, remaining: 15 }, sick: { used: 2, total: 10, remaining: 8 }, conference: { used: 3, total: 10, remaining: 7 }, personal: { used: 1, total: 5, remaining: 4 } };
        }
      }

      // ============ 4.4 EXISTING ENDPOINTS ============
      
      async getDepartments() { return this.getList('/api/departments') }
      async getAllDepartments() { return this.getList('/api/departments?include_inactive=true') }
      async getDepartmentImpact(id) { return this.request(`/api/departments/${id}/impact`) }
      async createDepartment(d) { this.invalidate('/api/departments'); return this.request('/api/departments', { method: 'POST', body: d }) }
      async updateDepartment(id, d) { this.invalidate('/api/departments'); return this.request(`/api/departments/${id}`, { method: 'PUT', body: d }) }
      async deleteDepartment(id, reassignments) { this.invalidate('/api/departments'); return this.request(`/api/departments/${id}`, { method: 'DELETE', body: reassignments ? { reassignments } : {} }) }

      async getTrainingUnits() { return this.getList('/api/training-units') }
      async createTrainingUnit(d) { this.invalidate('/api/training-units'); return this.request('/api/training-units', { method: 'POST', body: d }) }
      async updateTrainingUnit(id, d) { this.invalidate('/api/training-units'); return this.request(`/api/training-units/${id}`, { method: 'PUT', body: d }) }

      async getRotations() { return this.getList('/api/rotations') }
      async createRotation(d) { this.invalidate('/api/rotations'); return this.request('/api/rotations', { method: 'POST', body: d }) }
      async updateRotation(id, d) { this.invalidate('/api/rotations'); return this.request(`/api/rotations/${id}`, { method: 'PUT', body: d }) }
      async deleteRotation(id) { this.invalidate('/api/rotations'); return this.request(`/api/rotations/${id}`, { method: 'DELETE' }) }

      async getOnCallSchedule() { return this.getList('/api/oncall') }
      async getOnCallToday() { return this.getList('/api/oncall/today') }
      async createOnCall(d) { this.invalidate('/api/oncall'); return this.request('/api/oncall', { method: 'POST', body: d }) }
      async updateOnCall(id, d) { this.invalidate('/api/oncall'); return this.request(`/api/oncall/${id}`, { method: 'PUT', body: d }) }
      async deleteOnCall(id) { this.invalidate('/api/oncall'); return this.request(`/api/oncall/${id}`, { method: 'DELETE' }) }

      async getAbsences() {
        try {
          const r = await this.request('/api/absence-records')
          return (r?.success && Array.isArray(r.data)) ? r.data : Utils.ensureArray(r)
        } catch { return [] }
      }
      async createAbsence(d) { this.invalidate('/api/absence-records'); return this.request('/api/absence-records', { method: 'POST', body: d }) }
      async updateAbsence(id, d) { this.invalidate('/api/absence-records'); return this.request(`/api/absence-records/${id}`, { method: 'PUT', body: d }) }
      async deleteAbsence(id) { this.invalidate('/api/absence-records'); return this.request(`/api/absence-records/${id}`, { method: 'DELETE' }) }

      async getAnnouncements() { return this.getList('/api/announcements') }
      async createAnnouncement(d) { this.invalidate('/api/announcements'); return this.request('/api/announcements', { method: 'POST', body: d }) }
      async updateAnnouncement(id, d) { this.invalidate('/api/announcements'); return this.request(`/api/announcements/${id}`, { method: 'PUT', body: d }) }
      async deleteAnnouncement(id) { this.invalidate('/api/announcements'); return this.request(`/api/announcements/${id}`, { method: 'DELETE' }) }

      async getClinicalStatus() {
        try { return await this.request('/api/live-status/current') } catch { return { success: false, data: null } }
      }
      async createClinicalStatus(d) { this.invalidate('/api/live-status'); return this.request('/api/live-status', { method: 'POST', body: d }) }
      async updateClinicalStatus(id, d) { this.invalidate('/api/live-status'); return this.request(`/api/live-status/${id}`, { method: 'PUT', body: d }) }
      async deleteClinicalStatus(id) { this.invalidate('/api/live-status'); return this.request(`/api/live-status/${id}`, { method: 'DELETE' }) }
      async getClinicalStatusHistory(limit = 10) { return this.getList(`/api/live-status/history?limit=${limit}`) }

      async getSystemStats() { try { return await this.request('/api/system-stats') || {} } catch { return {} } }

      async getResearchLines() {
        try { const r = await this.request('/api/research-lines'); return r?.data || Utils.ensureArray(r) } catch { return [] }
      }
      async createResearchLine(d) { this.invalidate('/api/research-lines'); return this.request('/api/research-lines', { method: 'POST', body: d }) }
      async updateResearchLine(id, d) { this.invalidate('/api/research-lines'); return this.request(`/api/research-lines/${id}`, { method: 'PUT', body: d }) }
      async deleteResearchLine(id) { this.invalidate('/api/research-lines'); return this.request(`/api/research-lines/${id}`, { method: 'DELETE' }) }
      async assignCoordinator(lineId, coordinatorId) {
        this.invalidate('/api/research-lines')
        return this.request(`/api/research-lines/${lineId}/coordinator`, { method: 'PUT', body: { coordinator_id: coordinatorId } })
      }

      async getAllClinicalTrials() {
        try { const r = await this.request('/api/clinical-trials'); return r?.data || Utils.ensureArray(r) } catch { return [] }
      }
      async createClinicalTrial(d) { this.invalidate('/api/clinical-trials'); return this.request('/api/clinical-trials', { method: 'POST', body: d }) }
      async updateClinicalTrial(id, d) { this.invalidate('/api/clinical-trials'); return this.request(`/api/clinical-trials/${id}`, { method: 'PUT', body: d }) }
      async deleteClinicalTrial(id) { this.invalidate('/api/clinical-trials'); return this.request(`/api/clinical-trials/${id}`, { method: 'DELETE' }) }

      async getAllInnovationProjects() {
        try { const r = await this.request('/api/innovation-projects'); return r?.data || Utils.ensureArray(r) } catch { return [] }
      }
      async createInnovationProject(d) { this.invalidate('/api/innovation-projects'); return this.request('/api/innovation-projects', { method: 'POST', body: d }) }
      async updateInnovationProject(id, d) { this.invalidate('/api/innovation-projects'); return this.request(`/api/innovation-projects/${id}`, { method: 'PUT', body: d }) }
      async deleteInnovationProject(id) { this.invalidate('/api/innovation-projects'); return this.request(`/api/innovation-projects/${id}`, { method: 'DELETE' }) }

      async getResearchDashboard() {
        try { const r = await this.request('/api/analytics/research-dashboard'); return r?.data || r || null } catch { return null }
      }
      async getResearchLinesPerformance() {
        try { const r = await this.request('/api/analytics/research-lines-performance'); return r?.data || [] } catch { return [] }
      }
      async getPartnerCollaborations() {
        try { const r = await this.request('/api/analytics/partner-collaborations'); return r?.data || null } catch { return null }
      }
      async getClinicalTrialsTimeline(years = 3) {
        try { const r = await this.request(`/api/analytics/clinical-trials-timeline?years=${years}`); return r?.data || null } catch { return null }
      }
      async getAnalyticsSummary() {
        try { const r = await this.request('/api/analytics/summary'); return r?.data || null } catch { return null }
      }
      async exportData(type, format = 'csv') {
        return this.request(`/api/analytics/export/${type}?format=${format}`, { skipCache: true })
      }

      // ============ 4.5 ENHANCED RESEARCH PROFILE ============
      
      async getStaffResearchProfile(staffId) {
        try {
          const [performance, allTrials, allProjects, researchLines, rotations] = await Promise.all([
            this.getResearchLinesPerformance(), this.getAllClinicalTrials(),
            this.getAllInnovationProjects(), this.getResearchLines(), this.getRotations()
          ])
          
          // FIX 1: Use researchLines (UUID match) not performance (name string) for coordinator detection
          const linesCoordinated = researchLines.filter(l => l.coordinator_id === staffId)
          const trialsAsPI = allTrials.filter(t => t.principal_investigator_id === staffId)
          const linesAsPI = [...new Set(trialsAsPI.map(t => t.research_line_id))].map(lineId => researchLines.find(l => l.id === lineId)).filter(Boolean)
          const trialsAsCoI = allTrials.filter(t => t.co_investigators?.includes(staffId))
          const linesAsCoI = [...new Set(trialsAsCoI.map(t => t.research_line_id))].map(lineId => researchLines.find(l => l.id === lineId)).filter(Boolean)
          const projectsAsLead = allProjects.filter(p => p.lead_investigator_id === staffId)
          const linesAsLead = [...new Set(projectsAsLead.map(p => p.research_line_id))].map(lineId => researchLines.find(l => l.id === lineId)).filter(Boolean)
          const trialsAsSubI = allTrials.filter(t => t.sub_investigators?.includes(staffId))
          const linesAsSubI = [...new Set(trialsAsSubI.map(t => t.research_line_id))].map(lineId => researchLines.find(l => l.id === lineId)).filter(Boolean)
          
          // FIX 2: Build a roles-array map so a staff member can show multiple roles per line
          const allLineRolesMap = new Map();
          const addLineRole = (line, role) => {
            const key = line.id;
            if (!allLineRolesMap.has(key)) allLineRolesMap.set(key, { ...line, roles: [] });
            allLineRolesMap.get(key).roles.push(role);
          };
          linesCoordinated.forEach(l => addLineRole(l, 'Coordinator'));
          linesAsPI.forEach(l => addLineRole(l, 'Principal Investigator'));
          linesAsCoI.forEach(l => addLineRole(l, 'Co-Investigator'));
          linesAsLead.forEach(l => addLineRole(l, 'Project Lead'));
          linesAsSubI.forEach(l => addLineRole(l, 'Sub-Investigator'));
          
          // Find matching perf data for counts
          const perfMap = new Map(performance.map(p => [p.id, p]));
          const allResearchLines = Array.from(allLineRolesMap.values()).map(l => {
            const perf = perfMap.get(l.id);
            return {
              id: l.id, name: l.research_line_name || l.name, line_number: l.line_number,
              roles: l.roles, role: l.roles[0], // primary role for badge colour
              trialsCount: perf?.stats?.totalTrials || l.stats?.totalTrials || 0,
              projectsCount: perf?.stats?.totalProjects || l.stats?.totalProjects || 0
            };
          });
          
          const byPhase = { 'Phase I': 0, 'Phase II': 0, 'Phase III': 0, 'Phase IV': 0 };
          trialsAsPI.forEach(t => { if (t.phase in byPhase) byPhase[t.phase]++ });
          const partnerNeeds = {};
          projectsAsLead.forEach(p => p.partner_needs?.forEach(n => { partnerNeeds[n] = (partnerNeeds[n] || 0) + 1 }));
          
          // FIX 4: active count includes trials where staff is any role (PI or Co-I)
          const allActiveTrials = new Set([
            ...trialsAsPI.filter(t => ['Activo', 'Reclutando'].includes(t.status)).map(t => t.id),
            ...trialsAsCoI.filter(t => ['Activo', 'Reclutando'].includes(t.status)).map(t => t.id)
          ]);
          
          return {
            allResearchLines,
            // FIX: expose coordinator info at top level for banner display
            isCoordinator: linesCoordinated.length > 0,
            coordinatorLines: linesCoordinated.map(l => ({ id: l.id, name: l.research_line_name || l.name, line_number: l.line_number })),
            researchLines: linesCoordinated.map(l => ({ id: l.id, name: l.research_line_name || l.name, line_number: l.line_number, role: 'Coordinator', trialsCount: l.stats?.totalTrials || 0, projectsCount: l.stats?.totalProjects || 0 })),
            trials: {
              asPI: trialsAsPI.length, asCoI: trialsAsCoI.length, asSubI: trialsAsSubI.length,
              active: allActiveTrials.size,
              completed: trialsAsPI.filter(t => t.status === 'Completado').length, byPhase,
              list: [...trialsAsPI.slice(0, 3).map(t => ({ id: t.id, title: t.title, status: t.status, phase: t.phase, role: 'PI' })), ...trialsAsCoI.slice(0, 3).map(t => ({ id: t.id, title: t.title, status: t.status, phase: t.phase, role: 'Co-I' })), ...trialsAsSubI.slice(0, 3).map(t => ({ id: t.id, title: t.title, status: t.status, phase: t.phase, role: 'Sub-I' }))].slice(0, 8)
            },
            projects: {
              asLead: projectsAsLead.length,
              byStage: projectsAsLead.reduce((acc, p) => { const stage = p.current_stage || p.development_stage; acc[stage] = (acc[stage] || 0) + 1; return acc }, {}),
              list: projectsAsLead.slice(0, 5).map(p => ({ id: p.id, title: p.title, current_stage: p.current_stage || p.development_stage, role: 'Lead' }))
            },
            publications: [],
            partnerNeeds: Object.entries(partnerNeeds).map(([name, count]) => ({ name, count }))
          }
        } catch (error) {
          console.error('Failed to load research profile:', error);
          return null;
        }
      }
    }

    const API = new ApiService()

    // ============ 5. SHARED HELPERS ============
    function makePagination(views) {
      const pagination = reactive(Object.fromEntries(views.map(([k, size]) => [k, { page: 1, size }])))
      const resetPage = (v) => { if (pagination[v]) pagination[v].page = 1 }
      const paginate = (arr, v) => {
        if (!pagination[v]) return arr
        const { page, size } = pagination[v]
        return arr.slice((page - 1) * size, page * size)
      }
      const totalPages = (arr, v) => pagination[v] ? Math.max(1, Math.ceil(arr.length / pagination[v].size)) : 1
      const goToPage = (v, page, arr) => {
        if (!pagination[v]) return
        pagination[v].page = Math.max(1, Math.min(page, totalPages(arr, v)))
      }
      return { pagination, resetPage, paginate, totalPages, goToPage }
    }

    function makeSort(defaults) {
      const sortState = reactive(defaults)
      const sortBy = (v, field) => {
        const s = sortState[v]
        if (!s) return
        s.dir = (s.field === field && s.dir === 'asc') ? 'desc' : 'asc'
        s.field = field
      }
      const sortIcon = (v, field) => {
        const s = sortState[v]
        if (!s || s.field !== field) return 'fa-sort'
        return s.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down'
      }
      const applySort = (arr, v) => {
        const s = sortState[v]
        if (!s?.field) return arr
        return [...arr].sort((a, b) => {
          let va = a[s.field] ?? '', vb = b[s.field] ?? ''
          if (typeof va === 'string' && /\d{4}-\d{2}-\d{2}/.test(va)) {
            va = Utils.normalizeDate(va); vb = Utils.normalizeDate(vb)
          }
          const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true })
          return s.dir === 'asc' ? cmp : -cmp
        })
      }
      return { sortState, sortBy, sortIcon, applySort }
    }

    function makeValidation(forms) {
      const fieldErrors = reactive(Object.fromEntries(forms.map(f => [f, {}])))
      const setErr = (form, field, msg) => { if (fieldErrors[form]) fieldErrors[form][field] = msg }
      const clearErr = (form, field) => { if (fieldErrors[form]?.[field]) delete fieldErrors[form][field] }
      const clearAll = (form) => { if (fieldErrors[form]) Object.keys(fieldErrors[form]).forEach(k => delete fieldErrors[form][k]) }
      return { fieldErrors, setErr, clearErr, clearAll }
    }

    // ============ 6. COMPOSABLES ============

    // ============ 6.1 useAuth ============
    function useAuth() {
      const currentUser = ref(null)
      const loginForm = reactive({ email: '', password: '', remember_me: false })
      const loginLoading = ref(false)

      const hasPermission = (module, action = 'read') => {
        const role = currentUser.value?.user_role
        if (!role) return false
        if (role === ROLES.ADMIN) return true
        return PERMISSION_MATRIX[role]?.[module]?.includes(action) ?? false
      }

      return { currentUser, loginForm, loginLoading, hasPermission }
    }

    // ============ 6.2 useUI ============
    function useUI() {
      const toasts = ref([])
      const sidebarCollapsed = ref(false)
      const mobileMenuOpen = ref(false)
      const userMenuOpen = ref(false)
      const statsSidebarOpen = ref(false)
      const searchResultsOpen = ref(false)
      const globalSearchQuery = ref('')
      const currentView = ref('login')
      const systemAlerts = ref([])

      const confirmationModal = reactive({
        show: false, title: '', message: '', icon: 'fa-question-circle',
        confirmButtonText: 'Confirm', confirmButtonClass: 'btn-primary',
        cancelButtonText: 'Cancel', onConfirm: null, details: ''
      })
      const userProfileModal = reactive({
        show: false, form: { full_name: '', email: '', department_id: '' }
      })

      const showToast = (title, message, type = 'info', duration = 5000) => {
        const icons = { info: 'fas fa-info-circle', success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle' }
        const toast = { id: Date.now(), title, message, type, icon: icons[type], duration }
        toasts.value.push(toast)
        if (duration > 0) setTimeout(() => removeToast(toast.id), duration)
      }

      const removeToast = (id) => {
        const i = toasts.value.findIndex(t => t.id === id)
        if (i > -1) toasts.value.splice(i, 1)
      }

      const showConfirmation = (opts) => Object.assign(confirmationModal, { show: true, ...opts })

      const confirmAction = async () => {
        if (confirmationModal.onConfirm) {
          try { await confirmationModal.onConfirm() } catch (e) { showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
        }
        confirmationModal.show = false
      }

      const cancelConfirmation = () => { confirmationModal.show = false }

      const dismissAlert = (id) => {
        const i = systemAlerts.value.findIndex(a => a.id === id)
        if (i > -1) systemAlerts.value.splice(i, 1)
      }

      const activeAlertsCount = computed(() => systemAlerts.value.filter(a => !a.status || a.status === 'active').length)

      return {
        toasts, removeToast, showToast,
        confirmationModal, showConfirmation, confirmAction, cancelConfirmation,
        userProfileModal, systemAlerts, activeAlertsCount, dismissAlert,
        sidebarCollapsed, mobileMenuOpen, userMenuOpen, statsSidebarOpen, searchResultsOpen,
        globalSearchQuery, currentView
      }
    }

    // ============ 6.3 useStaff ============
    function useStaff({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, fieldErrors, setErr, clearAll }) {
      const medicalStaff = ref([])
      // allStaffLookup keeps ALL staff (including inactive) for name resolution
      // so deleted staff don't ghost as "Not assigned" in historical records
      const allStaffLookup = ref([])
      const staffFilters = reactive({ search: '', staffType: '', department: '', status: '', residentCategory: '' })
      const staffProfileModal = reactive({ 
        show: false, staff: null, activeTab: 'activity',
        researchProfile: null, supervisionData: null, leaveBalance: null,
        loadingResearch: false, loadingSupervision: false, loadingLeave: false
      })
      const medicalStaffModal = reactive({
        show: false, mode: 'add', activeTab: 'basic',
        form: { 
          full_name: '', staff_type: 'medical_resident', staff_id: '', employment_status: 'active', 
          professional_email: '', department_id: '', academic_degree: '', specialization: '', 
          training_year: '', clinical_certificate: '', certificate_status: '',
          mobile_phone: '', medical_license: '', can_supervise_residents: false, special_notes: '',
          can_be_pi: false, can_be_coi: false, other_certificate: '',
          resident_category: null, home_department: null, external_institution: null,
          is_chief_of_department: false, is_research_coordinator: false, 
          is_resident_manager: false, is_oncall_manager: false, clinical_study_certificates: []
        }
      })

      const validateStaff = (form) => {
        clearAll('staff'); let ok = true
        if (!form.full_name?.trim()) { setErr('staff', 'full_name', 'Full name is required'); ok = false }
        if (form.professional_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.professional_email)) {
          setErr('staff', 'professional_email', 'Invalid email address'); ok = false
        }
        if (form.staff_type === 'medical_resident' && !form.training_year?.trim()) {
          setErr('staff', 'training_year', 'Training year is required for residents'); ok = false
        }
        return ok
      }

      const filteredMedicalStaffAll = computed(() => {
        let f = medicalStaff.value
        if (staffFilters.search) {
          const q = staffFilters.search.toLowerCase()
          f = f.filter(x => x.full_name?.toLowerCase().includes(q) || x.staff_id?.toLowerCase().includes(q) || x.professional_email?.toLowerCase().includes(q))
        }
        if (staffFilters.staffType) f = f.filter(x => x.staff_type === staffFilters.staffType)
        if (staffFilters.department) f = f.filter(x => x.department_id === staffFilters.department)
        if (staffFilters.status) f = f.filter(x => x.employment_status === staffFilters.status)
        if (staffFilters.residentCategory) f = f.filter(x => x.resident_category === staffFilters.residentCategory)
        return applySort(f, 'medical_staff')
      })

      const filteredMedicalStaff = computed(() => paginate(filteredMedicalStaffAll.value, 'medical_staff'))
      const staffTotalPages = computed(() => totalPages(filteredMedicalStaffAll.value, 'medical_staff'))

      watch(staffFilters, () => resetPage('medical_staff'), { deep: true })

      const loadMedicalStaff = async () => {
        try {
          const raw = await API.getList('/api/medical-staff')
          if (Array.isArray(raw)) {
            allStaffLookup.value = raw.map(s => ({ id: s.id, full_name: s.full_name, staff_type: s.staff_type, employment_status: s.employment_status }))
          }
          medicalStaff.value = await API.getMedicalStaff()
        }
        catch { showToast('Error', 'Failed to load medical staff', 'error') }
      }

      const showAddMedicalStaffModal = () => {
        clearAll('staff')
        medicalStaffModal.mode = 'add'
        medicalStaffModal.activeTab = 'basic'
        Object.assign(medicalStaffModal.form, {
          full_name: '', staff_type: 'medical_resident', staff_id: `MD-${Date.now().toString().slice(-6)}`,
          employment_status: 'active', professional_email: '', department_id: '', academic_degree: '',
          specialization: '', training_year: '', clinical_certificate: '', certificate_status: '',
          mobile_phone: '', medical_license: '', can_supervise_residents: false, special_notes: '',
          can_be_pi: false, can_be_coi: false, other_certificate: '',
          resident_category: null, home_department: null, external_institution: null,
          is_chief_of_department: false, is_research_coordinator: false, 
          is_resident_manager: false, is_oncall_manager: false, clinical_study_certificates: []
        })
        medicalStaffModal.show = true
      }

      const editMedicalStaff = (staff) => {
        clearAll('staff')
        medicalStaffModal.mode = 'edit'
        medicalStaffModal.activeTab = 'basic'
        medicalStaffModal.form = {
          ...staff,
          full_name: staff.full_name || '',
          professional_email: staff.professional_email || '',
          mobile_phone: staff.mobile_phone || '',
          department_id: staff.department_id || '',
          academic_degree: staff.academic_degree || '',
          specialization: staff.specialization || '',
          training_year: staff.training_year || '',
          clinical_certificate: staff.clinical_certificate || '',
          certificate_status: staff.certificate_status || '',
          medical_license: staff.medical_license || '',
          special_notes: staff.special_notes || '',
          other_certificate: staff.other_certificate || '',
          resident_category: staff.resident_category || null,
          home_department: staff.home_department || null,
          external_institution: staff.external_institution || null,
          can_supervise_residents: staff.can_supervise_residents || false,
          can_be_pi: staff.can_be_pi || false,
          can_be_coi: staff.can_be_coi || false,
          is_chief_of_department: staff.is_chief_of_department || false,
          is_research_coordinator: staff.is_research_coordinator || false,
          is_resident_manager: staff.is_resident_manager || false,
          is_oncall_manager: staff.is_oncall_manager || false,
          clinical_study_certificates: Array.isArray(staff.clinical_study_certificates) ? [...staff.clinical_study_certificates] : []
        }
        medicalStaffModal.show = true
      }

      const saveMedicalStaff = async (saving) => {
        if (!validateStaff(medicalStaffModal.form)) { showToast('Validation Error', 'Please fix the highlighted fields', 'error'); return }
        saving.value = true
        try {
          const clean = v => (v == null) ? '' : String(v).trim()
          const f = medicalStaffModal.form
          const data = {
            full_name: f.full_name.trim(), staff_type: f.staff_type || 'medical_resident',
            staff_id: f.staff_id || Utils.generateId('MD'), employment_status: f.employment_status || 'active',
            professional_email: f.professional_email || '', department_id: f.department_id || null,
            academic_degree: clean(f.academic_degree), specialization: clean(f.specialization),
            training_year: clean(f.training_year), clinical_certificate: clean(f.clinical_certificate),
            certificate_status: clean(f.certificate_status), mobile_phone: clean(f.mobile_phone),
            medical_license: clean(f.medical_license), can_supervise_residents: f.can_supervise_residents || false,
            can_be_pi: f.can_be_pi || false, can_be_coi: f.can_be_coi || false,
            other_certificate: clean(f.other_certificate),
            special_notes: clean(f.special_notes), resident_category: f.resident_category || null,
            home_department: f.home_department || null, external_institution: f.external_institution || null,
            is_chief_of_department: f.is_chief_of_department || false, is_research_coordinator: f.is_research_coordinator || false,
            is_resident_manager: f.is_resident_manager || false, is_oncall_manager: f.is_oncall_manager || false,
            clinical_study_certificates: f.clinical_study_certificates || []
          }
          if (medicalStaffModal.mode === 'add') {
            medicalStaff.value.unshift(await API.createMedicalStaff(data))
            showToast('Success', 'Medical staff added', 'success')
          } else {
            const result = await API.updateMedicalStaff(f.id, data)
            const idx = medicalStaff.value.findIndex(s => s.id === result.id)
            if (idx !== -1) medicalStaff.value[idx] = result
            showToast('Success', 'Medical staff updated', 'success')
          }
          medicalStaffModal.show = false; clearAll('staff')
        } catch (e) { showToast('Error', e.message || 'Failed to save', 'error') }
        finally { saving.value = false }
      }

      // Raw deactivation — called by the main setup's orchestrated deletion workflow
      const deactivateStaffMember = async (staffId, staffName) => {
        await API.deleteMedicalStaff(staffId)
        medicalStaff.value = medicalStaff.value.filter(s => s.id !== staffId)
      }

      const isRoleTaken = (role) => {
        if (!medicalStaff.value) return false;
        const currentHolder = medicalStaff.value.find(staff => {
          switch (role) {
            case 'chief_of_department': return staff.is_chief_of_department;
            case 'research_coordinator': return staff.is_research_coordinator;
            case 'resident_manager': return staff.is_resident_manager;
            case 'oncall_manager': return staff.is_oncall_manager;
            default: return false;
          }
        });
        return currentHolder && currentHolder.id !== medicalStaffModal.form.id;
      }

      const getCurrentRoleHolder = (role) => {
        if (!medicalStaff.value) return null;
        return medicalStaff.value.find(staff => {
          switch (role) {
            case 'chief_of_department': return staff.is_chief_of_department;
            case 'research_coordinator': return staff.is_research_coordinator;
            case 'resident_manager': return staff.is_resident_manager;
            case 'oncall_manager': return staff.is_oncall_manager;
            default: return false;
          }
        }) || null;
      }

      const handleRoleAssignment = (role, checked) => {
        if (!checked) return;
        const currentHolder = getCurrentRoleHolder(role);
        if (currentHolder && currentHolder.id !== medicalStaffModal.form.id) {
          showConfirmation({
            title: 'Replace Role Holder', message: `${currentHolder.full_name} currently holds this role.`,
            details: `Are you sure you want to reassign it to ${medicalStaffModal.form.full_name}?`,
            icon: 'fa-exchange-alt', confirmButtonText: 'Yes, Reassign', confirmButtonClass: 'btn-warning',
            onConfirm: () => {
              const idx = medicalStaff.value.findIndex(s => s.id === currentHolder.id);
              if (idx !== -1) medicalStaff.value[idx][`is_${role}`] = false;
            }
          });
        }
      }

      const toggleCertificate = (cert) => {
        if (!medicalStaffModal.form.clinical_study_certificates) medicalStaffModal.form.clinical_study_certificates = [];
        const idx = medicalStaffModal.form.clinical_study_certificates.indexOf(cert);
        if (idx === -1) medicalStaffModal.form.clinical_study_certificates.push(cert);
        else medicalStaffModal.form.clinical_study_certificates.splice(idx, 1);
      }

      const availableCertificates = ['GCP - Good Clinical Practice','ICH Guidelines','Clinical Research Coordinator','CITI Program','HIPAA Certification','Responsible Conduct of Research'];

      return {
        medicalStaff, allStaffLookup, staffFilters, staffProfileModal, medicalStaffModal,
        filteredMedicalStaff, filteredMedicalStaffAll, staffTotalPages,
        loadMedicalStaff, showAddMedicalStaffModal, editMedicalStaff, saveMedicalStaff, deactivateStaffMember,
        formatTrainingYear: Utils.formatTrainingYear, formatSpecialization: Utils.formatSpecialization,
        formatPhone: Utils.formatPhone, formatLicense: Utils.formatLicense,
        getResidentCategoryInfo: Utils.getResidentCategoryInfo, formatResidentCategorySimple: Utils.formatResidentCategorySimple,
        formatResidentCategoryDetailed: Utils.formatResidentCategoryDetailed, getResidentCategoryIcon: Utils.getResidentCategoryIcon,
        getResidentCategoryTooltip: Utils.getResidentCategoryTooltip, getRoleInfo: Utils.getRoleInfo, getStaffRoles: Utils.getStaffRoles,
        isRoleTaken, getCurrentRoleHolder, handleRoleAssignment, toggleCertificate, availableCertificates
      }
    }

    // ============ 6.4 useOnCall ============
    function useOnCall({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff }) {
      const onCallSchedule = ref([])
      const todaysOnCall = ref([])
      const loadingSchedule = ref(false)
      const onCallFilters = reactive({ date: '', shiftType: '', physician: '', coverageArea: '', search: '' })
      const onCallModal = reactive({
        show: false, mode: 'add',
        form: { duty_date: Utils.normalizeDate(new Date()), shift_type: 'primary_call', start_time: '08:00', end_time: '17:00', primary_physician_id: '', backup_physician_id: '', coverage_area: 'emergency', coverage_notes: '' }
      })

      const getPhysicianName = (id) => {
        if (!id) return 'Not assigned'
        return medicalStaff.value.find(x => x.id === id)?.full_name || id
      }
      const formatStaffType = (t) => STAFF_TYPE_LABELS[t] || t

      const validateOnCall = (form) => {
        clearAll('oncall'); let ok = true
        if (!form.duty_date) { setErr('oncall', 'duty_date', 'Date is required'); ok = false }
        if (!form.primary_physician_id) { setErr('oncall', 'primary_physician_id', 'Please select a physician'); ok = false }
        if (!form.start_time) { setErr('oncall', 'start_time', 'Start time is required'); ok = false }
        if (!form.end_time) { setErr('oncall', 'end_time', 'End time is required'); ok = false }
        return ok
      }

      const checkExistingSchedule = async (date, shiftType, excludeId = null) => {
        try {
          const schedules = await API.getOnCallSchedule({ start_date: date, end_date: date });
          return schedules.filter(s => s.shift_type === shiftType && (!excludeId || s.id !== excludeId)).length > 0;
        } catch (error) { console.error('Failed to check existing schedule:', error); return false; }
      };

      const deriveOnCallStatus = (s) => {
        const today = Utils.normalizeDate(new Date())
        const d = Utils.normalizeDate(s.duty_date)
        if (d < today)  return 'completed'
        if (d === today) return 'today'
        return 'upcoming'
      }

      const filteredOnCallAll = computed(() => {
        let f = onCallSchedule.value
        // Default: hide past shifts unless user explicitly filters to a past date or searches
        const today = Utils.normalizeDate(new Date())
        if (!onCallFilters.date && !onCallFilters.search) {
          f = f.filter(s => Utils.normalizeDate(s.duty_date) >= today)
        }
        if (onCallFilters.date) f = f.filter(s => Utils.normalizeDate(s.duty_date) === onCallFilters.date)
        if (onCallFilters.shiftType) f = f.filter(s => s.shift_type === onCallFilters.shiftType)
        if (onCallFilters.physician) f = f.filter(s => s.primary_physician_id === onCallFilters.physician || s.backup_physician_id === onCallFilters.physician)
        if (onCallFilters.coverageArea) f = f.filter(s => s.coverage_area === onCallFilters.coverageArea)
        if (onCallFilters.search) {
          const q = onCallFilters.search.toLowerCase()
          f = f.filter(s => getPhysicianName(s.primary_physician_id).toLowerCase().includes(q) || (s.coverage_area || '').toLowerCase().includes(q))
        }
        return applySort(f, 'oncall')
      })

      const filteredOnCallSchedules = computed(() => paginate(filteredOnCallAll.value, 'oncall'))
      const oncallTotalPages = computed(() => totalPages(filteredOnCallAll.value, 'oncall'))
      const todaysOnCallCount = computed(() => todaysOnCall.value.length)

      // Groups ALL on-call schedules by physician for the compact orb view
      const staffWithOnCallOrbs = computed(() => {
        const today = Utils.normalizeDate(new Date())
        // Show shifts from 7 days ago onward (so recent past is visible, ancient history is not)
        const cutoff = Utils.normalizeDate(new Date(Date.now() - 7 * 86400000))
        const map = {}
        ;(onCallSchedule.value || []).forEach(shift => {
          const dutyDate = Utils.normalizeDate(shift.duty_date)
          if (dutyDate < cutoff) return // skip very old shifts
          const id = shift.primary_physician_id
          if (!id) return
          const staff = medicalStaff.value.find(s => s.id === id)
          if (!staff) return
          if (!map[id]) map[id] = { id, name: staff.full_name, staffType: staff.staff_type, shifts: [] }
          map[id].shifts.push({
            ...shift, dutyDate,
            isToday: dutyDate === today,
            isPast:  dutyDate < today,
            dayLabel:  new Date(dutyDate + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }),
            dateLabel: new Date(dutyDate + 'T12:00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' }),
            backupName: shift.backup_physician_id ? (medicalStaff.value.find(s => s.id === shift.backup_physician_id)?.full_name || null) : null
          })
        })
        Object.values(map).forEach(p => p.shifts.sort((a, b) => a.dutyDate.localeCompare(b.dutyDate)))
        return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
      })

      watch(onCallFilters, () => resetPage('oncall'), { deep: true })

      const existingSchedulesForDate = computed(() => {
        if (!onCallModal.form.duty_date) return [];
        return onCallSchedule.value.filter(s => Utils.normalizeDate(s.duty_date) === Utils.normalizeDate(onCallModal.form.duty_date));
      })

      const loadOnCallSchedule = async () => {
        loadingSchedule.value = true
        try {
          const raw = await API.getOnCallSchedule()
          onCallSchedule.value = raw.map(s => ({ ...s, duty_date: Utils.normalizeDate(s.duty_date) }))
        } catch { showToast('Error', 'Failed to load on-call schedule', 'error') }
        finally { loadingSchedule.value = false }
      }

      const loadTodaysOnCall = async () => {
        try {
          const data = await API.getOnCallToday()
          todaysOnCall.value = data.map(item => {
            const startTime = item.start_time?.substring(0, 5) || 'N/A'
            const endTime = item.end_time?.substring(0, 5) || 'N/A'
            const isPrimary = ['primary_call', 'primary'].includes(item.shift_type || '')
            const matchingStaff = medicalStaff.value.find(s => s.id === item.primary_physician_id)
            return {
              id: item.id, startTime, endTime,
              physicianName: item.primary_physician?.full_name || 'Unknown Physician',
              shiftTypeDisplay: isPrimary ? 'Primary' : 'Backup',
              shiftTypeClass: isPrimary ? 'badge-primary' : 'badge-secondary',
              shiftType: isPrimary ? 'Primary' : 'Backup',
              staffType: matchingStaff ? formatStaffType(matchingStaff.staff_type) : 'Physician',
              coverageArea: item.coverage_area || 'General Coverage',
              backupPhysician: item.backup_physician?.full_name || null,
              contactInfo: item.primary_physician?.professional_email || 'No contact info', raw: item
            }
          })
        } catch { todaysOnCall.value = [] }
      }

      const showAddOnCallModal = () => {
        clearAll('oncall')
        onCallModal.mode = 'add'
        Object.assign(onCallModal.form, {
          duty_date: Utils.normalizeDate(new Date()), shift_type: 'primary_call',
          start_time: '08:00', end_time: '17:00', primary_physician_id: '',
          backup_physician_id: '', coverage_area: 'emergency', coverage_notes: '',
          schedule_id: `SCH-${Date.now().toString().slice(-6)}`
        })
        onCallModal.show = true
      }

      const editOnCallSchedule = (schedule) => {
        clearAll('oncall')
        onCallModal.mode = 'edit'
        const raw = schedule.shift_type || 'primary_call'
        onCallModal.form = {
          ...schedule, duty_date: Utils.normalizeDate(schedule.duty_date),
          shift_type: ['primary', 'primary_call'].includes(raw) ? 'primary_call' : 'backup_call',
          coverage_area: schedule.coverage_area || 'emergency', coverage_notes: schedule.coverage_notes || ''
        }
        onCallModal.show = true
      }

      const saveOnCallSchedule = async (saving) => {
        if (!validateOnCall(onCallModal.form)) { showToast('Validation Error', 'Please fix the highlighted fields', 'error'); return }
        saving.value = true
        try {
          const f = onCallModal.form
          const data = {
            duty_date: Utils.normalizeDate(f.duty_date), shift_type: f.shift_type || 'primary_call',
            start_time: f.start_time || '08:00', end_time: f.end_time || '17:00',
            primary_physician_id: f.primary_physician_id, backup_physician_id: f.backup_physician_id || null,
            coverage_notes: f.coverage_notes || '', schedule_id: f.schedule_id || Utils.generateId('SCH')
          }
          if (onCallModal.mode === 'add') {
            const exists = await checkExistingSchedule(data.duty_date, data.shift_type);
            if (exists) { showToast('Duplicate Schedule', `A ${data.shift_type === 'primary_call' ? 'primary' : 'backup'} shift already exists for this date.`, 'warning'); saving.value = false; return; }
          }
          if (onCallModal.mode === 'edit') {
            const exists = await checkExistingSchedule(data.duty_date, data.shift_type, f.id);
            if (exists) { showToast('Duplicate Schedule', `Another ${data.shift_type === 'primary_call' ? 'primary' : 'backup'} shift already exists for this date.`, 'warning'); saving.value = false; return; }
          }
          if (onCallModal.mode === 'add') {
            const result = await API.createOnCall(data);
            onCallSchedule.value.unshift({ ...result, duty_date: Utils.normalizeDate(result.duty_date), coverage_area: f.coverage_area });
            showToast('Success', 'On-call scheduled', 'success');
          } else {
            const result = await API.updateOnCall(f.id, data);
            const idx = onCallSchedule.value.findIndex(s => s.id === result.id);
            if (idx !== -1) onCallSchedule.value[idx] = { ...result, duty_date: Utils.normalizeDate(result.duty_date), coverage_area: f.coverage_area };
            showToast('Success', 'On-call updated', 'success');
          }
          onCallModal.show = false; clearAll('oncall'); await loadTodaysOnCall();
        } catch (e) {
          if (e.message && e.message.includes('duplicate key')) showToast('Error', 'A schedule for this shift type already exists on this date', 'error');
          else showToast('Error', e.message || 'Failed to save on-call', 'error');
        } finally { saving.value = false }
      }

      const deleteOnCallSchedule = (schedule) => showConfirmation({
        title: 'Delete On-Call', message: 'Delete this on-call schedule?',
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        details: `Physician: ${getPhysicianName(schedule.primary_physician_id)}`,
        onConfirm: async () => {
          await API.deleteOnCall(schedule.id)
          onCallSchedule.value = onCallSchedule.value.filter(s => s.id !== schedule.id)
          showToast('Success', 'Schedule deleted', 'success'); loadTodaysOnCall()
        }
      })

      const contactPhysician = (shift) => {
        if (shift.contactInfo && shift.contactInfo !== 'No contact info')
          showToast('Contact Physician', `Contact ${shift.physicianName}: ${shift.contactInfo}`, 'info')
        else showToast('No Contact Info', `No contact info for ${shift.physicianName}`, 'warning')
      }

      // ============ [NEW] Compact view computed properties for On-Call ============
      const groupedOnCallSchedules = computed(() => {
        const groups = {}
        
        onCallSchedule.value.forEach(shift => {
          const date = Utils.normalizeDate(shift.duty_date)
          if (!groups[date]) {
            groups[date] = {
              date,
              dayOfWeek: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
              shifts: []
            }
          }
          
          // Apply filters
          if (onCallFilters.date && date !== onCallFilters.date) return
          if (onCallFilters.shiftType && shift.shift_type !== onCallFilters.shiftType) return
          if (onCallFilters.physician && shift.primary_physician_id !== onCallFilters.physician && 
              shift.backup_physician_id !== onCallFilters.physician) return
          if (onCallFilters.search) {
            const physicianName = getPhysicianName(shift.primary_physician_id).toLowerCase()
            if (!physicianName.includes(onCallFilters.search.toLowerCase())) return
          }
          
          groups[date].shifts.push(shift)
        })
        
        return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date))
      })

      const isShiftActive = (shift) => {
        if (!shift.duty_date) return false
        const today = Utils.normalizeDate(new Date())
        const shiftDate = Utils.normalizeDate(shift.duty_date)
        
        if (shiftDate !== today) return false
        
        const now = new Date()
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        
        return currentTime >= shift.start_time && currentTime <= shift.end_time
      }

      return {
        onCallSchedule, todaysOnCall, loadingSchedule, onCallFilters, onCallModal,
        filteredOnCallSchedules, filteredOnCallAll, oncallTotalPages, todaysOnCallCount,
        loadOnCallSchedule, loadTodaysOnCall, showAddOnCallModal,
        editOnCallSchedule, saveOnCallSchedule, deleteOnCallSchedule, contactPhysician,
        // NEW compact view properties
        groupedOnCallSchedules,
        isShiftActive,
        staffWithOnCallOrbs
      }
    }

    // ============ 6.5 useRotations ============
    function useRotations({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff, trainingUnits, currentUser }) {
      const rotations = ref([])
      const rotationFilters = reactive({ resident: '', status: '', trainingUnit: '', supervisor: '', search: '' })
      const rotationModal = reactive({
        show: false, mode: 'add',
        form: { rotation_id: '', resident_id: '', training_unit_id: '', start_date: Utils.normalizeDate(new Date()), end_date: Utils.normalizeDate(new Date(Date.now() + 30 * 86400000)), rotation_status: 'scheduled', rotation_category: 'clinical_rotation', supervising_attending_id: '' }
      })

      const pendingActivations = ref([])
      const activationModal = reactive({ show: false, rotations: [], selectedRotation: null, notes: '', action: 'activate' })

      const getResidentName = (id) => medicalStaff.value.find(s => s.id === id)?.full_name || 'Not assigned'
      const getTrainingUnitName = (id) => trainingUnits.value.find(u => u.id === id)?.unit_name || 'Not assigned'

      // Capacity info for rotation modal — reactive to selected unit
      const selectedUnitCapacity = computed(() => {
        const unitId = rotationModal.form.training_unit_id
        if (!unitId) return null
        const unit = trainingUnits.value.find(u => u.id === unitId)
        if (!unit) return null
        const editId = rotationModal.mode === 'edit' ? rotationModal.form.id : null
        const current = rotations.value.filter(r =>
          r.training_unit_id === unitId &&
          ['active', 'scheduled'].includes(r.rotation_status) &&
          r.id !== editId
        ).length
        const max = unit.maximum_residents || 5
        return { current, max, full: current >= max, warn: current / max >= 0.8, pct: Math.min(100, Math.round((current / max) * 100)) }
      })

      const checkAndUpdateRotations = async (requireValidation = true) => {
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const todayStr = Utils.normalizeDate(today)
        const updates = [], pending = []

        rotations.value.forEach(rotation => {
          const startDate = new Date(Utils.normalizeDate(rotation.start_date) + 'T00:00:00')
          const endDate = new Date(Utils.normalizeDate(rotation.end_date) + 'T23:59:59')
          if (rotation.rotation_status === 'scheduled' && Utils.normalizeDate(startDate) <= todayStr) {
            if (requireValidation) pending.push({ ...rotation, action: 'activate', message: `Rotation for ${getResidentName(rotation.resident_id)} at ${getTrainingUnitName(rotation.training_unit_id)} should start today.` })
            else updates.push(updateRotationStatus(rotation.id, 'active', { activated_at: new Date().toISOString(), activated_by: 'system', notes: 'Auto-activated on start date' }))
          }
          if (rotation.rotation_status === 'active' && Utils.normalizeDate(endDate) < todayStr) {
            if (requireValidation) pending.push({ ...rotation, action: 'complete', message: `Rotation for ${getResidentName(rotation.resident_id)} at ${getTrainingUnitName(rotation.training_unit_id)} ended yesterday and should be completed.` })
            else updates.push(updateRotationStatus(rotation.id, 'completed', { completed_at: new Date().toISOString(), completed_by: 'system', notes: 'Auto-completed after end date' }))
          }
        })

        if (pending.length > 0 && requireValidation) { pendingActivations.value = pending; showActivationModal() }
        if (updates.length > 0) { await Promise.all(updates); await loadRotations(); showToast('Rotations Updated', `${updates.length} rotation(s) automatically updated.`, 'info') }
        return { updates: updates.length, pending: pending.length }
      }

      const updateRotationStatus = async (rotationId, newStatus, metadata = {}) => {
        const rotation = rotations.value.find(r => r.id === rotationId)
        if (!rotation) return
        try {
          const updateData = {
            id: rotation.id, resident_id: rotation.resident_id, training_unit_id: rotation.training_unit_id,
            supervising_attending_id: rotation.supervising_attending_id || null,
            start_date: rotation.start_date, end_date: rotation.end_date,
            rotation_category: rotation.rotation_category || 'clinical_rotation',
            rotation_status: newStatus, clinical_notes: rotation.clinical_notes || '',
            supervisor_evaluation: rotation.supervisor_evaluation || '', goals: rotation.goals || '',
            notes: rotation.notes || '', rotation_id: rotation.rotation_id, ...metadata
          }
          const result = await API.updateRotation(rotationId, updateData)
          const idx = rotations.value.findIndex(r => r.id === rotationId)
          if (idx !== -1) rotations.value[idx] = { ...result, start_date: Utils.normalizeDate(result.start_date), end_date: Utils.normalizeDate(result.end_date) }
          return result
        } catch (error) { console.error('Failed to update rotation status:', error); throw error }
      }

      const showActivationModal = () => {
        if (pendingActivations.value.length === 0) return
        activationModal.rotations = [...pendingActivations.value]
        activationModal.selectedRotation = activationModal.rotations[0]
        activationModal.notes = ''; activationModal.show = true
      }

      const processNextPending = async () => {
        if (activationModal.rotations.length === 0) {
          activationModal.show = false; pendingActivations.value = []
          showToast('All Done', 'All rotation statuses have been updated.', 'success'); return
        }
        const current = activationModal.rotations[0]
        activationModal.selectedRotation = current; activationModal.action = current.action
      }

      const confirmPendingActivation = async () => {
        if (!activationModal.selectedRotation) return
        const rotation = activationModal.selectedRotation
        const newStatus = rotation.action === 'activate' ? 'active' : 'completed'
        try {
          await updateRotationStatus(rotation.id, newStatus, {
            [`${newStatus}_at`]: new Date().toISOString(),
            [`${newStatus}_by`]: currentUser?.value?.full_name || 'system',
            activation_notes: activationModal.notes || null,
            validated_by: currentUser?.value?.full_name || 'system', validated_at: new Date().toISOString()
          })
          activationModal.rotations = activationModal.rotations.slice(1)
          pendingActivations.value = pendingActivations.value.filter(r => r.id !== rotation.id)
          showToast('Rotation Updated', `${rotation.action === 'activate' ? 'Activated' : 'Completed'} rotation for ${getResidentName(rotation.resident_id)}`, 'success')
          await processNextPending()
        } catch (error) { showToast('Error', 'Failed to update rotation status', 'error') }
      }

      const skipPendingActivation = () => {
        if (!activationModal.selectedRotation) return
        const current = activationModal.rotations[0]
        activationModal.rotations = [...activationModal.rotations.slice(1), current]
        processNextPending(); showToast('Skipped', 'Rotation status update postponed.', 'warning')
      }

      const postponeAllActivations = () => {
        activationModal.show = false; showToast('Reminder Set', 'Will check again in 4 hours.', 'info')
        localStorage.setItem('last_rotation_check', new Date().toISOString())
      }

      const initAutoCheck = () => {
        setTimeout(() => checkAndUpdateRotations(true), 2000)
        const interval = setInterval(() => {
          const lastCheck = localStorage.getItem('last_rotation_check')
          const now = new Date()
          if (!lastCheck || (now - new Date(lastCheck)) > 4 * 60 * 60 * 1000) {
            checkAndUpdateRotations(true); localStorage.setItem('last_rotation_check', now.toISOString())
          }
        }, 60 * 60 * 1000)
        return interval
      }

      const validateRotation = (form) => {
        clearAll('rotation'); let ok = true
        if (!form.resident_id) { setErr('rotation', 'resident_id', 'Please select a resident'); ok = false }
        if (!form.training_unit_id) { setErr('rotation', 'training_unit_id', 'Please select a training unit'); ok = false }
        if (!form.start_date) { setErr('rotation', 'start_date', 'Start date is required'); ok = false }
        if (!form.end_date) { setErr('rotation', 'end_date', 'End date is required'); ok = false }
        if (form.start_date && form.end_date) {
          const s = new Date(Utils.normalizeDate(form.start_date) + 'T00:00:00')
          const e = new Date(Utils.normalizeDate(form.end_date) + 'T00:00:00')
          if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e <= s) { setErr('rotation', 'end_date', 'End date must be after start date'); ok = false }
        }
        return ok
      }

      const filteredRotationsAll = computed(() => {
        let f = rotations.value
        if (rotationFilters.resident) f = f.filter(r => r.resident_id === rotationFilters.resident)
        if (rotationFilters.status) f = f.filter(r => r.rotation_status === rotationFilters.status)
        if (rotationFilters.trainingUnit) f = f.filter(r => r.training_unit_id === rotationFilters.trainingUnit)
        if (rotationFilters.supervisor) f = f.filter(r => r.supervising_attending_id === rotationFilters.supervisor)
        if (rotationFilters.search) {
          const q = rotationFilters.search.toLowerCase()
          f = f.filter(r => getResidentName(r.resident_id).toLowerCase().includes(q) || getTrainingUnitName(r.training_unit_id).toLowerCase().includes(q))
        }
        return applySort(f, 'rotations')
      })
      const filteredRotations = computed(() => paginate(filteredRotationsAll.value, 'rotations'))
      const rotationTotalPages = computed(() => totalPages(filteredRotationsAll.value, 'rotations'))

      watch(rotationFilters, () => resetPage('rotations'), { deep: true })

      const loadRotations = async () => {
        try {
          const raw = await API.getRotations()
          rotations.value = raw.map(r => ({
            ...r, start_date: Utils.normalizeDate(r.start_date || r.rotation_start_date),
            end_date: Utils.normalizeDate(r.end_date || r.rotation_end_date)
          }))
        } catch { showToast('Error', 'Failed to load rotations', 'error') }
      }

      const showAddRotationModal = () => {
        clearAll('rotation'); rotationModal.mode = 'add'
        Object.assign(rotationModal.form, {
          rotation_id: `ROT-${Date.now().toString().slice(-6)}`, resident_id: '', training_unit_id: '',
          start_date: Utils.normalizeDate(new Date()), end_date: Utils.normalizeDate(new Date(Date.now() + 30 * 86400000)),
          rotation_status: 'scheduled', rotation_category: 'clinical_rotation', supervising_attending_id: ''
        })
        rotationModal.show = true
      }

      const editRotation = (rotation) => {
        clearAll('rotation'); rotationModal.mode = 'edit'
        rotationModal.form = { ...rotation, start_date: Utils.normalizeDate(rotation.start_date || rotation.rotation_start_date), end_date: Utils.normalizeDate(rotation.end_date || rotation.rotation_end_date) }
        rotationModal.show = true
      }

      const saveRotation = async (saving) => {
        if (!validateRotation(rotationModal.form)) { showToast('Validation Error', 'Please fix the highlighted fields', 'error'); return }
        const f = rotationModal.form
        const startISO = Utils.normalizeDate(f.start_date)
        const endISO = Utils.normalizeDate(f.end_date)
        const startDate = new Date(startISO + 'T00:00:00')
        const endDate = new Date(endISO + 'T23:59:59')

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) { setErr('rotation', 'start_date', 'Invalid date format'); showToast('Error', 'Invalid date format', 'error'); return }
        const duration = Math.ceil((endDate - startDate) / 86400000)
        if (duration > 365) { setErr('rotation', 'end_date', `Cannot exceed 365 days (current: ${duration})`); showToast('Error', 'Rotation cannot exceed 365 days', 'error'); return }

        // Lock button immediately — prevents double-submit during async refresh below
        saving.value = true

        // Refresh from server before overlap check to avoid stale-cache false conflicts
        API.invalidate('/api/rotations')
        try {
          const fresh = await API.request('/api/rotations', { skipCache: true })
          const freshList = Utils.ensureArray(fresh)
          if (freshList.length > 0) rotations.value = freshList.map(r => ({ ...r, start_date: Utils.normalizeDate(r.start_date), end_date: Utils.normalizeDate(r.end_date) }))
        } catch { /* proceed with cached data */ }

        const excludeId = rotationModal.mode === 'edit' ? f.id : null
        // Only scheduled/active/extended block new slots — completed/cancelled do NOT
        const BLOCKING_STATUSES = ['scheduled', 'active', 'extended']
        const hasOverlap = rotations.value.some(r => {
          if (r.resident_id !== f.resident_id) return false
          if (!BLOCKING_STATUSES.includes(r.rotation_status)) return false
          if (excludeId && r.id === excludeId) return false
          const eS = new Date(Utils.normalizeDate(r.start_date) + 'T00:00:00')
          const eE = new Date(Utils.normalizeDate(r.end_date) + 'T23:59:59')
          if (isNaN(eS.getTime()) || isNaN(eE.getTime())) return false
          return startDate <= eE && endDate >= eS
        })
        if (hasOverlap) {
          const conflicting = rotations.value.find(r => {
            if (r.resident_id !== f.resident_id || !BLOCKING_STATUSES.includes(r.rotation_status)) return false
            if (excludeId && r.id === excludeId) return false
            const eS = new Date(Utils.normalizeDate(r.start_date) + 'T00:00:00')
            const eE = new Date(Utils.normalizeDate(r.end_date) + 'T23:59:59')
            return startDate <= eE && endDate >= eS
          })
          const conflictUnit = conflicting ? getTrainingUnitName(conflicting.training_unit_id) : ''
          const conflictDates = conflicting ? `${Utils.formatDateShort(conflicting.start_date)} – ${Utils.formatDateShort(conflicting.end_date)}` : ''
          setErr('rotation', 'start_date', 'Dates overlap with an active or scheduled rotation')
          showToast('Scheduling Conflict', `${getResidentName(f.resident_id)} already has a ${conflicting?.rotation_status || ''} rotation at ${conflictUnit} (${conflictDates}).`, 'error')
          saving.value = false; return
        }

        try {
          const data = {
            rotation_id: f.rotation_id || Utils.generateId('ROT'), resident_id: f.resident_id,
            training_unit_id: f.training_unit_id, supervising_attending_id: f.supervising_attending_id || null,
            start_date: startISO, end_date: endISO,
            rotation_category: f.rotation_category || 'clinical_rotation',
            rotation_status: (f.rotation_status || 'scheduled').toLowerCase()
          }
          const normalize = r => ({ ...r, start_date: Utils.normalizeDate(r.start_date), end_date: Utils.normalizeDate(r.end_date) })
          if (rotationModal.mode === 'add') {
            rotations.value.unshift(normalize(await API.createRotation(data)))
            showToast('Success', 'Rotation scheduled', 'success')
          } else {
            const result = normalize(await API.updateRotation(f.id, data))
            const idx = rotations.value.findIndex(r => r.id === result.id)
            if (idx !== -1) rotations.value[idx] = result
            showToast('Success', 'Rotation updated', 'success')
          }
          rotationModal.show = false; clearAll('rotation')
        } catch (e) {
          let msg = e.message || 'Failed to save rotation'
          if (msg.includes('overlapping')) msg = 'Dates conflict with an existing rotation.'
          if (msg.includes('date')) msg = 'Invalid date — check start and end dates.'
          showToast('Error', msg, 'error')
        } finally { saving.value = false }
      }

      const deleteRotation = (rotation) => showConfirmation({
        title: 'Delete Rotation', message: 'Delete this rotation?',
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        details: `Resident: ${getResidentName(rotation.resident_id)}`,
        onConfirm: async () => {
          await API.deleteRotation(rotation.id)
          rotations.value = rotations.value.filter(r => r.id !== rotation.id)
          showToast('Success', 'Rotation deleted', 'success')
        }
      })

      // ============ [NEW] Compact view computed properties for Rotations ============
      const residentsWithRotations = computed(() => {
        const residents = medicalStaff.value.filter(s => s.staff_type === 'medical_resident' && s.employment_status === 'active')
        
        return residents.map(resident => {
          const allResidentRotations = rotations.value.filter(r => r.resident_id === resident.id)
          
          // Sort rotations by date
          const sortedRotations = [...allResidentRotations].sort((a, b) => {
            return new Date(a.start_date) - new Date(b.start_date)
          })
          
          const pastRotations = sortedRotations.filter(r => 
            r.rotation_status === 'completed' || 
            (r.rotation_status !== 'active' && new Date(r.end_date) < new Date())
          )
          
          const currentRotation = sortedRotations.find(r => r.rotation_status === 'active')
          
          const upcomingRotations = sortedRotations.filter(r => 
            r.rotation_status === 'scheduled' && 
            (!currentRotation || new Date(r.start_date) > new Date(currentRotation.end_date))
          )
          
          // Calculate empty slots (assuming max 8 rotations per resident over program)
          const maxRotations = 8
          const totalRotations = sortedRotations.length
          const emptySlots = Math.max(0, maxRotations - totalRotations)
          
          return {
            ...resident,
            allRotations: sortedRotations,
            pastRotations: pastRotations.map(r => ({
              ...r,
              unitName: getTrainingUnitName(r.training_unit_id)
            })),
            currentRotation: currentRotation ? {
              ...currentRotation,
              unitName: getTrainingUnitName(currentRotation.training_unit_id)
            } : null,
            upcomingRotations: upcomingRotations.map(r => ({
              ...r,
              unitName: getTrainingUnitName(r.training_unit_id)
            })),
            totalRotations: sortedRotations.length,
            emptySlots
          }
        }).filter(r => 
          // Apply filters
          (!rotationFilters.resident || r.id === rotationFilters.resident) &&
          (!rotationFilters.trainingUnit || r.allRotations.some(rot => rot.training_unit_id === rotationFilters.trainingUnit)) &&
          (!rotationFilters.status || r.allRotations.some(rot => rot.rotation_status === rotationFilters.status)) &&
          (!rotationFilters.search || r.full_name.toLowerCase().includes(rotationFilters.search.toLowerCase()))
        )
      })

      const isRotationActive = (rotation) => {
        return rotation.rotation_status === 'active'
      }

      const getRotationsForDay = (resident, dayIndex) => {
        const today = new Date()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Monday
        
        const targetDate = new Date(startOfWeek)
        targetDate.setDate(startOfWeek.getDate() + dayIndex - 1)
        const targetDateStr = Utils.normalizeDate(targetDate)
        
        return resident.allRotations?.filter(r => {
          const start = Utils.normalizeDate(r.start_date)
          const end = Utils.normalizeDate(r.end_date)
          return targetDateStr >= start && targetDateStr <= end
        }) || []
      }

      const viewRotationDetails = (rotation) => {
        if (!rotation) return
        // Enrich rotation with display-friendly fields expected by the detail sheet
        const resident  = medicalStaff.value.find(s => s.id === rotation.resident_id)
        const supervisor = medicalStaff.value.find(s => s.id === rotation.supervising_attending_id)
        const startD = new Date(Utils.normalizeDate(rotation.start_date) + 'T00:00:00')
        const endD   = new Date(Utils.normalizeDate(rotation.end_date)   + 'T00:00:00')
        const today  = new Date(); today.setHours(0,0,0,0)
        const daysTotal = Math.max(1, Math.round((endD - startD) / 86400000))
        const daysLeft  = Math.max(0, Math.round((endD - today)  / 86400000))
        rotationViewModal.rotation = {
          ...rotation,
          unitName:         rotation.unitName || getTrainingUnitName(rotation.training_unit_id),
          residentName:     resident?.full_name   || rotation.residentName || 'Unknown',
          supervisorName:   supervisor?.full_name || rotation.supervisorName || '—',
          daysTotal,
          daysLeft,
          clinicalDuration: Utils.formatClinicalDuration(rotation.start_date, rotation.end_date)
        }
        rotationViewModal.show = true
      }

      // ============ [NEW] Rotation detail sheet modal ============
      const rotationViewModal = reactive({ show: false, rotation: null })

      // ============ [NEW] Week view ============
      const weekOffset = ref(0)

      const getWeekDayLabel = (dayIndex) => {
        const today = new Date()
        const monday = new Date(today)
        monday.setDate(today.getDate() - today.getDay() + 1 + weekOffset.value * 7)
        const d = new Date(monday)
        d.setDate(monday.getDate() + dayIndex - 1)
        const isToday = d.toDateString() === today.toDateString()
        return {
          dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: d.getDate(),
          isToday,
          date: Utils.normalizeDate(d)
        }
      }

      const getWeekRangeLabel = () => {
        const today = new Date()
        const monday = new Date(today)
        monday.setDate(today.getDate() - today.getDay() + 1 + weekOffset.value * 7)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return `${fmt(monday)} – ${fmt(sunday)}, ${sunday.getFullYear()}`
      }

      const isFirstDayOfRotation = (rotation, dayIndex) => {
        const { date } = getWeekDayLabel(dayIndex)
        return Utils.normalizeDate(rotation.start_date) === date
      }

      const isLastDayOfRotation = (rotation, dayIndex) => {
        const { date } = getWeekDayLabel(dayIndex)
        return Utils.normalizeDate(rotation.end_date) === date
      }

      return {
        rotations, rotationFilters, rotationModal,
        filteredRotations, filteredRotationsAll, rotationTotalPages,
        loadRotations, showAddRotationModal, editRotation, saveRotation, deleteRotation, selectedUnitCapacity,
        pendingActivations, activationModal, checkAndUpdateRotations, updateRotationStatus,
        confirmPendingActivation, skipPendingActivation, postponeAllActivations, initAutoCheck,
        forceActivationCheck: () => checkAndUpdateRotations(true),
        quickActivate: (rotation) => updateRotationStatus(rotation.id, 'active', { activated_at: new Date().toISOString(), activated_by: currentUser?.value?.full_name || 'manual', notes: 'Manually activated', clinical_notes: rotation.clinical_notes || '', supervisor_evaluation: rotation.supervisor_evaluation || '', goals: rotation.goals || '' }),
        quickComplete: (rotation) => updateRotationStatus(rotation.id, 'completed', { completed_at: new Date().toISOString(), completed_by: currentUser?.value?.full_name || 'manual', notes: 'Manually completed', clinical_notes: rotation.clinical_notes || '', supervisor_evaluation: rotation.supervisor_evaluation || '', goals: rotation.goals || '' }),
        // NEW compact view properties
        residentsWithRotations,
        isRotationActive,
        getRotationsForDay,
        viewRotationDetails,
        // Week view
        rotationViewModal,
        weekOffset,
        getWeekDayLabel,
        getWeekRangeLabel,
        isFirstDayOfRotation,
        isLastDayOfRotation
      }
    }

    // ============ 6.6 useAbsences ============
    function useAbsences({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff }) {
      const absences = ref([])
      const absenceFilters = reactive({ staff: '', status: '', reason: '', startDate: '', search: '' })
      const absenceModal = reactive({
        show: false, mode: 'add',
        form: { staff_member_id: '', absence_type: 'planned', absence_reason: 'vacation', start_date: Utils.normalizeDate(new Date()), end_date: Utils.normalizeDate(new Date(Date.now() + 7 * 86400000)), covering_staff_id: '', coverage_notes: '', coverage_arranged: false, hod_notes: '' }
      })

      const getStaffName = (id) => {
        if (!id) return 'Not assigned'
        return medicalStaff.value.find(x => x.id === id)?.full_name || id
      }

      const validateAbsence = (form) => {
        clearAll('absence'); let ok = true
        if (!form.staff_member_id) { setErr('absence', 'staff_member_id', 'Please select a staff member'); ok = false }
        if (!form.start_date) { setErr('absence', 'start_date', 'Start date is required'); ok = false }
        if (!form.end_date) { setErr('absence', 'end_date', 'End date is required'); ok = false }
        if (form.start_date && form.end_date) {
          const s = new Date(Utils.normalizeDate(form.start_date) + 'T00:00:00')
          const e = new Date(Utils.normalizeDate(form.end_date) + 'T00:00:00')
          if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) { setErr('absence', 'end_date', 'End date cannot be before start date'); ok = false }
        }
        return ok
      }

      // Warn if this staff member already has a non-cancelled overlapping absence
      const absenceOverlapWarning = computed(() => {
        const f = absenceModal.form
        if (!f.staff_member_id || !f.start_date || !f.end_date) return null
        const editId = absenceModal.mode === 'edit' ? f.id : null
        const newStart = Utils.normalizeDate(f.start_date)
        const newEnd   = Utils.normalizeDate(f.end_date)
        if (!newStart || !newEnd) return null
        const overlap = absences.value.find(a => {
          if (a.staff_member_id !== f.staff_member_id) return false
          if (editId && a.id === editId) return false
          if (a.current_status === 'cancelled') return false
          const aS = Utils.normalizeDate(a.start_date)
          const aE = Utils.normalizeDate(a.end_date)
          return newStart <= aE && newEnd >= aS
        })
        if (!overlap) return null
        return {
          reason: ABSENCE_REASON_LABELS?.[overlap.absence_reason] || overlap.absence_reason,
          start: Utils.formatDateShort(overlap.start_date),
          end: Utils.formatDateShort(overlap.end_date),
          status: overlap.current_status
        }
      })

      const filteredAbsencesAll = computed(() => {
        const today = Utils.normalizeDate(new Date())
        let f = absences.value.map(a => {
          const derived = deriveAbsenceStatus(a)
          // Auto-clear coverage_arranged if covering person is also absent in the same period
          let coverageOk = a.coverage_arranged
          if (coverageOk && a.covering_staff_id) {
            const coverIsAbsent = absences.value.some(b =>
              b.id !== a.id &&
              b.staff_member_id === a.covering_staff_id &&
              b.current_status !== 'cancelled' &&
              Utils.normalizeDate(b.start_date) <= Utils.normalizeDate(a.end_date) &&
              Utils.normalizeDate(b.end_date)   >= Utils.normalizeDate(a.start_date)
            )
            if (coverIsAbsent) coverageOk = false
          }
          return { ...a, current_status: derived, coverage_arranged: coverageOk }
        })
        if (absenceFilters.staff) f = f.filter(a => a.staff_member_id === absenceFilters.staff)
        if (absenceFilters.status) f = f.filter(a => a.current_status === absenceFilters.status)
        if (absenceFilters.reason) f = f.filter(a => a.absence_reason === absenceFilters.reason)
        if (absenceFilters.startDate) f = f.filter(a => Utils.normalizeDate(a.start_date) >= absenceFilters.startDate)
        if (absenceFilters.search) {
          const q = absenceFilters.search.toLowerCase()
          f = f.filter(a => getStaffName(a.staff_member_id).toLowerCase().includes(q) || (ABSENCE_REASON_LABELS[a.absence_reason] || '').toLowerCase().includes(q))
        }
        return applySort(f, 'absences')
      })
      const filteredAbsences = computed(() => paginate(filteredAbsencesAll.value, 'absences'))
      const absenceTotalPages = computed(() => totalPages(filteredAbsencesAll.value, 'absences'))

      watch(absenceFilters, () => resetPage('absences'), { deep: true })

      const deriveAbsenceStatus = (a) => {
        if (a.current_status === 'cancelled') return 'cancelled'
        const today = Utils.normalizeDate(new Date())
        const start = Utils.normalizeDate(a.start_date)
        const end   = Utils.normalizeDate(a.end_date)
        if (end < today)    return 'completed'
        if (start <= today) return 'currently_absent'
        return 'upcoming'
      }

      const loadAbsences = async () => {
        try {
          const raw = await API.getAbsences()
          const today = Utils.normalizeDate(new Date())
          const stalePatches = []

          absences.value = raw.map(a => {
            const normalized = { ...a, start_date: Utils.normalizeDate(a.start_date), end_date: Utils.normalizeDate(a.end_date) }
            const derived = deriveAbsenceStatus(normalized)
            // Silently patch stale records (ended but still not 'completed' in DB)
            if (derived === 'completed' && a.current_status && a.current_status !== 'completed' && a.current_status !== 'cancelled') {
              stalePatches.push(API.updateAbsence(a.id, { ...a, current_status: 'completed' }).catch(() => {}))
            }
            return { ...normalized, current_status: derived }
          })

          if (stalePatches.length) await Promise.all(stalePatches)
        } catch { showToast('Error', 'Failed to load absences', 'error') }
      }

      const showAddAbsenceModal = () => {
        clearAll('absence'); absenceModal.mode = 'add'
        Object.assign(absenceModal.form, {
          staff_member_id: '', absence_type: 'planned', absence_reason: 'vacation',
          start_date: Utils.normalizeDate(new Date()), end_date: Utils.normalizeDate(new Date(Date.now() + 7 * 86400000)),
          covering_staff_id: '', coverage_notes: '', coverage_arranged: false, hod_notes: ''
        })
        absenceModal.show = true
      }

      const editAbsence = (absence) => {
        clearAll('absence'); absenceModal.mode = 'edit'
        Object.assign(absenceModal.form, {
          id: absence.id,
          staff_member_id:    absence.staff_member_id    || '',
          absence_type:       absence.absence_type       || 'planned',
          absence_reason:     absence.absence_reason     || 'vacation',
          start_date:         Utils.normalizeDate(absence.start_date),
          end_date:           Utils.normalizeDate(absence.end_date),
          covering_staff_id:  absence.covering_staff_id  || '',
          coverage_notes:     absence.coverage_notes     || '',
          coverage_arranged:  absence.coverage_arranged  ?? false,
          hod_notes:          absence.hod_notes          || '',
          current_status:     absence.current_status     || null
        })
        absenceModal.show = true
      }

      const saveAbsence = async (saving) => {
        if (!validateAbsence(absenceModal.form)) { showToast('Validation Error', 'Please fix the highlighted fields', 'error'); return }
        saving.value = true
        try {
          const f = absenceModal.form
          const data = {
            staff_member_id: f.staff_member_id, absence_type: f.absence_type || 'planned',
            absence_reason: f.absence_reason || 'vacation', start_date: Utils.normalizeDate(f.start_date),
            end_date: Utils.normalizeDate(f.end_date), coverage_arranged: f.coverage_arranged || false,
            covering_staff_id: f.covering_staff_id || null, coverage_notes: f.coverage_notes || '', hod_notes: f.hod_notes || ''
          }
          const normalize = a => ({ ...(a?.data || a), start_date: Utils.normalizeDate((a?.data || a).start_date), end_date: Utils.normalizeDate((a?.data || a).end_date) })
          if (absenceModal.mode === 'add') {
            absences.value.unshift(normalize(await API.createAbsence(data)))
            showToast('Success', 'Absence recorded', 'success')
          } else {
            const record = normalize(await API.updateAbsence(f.id, data))
            const idx = absences.value.findIndex(a => a.id === (record.id || f.id))
            if (idx !== -1) absences.value[idx] = record
            showToast('Success', 'Absence updated', 'success')
          }
          absenceModal.show = false; clearAll('absence'); await loadAbsences()
        } catch (e) { showToast('Error', e.message || 'Failed to save absence', 'error') }
        finally { saving.value = false }
      }

      const deleteAbsence = (absence) => showConfirmation({
        title: 'Delete Absence', message: 'Delete this absence record?',
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        details: `Staff: ${getStaffName(absence.staff_member_id)}`,
        onConfirm: async () => {
          await API.deleteAbsence(absence.id)
          absences.value = absences.value.filter(a => a.id !== absence.id)
          showToast('Success', 'Absence deleted', 'success')
        }
      })

      return {
        absences, absenceFilters, absenceModal, absenceOverlapWarning,
        filteredAbsences, filteredAbsencesAll, absenceTotalPages,
        loadAbsences, showAddAbsenceModal, editAbsence, saveAbsence, deleteAbsence
      }
    }

    // ============ 6.7 useDepartments ============
    function useDepartments({ showToast, showConfirmation, medicalStaff, trainingUnits, rotations }) {
      const departments = ref([])
      const allDepartmentsLookup = ref([])  // includes inactive — for name resolution only
      const departmentFilters = reactive({ search: '', status: '' })
      const departmentModal = reactive({ show: false, mode: 'add', form: { name: '', code: '', status: 'active', head_of_department_id: '', description: '', contact_email: '', contact_phone: '' } })

      // Department reassignment modal — shown when dept has active staff/units
      const deptReassignModal = reactive({
        show: false,
        dept: null,
        impact: { activeStaff: [], activeUnits: [], activeRotations: [] },
        staffTargetDeptId: '',
        unitsTargetDeptId: ''
      })

      const filteredDepartments = computed(() => {
        let f = departments.value
        if (departmentFilters.search) { const q = departmentFilters.search.toLowerCase(); f = f.filter(d => d.name?.toLowerCase().includes(q) || d.code?.toLowerCase().includes(q)) }
        if (departmentFilters.status) f = f.filter(d => d.status === departmentFilters.status)
        return f
      })

      // Use allDepartmentsLookup for name resolution so deactivated depts still resolve
      const getDepartmentName = (id) => allDepartmentsLookup.value.find(d => d.id === id)?.name || departments.value.find(d => d.id === id)?.name || 'Not assigned'
      const getDepartmentUnits = (id) => trainingUnits.value.filter(u => u.department_id === id)
      const getDepartmentStaffCount = (id) => medicalStaff.value.filter(s => s.department_id === id).length

      const loadDepartments = async () => {
        try {
          const [active, all] = await Promise.all([API.getDepartments(), API.getAllDepartments()])
          departments.value = active
          allDepartmentsLookup.value = all
        } catch { showToast('Error', 'Failed to load departments', 'error') }
      }

      const showAddDepartmentModal = () => {
        departmentModal.mode = 'add'
        Object.assign(departmentModal.form, { name: '', code: '', status: 'active', head_of_department_id: '', description: '', contact_email: '', contact_phone: '' })
        departmentModal.show = true
      }
      const editDepartment = (d) => { departmentModal.mode = 'edit'; Object.assign(departmentModal.form, { ...d }); departmentModal.show = true }

      const saveDepartment = async (saving) => {
        saving.value = true
        try {
          if (departmentModal.mode === 'add') {
            departments.value.unshift(await API.createDepartment(departmentModal.form))
            showToast('Success', 'Department created', 'success')
          } else {
            const result = await API.updateDepartment(departmentModal.form.id, departmentModal.form)
            const idx = departments.value.findIndex(d => d.id === result.id)
            if (idx !== -1) departments.value[idx] = result
            showToast('Success', 'Department updated', 'success')
          }
          departmentModal.show = false
        } catch (e) { showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
        finally { saving.value = false }
      }

      const deleteDepartment = async (dept) => {
        // Step 1: fetch impact from backend
        let impact
        try { impact = (await API.getDepartmentImpact(dept.id))?.impact }
        catch { showToast('Error', 'Could not check department dependencies', 'error'); return }

        const { activeStaff = [], activeUnits = [], activeRotations = [], canDelete } = impact

        // Step 2: if active rotations exist — hard block (can't safely reassign rotations away)
        if (activeRotations.length > 0) {
          showConfirmation({
            title: 'Cannot Deactivate Department',
            message: `"${dept.name}" has ${activeRotations.length} active rotation(s) in its training units.`,
            icon: 'fa-exclamation-triangle',
            confirmButtonText: 'OK', confirmButtonClass: 'btn-secondary',
            details: 'Complete or reassign all active rotations before deactivating this department.',
            onConfirm: () => {}
          })
          return
        }

        // Step 3: clean — no deps at all
        if (canDelete) {
          showConfirmation({
            title: 'Deactivate Department',
            message: `Deactivate "${dept.name}" (${dept.code})?`,
            icon: 'fa-building',
            confirmButtonText: 'Deactivate', confirmButtonClass: 'btn-danger',
            details: 'No active staff or units are assigned to this department.',
            onConfirm: async () => {
              try {
                await API.deleteDepartment(dept.id, null)
                departments.value = departments.value.filter(d => d.id !== dept.id)
                showToast('Deactivated', `${dept.name} has been deactivated`, 'success')
              } catch (e) { showToast('Error', e?.message || 'Failed to deactivate department', 'error') }
            }
          })
          return
        }

        // Step 4: has active staff or units — open reassignment modal
        Object.assign(deptReassignModal, {
          show: true, dept,
          impact: { activeStaff, activeUnits, activeRotations },
          staffTargetDeptId: '',
          unitsTargetDeptId: ''
        })
      }

      const confirmDeptReassignAndDeactivate = async () => {
        const { dept, impact, staffTargetDeptId, unitsTargetDeptId } = deptReassignModal
        const needsStaffReassign = impact.activeStaff.length > 0
        const needsUnitReassign = impact.activeUnits.length > 0
        if (needsStaffReassign && !staffTargetDeptId) { showToast('Required', 'Please select a department for staff reassignment', 'warning'); return }
        if (needsUnitReassign && !unitsTargetDeptId) { showToast('Required', 'Please select a department for unit reassignment', 'warning'); return }
        try {
          await API.deleteDepartment(dept.id, {
            staffDeptId: needsStaffReassign ? staffTargetDeptId : null,
            unitsDeptId: needsUnitReassign ? unitsTargetDeptId : null
          })
          departments.value = departments.value.filter(d => d.id !== dept.id)
          deptReassignModal.show = false
          showToast('Deactivated', `${dept.name} deactivated — staff and units reassigned`, 'success')
          // Reload to pick up fresh state
          await loadDepartments()
        } catch (e) { showToast('Error', e?.message || 'Failed to deactivate department', 'error') }
      }

      const viewDepartmentStaff = (dept) => showToast('Department Staff', `Viewing staff for ${dept.name}`, 'info')

      return {
        departments, allDepartmentsLookup, departmentFilters, departmentModal, deptReassignModal,
        filteredDepartments, getDepartmentName, getDepartmentUnits, getDepartmentStaffCount,
        loadDepartments, showAddDepartmentModal, editDepartment, saveDepartment,
        deleteDepartment, confirmDeptReassignAndDeactivate, viewDepartmentStaff
      }
    }

    // ============ 6.8 useTrainingUnits ============
    function useTrainingUnits({ showToast, showConfirmation, rotations }) {
      const trainingUnits = ref([])
      const trainingUnitFilters = reactive({ search: '', department: '', status: '' })
      const trainingUnitModal = reactive({ show: false, mode: 'add', form: { unit_name: '', unit_code: '', department_id: '', maximum_residents: 10, unit_status: 'active', specialty: '', supervising_attending_id: '' } })
      const unitResidentsModal = reactive({ show: false, unit: null, rotations: [] })
      const unitCliniciansModal = reactive({ show: false, unit: null, clinicians: [], supervisorId: '', allStaff: [] })

      const filteredTrainingUnits = computed(() => {
        let f = trainingUnits.value
        if (trainingUnitFilters.search) { const q = trainingUnitFilters.search.toLowerCase(); f = f.filter(u => u.unit_name?.toLowerCase().includes(q)) }
        if (trainingUnitFilters.department) f = f.filter(u => u.department_id === trainingUnitFilters.department)
        if (trainingUnitFilters.status) f = f.filter(u => u.unit_status === trainingUnitFilters.status)
        return f
      })

      const getUnitActiveRotationCount = (id) => rotations.value.filter(r => r.training_unit_id === id && ['active', 'scheduled'].includes(r.rotation_status)).length

      const loadTrainingUnits = async () => {
        try { trainingUnits.value = await API.getTrainingUnits() }
        catch { showToast('Error', 'Failed to load training units', 'error') }
      }

      const showAddTrainingUnitModal = () => { trainingUnitModal.mode = 'add'; Object.assign(trainingUnitModal.form, { unit_name: '', unit_code: '', department_id: '', maximum_residents: 10, unit_status: 'active', specialty: '', supervising_attending_id: '' }); trainingUnitModal.show = true }
      const editTrainingUnit = (u) => { trainingUnitModal.mode = 'edit'; trainingUnitModal.form = { ...u }; trainingUnitModal.show = true }

      const deleteTrainingUnit = (unit) => {
        const activeRotations = rotations.value.filter(r =>
          r.training_unit_id === unit.id && ['active', 'scheduled'].includes(r.rotation_status)
        )
        if (activeRotations.length > 0) {
          showConfirmation({
            title: 'Cannot Delete Training Unit',
            message: `"${unit.unit_name}" has ${activeRotations.length} active or scheduled rotation(s) assigned to it.`,
            icon: 'fa-exclamation-triangle',
            confirmButtonText: 'OK',
            confirmButtonClass: 'btn-secondary',
            details: 'Reassign or complete all active rotations before deleting this unit.',
            onConfirm: () => {}
          })
          return
        }
        showConfirmation({
          title: 'Delete Training Unit', icon: 'fa-trash',
          message: `Delete "${unit.unit_name}"?`,
          confirmButtonText: 'Delete Unit', confirmButtonClass: 'btn-danger',
          details: activeRotations.length === 0 ? 'No active rotations are assigned to this unit.' : '',
          onConfirm: async () => {
            await API.deleteTrainingUnit(unit.id)
            trainingUnits.value = trainingUnits.value.filter(u => u.id !== unit.id)
            showToast('Deleted', `${unit.unit_name} removed`, 'success')
          }
        })
      }

      const openUnitClinicians = (unit, allStaff) => {
        unitCliniciansModal.unit = unit
        unitCliniciansModal.clinicians = (unit.clinician_ids || []).slice()
        unitCliniciansModal.supervisorId = unit.supervising_attending_id || ''
        unitCliniciansModal.allStaff = allStaff.filter(s => ['attending_physician','fellow'].includes(s.staff_type))
        unitCliniciansModal.show = true
      }

      const saveUnitClinicians = async () => {
        const u = unitCliniciansModal.unit
        // Backend Joi schema: unit_name, unit_code, department_id (req), supervising_attending_id (opt uuid),
        // maximum_residents, unit_status, specialty/location_building/location_floor (opt — no empty strings).
        // stripUnknown:true drops anything else silently.
        const payload = {
          unit_name: u.unit_name, unit_code: u.unit_code, department_id: u.department_id,
          maximum_residents: u.maximum_residents || 5, unit_status: u.unit_status || 'active',
        }
        if (unitCliniciansModal.supervisorId) payload.supervising_attending_id = unitCliniciansModal.supervisorId
        if (u.specialty)         payload.specialty         = u.specialty
        if (u.location_building) payload.location_building = u.location_building
        if (u.location_floor)    payload.location_floor    = u.location_floor

        await API.updateTrainingUnit(u.id, payload)
        const idx = trainingUnits.value.findIndex(x => x.id === u.id)
        if (idx !== -1) {
          trainingUnits.value[idx] = {
            ...trainingUnits.value[idx],
            supervising_attending_id: unitCliniciansModal.supervisorId || null,
            supervisor_id: unitCliniciansModal.supervisorId || null,
          }
        }
        unitCliniciansModal.show = false
        showToast('Saved', 'Supervisor assignment updated', 'success')
      }

      const viewUnitResidents = (unit, allRotations) => {
        unitResidentsModal.unit = unit
        unitResidentsModal.rotations = allRotations.filter(r => r.training_unit_id === unit.id && ['active', 'scheduled'].includes(r.rotation_status))
        unitResidentsModal.show = true
      }

      const saveTrainingUnit = async (saving) => {
        saving.value = true
        try {
          const f = trainingUnitModal.form
          // Exact fields from backend Joi trainingUnit schema — nothing more, nothing less
          const data = {
            unit_name: f.unit_name, unit_code: f.unit_code, department_id: f.department_id,
            maximum_residents: f.maximum_residents || 5, unit_status: f.unit_status || 'active',
          }
          if (f.supervising_attending_id) data.supervising_attending_id = f.supervising_attending_id
          if (f.specialty)         data.specialty         = f.specialty
          if (f.location_building) data.location_building = f.location_building
          if (f.location_floor)    data.location_floor    = f.location_floor
          if (trainingUnitModal.mode === 'add') { trainingUnits.value.unshift(await API.createTrainingUnit(data)); showToast('Success', 'Training unit created', 'success') }
          else { const result = await API.updateTrainingUnit(f.id, data); const idx = trainingUnits.value.findIndex(u => u.id === result.id); if (idx !== -1) trainingUnits.value[idx] = result; showToast('Success', 'Training unit updated', 'success') }
          trainingUnitModal.show = false
        } catch (e) { showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
        finally { saving.value = false }
      }

      return { trainingUnits, trainingUnitFilters, trainingUnitModal, unitResidentsModal, unitCliniciansModal, filteredTrainingUnits, getUnitActiveRotationCount, loadTrainingUnits, showAddTrainingUnitModal, editTrainingUnit, deleteTrainingUnit, openUnitClinicians, saveUnitClinicians, viewUnitResidents, saveTrainingUnit }
    }

    // ============ 6.9 useComms ============
    function useComms({ showToast, showConfirmation }) {
      const announcements = ref([])
      const communicationsFilters = reactive({ search: '', priority: '', audience: '' })
      const communicationsModal = reactive({
        show: false, activeTab: 'announcement',
        form: { title: '', content: '', priority: 'normal', target_audience: 'all_staff', updateType: 'daily', dailySummary: '', highlight1: '', highlight2: '', alerts: { erBusy: false, icuFull: false, wardFull: false, staffShortage: false }, metricName: '', metricValue: '', metricTrend: 'stable', metricChange: '', metricNote: '', alertLevel: 'low', alertMessage: '', affectedAreas: { er: false, icu: false, ward: false, surgery: false } }
      })

      const filteredAnnouncements = computed(() => {
        let f = announcements.value
        if (communicationsFilters.search) { const q = communicationsFilters.search.toLowerCase(); f = f.filter(a => a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q)) }
        if (communicationsFilters.priority) f = f.filter(a => a.priority_level === communicationsFilters.priority)
        if (communicationsFilters.audience) f = f.filter(a => a.target_audience === communicationsFilters.audience)
        return f.slice(0, 20)
      })

      const recentAnnouncements = computed(() => filteredAnnouncements.value)
      const unreadAnnouncements = computed(() => announcements.value.filter(a => !a.read).length)

      const loadAnnouncements = async () => {
        try { announcements.value = await API.getAnnouncements() }
        catch { showToast('Error', 'Failed to load announcements', 'error') }
      }

      const showCommunicationsModal = () => {
        communicationsModal.show = true; communicationsModal.activeTab = 'announcement'
        Object.assign(communicationsModal.form, { title: '', content: '', priority: 'normal', target_audience: 'all_staff', updateType: 'daily', dailySummary: '', highlight1: '', highlight2: '', alerts: { erBusy: false, icuFull: false, wardFull: false, staffShortage: false }, metricName: '', metricValue: '', metricTrend: 'stable', metricChange: '', metricNote: '', alertLevel: 'low', alertMessage: '', affectedAreas: { er: false, icu: false, ward: false, surgery: false } })
      }

      const viewAnnouncement = (a) => showToast(a.title, Utils.truncateText(a.content, 120), 'info')

      const saveCommunication = async (saving, saveClinicalStatus) => {
        saving.value = true
        try {
          if (communicationsModal.activeTab === 'announcement') {
            const f = communicationsModal.form
            announcements.value.unshift(await API.createAnnouncement({ title: f.title, content: f.content, priority_level: f.priority, target_audience: f.target_audience, type: 'announcement' }))
            showToast('Success', 'Announcement posted', 'success')
          } else { await saveClinicalStatus() }
          communicationsModal.show = false
        } catch (e) { showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
        finally { saving.value = false }
      }

      const deleteAnnouncement = (ann) => showConfirmation({
        title: 'Delete Announcement', message: `Delete "${ann.title}"?`,
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        onConfirm: async () => { await API.deleteAnnouncement(ann.id); announcements.value = announcements.value.filter(a => a.id !== ann.id); showToast('Success', 'Announcement deleted', 'success') }
      })

      return { announcements, communicationsFilters, communicationsModal, filteredAnnouncements, recentAnnouncements, unreadAnnouncements, loadAnnouncements, showCommunicationsModal, viewAnnouncement, saveCommunication, deleteAnnouncement }
    }

    // ============ 6.10 useLiveStatus ============
    function useLiveStatus({ showToast, showConfirmation, medicalStaff, currentUser }) {
      const clinicalStatus = ref(null)
      const clinicalStatusHistory = ref([])
      const isLoadingStatus = ref(false)
      const newStatusText = ref('')
      const selectedAuthorId = ref('')
      const expiryHours = ref(8)
      const activeMedicalStaff = ref([])
      const liveStatsEditMode = ref(false)
      const quickStatus = ref('')

      const recentStatuses = computed(() => clinicalStatusHistory.value)
      const isStatusExpired = (exp) => { if (!exp) return true; try { return new Date() > new Date(exp) } catch { return true } }
      const getStatusBadgeClass = (status) => (!status || isStatusExpired(status.expires_at)) ? 'badge-warning' : 'badge-success'

      const calculateTimeRemaining = (expiryTime) => {
        if (!expiryTime) return 'N/A'
        try {
          const diff = new Date(expiryTime) - new Date()
          if (diff <= 0) return 'Expired'
          const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000)
          return h > 0 ? `${h}h ${m}m` : `${m}m`
        } catch { return 'N/A' }
      }

      const getStatusLocation = (status) => {
        if (!status?.status_text) return 'Pulmonology Department'
        if (status.location) return status.location
        const t = status.status_text.toLowerCase()
        if (t.includes('icu') || t.includes('intensive care')) return 'Respiratory ICU'
        if (t.includes('sleep') || t.includes('cpap')) return 'Sleep Medicine Lab'
        if (t.includes('bronchoscopy') || t.includes('pft')) return 'Pulmonary Procedure Unit'
        if (t.includes('ventilator')) return 'Respiratory Therapy Unit'
        if (t.includes('er') || t.includes('emergency')) return 'Emergency Department'
        if (t.includes('ward') || t.includes('floor')) return 'General Ward'
        return 'Pulmonology Department'
      }

      const formattedExpiry = computed(() => {
        if (!clinicalStatus.value?.expires_at) return ''
        const diff = Math.ceil((new Date(clinicalStatus.value.expires_at) - new Date()) / 3600000)
        if (diff <= 1) return 'Expires soon'
        if (diff <= 4) return `Expires in ${diff}h`
        return `Expires ${Utils.formatTime(clinicalStatus.value.expires_at)}`
      })

      const loadClinicalStatus = async () => {
        isLoadingStatus.value = true
        try { const r = await API.getClinicalStatus(); clinicalStatus.value = r?.success ? r.data : null }
        catch { clinicalStatus.value = null }
        finally { isLoadingStatus.value = false }
      }

      const loadClinicalStatusHistory = async () => {
        try {
          const history = await API.getClinicalStatusHistory(20)
          const cid = clinicalStatus.value?.id; const now = new Date()
          clinicalStatusHistory.value = history.filter(s => s.id !== cid && (!s.expires_at || now < new Date(s.expires_at))).slice(0, 5)
        } catch { clinicalStatusHistory.value = [] }
      }

      const loadActiveMedicalStaff = async () => {
        try {
          const data = await API.getMedicalStaff()
          activeMedicalStaff.value = data.filter(s => s.employment_status === 'active')
          if (currentUser.value) {
            const found = activeMedicalStaff.value.find(s => s.professional_email === currentUser.value.email)
            if (found) selectedAuthorId.value = found.id
          }
        } catch { activeMedicalStaff.value = [] }
      }

      const saveClinicalStatus = async () => {
        if (!newStatusText.value.trim() || !selectedAuthorId.value) { showToast('Error', 'Please fill all required fields', 'error'); return }
        isLoadingStatus.value = true
        try {
          const response = await API.createClinicalStatus({ status_text: newStatusText.value.trim(), author_id: selectedAuthorId.value, expires_in_hours: expiryHours.value })
          if (response?.success && response.data) {
            if (clinicalStatus.value) clinicalStatusHistory.value.unshift(clinicalStatus.value)
            clinicalStatus.value = response.data; newStatusText.value = ''; selectedAuthorId.value = ''; liveStatsEditMode.value = false
            await loadClinicalStatusHistory(); showToast('Success', 'Live status updated for all staff', 'success')
          } else { throw new Error(response?.error || 'Failed to save status') }
        } catch (e) { showToast('Error', e.message || 'Could not update status', 'error') }
        finally { isLoadingStatus.value = false }
      }

      const deleteClinicalStatus = () => {
        if (!clinicalStatus.value) return
        showConfirmation({ title: 'Clear Live Status', message: 'Clear the current live status?', icon: 'fa-trash', confirmButtonText: 'Clear', confirmButtonClass: 'btn-danger', onConfirm: async () => { await API.deleteClinicalStatus(clinicalStatus.value.id); clinicalStatus.value = null; showToast('Success', 'Live status cleared', 'success') } })
      }

      const refreshStatus = () => { loadClinicalStatus(); showToast('Refreshed', 'Live status updated', 'info') }
      const showCreateStatusModal = () => { liveStatsEditMode.value = true; newStatusText.value = ''; selectedAuthorId.value = ''; expiryHours.value = 8 }
      const setQuickStatus = (status) => { quickStatus.value = status }

      return { clinicalStatus, clinicalStatusHistory, isLoadingStatus, newStatusText, selectedAuthorId, expiryHours, activeMedicalStaff, liveStatsEditMode, quickStatus, recentStatuses, isStatusExpired, getStatusBadgeClass, calculateTimeRemaining, getStatusLocation, formattedExpiry, loadClinicalStatus, loadClinicalStatusHistory, loadActiveMedicalStaff, saveClinicalStatus, deleteClinicalStatus, refreshStatus, showCreateStatusModal, setQuickStatus }
    }

    // ============ 6.11 useResearch ============
    function useResearch({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, clearAll, medicalStaff, loadAnalyticsSummary, loadResearchLinesPerformance, loadPartnerCollaborations }) {
      const researchLines = ref([])
      const clinicalTrials = ref([])
      const innovationProjects = ref([])
      const researchLineFilters = reactive({ search: '', active: '' })
      const trialFilters = reactive({ line: '', phase: '', status: '', search: '' })
      const projectFilters = reactive({ research_line_id: '', category: '', stage: '', funding_status: '', search: '' })

      const researchLineModal = reactive({ show: false, mode: 'add', form: { line_number: null, name: '', description: '', capabilities: 'Alcance y capacidades', sort_order: 0, active: true } })
      const clinicalTrialModal = reactive({ show: false, mode: 'add', form: { protocol_id: '', title: '', research_line_id: '', phase: 'Phase III', status: 'Reclutando', description: '', inclusion_criteria: '', exclusion_criteria: '', principal_investigator_id: '', co_investigators: [], sub_investigators: [], contact_email: '', featured_in_website: true, display_order: 0, start_date: '', end_date: '' } })
      const trialDetailModal = reactive({ show: false, trial: null })
      const innovationProjectModal = reactive({ show: false, mode: 'add', form: { title: '', category: 'Dispositivo', current_stage: 'Idea', description: '', clinical_rationale: '', research_line_id: '', lead_investigator_id: '', co_investigators: [], partner_needs: [], partner_found: false, partner_name: '', funding_status: 'not_applicable', keywords: [], keywordsInput: '', featured_in_website: true, display_order: 0 } })
      const assignCoordinatorModal = reactive({ show: false, lineId: null, lineName: '', selectedCoordinatorId: '' })

      const getResearchLineName = (id) => { if (!id) return 'Not assigned'; const l = researchLines.value.find(l => l.id === id); return l ? (l.research_line_name || l.name) : 'Unknown' }
      const getClinicianResearchLines = (id) => { if (!id || !researchLines.value.length) return []; return researchLines.value.filter(l => l.coordinator_id === id).map(l => ({ line_number: l.line_number, name: l.research_line_name || l.name, role: 'Coordinador/a', id: l.id })) }

      const filteredResearchLines = computed(() => {
        let f = researchLines.value
        if (researchLineFilters.search) {
          const q = researchLineFilters.search.toLowerCase()
          f = f.filter(l =>
            (l.research_line_name || l.name)?.toLowerCase().includes(q) ||
            l.description?.toLowerCase().includes(q) ||
            l.capabilities?.toLowerCase().includes(q) ||
            (Array.isArray(l.keywords) && l.keywords.some(k => k.toLowerCase().includes(q)))
          )
        }
        if (researchLineFilters.active !== '') { const active = researchLineFilters.active === 'true'; f = f.filter(l => l.active === active) }
        return applySort(f, 'research_lines')
      })

      const filteredTrialsAll = computed(() => {
        let f = clinicalTrials.value
        if (trialFilters.line) f = f.filter(t => t.research_line_id === trialFilters.line)
        if (trialFilters.phase) f = f.filter(t => t.phase === trialFilters.phase)
        if (trialFilters.status) f = f.filter(t => t.status === trialFilters.status)
        if (trialFilters.search) { const q = trialFilters.search.toLowerCase(); f = f.filter(t => t.protocol_id?.toLowerCase().includes(q) || t.title?.toLowerCase().includes(q)) }
        return applySort(f, 'trials')
      })
      const filteredTrials = computed(() => paginate(filteredTrialsAll.value, 'trials'))
      const trialTotalPages = computed(() => totalPages(filteredTrialsAll.value, 'trials'))

      const filteredProjectsAll = computed(() => {
        let f = innovationProjects.value
        if (projectFilters.research_line_id) f = f.filter(p => p.research_line_id === projectFilters.research_line_id)
        if (projectFilters.category) f = f.filter(p => p.category === projectFilters.category)
        if (projectFilters.stage) f = f.filter(p => (p.current_stage || p.development_stage) === projectFilters.stage)
        if (projectFilters.funding_status) f = f.filter(p => (p.funding_status || 'not_applicable') === projectFilters.funding_status)
        if (projectFilters.search) { const q = projectFilters.search.toLowerCase(); f = f.filter(p => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || (Array.isArray(p.keywords) && p.keywords.some(k => k.toLowerCase().includes(q)))) }
        return applySort(f, 'projects')
      })
      const filteredProjects = computed(() => paginate(filteredProjectsAll.value, 'projects'))
      const projectTotalPages = computed(() => totalPages(filteredProjectsAll.value, 'projects'))

      // ── Keyword chip helpers ──────────────────────────────────────────────
      const addKeyword = (form) => {
        if (!form.keywordsInput?.trim()) return
        const incoming = form.keywordsInput.split(',').map(k => k.trim()).filter(Boolean)
        incoming.forEach(kw => { if (kw && !form.keywords.includes(kw)) form.keywords.push(kw) })
        form.keywordsInput = ''
      }
      const removeKeyword = (form, idx) => { form.keywords.splice(idx, 1) }
      const handleKeywordKey = (e, form) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
          e.preventDefault(); addKeyword(form)
        }
      }

      const loadResearchLines = async () => { try { researchLines.value = await API.getResearchLines() } catch { } }
      const loadClinicalTrials = async () => { try { clinicalTrials.value = await API.getAllClinicalTrials() } catch { } }
      const loadInnovationProjects = async () => { try { innovationProjects.value = await API.getAllInnovationProjects() } catch { } }

      const showAddResearchLineModal = () => { clearAll('research'); researchLineModal.mode = 'add'; Object.assign(researchLineModal.form, { line_number: researchLines.value.length + 1, name: '', description: '', capabilities: '', sort_order: researchLines.value.length + 1, active: true, keywords: [], keywordsInput: '' }); researchLineModal.show = true }
      const showAddTrialModal = () => { clinicalTrialModal.mode = 'add'; Object.assign(clinicalTrialModal.form, { protocol_id: `HUAC-${Date.now().toString().slice(-6)}`, title: '', research_line_id: '', phase: 'Phase III', status: 'Reclutando', description: '', inclusion_criteria: '', exclusion_criteria: '', principal_investigator_id: '', co_investigators: [], sub_investigators: [], contact_email: '', featured_in_website: true, display_order: clinicalTrials.value.length + 1, start_date: '', end_date: '' }); clinicalTrialModal.show = true }
      const showAddProjectModal = () => { innovationProjectModal.mode = 'add'; Object.assign(innovationProjectModal.form, { title: '', category: 'Dispositivo', current_stage: 'Idea', description: '', clinical_rationale: '', research_line_id: '', lead_investigator_id: '', co_investigators: [], partner_needs: [], partner_found: false, partner_name: '', funding_status: 'not_applicable', keywords: [], keywordsInput: '', featured_in_website: true, display_order: innovationProjects.value.length + 1 }); innovationProjectModal.show = true }

      const openAssignCoordinatorModal = (line) => { assignCoordinatorModal.lineId = line.id; assignCoordinatorModal.lineName = line.research_line_name || line.name; assignCoordinatorModal.selectedCoordinatorId = line.coordinator_id || ''; assignCoordinatorModal.show = true }
      const editResearchLine = (l) => { researchLineModal.mode = 'edit'; researchLineModal.form = { ...l, keywordsInput: Array.isArray(l.keywords) ? l.keywords.join(', ') : (l.keywordsInput || '') }; researchLineModal.show = true }
      const editTrial = (t) => { clinicalTrialModal.mode = 'edit'; clinicalTrialModal.form = { ...t, end_date: t.end_date || t.estimated_end_date || '', co_investigators: Array.isArray(t.co_investigators) ? [...t.co_investigators] : (t.co_investigator_id ? [t.co_investigator_id] : []), sub_investigators: Array.isArray(t.sub_investigators) ? [...t.sub_investigators] : (t.sub_investigator_id ? [t.sub_investigator_id] : []) }; clinicalTrialModal.show = true }
      const editProject = (p) => { innovationProjectModal.mode = 'edit'; const coI = Array.isArray(p.co_investigators) && p.co_investigators.length ? p.co_investigators : (Array.isArray(p.co_leads) ? p.co_leads : []); const kws = Array.isArray(p.keywords) && p.keywords.length ? p.keywords : (Array.isArray(p.tags) ? p.tags : []); innovationProjectModal.form = { ...p, current_stage: p.current_stage || p.development_stage || 'Idea', partner_needs: Array.isArray(p.partner_needs) ? [...p.partner_needs] : [], co_investigators: [...coI], keywords: [...kws], keywordsInput: kws.length ? kws.join(', ') : '', partner_found: p.partner_found || false, partner_name: p.partner_name || '', funding_status: p.funding_status || 'not_applicable', clinical_rationale: p.clinical_rationale || '' }; innovationProjectModal.show = true }
      const viewTrial = (t) => { trialDetailModal.trial = t; trialDetailModal.show = true }

      const saveResearchLine = async (saving) => {
        // Normalise: HTML form uses research_line_name, JS defaults use name — backend DB stores 'name'
        const f = researchLineModal.form
        const lineName = (f.research_line_name || f.name || '').trim()
        if (!lineName) { showToast('Validation Error', 'Research line name is required', 'error'); return }
        saving.value = true
        try {
          // FIX 14: Parse keywords from comma-separated string into array
          const keywords = f.keywordsInput ? f.keywordsInput.split(',').map(k => k.trim()).filter(Boolean) : (Array.isArray(f.keywords) ? f.keywords : [])
          // FIX 15: Never send the placeholder text as capabilities
          const capabilities = (f.capabilities && f.capabilities !== 'Alcance y capacidades') ? f.capabilities : ''
          const payload = { ...f, name: lineName, keywords, capabilities }
          delete payload.research_line_name // backend only knows 'name'
          delete payload.keywordsInput
          // These come from the view join — not writable columns on research_lines table
          delete payload.coordinator_name
          delete payload.coordinator_email
          delete payload.coordinator_type
          delete payload.full_name
          delete payload.professional_email
          if (researchLineModal.mode === 'add') { researchLines.value.unshift(await API.createResearchLine(payload)); showToast('Success', 'Research line created', 'success') }
          else { const result = await API.updateResearchLine(f.id, payload); const idx = researchLines.value.findIndex(l => l.id === result.id); if (idx !== -1) researchLines.value[idx] = result; showToast('Success', 'Research line updated', 'success') }
          researchLineModal.show = false; await loadResearchLines(); loadAnalyticsSummary()
        } catch (e) { showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
        finally { saving.value = false }
      }

      const saveClinicalTrial = async (saving) => {
        const f = clinicalTrialModal.form
        // FIX 8: date relationship validation
        if (f.start_date && f.end_date && f.end_date < f.start_date) { showToast('Validation Error', 'End date cannot be before start date', 'error'); return }
        saving.value = true
        try {
          const payload = { ...f }
          // Mirror end_date → estimated_end_date so both DB columns stay in sync
          if (payload.end_date) payload.estimated_end_date = payload.end_date
          delete payload.co_investigator_id // legacy field
          delete payload.sub_investigator_id // legacy field
          if (clinicalTrialModal.mode === 'add') { clinicalTrials.value.unshift(await API.createClinicalTrial(payload)); showToast('Success', 'Clinical trial created', 'success') }
          else { const result = await API.updateClinicalTrial(payload.id, payload); const idx = clinicalTrials.value.findIndex(t => t.id === result.id); if (idx !== -1) clinicalTrials.value[idx] = result; showToast('Success', 'Clinical trial updated', 'success') }
          clinicalTrialModal.show = false; await loadClinicalTrials(); loadAnalyticsSummary()
        } catch (e) { showToast('Error', e?.message || 'Failed to save trial', 'error') }
        finally { saving.value = false }
      }

      const saveInnovationProject = async (saving) => {
        const f = innovationProjectModal.form
        if (!f.title?.trim()) { showToast('Validation Error', 'Project title is required', 'error'); return }
        saving.value = true
        try {
          const payload = { ...f }
          // Parse keywords from comma-separated string into array
          payload.keywords = f.keywordsInput ? f.keywordsInput.split(',').map(k => k.trim()).filter(Boolean) : (Array.isArray(f.keywords) ? f.keywords : [])
          delete payload.keywordsInput
          // Mirror to legacy DB column aliases
          payload.co_leads = payload.co_investigators
          payload.tags = payload.keywords
          // Stage normalisation
          if (!payload.current_stage && payload.development_stage) payload.current_stage = payload.development_stage
          delete payload.development_stage
          // Partner logic: if partner found, no longer need partner_needs list
          if (payload.partner_found) payload.partner_needs = []
          else payload.partner_name = ''
          if (innovationProjectModal.mode === 'add') { innovationProjects.value.unshift(await API.createInnovationProject(payload)); showToast('Success', 'Innovation project created', 'success') }
          else { const result = await API.updateInnovationProject(payload.id, payload); const idx = innovationProjects.value.findIndex(p => p.id === result.id); if (idx !== -1) innovationProjects.value[idx] = result; showToast('Success', 'Innovation project updated', 'success') }
          innovationProjectModal.show = false; await loadInnovationProjects(); loadAnalyticsSummary(); loadPartnerCollaborations()
        } catch (e) { showToast('Error', e?.message || 'Failed to save project', 'error') }
        finally { saving.value = false }
      }

      const saveCoordinatorAssignment = async () => {
        try { await API.assignCoordinator(assignCoordinatorModal.lineId, assignCoordinatorModal.selectedCoordinatorId || null); await loadResearchLines(); assignCoordinatorModal.show = false; showToast('Success', 'Coordinator assigned', 'success'); loadResearchLinesPerformance() }
        catch (e) { showToast('Error', e.message || 'Failed to assign coordinator', 'error') }
      }

      const deleteResearchLine = (line) => {
        const activeTrials = clinicalTrials.value.filter(t => t.research_line_id === line.id && !['Completado','Suspendido','Cancelado'].includes(t.status))
        const activeProjects = innovationProjects.value.filter(p => p.research_line_id === line.id)
        if (activeTrials.length || activeProjects.length) {
          showConfirmation({
            title: 'Cannot Delete Research Line',
            message: `"${line.research_line_name || line.name}" has ${activeTrials.length} active trial(s) and ${activeProjects.length} project(s) linked to it.`,
            icon: 'fa-exclamation-triangle',
            confirmButtonText: 'OK', confirmButtonClass: 'btn-secondary',
            details: 'Reassign or remove all associated trials and projects before deleting this research line.',
            onConfirm: () => {}
          })
          return
        }
        showConfirmation({
          title: 'Delete Research Line', message: `Delete "${line.research_line_name || line.name}"?`,
          icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
          details: 'No active trials or projects are linked to this line.',
          onConfirm: async () => { await API.deleteResearchLine(line.id); await loadResearchLines(); showToast('Success', 'Research line deleted', 'success'); loadAnalyticsSummary() }
        })
      }
      const deleteClinicalTrial = (trial) => showConfirmation({ title: 'Delete Trial', message: `Delete "${trial.title}"?`, icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger', details: `Protocol: ${trial.protocol_id}`, onConfirm: async () => { await API.deleteClinicalTrial(trial.id); await loadClinicalTrials(); showToast('Success', 'Trial deleted', 'success'); loadAnalyticsSummary() } })
      const deleteInnovationProject = (project) => showConfirmation({ title: 'Delete Project', message: `Delete "${project.title}"?`, icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger', onConfirm: async () => { await API.deleteInnovationProject(project.id); await loadInnovationProjects(); showToast('Success', 'Project deleted', 'success'); loadAnalyticsSummary(); loadPartnerCollaborations() } })

      return { researchLines, clinicalTrials, innovationProjects, researchLineFilters, trialFilters, projectFilters, researchLineModal, clinicalTrialModal, innovationProjectModal, assignCoordinatorModal, trialDetailModal, filteredResearchLines, filteredTrials, filteredTrialsAll, filteredProjects, filteredProjectsAll, trialTotalPages, projectTotalPages, getResearchLineName, getClinicianResearchLines, loadResearchLines, loadClinicalTrials, loadInnovationProjects, showAddResearchLineModal, showAddTrialModal, showAddProjectModal, openAssignCoordinatorModal, editResearchLine, editTrial, editProject, viewTrial, saveResearchLine, saveClinicalTrial, saveInnovationProject, saveCoordinatorAssignment, deleteResearchLine, deleteClinicalTrial, deleteInnovationProject, addKeyword, removeKeyword, handleKeywordKey }
    }

    // ============ 6.12 useAnalytics ============
    function useAnalytics({ showToast, hasPermission }) {
      const researchDashboard = ref(null)
      const researchLinesPerformance = ref([])
      const partnerCollaborations = ref(null)
      const trialsTimeline = ref(null)
      const analyticsSummary = ref(null)
      const loadingAnalytics = ref(false)
      const exportModal = reactive({ show: false, type: 'clinical-trials', format: 'csv', loading: false })
      const analyticsActiveTab = ref('dashboard') // 'dashboard' | 'performance' | 'partners'

      const loadResearchDashboard = async (localResearchLines, localTrials, localProjects) => {
        if (!hasPermission('analytics', 'read')) return
        loadingAnalytics.value = true
        try {
          const data = await API.getResearchDashboard()
          if (data) {
            // Augment with researchLines table the backend doesn't return
            const lines = localResearchLines?.value || []
            const trials = localTrials?.value || []
            const projects = localProjects?.value || []
            data.researchLines = lines.map(line => ({
              id: line.id,
              line_number: line.line_number,
              name: line.research_line_name || line.name,
              active: line.active,
              coordinator_name: line.coordinator_name || null,
              coordinator_id: line.coordinator_id || null,
              trialsCount: trials.filter(t => t.research_line_id === line.id).length,
              projectsCount: projects.filter(p => p.research_line_id === line.id).length
            }))
            researchDashboard.value = data
          }
        }
        catch { showToast('Error', 'Failed to load research dashboard', 'error') }
        finally { loadingAnalytics.value = false }
      }
      const loadResearchLinesPerformance = async () => { if (!hasPermission('analytics', 'read')) return; try { researchLinesPerformance.value = await API.getResearchLinesPerformance() } catch { showToast('Error', 'Failed to load performance data', 'error') } }
      const loadPartnerCollaborations = async () => {
        if (!hasPermission('analytics', 'read')) return
        try {
          const raw = await API.getPartnerCollaborations()
          if (raw) {
            // Compute needsByType from partnerNeeds (group by first word as category proxy)
            const needs = raw.partnerNeeds || []
            const byType = {}
            needs.forEach(n => {
              const type = n.name.split(' ')[0] || 'Other'
              byType[type] = (byType[type] || 0) + n.count
            })
            raw.needsByType = Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a,b) => b.count - a.count)
            partnerCollaborations.value = raw
          }
        } catch { showToast('Error', 'Failed to load partner data', 'error') }
      }
      const loadTrialsTimeline = async (years = 3) => { if (!hasPermission('analytics', 'read')) return; try { trialsTimeline.value = await API.getClinicalTrialsTimeline(years) } catch { showToast('Error', 'Failed to load timeline', 'error') } }
      const loadAnalyticsSummary = async () => { if (!hasPermission('analytics', 'read')) return; try { analyticsSummary.value = await API.getAnalyticsSummary() } catch { } }

      const loadStaffResearchProfile = async (staffProfileModal, staffId) => {
        if (!staffId || !hasPermission('analytics', 'read')) return
        staffProfileModal.loadingResearch = true
        try { staffProfileModal.researchProfile = await API.getStaffResearchProfile(staffId) }
        catch { showToast('Error', 'Failed to load research profile', 'error') }
        finally { staffProfileModal.loadingResearch = false }
      }

      const handleExport = async () => {
        if (!hasPermission('analytics', 'export')) { showToast('Error', 'No permission to export data', 'error'); return }
        exportModal.loading = true
        try {
          const data = await API.exportData(exportModal.type, exportModal.format)
          const blob = new Blob([data], { type: 'text/csv' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = `${exportModal.type}-${new Date().toISOString().split('T')[0]}.csv`
          document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url)
          showToast('Success', 'Export completed', 'success'); exportModal.show = false
        } catch (e) { showToast('Error', e.message || 'Export failed', 'error') }
        finally { exportModal.loading = false }
      }

      const showExportModal = () => { exportModal.type = 'clinical-trials'; exportModal.show = true }

      return { researchDashboard, researchLinesPerformance, partnerCollaborations, trialsTimeline, analyticsSummary, loadingAnalytics, exportModal, analyticsActiveTab, loadResearchDashboard, loadResearchLinesPerformance, loadPartnerCollaborations, loadTrialsTimeline, loadAnalyticsSummary, loadStaffResearchProfile, handleExport, showExportModal }
    }

    // ============ 6.13 useDashboard ============
    function useDashboard({ medicalStaff, rotations, absences, onCallSchedule }) {
      const systemStats = ref({
        totalStaff: 0, activeAttending: 0, activeResidents: 0, onCallNow: 0, inSurgery: 0,
        activeRotations: 0, endingThisWeek: 0, startingNextWeek: 0, onLeaveStaff: 0,
        departmentStatus: 'normal', activePatients: 0, icuOccupancy: 0, wardOccupancy: 0,
        pendingApprovals: 0, nextShiftChange: new Date(Date.now() + 6 * 3600000).toISOString()
      })
      const currentTime = ref(new Date())

      const animateCount = (targetRef, end, duration = 600) => {
        if (!end) return
        const start = performance.now()
        const step = (now) => {
          const p = Math.min((now - start) / duration, 1); const e = 1 - Math.pow(1 - p, 3)
          targetRef.value = Math.round(end * e)
          if (p < 1) requestAnimationFrame(step); else targetRef.value = end
        }
        requestAnimationFrame(step)
      }

      const loadSystemStats = async () => {
        try { const data = await API.getSystemStats(); if (data?.success) Object.assign(systemStats.value, data.data) } catch { }
      }

      const updateDashboardStats = () => {
        const ns = medicalStaff.value.length
        const na = medicalStaff.value.filter(s => s.staff_type === 'attending_physician' && s.employment_status === 'active').length
        const nr = medicalStaff.value.filter(s => s.staff_type === 'medical_resident' && s.employment_status === 'active').length

        if (systemStats.value.totalStaff === 0 && ns > 0) {
          const tr = { value: 0 }, ar = { value: 0 }, rr = { value: 0 }
          animateCount(tr, ns, 700); animateCount(ar, na, 600); animateCount(rr, nr, 650)
          const iv = setInterval(() => {
            systemStats.value.totalStaff = tr.value; systemStats.value.activeAttending = ar.value; systemStats.value.activeResidents = rr.value
            if (tr.value >= ns) clearInterval(iv)
          }, 16)
        } else { systemStats.value.totalStaff = ns; systemStats.value.activeAttending = na; systemStats.value.activeResidents = nr }

        const today = Utils.normalizeDate(new Date())
        systemStats.value.onLeaveStaff = absences.value.filter(a => {
          const s = Utils.normalizeDate(a.start_date), e = Utils.normalizeDate(a.end_date)
          if (!s || !e || !(s <= today && today <= e)) return false
          if (a.current_status) return a.current_status === 'currently_absent'
          return true
        }).length

        systemStats.value.activeRotations = rotations.value.filter(r => r.rotation_status === 'active').length

        const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
        const nextWeek = new Date(todayDate.getTime() + 7 * 86400000)
        const twoWeeks = new Date(todayDate.getTime() + 14 * 86400000)

        systemStats.value.endingThisWeek = rotations.value.filter(r => {
          if (r.rotation_status !== 'active') return false
          const e = new Date(Utils.normalizeDate(r.end_date) + 'T00:00:00')
          return !isNaN(e.getTime()) && e >= todayDate && e <= nextWeek
        }).length

        systemStats.value.startingNextWeek = rotations.value.filter(r => {
          if (r.rotation_status !== 'scheduled') return false
          const s = new Date(Utils.normalizeDate(r.start_date) + 'T00:00:00')
          return !isNaN(s.getTime()) && s >= nextWeek && s <= twoWeeks
        }).length

        const unique = new Set()
        onCallSchedule.value.filter(s => Utils.normalizeDate(s.duty_date) === today).forEach(s => {
          if (s.primary_physician_id) unique.add(s.primary_physician_id)
          if (s.backup_physician_id) unique.add(s.backup_physician_id)
        })
        systemStats.value.onCallNow = unique.size
      }

      const currentTimeFormatted = computed(() => Utils.formatTime(currentTime.value))
      return { systemStats, currentTime, currentTimeFormatted, loadSystemStats, updateDashboardStats }
    }

    // ============ 7. ROOT APP ============
    const app = createApp({
      setup() {
        const loading = ref(false)
        const saving = ref(false)

        const showPassword = ref(false)
        const loginError = ref('')
        const loginFieldErrors = reactive({ email: '', password: '' })
        const clearLoginError = (field) => { if (field === 'email') loginFieldErrors.email = ''; if (field === 'password') loginFieldErrors.password = ''; loginError.value = '' }
        const handleForgotPassword = () => { showToast('Info', 'Password reset link sent', 'info') }

        const auth = useAuth()
        const { currentUser, loginForm, loginLoading, hasPermission } = auth
        const ui = useUI()
        const { showToast, showConfirmation, currentView, userMenuOpen, userProfileModal } = ui

        const { sortState, sortBy, sortIcon, applySort } = makeSort({
          medical_staff: { field: 'full_name', dir: 'asc' },
          rotations: { field: 'start_date', dir: 'desc' },
          oncall: { field: 'duty_date', dir: 'asc' },
          absences: { field: 'start_date', dir: 'desc' },
          trials: { field: 'protocol_id', dir: 'asc' },
          research_lines: { field: 'line_number', dir: 'asc' }
        })

        const { pagination, resetPage, paginate, totalPages, goToPage } = makePagination([
          ['medical_staff', 15], ['rotations', 15], ['oncall', 15], ['absences', 15], ['trials', 15]
        ])

        const { fieldErrors, setErr, clearErr: clearFieldError, clearAll } = makeValidation(['rotation', 'staff', 'absence', 'oncall', 'research'])

        const deptOps = useDepartments({ showToast, showConfirmation: () => {}, medicalStaff: ref([]), trainingUnits: ref([]), rotations: ref([]) })
        const tuOps = useTrainingUnits({ showToast, showConfirmation: () => {}, rotations: ref([]) })

        const staffOps = useStaff({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, fieldErrors, setErr, clearAll })
        const { medicalStaff, allStaffLookup } = staffOps

        const { departments, allDepartmentsLookup, departmentFilters, departmentModal, deptReassignModal,
          filteredDepartments, getDepartmentName, getDepartmentUnits, getDepartmentStaffCount,
          loadDepartments, showAddDepartmentModal, editDepartment, saveDepartment,
          deleteDepartment, confirmDeptReassignAndDeactivate, viewDepartmentStaff } = useDepartments({
          showToast, showConfirmation, medicalStaff, trainingUnits: tuOps.trainingUnits, rotations: ref([])
        })

        const onCallOps = useOnCall({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff })
        const { onCallSchedule } = onCallOps

        // useTrainingUnits needs a stub here so trainingUnits ref is available for rotationOps
        const { trainingUnits: _tuStub } = useTrainingUnits({ showToast, showConfirmation: () => {}, rotations: ref([]) })

        const rotationOps = useRotations({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff, trainingUnits: _tuStub, currentUser })
        const { rotations } = rotationOps

        // Full useTrainingUnits with real rotations ref (now declared above)
        const { trainingUnits, trainingUnitFilters, trainingUnitModal, unitResidentsModal, unitCliniciansModal,
          filteredTrainingUnits, getUnitActiveRotationCount, loadTrainingUnits, showAddTrainingUnitModal,
          editTrainingUnit, deleteTrainingUnit, openUnitClinicians, saveUnitClinicians,
          viewUnitResidents, saveTrainingUnit } = useTrainingUnits({
          showToast, showConfirmation, rotations
        })

        // Sync real trainingUnits into the stub so rotationOps.getTrainingUnitName resolves correctly
        watch(trainingUnits, (v) => { _tuStub.value = v }, { immediate: true })

        const absenceOps = useAbsences({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff })
        const { absences } = absenceOps

        // ============ STAFF DEACTIVATION WORKFLOW ============
        // Professional reassignment flow: scan future records before deactivating
        const reassignmentModal = reactive({
          show: false, staff: null, saving: false,
          affectedShifts: [], affectedRotations: [], affectedAbsences: [],
          replacements: {}
        })

        const deleteMedicalStaff = (staff) => {
          const today = Utils.normalizeDate(new Date())

          // Scan future on-call shifts
          const affectedShifts = []
          onCallSchedule.value.forEach(s => {
            if (Utils.normalizeDate(s.duty_date) < today) return
            if (s.primary_physician_id === staff.id) affectedShifts.push({ ...s, role: 'primary' })
            else if (s.backup_physician_id === staff.id) affectedShifts.push({ ...s, role: 'backup' })
          })

          // Scan active/scheduled rotations
          const affectedRotations = []
          rotations.value.forEach(r => {
            if (['completed', 'cancelled'].includes(r.rotation_status)) return
            if (r.supervising_attending_id === staff.id) affectedRotations.push({ ...r, role: 'supervisor' })
            else if (r.resident_id === staff.id) affectedRotations.push({ ...r, role: 'resident' })
          })

          // Scan future absences where this person is the cover
          const affectedAbsences = []
          absences.value.forEach(a => {
            if (Utils.normalizeDate(a.end_date) < today) return
            if (a.covering_staff_id === staff.id) affectedAbsences.push({ ...a, role: 'cover' })
          })

          const total = affectedShifts.length + affectedRotations.length + affectedAbsences.length

          if (total === 0) {
            showConfirmation({
              title: 'Remove Staff Member',
              message: `Remove ${staff.full_name} from active staff?`,
              icon: 'fa-user-times',
              confirmButtonText: 'Confirm Removal',
              confirmButtonClass: 'btn-danger',
              details: 'No upcoming assignments found. All historical records are preserved for audit purposes.',
              onConfirm: async () => {
                try {
                  await staffOps.deactivateStaffMember(staff.id, staff.full_name)
                  showToast('Done', `${staff.full_name} has been deactivated`, 'success')
                } catch (e) { showToast('Error', e.message || 'Failed to remove staff member', 'error') }
              }
            })
          } else {
            Object.assign(reassignmentModal, {
              show: true, staff, saving: false,
              affectedShifts, affectedRotations, affectedAbsences,
              replacements: {}
            })
          }
        }

        const confirmReassignAndDeactivate = async () => {
          const { staff, affectedShifts, affectedRotations, affectedAbsences, replacements } = reassignmentModal
          reassignmentModal.saving = true
          try {
            // Patch on-call shifts
            for (const shift of affectedShifts) {
              const newId = replacements[`shift_${shift.role}_${shift.id}`] || null
              const existing = onCallSchedule.value.find(s => s.id === shift.id) || shift
              const payload = {
                primary_physician_id: shift.role === 'primary' ? newId : existing.primary_physician_id,
                backup_physician_id:  shift.role === 'backup'  ? newId : existing.backup_physician_id,
                duty_date: existing.duty_date, shift_type: existing.shift_type,
                start_time: existing.start_time, end_time: existing.end_time,
                coverage_area: existing.coverage_area, coverage_notes: existing.coverage_notes || ''
              }
              await API.updateOnCall(shift.id, payload)
              const idx = onCallSchedule.value.findIndex(s => s.id === shift.id)
              if (idx !== -1) {
                if (shift.role === 'primary') onCallSchedule.value[idx].primary_physician_id = newId
                else onCallSchedule.value[idx].backup_physician_id = newId
              }
            }
            // Patch rotation supervisors (residents can't be re-assigned here)
            for (const rot of affectedRotations.filter(r => r.role === 'supervisor')) {
              const newId = replacements[`rotation_supervisor_${rot.id}`] || null
              const existing = rotations.value.find(r => r.id === rot.id) || rot
              await API.updateRotation(rot.id, { ...existing, supervising_attending_id: newId })
              const idx = rotations.value.findIndex(r => r.id === rot.id)
              if (idx !== -1) rotations.value[idx].supervising_attending_id = newId
            }
            // Patch absence cover assignments
            for (const abs of affectedAbsences) {
              const newId = replacements[`absence_cover_${abs.id}`] || null
              const existing = absences.value.find(a => a.id === abs.id) || abs
              await API.updateAbsence(abs.id, { ...existing, covering_staff_id: newId })
              const idx = absences.value.findIndex(a => a.id === abs.id)
              if (idx !== -1) absences.value[idx].covering_staff_id = newId
            }
            // Now deactivate
            await staffOps.deactivateStaffMember(staff.id, staff.full_name)
            const updatedCount = affectedShifts.length + affectedRotations.filter(r => r.role === 'supervisor').length + affectedAbsences.length
            reassignmentModal.show = false
            showToast('Done', `${staff.full_name} deactivated. ${updatedCount} assignment(s) updated.`, 'success')
          } catch (e) {
            showToast('Error', e.message || 'Failed to complete removal', 'error')
          } finally { reassignmentModal.saving = false }
        }


        const commsOps = useComms({ showToast, showConfirmation })
        const liveOps = useLiveStatus({ showToast, showConfirmation, medicalStaff, currentUser })
        const analyticsOps = useAnalytics({ showToast, hasPermission })
        const { loadAnalyticsSummary, loadResearchLinesPerformance, loadPartnerCollaborations } = analyticsOps

        const researchOps = useResearch({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, clearAll, medicalStaff, loadAnalyticsSummary, loadResearchLinesPerformance, loadPartnerCollaborations })
        const dashOps = useDashboard({ medicalStaff, rotations, absences, onCallSchedule })
        const { systemStats, updateDashboardStats, loadSystemStats } = dashOps

        // ============ NEW COMPACT VIEW STATE ============
        const rotationView = ref('detailed') // 'compact', 'detailed', or 'week'
        const onCallView = ref('detailed') // 'compact' or 'detailed'
        const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        // ============ EXISTING COMPUTED PROPERTIES ============
        const getStaffName = (id) => {
          if (!id) return 'Not assigned'
          const s = allStaffLookup.value.find(x => x.id === id) || medicalStaff.value.find(x => x.id === id)
          return s?.full_name || 'Not assigned'
        }
        const getSupervisorName = (id) => getStaffName(id)
        const getPhysicianName = (id) => getStaffName(id)
        const getResidentName = (id) => getStaffName(id)
        const getTrainingUnitName = (id) => trainingUnits.value.find(u => u.id === id)?.unit_name || 'Not assigned'
        const calculateAbsenceDuration = (s, e) => Utils.dateDiff(s, e)
        const getDaysRemaining = (d) => Utils.daysUntil(d)

        const getRotationProgress = (rotation) => {
          if (!rotation) return { pct: 0, label: '', urgent: false, done: false }
          const start = new Date(Utils.normalizeDate(rotation.start_date || rotation.rotation_start_date) + 'T00:00:00')
          const end   = new Date(Utils.normalizeDate(rotation.end_date   || rotation.rotation_end_date)   + 'T23:59:59')
          const now   = new Date()
          if (rotation.rotation_status === 'completed') return { pct: 100, label: 'Completed', urgent: false, done: true }
          if (rotation.rotation_status === 'cancelled') return { pct: 0, label: 'Cancelled', urgent: false, done: false }
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return { pct: 0, label: '', urgent: false, done: false }
          const total = end - start
          const elapsed = now - start
          const pct = Math.min(100, Math.max(0, Math.round(elapsed / total * 100)))
          const daysLeft = Math.ceil((end - now) / 86400000)
          const urgent = daysLeft <= 7 && daysLeft >= 0
          const label = daysLeft <= 0 ? 'Ending' : daysLeft === 1 ? '1 day left' : `${daysLeft}d left`
          return { pct, label, urgent, done: false }
        }
        const getDaysUntilStart = (d) => Utils.daysUntil(d)

        const getCurrentRotationForStaff = (id) => rotations.value.find(r => r.resident_id === id && r.rotation_status === 'active') || null
        const isOnCallToday = (staffId) => { const today = Utils.normalizeDate(new Date()); return onCallSchedule.value.some(s => (s.primary_physician_id === staffId || s.backup_physician_id === staffId) && Utils.normalizeDate(s.duty_date) === today) }
        const getUpcomingOnCall = (staffId) => { if (!staffId) return []; const today = Utils.normalizeDate(new Date()); return onCallSchedule.value.filter(s => (s.primary_physician_id === staffId || s.backup_physician_id === staffId) && Utils.normalizeDate(s.duty_date) >= today).sort((a, b) => Utils.normalizeDate(a.duty_date).localeCompare(Utils.normalizeDate(b.duty_date))) }
        const getUpcomingLeave = (staffId) => {
          if (!staffId) return []
          const today = Utils.normalizeDate(new Date())
          return absences.value
            .filter(a => a.staff_member_id === staffId
              && Utils.normalizeDate(a.start_date) >= today
              && a.current_status !== 'cancelled'
              && a.current_status !== 'completed')
            .sort((a, b) => Utils.normalizeDate(a.start_date).localeCompare(Utils.normalizeDate(b.start_date)))
        }
        const getRotationHistory = (staffId) => { if (!staffId) return []; return rotations.value.filter(r => r.resident_id === staffId && !['active', 'scheduled'].includes(r.rotation_status)).sort((a, b) => Utils.normalizeDate(b.end_date || b.rotation_end_date).localeCompare(Utils.normalizeDate(a.end_date || a.rotation_end_date))) }
        const getRotationDaysLeft = (staffId) => { const r = getCurrentRotationForStaff(staffId); return r ? getDaysRemaining(r.end_date || r.rotation_end_date) : 0 }
        const getCurrentRotationSupervisor = (staffId) => { const r = getCurrentRotationForStaff(staffId); return r?.supervising_attending_id ? getStaffName(r.supervising_attending_id) : 'Not assigned' }
        const hasProfessionalCredentials = (staff) => !!(staff?.academic_degree || staff?.specialization || staff?.training_year || staff?.clinical_certificate || staff?.medical_license)

        const toggleProfileSection = (key) => {
          if (!staffOps.staffProfileModal.collapsed) staffOps.staffProfileModal.collapsed = {}
          staffOps.staffProfileModal.collapsed[key] = !staffOps.staffProfileModal.collapsed[key]
        }

        const viewStaffDetails = async (staff) => {
          staffOps.staffProfileModal.staff = staff; staffOps.staffProfileModal.activeTab = 'activity'; staffOps.staffProfileModal.show = true
          if (hasPermission('analytics', 'read')) await analyticsOps.loadStaffResearchProfile(staffOps.staffProfileModal, staff.id)
          if (staff.staff_type === 'attending_physician') {
            staffOps.staffProfileModal.loadingSupervision = true
            try { staffOps.staffProfileModal.supervisionData = await API.getSupervisedResidents(staff.id) }
            catch { staffOps.staffProfileModal.supervisionData = { current: [], currentCount: 0, pastCount: 0, avgEvaluation: 0 } }
            finally { staffOps.staffProfileModal.loadingSupervision = false }
          }
          staffOps.staffProfileModal.loadingLeave = true
          try { staffOps.staffProfileModal.leaveBalance = await API.getLeaveBalance(staff.id) }
          catch { staffOps.staffProfileModal.leaveBalance = null }
          finally { staffOps.staffProfileModal.loadingLeave = false }
        }

        const formatStaffType = (t) => STAFF_TYPE_LABELS[t] || t
        const getStaffTypeClass = (t) => STAFF_TYPE_CLASSES[t] || 'badge-secondary'
        const formatEmploymentStatus = (s) => ({ active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' }[s] || s)
        const formatAbsenceReason = (r) => ABSENCE_REASON_LABELS[r] || r
        const formatRotationStatus = (s) => ROTATION_STATUS_LABELS[s] || s
        const getUserRoleDisplay = (r) => USER_ROLE_LABELS[r] || r
        const formatAudience = (a) => ({ all_staff: 'All Staff', medical_staff: 'Medical Staff', residents: 'Residents', attendings: 'Attending Physicians' }[a] || a)
        const getCurrentViewTitle = () => VIEW_TITLES[currentView.value] || 'NeumoCare Dashboard'
        const getCurrentViewSubtitle = () => VIEW_SUBTITLES[currentView.value] || 'Hospital Management System'
        const getSearchPlaceholder = () => 'Search...'

        const getStaffTypeIcon = (t) => ({ attending_physician: 'fa-user-md', medical_resident: 'fa-user-graduate', fellow: 'fa-user-tie', nurse_practitioner: 'fa-user-nurse' }[t] || 'fa-user')
        const getAbsenceReasonIcon = (r) => ({ vacation: 'fa-umbrella-beach', sick_leave: 'fa-procedures', conference: 'fa-chalkboard-teacher', training: 'fa-graduation-cap', personal: 'fa-user-clock', other: 'fa-question-circle' }[r] || 'fa-clock')
        const calculateCapacityPercent = (cur, max) => (!cur || !max) ? 0 : Math.round((cur / max) * 100)
        const getPreviewCardClass = () => absenceOps.absenceModal.form.absence_type === 'planned' ? 'planned' : 'unplanned'
        const getPreviewIcon = () => ({ vacation: 'fas fa-umbrella-beach', conference: 'fas fa-chalkboard-teacher', sick_leave: 'fas fa-heartbeat', training: 'fas fa-graduation-cap', personal: 'fas fa-home', other: 'fas fa-ellipsis-h' }[absenceOps.absenceModal.form.absence_reason] || 'fas fa-clock')
        const getPreviewReasonText = () => formatAbsenceReason(absenceOps.absenceModal.form.absence_reason)
        const getPreviewStatusClass = () => absenceOps.absenceModal.form.absence_type === 'planned' ? 'status-planned' : 'status-unplanned'
        const getPreviewStatusText = () => absenceOps.absenceModal.form.absence_type === 'planned' ? 'Planned' : 'Unplanned'
        const updatePreview = () => { }
        const requestFullDossier = () => showToast('Info', 'Dossier request sent. Our team will contact you.', 'info')

        // All clinical staff eligible for on-call (attendings, fellows, NPs, and residents)
        const availablePhysicians = computed(() => medicalStaff.value.filter(s => ['attending_physician', 'fellow', 'nurse_practitioner', 'medical_resident'].includes(s.staff_type) && s.employment_status === 'active'))
        const availableResidents = computed(() => medicalStaff.value.filter(s => s.staff_type === 'medical_resident' && s.employment_status === 'active'))
        const availableAttendings = computed(() => medicalStaff.value.filter(s => s.staff_type === 'attending_physician' && s.employment_status === 'active'))
        const availableHeadsOfDepartment = computed(() => availableAttendings.value)
        const availableReplacementStaff = computed(() => medicalStaff.value.filter(s => s.employment_status === 'active'))

        const showUserProfileModal = () => {
          userProfileModal.form = { full_name: currentUser.value?.full_name || '', email: currentUser.value?.email || '', department_id: currentUser.value?.department_id || '' }
          userProfileModal.show = true; userMenuOpen.value = false
        }

        const saveUserProfile = async () => {
          saving.value = true
          try { currentUser.value.full_name = userProfileModal.form.full_name; currentUser.value.department_id = userProfileModal.form.department_id; localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(currentUser.value)); userProfileModal.show = false; showToast('Success', 'Profile updated', 'success') }
          catch (e) { showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
          finally { saving.value = false }
        }

        const handleLogin = async () => {
          loginFieldErrors.email = !loginForm.email ? 'Email required' : ''
          loginFieldErrors.password = !loginForm.password ? 'Password required' : ''
          if (loginFieldErrors.email || loginFieldErrors.password) { loginError.value = 'Please fill all required fields'; return }
          loginLoading.value = true; loginError.value = ''
          try {
            const response = await API.login(loginForm.email, loginForm.password)
            currentUser.value = response.user; localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(response.user))
            showToast('Success', `Welcome, ${response.user.full_name}!`, 'success')
            await loadAllData(); currentView.value = 'dashboard'
          } catch (e) { loginError.value = e.message || 'Invalid email or password'; showToast('Error', 'Login failed', 'error') }
          finally { loginLoading.value = false }
        }

        const handleLogout = () => showConfirmation({
          title: 'Logout', message: 'Are you sure you want to logout?',
          icon: 'fa-sign-out-alt', confirmButtonText: 'Logout', confirmButtonClass: 'btn-danger',
          onConfirm: async () => {
            try { await API.logout() } finally { currentUser.value = null; currentView.value = 'login'; userMenuOpen.value = false; showToast('Info', 'Logged out successfully', 'info') }
          }
        })

        const switchView = async (view) => {
          currentView.value = view; ui.mobileMenuOpen.value = false
          ui.searchResultsOpen.value = false
          if (pagination[view]) pagination[view].page = 1
          // Trigger entrance animation on content area
          const ca = document.querySelector('.content-area')
          if (ca) { ca.classList.remove('content-view-enter'); void ca.offsetWidth; ca.classList.add('content-view-enter') }
          if (view === 'analytics_dashboard' && hasPermission('analytics', 'read')) {
            analyticsOps.analyticsActiveTab.value = 'dashboard'
            await Promise.all([
              analyticsOps.loadResearchDashboard(researchOps.researchLines, researchOps.clinicalTrials, researchOps.innovationProjects),
              analyticsOps.loadTrialsTimeline()
            ])
          } else if (view === 'analytics_performance' && hasPermission('analytics', 'read')) {
            analyticsOps.analyticsActiveTab.value = 'performance'
            currentView.value = 'analytics_dashboard'
            await analyticsOps.loadResearchLinesPerformance()
            return
          } else if (view === 'analytics_partners' && hasPermission('analytics', 'read')) {
            analyticsOps.analyticsActiveTab.value = 'partners'
            currentView.value = 'analytics_dashboard'
            await analyticsOps.loadPartnerCollaborations()
            return
          }
        }

        const toggleStatsSidebar = () => { ui.statsSidebarOpen.value = !ui.statsSidebarOpen.value }
        const handleGlobalSearch = () => {
          if (!globalSearchQuery.value.trim()) { ui.searchResultsOpen.value = false; return }
          ui.searchResultsOpen.value = true
        }

        const globalSearchResults = Vue.computed(() => {
          const q = (globalSearchQuery.value || '').toLowerCase().trim()
          if (!q || q.length < 2) return {}
          const results = {}
          // Staff
          const staff = (staffOps.medicalStaff.value || []).filter(s =>
            (s.full_name || '').toLowerCase().includes(q) ||
            (s.professional_email || '').toLowerCase().includes(q) ||
            (s.staff_id || '').toLowerCase().includes(q)
          ).slice(0, 4)
          if (staff.length) results.staff = staff.map(s => ({ id: s.id, name: s.full_name, meta: rotationOps.formatStaffType ? rotationOps.formatStaffType(s.staff_type) : s.staff_type, icon: 'fa-user-md', action: () => { staffOps.viewStaffDetails(s); ui.searchResultsOpen.value = false; globalSearchQuery.value = '' } }))
          // Rotations
          const rots = (rotationOps.rotations.value || []).filter(r => {
            const rn = (staffOps.medicalStaff.value || []).find(s => s.id === r.resident_id)
            return rn && (rn.full_name || '').toLowerCase().includes(q)
          }).slice(0, 3)
          if (rots.length) results.rotations = rots.map(r => {
            const rn = (staffOps.medicalStaff.value || []).find(s => s.id === r.resident_id)
            return { id: r.id, name: rn ? rn.full_name : 'Resident', meta: `Rotation · ${r.rotation_status}`, icon: 'fa-calendar-check', action: () => { switchView('resident_rotations'); ui.searchResultsOpen.value = false; globalSearchQuery.value = '' } }
          })
          // Research lines
          const lines = (researchOps.researchLines.value || []).filter(l =>
            (l.name || '').toLowerCase().includes(q) ||
            (l.description || '').toLowerCase().includes(q)
          ).slice(0, 3)
          if (lines.length) results.research = lines.map(l => ({ id: l.id, name: l.name, meta: `Research Line`, icon: 'fa-flask', action: () => { switchView('research_lines'); ui.searchResultsOpen.value = false; globalSearchQuery.value = '' } }))
          return results
        })

        const clearSearch = () => { globalSearchQuery.value = ''; ui.searchResultsOpen.value = false }

        const loadAllData = async () => {
          loading.value = true
          try {
            await Promise.all([staffOps.loadMedicalStaff(), loadDepartments(), loadTrainingUnits()])
            await Promise.all([rotationOps.loadRotations(), onCallOps.loadOnCallSchedule(), absenceOps.loadAbsences()])
            updateDashboardStats()
            Promise.all([onCallOps.loadTodaysOnCall(), commsOps.loadAnnouncements(), liveOps.loadClinicalStatus(), liveOps.loadActiveMedicalStaff(), researchOps.loadResearchLines(), loadSystemStats()]).then(() => updateDashboardStats())
            Promise.all([researchOps.loadClinicalTrials(), researchOps.loadInnovationProjects(), analyticsOps.loadAnalyticsSummary()])
            showToast('Success', 'System data loaded', 'success')
          } catch { showToast('Error', 'Failed to load some data', 'error') }
          finally { loading.value = false }
        }

        watch([medicalStaff, rotations, trainingUnits, absences], () => updateDashboardStats(), { deep: true })

        onMounted(() => {
          const token = localStorage.getItem(CONFIG.TOKEN_KEY)
          const user = localStorage.getItem(CONFIG.USER_KEY)
          if (token && user) {
            try { currentUser.value = JSON.parse(user); loadAllData(); currentView.value = 'dashboard' }
            catch { currentView.value = 'login' }
          } else { currentView.value = 'login' }

          const statusInterval = setInterval(() => { if (currentUser.value && !liveOps.isLoadingStatus.value) liveOps.loadClinicalStatus() }, 60000)
          const timeInterval = setInterval(() => { dashOps.currentTime.value = new Date() }, 60000)

          let rotationCheckInterval = null
          if (rotationOps.initAutoCheck) rotationCheckInterval = rotationOps.initAutoCheck()

          document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return
            const modals = [staffOps.medicalStaffModal, staffOps.staffProfileModal, departmentModal, trainingUnitModal, unitResidentsModal, unitCliniciansModal, rotationOps.rotationModal, rotationOps.rotationViewModal, onCallOps.onCallModal, absenceOps.absenceModal, commsOps.communicationsModal, userProfileModal, ui.confirmationModal, researchOps.researchLineModal, researchOps.clinicalTrialModal, researchOps.innovationProjectModal, researchOps.assignCoordinatorModal, analyticsOps.exportModal, rotationOps.activationModal]
            modals.forEach(m => { if (m.show) m.show = false })
          })

          onUnmounted(() => { clearInterval(statusInterval); clearInterval(timeInterval); if (rotationCheckInterval) clearInterval(rotationCheckInterval) })
        })

        return {
          // Existing returns
          loading, saving, currentUser, loginForm, loginLoading,
          ...Object.fromEntries(Object.entries(ui).filter(([k]) => k !== 'showToast')),
          showToast, showConfirmation, ui,
          ...staffOps,
          deleteMedicalStaff,          // override useStaff's deactivateStaffMember with full workflow
          reassignmentModal, confirmReassignAndDeactivate,
          ...onCallOps,
          ...rotationOps,
          ...absenceOps,
          formatTrainingYear: Utils.formatTrainingYear, formatSpecialization: Utils.formatSpecialization,
          formatPhone: Utils.formatPhone, formatLicense: Utils.formatLicense,
          getResidentCategoryInfo: Utils.getResidentCategoryInfo, formatResidentCategorySimple: Utils.formatResidentCategorySimple,
          formatResidentCategoryDetailed: Utils.formatResidentCategoryDetailed, getResidentCategoryIcon: Utils.getResidentCategoryIcon,
          getResidentCategoryTooltip: Utils.getResidentCategoryTooltip, getRoleInfo: Utils.getRoleInfo, getStaffRoles: Utils.getStaffRoles,
          getDaysRemainingColor: Utils.getDaysRemainingColor,
          departments, allDepartmentsLookup, departmentFilters, departmentModal, deptReassignModal,
          filteredDepartments, getDepartmentName, getDepartmentUnits, getDepartmentStaffCount,
          loadDepartments, showAddDepartmentModal, editDepartment, saveDepartment,
          deleteDepartment, confirmDeptReassignAndDeactivate, viewDepartmentStaff,
          trainingUnits, trainingUnitFilters, trainingUnitModal, unitResidentsModal, unitCliniciansModal, filteredTrainingUnits,
          getUnitActiveRotationCount, loadTrainingUnits, showAddTrainingUnitModal,
          editTrainingUnit, deleteTrainingUnit, saveTrainingUnit,
          openUnitClinicians: (unit) => openUnitClinicians(unit, medicalStaff.value),
          saveUnitClinicians,
          viewUnitResidents: (unit) => viewUnitResidents(unit, rotations.value),
          ...commsOps,
          saveCommunication: (sv) => commsOps.saveCommunication(sv ?? saving, liveOps.saveClinicalStatus),
          ...liveOps,
          ...researchOps,
          saveResearchLine: () => researchOps.saveResearchLine(saving),
          saveClinicalTrial: () => researchOps.saveClinicalTrial(saving),
          saveInnovationProject: () => researchOps.saveInnovationProject(saving),
          ...analyticsOps,
          ...dashOps,
          handleLogin, handleLogout,
          switchView, toggleStatsSidebar, handleGlobalSearch, globalSearchResults, clearSearch,
          searchResultsOpen: ui.searchResultsOpen,
          sortState, sortBy, sortIcon, pagination,
          goToPage: (view, page) => {
            const arrMap = {
              medical_staff: staffOps.filteredMedicalStaffAll.value,
              rotations:     rotationOps.filteredRotationsAll.value,
              oncall:        onCallOps.filteredOnCallAll.value,
              absences:      absenceOps.filteredAbsencesAll.value,
              trials:        researchOps.filteredTrialsAll.value,
              projects:      researchOps.filteredProjectsAll.value
            }
            goToPage(view, page, arrMap[view] || [])
          },
          staffTotalPages: staffOps.staffTotalPages,
          rotationTotalPages: rotationOps.rotationTotalPages,
          oncallTotalPages: onCallOps.oncallTotalPages,
          absenceTotalPages: absenceOps.absenceTotalPages,
          trialTotalPages: researchOps.trialTotalPages,
          projectTotalPages: researchOps.projectTotalPages,
          addKeyword: (form) => researchOps.addKeyword(form),
          removeKeyword: (form, idx) => researchOps.removeKeyword(form, idx),
          handleKeywordKey: (e, form) => researchOps.handleKeywordKey(e, form),
          fieldErrors, clearFieldError: (form, field) => clearFieldError(form, field),
          viewStaffDetails, toggleProfileSection, showUserProfileModal, saveUserProfile,
          getStaffName, getSupervisorName, getPhysicianName, getResidentName, getTrainingUnitName,
          calculateAbsenceDuration, getDaysRemaining, getDaysUntilStart, getRotationProgress,
          getCurrentRotationForStaff, isOnCallToday, getUpcomingOnCall,
          getUpcomingLeave, getRotationHistory, getRotationDaysLeft,
          getCurrentRotationSupervisor, hasProfessionalCredentials,
          formatStaffType, getStaffTypeClass, formatEmploymentStatus, formatAbsenceReason,
          formatRotationStatus, getUserRoleDisplay, formatAudience,
          getCurrentViewTitle, getCurrentViewSubtitle, getSearchPlaceholder,
          showPassword, loginError, loginFieldErrors, clearLoginError, handleForgotPassword,
          normalizeDate: (d) => Utils.normalizeDate(d),
          formatDate: (d) => Utils.formatDate(d),
          formatDateShort: (d) => Utils.formatDateShort(d),
          formatDatePlusDays: (d, n) => Utils.formatDatePlusDays(d, n),
          formatRelativeDate: (d) => Utils.formatRelativeDate(d),
          formatTime: (d) => Utils.formatTime(d),
          formatClinicalDuration: (s, e) => Utils.formatClinicalDuration(s, e),
          formatRelativeTime: (d) => Utils.formatRelativeTime(d),
          formatTimeAgo: (d) => Utils.formatRelativeTime(d),
          getInitials: (n) => Utils.getInitials(n),
          getTomorrow: () => Utils.getTomorrow(),
          getStaffTypeIcon, getAbsenceReasonIcon, calculateCapacityPercent,
          getPreviewCardClass, getPreviewIcon, getPreviewReasonText,
          getPreviewStatusClass, getPreviewStatusText, updatePreview, requestFullDossier,
          getPhaseColor: Utils.getPhaseColor, getStageColor: Utils.getStageColor, getStageConfig: Utils.getStageConfig, PROJECT_STAGES: PROJECT_STAGES_DATA, formatPercentage: Utils.formatPercentage,
          availablePhysicians, availableResidents, availableAttendings, availableHeadsOfDepartment, availableReplacementStaff,
          // FIX 11: Partner needs options with an "Other" escape hatch handled in template
          availablePartnerNeeds: ['Financiación', 'Distribución', 'Fabricación', 'Software', 'Regulatorio', 'Ensayos clínicos', 'Licencia de tecnología', 'Co-desarrollo'],
          togglePartnerNeed: (need) => {
            const arr = researchOps.innovationProjectModal.form.partner_needs
            const idx = arr.indexOf(need)
            if (idx === -1) arr.push(need); else arr.splice(idx, 1)
          },
          // FIX 5: toggle helpers for co_investigators and sub_investigators arrays
          toggleCoInvestigator: (id) => {
            const arr = researchOps.clinicalTrialModal.form.co_investigators
            const idx = arr.indexOf(id)
            if (idx === -1) arr.push(id); else arr.splice(idx, 1)
          },
          toggleSubInvestigator: (id) => {
            const arr = researchOps.clinicalTrialModal.form.sub_investigators
            const idx = arr.indexOf(id)
            if (idx === -1) arr.push(id); else arr.splice(idx, 1)
          },
          toggleProjectCoInvestigator: (id) => {
            const arr = researchOps.innovationProjectModal.form.co_investigators
            const idx = arr.indexOf(id)
            if (idx === -1) arr.push(id); else arr.splice(idx, 1)
          },
          saveMedicalStaff: () => staffOps.saveMedicalStaff(saving),
          saveDepartment: () => saveDepartment(saving),
          saveTrainingUnit: () => saveTrainingUnit(saving),
          saveRotation: () => rotationOps.saveRotation(saving),
          saveOnCallSchedule: () => onCallOps.saveOnCallSchedule(saving),
          saveAbsence: () => absenceOps.saveAbsence(saving),
          saveUserProfile, hasPermission,
          dismissAlert: ui.dismissAlert, activeAlertsCount: ui.activeAlertsCount,
          
          // NEW: Compact view properties - now coming from composables
          rotationView,
          onCallView,
          residentsWithRotations: rotationOps.residentsWithRotations,
          groupedOnCallSchedules: onCallOps.groupedOnCallSchedules,
          staffWithOnCallOrbs: onCallOps.staffWithOnCallOrbs,
          weekDays,
          getRotationsForDay: rotationOps.getRotationsForDay,
          rotationViewModal: rotationOps.rotationViewModal,
          weekOffset: rotationOps.weekOffset,
          getWeekDayLabel: rotationOps.getWeekDayLabel,
          getWeekRangeLabel: rotationOps.getWeekRangeLabel,
          isFirstDayOfRotation: rotationOps.isFirstDayOfRotation,
          isLastDayOfRotation: rotationOps.isLastDayOfRotation,
          isRotationActive: rotationOps.isRotationActive,
          isShiftActive: onCallOps.isShiftActive,
          viewRotationDetails: rotationOps.viewRotationDetails
        }
      }
    })

    app.mount('#app')

  } catch (error) {
    document.body.innerHTML = `
      <div style="padding:40px;text-align:center;margin-top:100px;color:#333;font-family:Arial,sans-serif;">
        <h2 style="color:#dc3545;">⚠️ Application Error</h2>
        <p style="margin:20px 0;color:#666;">The application failed to load. Please refresh the page.</p>
        <button onclick="window.location.reload()"
                style="padding:12px 24px;background:#007bff;color:white;border:none;border-radius:6px;cursor:pointer;">
          🔄 Refresh Page
        </button>
      </div>`;
    throw error;
  }
});
