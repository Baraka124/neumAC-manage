document.addEventListener('DOMContentLoaded', () => {
  try {
    if (typeof Vue === 'undefined') throw new Error('Vue.js not loaded')   

    const { createApp, ref, reactive, computed, onMounted, watch, onUnmounted } = Vue 

    // ============ 1. CONFIGURATION ====----===--====-=
    const CONFIG = {
      API_BASE_URL: window.location.hostname.includes('localhost')
        ? 'http://localhost:3000' 
        : 'https://neumac-manage-back-end-production.up.railway.app',      
      TOKEN_KEY: 'neumocare_token',
      USER_KEY: 'neumocare_user',
      CACHE_TTL: 300000
    }

    // ============ 2. CONSTANTS ====-========
    // Research line accent colours — available globally, not just inside useResearch
    const LINE_ACCENTS_GLOBAL = [
      { bg: 'linear-gradient(135deg,#3b82f6,#6366f1)', light: '#eff6ff', color: '#1e40af' },
      { bg: 'linear-gradient(135deg,#10b981,#0891b2)', light: '#d1fae5', color: '#065f46' },
      { bg: 'linear-gradient(135deg,#22d3ee,#0ea5e9)', light: '#e0f7fa', color: '#0e7490' },
      { bg: 'linear-gradient(135deg,#f59e0b,#f97316)', light: '#fef3c7', color: '#92400e' },
      { bg: 'linear-gradient(135deg,#a78bfa,#8b5cf6)', light: '#ede9fe', color: '#5b21b6' },
      { bg: 'linear-gradient(135deg,#fb7185,#ec4899)', light: '#fce7f3', color: '#9d174d' },
    ]
    const getLineAccentGlobal = (lineNumber) => LINE_ACCENTS_GLOBAL[((lineNumber || 1) - 1) % 6]

    const ROLES = {
      ADMIN: 'system_admin',
      HEAD: 'department_head',
      MANAGER: 'resident_manager',
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
        communications: ['create', 'read', 'update', 'delete'], 
        research_lines: ['create', 'read', 'update', 'delete'],
        clinical_trials: ['create', 'read', 'update', 'delete'], 
        innovation_projects: ['create', 'read', 'update', 'delete'],
        analytics: ['read', 'export'], 
        system: ['manage_departments', 'manage_updates'],
        system_settings: ['create', 'read', 'update', 'delete'],
        news_posts: ['create', 'read', 'update', 'delete']
      },
      department_head: {
        medical_staff: ['read', 'update'], 
        oncall_schedule: ['create', 'read', 'update'],
        resident_rotations: ['create', 'read', 'update'], 
        training_units: ['read', 'update'],
        staff_absence: ['create', 'read', 'update'],
        communications: ['create', 'read'], 
        research_lines: ['create', 'read', 'update', 'delete'],
        clinical_trials: ['read', 'create', 'update', 'delete'], 
        innovation_projects: ['read', 'create', 'update', 'delete'],
        analytics: ['read'], 
        system: ['manage_updates'],
        system_settings: ['read'],
        news_posts: ['create', 'read', 'update', 'delete']
      },
      attending_physician: {
        medical_staff: ['read'], 
        oncall_schedule: ['read'], 
        resident_rotations: ['read'],
        training_units: ['read'], 
        staff_absence: ['read'],
        communications: ['read'], 
        research_lines: ['read'], 
        clinical_trials: ['read'],
        innovation_projects: ['read'], 
        analytics: ['read'],
        system_settings: [],
        news_posts: ['read']
      },
      resident_manager: {
        medical_staff: ['read', 'create', 'update'],
        oncall_schedule: ['create', 'read', 'update', 'delete'],
        resident_rotations: ['create', 'read', 'update', 'delete'],
        training_units: ['read', 'update'],
        staff_absence: ['create', 'read', 'update'],
        communications: ['create', 'read'],
        research_lines: ['create', 'read', 'update', 'delete'],
        clinical_trials: ['create', 'read', 'update', 'delete'],
        innovation_projects: ['create', 'read', 'update', 'delete'],
        analytics: ['read'],
        system_settings: [],
        news_posts: ['create', 'read', 'update', 'delete']
      },
      medical_resident: {
        medical_staff: ['read'], 
        oncall_schedule: ['read'], 
        resident_rotations: ['read'],
        training_units: ['read'], 
        staff_absence: ['read'],
        communications: ['read'], 
        research_lines: ['read'], 
        clinical_trials: ['read'],
        innovation_projects: ['read'], 
        analytics: [],
        system_settings: [],
        news_posts: ['read']
      }
    }

    // ── Staff types: loaded dynamically from /api/staff-types ──────────────
    // Replaces the old hardcoded STAFF_TYPE_LABELS / STAFF_TYPE_CLASSES maps.
    // staffTypesList  → raw array for v-for dropdowns
    // staffTypeMap    → { type_key: { display_name, badge_class, is_resident_type } }
    const staffTypesList = ref([])
    const staffTypeMap   = ref({})
    const academicDegrees = ref([])   // loaded from /api/academic-degrees
    const rotationServices = ref([])  // loaded from /api/rotation-services (departments with service_type='rotation_service')

    // Fallbacks for display while loading or for unknown keys
    const STAFF_TYPE_LABELS_FALLBACK = {
      medical_resident: 'Resident', attending_physician: 'Attending',
      fellow: 'Fellow', nurse_practitioner: 'NP', administrator: 'Admin',
    }
    const STAFF_TYPE_CLASSES_FALLBACK = {
      medical_resident: 'badge-primary', attending_physician: 'badge-success',
      fellow: 'badge-info', nurse_practitioner: 'badge-warning', administrator: 'badge-secondary',
    }
    // Global helpers used throughout the app
    const formatStaffTypeGlobal   = (key) => staffTypeMap.value[key]?.display_name || STAFF_TYPE_LABELS_FALLBACK[key] || key
    const getRotationServiceName  = (id) => rotationServices.value.find(s => s.id === id)?.name || null
    // Short labels for table badges — keeps columns from overflowing
    const SHORT_LABELS = {
      attending_physician: 'Attending', medical_resident: 'Resident',
      fellow: 'Fellow', nurse_practitioner: 'NP', administrator: 'Admin'
    }
    const _toTitle = (k) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const formatStaffTypeShort = (key) => SHORT_LABELS[key] || (staffTypeMap.value[key]?.display_name?.split(' ')[0]) || _toTitle(key)
    const getStaffTypeClassGlobal = (key) => staffTypeMap.value[key]?.badge_class  || STAFF_TYPE_CLASSES_FALLBACK[key] || 'badge-secondary'
    const isResidentType          = (key) => staffTypeMap.value[key]?.is_resident_type ?? (key === 'medical_resident')
    
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
      extended: 'Extended',
      terminated_early: 'Terminated'
    }
    
    const USER_ROLE_LABELS = {
      system_admin: 'System Administrator', 
      department_head: 'Department Head',
      attending_physician: 'Attending Physician', 
      medical_resident: 'Medical Resident'
    }
    
    const VIEW_TITLES = {
      dashboard:             'Dashboard',
      medical_staff:         'Medical Staff',
      oncall_schedule:       'On-call',
      resident_rotations:    'Rotations',
      training_units:        'Training Units',
      staff_absence:         'Staff Absence',
      department_management: 'Departments',
      research_hub:          'Research',
      research_lines:        'Research',
      clinical_trials:       'Research',
      innovation_projects:   'Research',
      analytics_dashboard:   'Research',
      analytics_performance: 'Research',
      analytics_partners:    'Research',
      news:                  'News & Posts',
      system_settings:       'Settings'
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
      static localDateStr(d) {
        // Returns YYYY-MM-DD in LOCAL timezone — prevents UTC offset issues
        const dt = d instanceof Date ? d : new Date(d)
        if (isNaN(dt.getTime())) return ''
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        const day = String(dt.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      static normalizeDate(d) {
        if (!d) return ''
        if (d instanceof Date) return isNaN(d.getTime()) ? '' : Utils.localDateStr(d)
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
      
      // Compute effective R-year: override wins over system-calc, system-calc over legacy training_year
      static effectiveResidentYear(staff) {
        if (staff.residency_year_override) return staff.residency_year_override
        if (staff.residency_year_calc) return staff.residency_year_calc
        // fallback: map legacy PGY- values
        const t = staff.training_year
        if (!t) return null
        const map = { 'PGY-1':'R1','PGY-2':'R2','PGY-3':'R3','PGY-4':'R4','PGY-5':'R4+' }
        return map[t] || t
      }

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
            text: 'External',
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

      static formatNewsDate(d) {
        if (!d) return ''
        try {
          const diff = Math.floor((new Date() - new Date(d)) / 60000)
          if (diff < 1)    return 'Just now'
          if (diff < 60)   return `${diff}m ago`
          if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
          if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`
          return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        } catch { return '' }
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

      static getPartnerTypeColor(type) {
        const map = {
          'Empresa': '#4d9aff', 'Hospital': '#00e5a0', 'Tecnología': '#ffbe3d', 'Universidad': '#a78bfa',
          'Industria': '#f97316', 'Startup': '#34d399', 'Fundación': '#fb7185', 'Institución': '#60a5fa',
          'CRO': '#f59e0b', 'Other': '#7a90b0'
        }
        return map[type] || ('#' + [...type].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffff, 0x4d9aff).toString(16).padStart(6, '0'))
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
        const clean = name.replace(/^(Dr\.?|Dra\.?|Prof\.?)\s*/i, '').trim()
        const parts = clean.split(/\s+/).filter(Boolean)
        if (parts.length === 0) return '??'
        if (parts.length === 1) return parts[0][0].toUpperCase()
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }

      // Consistent colour index from name — same name always same colour
      static avatarColorIndex(name) {
        if (!name) return 0
        let h = 0
        for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
        return h % 8
      }

      // CSS class for the avatar based on staff type + name hash
      // Returns: nm-av nm-av--{type} nm-av--c{0-7}
      static avatarClass(staffType, name, size = 'md') {
        const isResident = staffType === 'medical_resident' || staffType === 'external_resident' || staffType === 'rotating_other_dept'
        const isFellow   = staffType === 'fellow'
        const isNurse    = staffType === 'nurse_practitioner'
        const isAdmin    = staffType === 'administrator' || staffType === 'admin'
        const idx        = Utils.avatarColorIndex(name || '')
        let typeClass = isResident ? 'resident' : isFellow ? 'fellow' : isNurse ? 'nurse' : isAdmin ? 'admin' : 'attending'
        return `nm-av nm-av--${size} nm-av--${typeClass} nm-av--c${idx}`
      }

      // Format a clinician name for compact display in the dashboard.
      // Respects whatever title the user stored (Dr., Dra., Prof., etc.)
      // Shortens to: <title> <LastName>  e.g. "Dr. Pedro J. Marcos" → "Dr. Marcos"
      //                                       "Dra. María García"   → "Dra. García"
      //                                       "Pedro Marcos"        → "Pedro Marcos" (no title detected)
      static formatDrName(fullName) {
        if (!fullName || typeof fullName !== 'string') return '—'
        const parts = fullName.trim().split(/\s+/).filter(Boolean)
        if (parts.length === 0) return '—'
        if (parts.length === 1) return parts[0]

        // Check if the first word looks like a title (Dr., Dra., Prof., etc.)
        const titlePattern = /^(Dr\.?|Dra\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)$/i
        const hasTitle = titlePattern.test(parts[0])

        if (hasTitle) {
          // "Dr. Pedro J. Marcos" → ["Dr.", "Pedro", "J.", "Marcos"] → "Dr. Marcos"
          const title    = parts[0]
          const lastName = parts[parts.length - 1]
          return `${title} ${lastName}`
        } else {
          // No title stored — just show first + last, skip middle initials
          // "Pedro Juan Marcos" → "Pedro Marcos"
          return parts.length > 2
            ? `${parts[0]} ${parts[parts.length - 1]}`
            : fullName.trim()
        }
      }
    }

    // ============ 4. ENHANCED API SERVICE ============
    class ApiService {
      constructor() {
        this.cache = new Map()
        this._isOnline = navigator.onLine
        this._sessionExpired = false
        window.addEventListener('online',  () => { this._isOnline = true;  window.dispatchEvent(new CustomEvent('neumax:online'))  })
        window.addEventListener('offline', () => { this._isOnline = false; window.dispatchEvent(new CustomEvent('neumax:offline')) })
      }
      get isOnline() { return this._isOnline }

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
              if (!this._sessionExpired) {
                this._sessionExpired = true
                localStorage.removeItem(CONFIG.TOKEN_KEY)
                localStorage.removeItem(CONFIG.USER_KEY)
                window.dispatchEvent(new CustomEvent('neumax:session-expired'))
              }
              throw new Error('Session expired. Please log in again.')
            }
            if (res.status === 403) throw new Error('You do not have permission to perform this action.')
            if (res.status === 404) throw new Error('The requested resource was not found.')
            if (res.status === 503) {
              window.dispatchEvent(new CustomEvent('neumax:maintenance'))
              throw new Error('System is under maintenance. Please try again shortly.')
            }
            if (res.status >= 500) throw new Error('A server error occurred. Please try again in a moment.')
            const errBody = await res.text().catch(() => `HTTP ${res.status}`)
            let errMsg = errBody
            try { const j = JSON.parse(errBody); errMsg = j.message || j.error || errBody } catch {}
            throw new Error(errMsg)
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
          this._sessionExpired = false
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
        // B9 FIX: Removed redundant .filter(employment_status !== 'inactive') —
        // the backend already excludes inactive staff by default (neq query).
        // Keeping it here would silently drop inactive staff even when fetched intentionally.
        const data = await this.getList('/api/medical-staff?limit=500');
        return data
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
      async updateMedicalStaff(id, d) {
        // FIX: invalidate both the paginated list and the individual record cache keys
        this.invalidate('/api/medical-staff')
        this.invalidate(`/api/medical-staff/${id}`)
        return this.request(`/api/medical-staff/${id}`, { method: 'PUT', body: d })
      }
      async deleteMedicalStaff(id) { this.invalidate('/api/medical-staff'); this.invalidate(`/api/medical-staff/${id}`); return this.request(`/api/medical-staff/${id}`, { method: 'DELETE' }) }

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
                residentName: resident?.full_name || 'Unknown',
                residentYear: resident?.training_year || null,
                unitId: r.training_unit_id, unitName: unit?.unit_name || 'Unknown',
                startDate: r.start_date, endDate: r.end_date,
                daysLeft: Utils.daysUntil(r.end_date)
              };
            });

          const past = rotations.filter(r => r.supervising_attending_id === attendingId && r.rotation_status === 'completed').length;
          const totalDaysSupervised = rotations
            .filter(r => r.supervising_attending_id === attendingId && ['completed','active'].includes(r.rotation_status))
            .reduce((sum, r) => {
              const s = new Date(r.start_date), e = new Date(r.end_date)
              return sum + Math.max(0, Math.round((e - s) / 86400000))
            }, 0)

          return { current: active, currentCount: active.length, pastCount: past, totalDaysSupervised };
        } catch (error) {
          console.error('Failed to load supervision data:', error);
          return { current: [], currentCount: 0, pastCount: 0, avgEvaluation: 0 };
        }
      }

      // ============ 4.3 LEAVE BALANCE ENDPOINTS ============
      
      async getLeaveBalance(staffId) {
        try {
          const [allStaff, allAbsences] = await Promise.all([this.getMedicalStaff(), this.getAbsences()])
          const staff = allStaff.find(s => s.id === staffId)
          const isAttending = staff?.staff_type === 'attending_physician'
          const TOTALS = {
            vacation:   isAttending ? 25 : 20,
            sick_leave: 12,
            conference: isAttending ? 15 : 10,
            personal:   5,
          }
          const currentYear = new Date().getFullYear()
          const myAbsences = allAbsences.filter(a =>
            a.staff_member_id === staffId &&
            !['cancelled'].includes(a.current_status) &&
            new Date(a.start_date).getFullYear() === currentYear
          )
          const used = { vacation: 0, sick_leave: 0, conference: 0, personal: 0 }
          myAbsences.forEach(a => {
            const reason = a.absence_reason
            if (used[reason] !== undefined) {
              const days = Math.ceil(Math.abs(new Date(a.end_date) - new Date(a.start_date)) / 86400000) + 1
              used[reason] += days
            }
          })
          return {
            vacation:   { used: used.vacation,   total: TOTALS.vacation,   remaining: Math.max(0, TOTALS.vacation   - used.vacation)   },
            sick:       { used: used.sick_leave,  total: TOTALS.sick_leave, remaining: Math.max(0, TOTALS.sick_leave - used.sick_leave) },
            conference: { used: used.conference,  total: TOTALS.conference, remaining: Math.max(0, TOTALS.conference - used.conference) },
            personal:   { used: used.personal,    total: TOTALS.personal,   remaining: Math.max(0, TOTALS.personal   - used.personal)   },
          }
        } catch {
          return { vacation:{used:0,total:20,remaining:20}, sick:{used:0,total:12,remaining:12}, conference:{used:0,total:10,remaining:10}, personal:{used:0,total:5,remaining:5} }
        }
      }

      // ============ 4.4 EXISTING ENDPOINTS ============

      // ── Staff Types (dynamic) ─────────────────────────────────────────────
      // ── Rotation Services ────────────────────────────────────────────
      async getRotationServices(includeHome = false) {
        const url = '/api/rotation-services' + (includeHome ? '?include_home=true' : '')
        try { const r = await this.request(url); return (r?.success && Array.isArray(r.data)) ? r.data : [] } catch { return [] }
      }
      async createRotationService(d) { this.invalidate('/api/rotation-services'); const r = await this.request('/api/rotation-services', { method: 'POST', body: d }); return r?.data || r }
      async updateRotationService(id, d) { this.invalidate('/api/rotation-services'); const r = await this.request(`/api/rotation-services/${id}`, { method: 'PUT', body: d }); return r?.data || r }
      async deleteRotationService(id) { this.invalidate('/api/rotation-services'); return this.request(`/api/rotation-services/${id}`, { method: 'DELETE' }) }

      async getStaffTypes(includeInactive = false) {
        // B3 FIX: GET /api/staff-types returns { success: true, data: [] } not a raw array.
        // Using getList() risks hitting ensureArray's Object.values() fallback which would
        // return [true, [...]] — corrupting the staffTypeMap used for badges app-wide.
        const url = '/api/staff-types' + (includeInactive ? '?include_inactive=true' : '')
        try {
          const r = await this.request(url)
          return (r?.success && Array.isArray(r.data)) ? r.data : Utils.ensureArray(r)
        } catch { return [] }
      }
      async createStaffType(data) { this.invalidate('/api/staff-types'); const r = await this.request('/api/staff-types', { method: 'POST', body: data }); return r?.data || r } // unwrap { success, data }
      async updateStaffType(id, data) { this.invalidate('/api/staff-types'); const r = await this.request(`/api/staff-types/${id}`, { method: 'PUT', body: data }); return r?.data || r } // unwrap { success, data }
      async deleteStaffType(id) { this.invalidate('/api/staff-types'); return this.request(`/api/staff-types/${id}`, { method: 'DELETE' }) }

      // ── Academic Degrees ─────────────────────────────────────────────────
      async getAcademicDegrees() { return this.getList('/api/academic-degrees') }
      async createAcademicDegree(d) { this.invalidate('/api/academic-degrees'); return this.request('/api/academic-degrees', { method: 'POST', body: d }) }
      async updateAcademicDegree(id, d) { this.invalidate('/api/academic-degrees'); return this.request(`/api/academic-degrees/${id}`, { method: 'PUT', body: d }) }
      async deleteAcademicDegree(id) { this.invalidate('/api/academic-degrees'); return this.request(`/api/academic-degrees/${id}`, { method: 'DELETE' }) }

      // ── Staff Certificates ───────────────────────────────────────────────
      async getStaffCertificates(staffId) { return this.getList(`/api/medical-staff/${staffId}/certificates`) }
      async createStaffCertificate(staffId, d) { return this.request(`/api/medical-staff/${staffId}/certificates`, { method: 'POST', body: d }) }
      async updateStaffCertificate(staffId, certId, d) { return this.request(`/api/medical-staff/${staffId}/certificates/${certId}`, { method: 'PUT', body: d }) }
      async deleteStaffCertificate(staffId, certId) { return this.request(`/api/medical-staff/${staffId}/certificates/${certId}`, { method: 'DELETE' }) }

      async getDepartments() { return this.getList('/api/departments') }
      async getDepartmentSummary(id) { return this.request(`/api/departments/${id}/summary`) }
      async checkRotationAvailability(params) {
        const q = new URLSearchParams(params).toString()
        return this.request(`/api/rotations/availability?${q}`)
      }
      async getAllDepartments() { return this.getList('/api/departments?include_inactive=true') }
      async getDepartmentImpact(id) { return this.request(`/api/departments/${id}/impact`) }
      async createDepartment(d) { this.invalidate('/api/departments'); return this.request('/api/departments', { method: 'POST', body: d }) }
      async updateDepartment(id, d) { this.invalidate('/api/departments'); return this.request(`/api/departments/${id}`, { method: 'PUT', body: d }) }
      async deleteDepartment(id, reassignments) { this.invalidate('/api/departments'); return this.request(`/api/departments/${id}`, { method: 'DELETE', body: reassignments ? { reassignments } : {} }) }

      async getHospitals() {
        try { const r = await this.request('/api/hospitals'); return (r?.success && Array.isArray(r.data)) ? r.data : Utils.ensureArray(r) } catch { return [] }
      }
      async createHospital(d) { this.invalidate('/api/hospitals'); return this.request('/api/hospitals', { method: 'POST', body: d }) }
      async updateHospital(id, d) { this.invalidate('/api/hospitals'); return this.request(`/api/hospitals/${id}`, { method: 'PUT', body: d }) }

      async getClinicalUnits(departmentId) {
        // clinical_units merged into training_units — hit training-units directly
        const url = departmentId ? `/api/training-units?department_id=${departmentId}` : '/api/training-units'
        try { const r = await this.request(url); return (r?.success && Array.isArray(r.data)) ? r.data : Utils.ensureArray(r) } catch { return [] }
      }
      async createClinicalUnit(d) { this.invalidate('/api/clinical-units'); return this.request('/api/clinical-units', { method: 'POST', body: d }) }
      async updateClinicalUnit(id, d) { this.invalidate('/api/clinical-units'); return this.request(`/api/clinical-units/${id}`, { method: 'PUT', body: d }) }
      async deleteClinicalUnit(id) { this.invalidate('/api/clinical-units'); return this.request(`/api/clinical-units/${id}`, { method: 'DELETE' }) }
      async getClinicalUnitStaff(unitId) {
        try { const r = await this.request(`/api/clinical-units/${unitId}/staff`); return (r?.success && Array.isArray(r.data)) ? r.data : [] } catch { return [] }
      }
      async assignStaffToUnit(unitId, d) { return this.request(`/api/clinical-units/${unitId}/staff`, { method: 'POST', body: d }) }
      async removeStaffFromUnit(unitId, assignmentId) { return this.request(`/api/clinical-units/${unitId}/staff/${assignmentId}`, { method: 'DELETE' }) }

      async getPartners() {
        try { const r = await this.request('/api/partners'); return (r?.success && Array.isArray(r.data)) ? r.data : Utils.ensureArray(r) } catch { return [] }
      }
      async createPartner(d) { this.invalidate('/api/partners'); return this.request('/api/partners', { method: 'POST', body: d }) }
      async updatePartner(id, d) { this.invalidate('/api/partners'); return this.request(`/api/partners/${id}`, { method: 'PUT', body: d }) }
      async deletePartner(id) { this.invalidate('/api/partners'); return this.request(`/api/partners/${id}`, { method: 'DELETE' }) }
      async getPartnerNeeds() {
        try { const r = await this.request('/api/partner-needs'); return (r?.success && Array.isArray(r.data)) ? r.data : [] } catch { return [] }
      }
      async createPartnerNeed(d) { return this.request('/api/partner-needs', { method: 'POST', body: d }) }
      async getProjectPartners(projectId) {
        try { const r = await this.request(`/api/innovation-projects/${projectId}/partners`); return (r?.success && Array.isArray(r.data)) ? r.data : [] } catch { return [] }
      }
      async linkPartnerToProject(projectId, d) { return this.request(`/api/innovation-projects/${projectId}/partners`, { method: 'POST', body: d }) }
      async unlinkPartnerFromProject(projectId, partnerId) { return this.request(`/api/innovation-projects/${projectId}/partners/${partnerId}`, { method: 'DELETE' }) }

      async getTrainingUnits() { return this.getList('/api/training-units') }
      async createTrainingUnit(d) { this.invalidate('/api/training-units'); return this.request('/api/training-units', { method: 'POST', body: d }) }
      async updateTrainingUnit(id, d) { this.invalidate('/api/training-units'); return this.request(`/api/training-units/${id}`, { method: 'PUT', body: d }) }
      async deleteTrainingUnit(id) { this.invalidate('/api/training-units'); return this.request(`/api/training-units/${id}`, { method: 'DELETE' }) }

      async getRotations() {
        try { const r = await this.request('/api/rotations?limit=500'); return Utils.ensureArray(r?.data ?? r) } catch { return [] }
      }
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
          const r = await this.request('/api/absence-records?limit=500')
          return (r?.success && Array.isArray(r.data)) ? r.data : Utils.ensureArray(r)
        } catch { return [] }
      }
      async createAbsence(d) { this.invalidate('/api/absence-records'); return this.request('/api/absence-records', { method: 'POST', body: d }) }
      async updateAbsence(id, d) { this.invalidate('/api/absence-records'); return this.request(`/api/absence-records/${id}`, { method: 'PUT', body: d }) }
      async deleteAbsence(id) { this.invalidate('/api/absence-records'); return this.request(`/api/absence-records/${id}`, { method: 'DELETE' }) }
      async purgeAbsence(id) { this.invalidate('/api/absence-records'); return this.request(`/api/absence-records/${id}/purge`, { method: 'DELETE' }) }
      async returnToDuty(id, d) { this.invalidate('/api/absence-records'); return this.request(`/api/absence-records/${id}/return`, { method: 'PUT', body: d }) }

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
      async createResearchLine(d) { this.invalidate('/api/research-lines'); const r = await this.request('/api/research-lines', { method: 'POST', body: d }); return r?.data || r } // C1 FIX: unwrap { success, data }
      async updateResearchLine(id, d) { this.invalidate('/api/research-lines'); const r = await this.request(`/api/research-lines/${id}`, { method: 'PUT', body: d }); return r?.data || r } // C1 FIX
      async deleteResearchLine(id) { this.invalidate('/api/research-lines'); return this.request(`/api/research-lines/${id}`, { method: 'DELETE' }) }
      async assignCoordinator(lineId, coordinatorId) {
        this.invalidate('/api/research-lines')
        return this.request(`/api/research-lines/${lineId}/coordinator`, { method: 'PUT', body: { coordinator_id: coordinatorId } })
      }

      async getAllClinicalTrials() {
        try { const r = await this.request('/api/clinical-trials'); return r?.data || Utils.ensureArray(r) } catch { return [] }
      }
      async createClinicalTrial(d) { this.invalidate('/api/clinical-trials'); const r = await this.request('/api/clinical-trials', { method: 'POST', body: d }); return r?.data || r } // C1 FIX
      async updateClinicalTrial(id, d) { this.invalidate('/api/clinical-trials'); const r = await this.request(`/api/clinical-trials/${id}`, { method: 'PUT', body: d }); return r?.data || r } // C1 FIX
      async deleteClinicalTrial(id) { this.invalidate('/api/clinical-trials'); return this.request(`/api/clinical-trials/${id}`, { method: 'DELETE' }) }

      async getAllInnovationProjects() {
        try { const r = await this.request('/api/innovation-projects'); return r?.data || Utils.ensureArray(r) } catch { return [] }
      }
      async createInnovationProject(d) { this.invalidate('/api/innovation-projects'); const r = await this.request('/api/innovation-projects', { method: 'POST', body: d }); return r?.data || r } // C1 FIX
      async updateInnovationProject(id, d) { this.invalidate('/api/innovation-projects'); const r = await this.request(`/api/innovation-projects/${id}`, { method: 'PUT', body: d }); return r?.data || r } // C1 FIX
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
      
      async getOpsMetrics(date = null) {
        const p = date ? `?date=${date}` : ''
        return this.request(`/api/ops-metrics${p}`)
      }
      async postOpsMetrics(metrics) {
        this.invalidate('/api/ops-metrics')
        return this.request('/api/ops-metrics', { method: 'POST', body: metrics })
      }
      async deleteOpsMetric(id) {
        this.invalidate('/api/ops-metrics')
        return this.request(`/api/ops-metrics/${id}`, { method: 'DELETE' })
      }

    async batchCreateOnCall(shifts) {
        this.invalidate('/api/oncall')
        return this.request('/api/oncall/batch', { method: 'POST', body: { shifts } })
      }
      async getCoverageAreas() {
        return this.getList('/api/coverage-areas')
      }
      async createCoverageArea(data) {
        this.invalidate('/api/coverage-areas')
        return this.request('/api/coverage-areas', { method: 'POST', body: data })
      }
      async updateCoverageArea(id, data) {
        this.invalidate('/api/coverage-areas')
        return this.request(`/api/coverage-areas/${id}`, { method: 'PUT', body: data })
      }
      async deleteCoverageArea(id) {
        this.invalidate('/api/coverage-areas')
        return this.request(`/api/coverage-areas/${id}`, { method: 'DELETE' })
      }

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
          // Numeric comparison prevents "9" > "10" string-sort bugs
          if (typeof va === 'number' && typeof vb === 'number') {
            return s.dir === 'asc' ? va - vb : vb - va
          }
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
      const setErr = (form, field, msg) => { if (fieldErrors[form] !== undefined) fieldErrors[form][field] = msg }
      // V2 FIX: Vue 3 reactive objects don't trigger on individual key deletion.
      // Replace the whole sub-object to ensure the DOM always reflects cleared state.
      const clearErr = (form, field) => {
        if (fieldErrors[form]?.[field] !== undefined) {
          const copy = { ...fieldErrors[form] }
          delete copy[field]
          fieldErrors[form] = copy
        }
      }
      const clearAll = (form) => {
        if (fieldErrors[form] !== undefined) fieldErrors[form] = {}
      }
      return { fieldErrors, setErr, clearErr, clearAll }
    }

    // ============ 6. COMPOSABLES ============

    // ============ 6.1 useAuth ============
    function useAuth() {
      const currentUser = ref(null)
      const loginForm = reactive({ email: '', password: '', remember_me: false })
      const loginLoading = ref(false)

      const hasPermission = (module, action = 'read') => {
        // B13 FIX: Backend DB returns 'user_role'; JWT payload uses 'role'.
        // After auth/me merge both should be present, but defensively check both
        // so a race condition or unexpected response shape never silently breaks permissions.
        const role = currentUser.value?.user_role || currentUser.value?.role
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

      // ── Splash screen ──────────────────────────────────────────────
      const splashVisible = ref(true)
      setTimeout(() => { splashVisible.value = false }, 1800)

      // ── Dashboard expand drawers ────────────────────────────────────
      const dbDrawer = reactive({ show: false, panel: null }) // panel: 'oncall' | 'rotations'
      const openDbDrawer = (panel) => { dbDrawer.panel = panel; dbDrawer.show = true }
      const closeDbDrawer = () => { dbDrawer.show = false }
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

      let _toastSeq = 0
      const showToast = (title, message, type = 'info', duration = 5000) => {
        const icons = { info: 'fas fa-info-circle', success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle' }
        const toast = { id: ++_toastSeq, title, message, type, icon: icons[type] || icons.info, duration }
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

      const cancelConfirmation = () => {
        if (confirmationModal.onCancel) confirmationModal.onCancel()
        confirmationModal.show = false
      }

      const dismissAlert = (id) => {
        const i = systemAlerts.value.findIndex(a => a.id === id)
        if (i > -1) systemAlerts.value.splice(i, 1)
      }

      const activeAlertsCount = computed(() => systemAlerts.value.filter(a => !a.status || a.status === 'active').length)

      // ── ⌘K Command Palette (open/close only — logic in main setup) ──
      const cmdPaletteOpen = ref(false)
      const isOffline = ref(!navigator.onLine)
      const isMaintenanceMode = ref(false)
      window.addEventListener('online',  () => { isOffline.value = false })
      window.addEventListener('offline', () => { isOffline.value = true  })

      // keyboard toggle
      if (typeof window !== 'undefined') {
        // Global keyboard shortcuts
        let _gKeyPending = false, _gKeyTimer = null
        window.addEventListener('keydown', (e) => {
          // ⌘K / Ctrl+K — command palette
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault()
            cmdPaletteOpen.value = !cmdPaletteOpen.value
            return
          }
          if (e.key === 'Escape' && cmdPaletteOpen.value) {
            cmdPaletteOpen.value = false
            return
          }
          // Skip if typing in an input, textarea, or select
          const tag = e.target?.tagName?.toLowerCase()
          if (['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable) return
          if (e.metaKey || e.ctrlKey || e.altKey) return

          // G + key navigation (like Gmail)
          if (_gKeyPending) {
            clearTimeout(_gKeyTimer)
            _gKeyPending = false
            const navMap = {
              'd': 'dashboard',
              's': 'medical_staff',
              'o': 'oncall_schedule',
              'r': 'resident_rotations',
              'u': 'training_units',
              'a': 'staff_absence',
              'h': 'research_hub',
              'n': 'news',
              ',': 'system_settings',
            }
            if (navMap[e.key]) {
              e.preventDefault()
              switchView(navMap[e.key])
            }
            return
          }
          // G = start of G+key combo
          if (e.key === 'g' || e.key === 'G') {
            _gKeyPending = true
            _gKeyTimer = setTimeout(() => { _gKeyPending = false }, 1000)
          }
          // ? — show keyboard shortcut help (quick toast)
          if (e.key === '?') {
            showToast('Keyboard shortcuts',
              'G+D Dashboard · G+S Staff · G+O On-call · G+R Rotations · G+U Units · G+A Absence · G+H Research · G+N News · ⌘K Search',
              'info', 8000)
          }
        })
      }

      const sidebarLiveStatus = computed(() => {
        try {
          const absentNow  = absences.value
            .map(a => ({...a, ...deriveAbsenceStatus(a)}))
            .filter(a => a.current_status === 'currently_absent').length
          const activeRots = rotations.value.filter(r => r.rotation_status === 'active').length
          const parts = []
          if (activeRots > 0) parts.push(`${activeRots} resident${activeRots!==1?'s':''} on rotation`)
          if (absentNow  > 0) parts.push(`${absentNow} absent`)
          return parts.length ? parts.join(' · ') : 'System operational'
        } catch { return 'System operational' }
      })

      return {
        toasts, removeToast, showToast,
        confirmationModal, showConfirmation, confirmAction, cancelConfirmation,
        userProfileModal, systemAlerts, activeAlertsCount, dismissAlert,
        sidebarCollapsed, mobileMenuOpen, userMenuOpen, statsSidebarOpen, searchResultsOpen,
        splashVisible, dbDrawer, openDbDrawer, closeDbDrawer,
        globalSearchQuery, currentView, sidebarLiveStatus,
        cmdPaletteOpen,
        isOffline,
        isMaintenanceMode
      }
    }

    // ============ 6.3 useStaff ============
    function useStaff({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, fieldErrors, setErr, clearAll, currentUser, researchLines, loadResearchLines }) {
      const medicalStaff    = ref([])
      const allStaffLookup  = ref([])   // ALL staff including inactive, for name resolution
      const staffView = ref('table') // 'table' | 'compact'
      const hospitalsList = ref([])   // all hospitals from DB
      const clinicalUnits = ref([])   // clinical units (Pneumology + others)
      const staffFilters = reactive({ search: '', staffType: '', department: '', status: '', residentCategory: '', hospital: '', networkType: '' })
      const clearStaffFilters = () => { staffFilters.search = ''; staffFilters.staffType = ''; staffFilters.department = ''; staffFilters.status = ''; staffFilters.residentCategory = ''; staffFilters.hospital = ''; staffFilters.networkType = '' }
      const hasActiveStaffFilters = computed(() => !!(staffFilters.search || staffFilters.staffType || staffFilters.department || staffFilters.status || staffFilters.residentCategory || staffFilters.hospital || staffFilters.networkType))
      const staffProfileModal = reactive({ 
        show: false, staff: null, activeTab: 'activity',
        researchProfile: null, supervisionData: null, leaveBalance: null,
        loadingResearch: false, loadingSupervision: false, loadingLeave: false
      })
      const medicalStaffModal = reactive({
        show: false, mode: 'add', activeTab: 'basic',
        _addingHospital: false, _newHospitalName: '', _newHospitalNetwork: 'external',
        _certs: [], _addingCert: false, _newCert: { name:'', issued_month:'', renewal_months: 24 },
        _addingStaffType: false, _newStaffTypeName: '', _newStaffTypeIsResident: false, _savingStaffType: false,
        form: { 
          full_name: '', staff_type: 'medical_resident', staff_id: '', employment_status: 'active', 
          professional_email: '', department_id: '', academic_degree: '', specialization: '', 
          training_year: '', clinical_certificate: '', certificate_status: '',
          mobile_phone: '', medical_license: '', can_supervise_residents: false, special_notes: '',
          can_be_pi: false, can_be_coi: false, other_certificate: '',
          resident_category: null, home_department: null, external_institution: null,
          home_department_id: null, external_contact_name: null, external_contact_email: null, external_contact_phone: null,
          academic_degree_id: null, has_medical_license: false,
          residency_start_date: null, residency_year_override: null,
          is_chief_of_department: false, is_research_coordinator: false, 
          is_resident_manager: false, is_oncall_manager: false, clinical_study_certificates: [],
          hospital_id: null, _networkHint: null
        }
      })

      // V3 FIX: Map each field to its tab so we can auto-switch when a hidden field fails
      const STAFF_FIELD_TAB = {
        full_name: 'basic', staff_type: 'basic', professional_email: 'basic',
        department_id: 'basic', employment_status: 'basic',
        resident_category: 'basic', home_department_id: 'basic',
        external_institution: 'basic', external_contact_name: 'basic', external_contact_email: 'basic',
        specialization: 'professional', training_year: 'professional',
        medical_license: 'professional', mobile_phone: 'professional',
        can_supervise_residents: 'roles', can_be_pi: 'roles', can_be_coi: 'roles',
        is_research_coordinator: 'roles'
      }
      const jumpToFirstStaffError = () => {
        const errors = fieldErrors['staff'] || {}
        for (const field of Object.keys(errors)) {
          const tab = STAFF_FIELD_TAB[field]
          if (tab) { medicalStaffModal.activeTab = tab; break }
        }
      }

      const validateStaff = (form) => {
        clearAll('staff'); let ok = true
        if (!form.full_name?.trim()) { setErr('staff', 'full_name', 'Full name is required'); ok = false }
        if (!form.staff_type) { setErr('staff', 'staff_type', 'Staff type is required'); ok = false }
        if (form.professional_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.professional_email)) {
          setErr('staff', 'professional_email', 'Invalid email address'); ok = false
        }
        // External resident: needs institution + contact
        if (form.resident_category === 'external_resident') {
          if (!form.external_institution?.trim())  { setErr('staff', 'external_institution', 'Institution required'); ok = false }
          if (!form.external_contact_name?.trim()) { setErr('staff', 'external_contact_name', 'Contact person required'); ok = false }
          if (!form.external_contact_email?.trim()){ setErr('staff', 'external_contact_email', 'Contact email required'); ok = false }
        }
        // Rotating resident: needs origin department
        if (form.resident_category === 'rotating_other_dept') {
          if (!form.home_department_id) { setErr('staff', 'home_department_id', 'Origin department required'); ok = false }
        }
        if (!ok) jumpToFirstStaffError()
        
        // Duplicate email check
        if (ok && form.professional_email?.trim()) {
          const editId = form.id
          const dup = medicalStaff.value.find(s =>
            s.id !== editId &&
            s.professional_email?.toLowerCase() === form.professional_email.toLowerCase()
          )
          if (dup) {
            setErr('staff', 'professional_email', `Email already used by ${dup.full_name}`)
            ok = false
          }
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
        if (staffFilters.hospital) f = f.filter(x => x.hospital_id === staffFilters.hospital)
        if (staffFilters.networkType) {
          const ids = hospitalsList.value.filter(h => h.parent_complex === staffFilters.networkType).map(h => h.id)
          f = f.filter(x => ids.includes(x.hospital_id))
        }
        return applySort(f, 'medical_staff')
      })

      const filteredMedicalStaff = computed(() => paginate(filteredMedicalStaffAll.value, 'medical_staff'))
      const staffTotalPages = computed(() => totalPages(filteredMedicalStaffAll.value, 'medical_staff'))

      // Compact view: staff grouped by role with section dividers
      const compactStaffWithDividers = computed(() => {
        const staff = filteredMedicalStaff.value
        const attendings = staff.filter(s => !isResidentType(s.staff_type))
        const residents  = staff.filter(s =>  isResidentType(s.staff_type))
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
      })

      watch(staffFilters, () => resetPage('medical_staff'), { deep: true })

      const loadMedicalStaff = async () => {
        try {
          const [raw, hospitals, units] = await Promise.all([
            API.getList('/api/medical-staff?limit=500&employment_status=all'),
            API.getHospitals(),
            API.getClinicalUnits()
          ])
          if (Array.isArray(raw)) {
            allStaffLookup.value = raw.map(s => ({ id: s.id, full_name: s.full_name, staff_type: s.staff_type, employment_status: s.employment_status }))
          }
          hospitalsList.value = hospitals
          clinicalUnits.value = units
          medicalStaff.value = await API.getMedicalStaff()
        }
        catch { showToast('Error', 'Failed to load medical staff', 'error') }
      }

      const loadHospitals = async () => {
        try { hospitalsList.value = await API.getHospitals() }
        catch { console.error('Failed to load hospitals') }
      }

      // Create a new hospital inline from the staff form, append to list, auto-select it
      const addHospitalInline = async (name, networkType = 'external') => {
        if (!name?.trim()) return null
        try {
          const result = await API.createHospital({ name: name.trim(), network_type: networkType })
          if (result?.success && result.data) {
            hospitalsList.value = [...hospitalsList.value, result.data].sort((a, b) => a.name.localeCompare(b.name))
            showToast('Success', `Hospital "${result.data.name}" added`, 'success')
            return result.data
          }
          return null
        } catch { showToast('Error', 'Failed to add hospital', 'error'); return null }
      }

      // Inline staff type creation — called from within the Add/Edit Staff modal
      // Creates the type in DB, refreshes the list, auto-selects it in the form
      const addStaffTypeInline = async () => {
        const name = medicalStaffModal._newStaffTypeName?.trim()
        if (!name) { showToast('Required', 'Please enter a staff type name', 'warning'); return }
        // Generate a type_key from the display name: lowercase, spaces→underscores, strip special chars
        const typeKey = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 60)
        if (!typeKey) { showToast('Invalid', 'Name must contain letters or numbers', 'warning'); return }
        medicalStaffModal._savingStaffType = true
        try {
          await API.createStaffType({
            type_key: typeKey,
            display_name: name,
            badge_class: 'badge-secondary',
            is_resident_type: medicalStaffModal._newStaffTypeIsResident,
            can_supervise: false,
            is_active: true,
            display_order: staffTypesList.value.length * 10
          })
          // Refresh the global staff types list + map
          await loadStaffTypes()
          // Auto-select the newly created type
          medicalStaffModal.form.staff_type = typeKey
          // Reset inline form
          medicalStaffModal._addingStaffType = false
          medicalStaffModal._newStaffTypeName = ''
          medicalStaffModal._newStaffTypeIsResident = false
          showToast('Success', `Staff type "${name}" created and selected`, 'success')
        } catch (e) {
          showToast('Error', e?.message || 'Failed to create staff type', 'error')
        } finally {
          medicalStaffModal._savingStaffType = false
        }
      }

      const showAddMedicalStaffModal = (opts = {}) => {
        clearAll('staff')
        medicalStaffModal.mode = 'add'
        medicalStaffModal.activeTab = 'basic'
        medicalStaffModal._addingHospital = false
        medicalStaffModal._newHospitalName = ''
        medicalStaffModal._newHospitalNetwork = 'external'
        medicalStaffModal._addingStaffType = false
        medicalStaffModal._newStaffTypeName = ''
        medicalStaffModal._newStaffTypeIsResident = false
        medicalStaffModal._savingStaffType = false
        // Context-aware department default:
        // 1. Explicit opts.department_id (e.g. opened from dept panel)
        // 2. Current user's own department
        // 3. Blank — user must select
        const defaultDeptId = opts.department_id || null
        Object.assign(medicalStaffModal.form, {
          full_name: '', staff_type: 'medical_resident', staff_id: `MD-${Date.now().toString().slice(-6)}`,
          employment_status: 'active', professional_email: '', department_id: defaultDeptId || '', academic_degree: '',
          specialization: '', training_year: '', clinical_certificate: '', certificate_status: '',
          mobile_phone: '', medical_license: '', can_supervise_residents: false, special_notes: '',
          can_be_pi: false, can_be_coi: false, other_certificate: '',
          resident_category: null, home_department: null, external_institution: null,
          home_department_id: null, external_contact_name: null, external_contact_email: null, external_contact_phone: null,
          academic_degree_id: null, has_medical_license: false,
          residency_start_date: null, residency_year_override: null,
          is_chief_of_department: false, is_research_coordinator: false, 
          is_resident_manager: false, is_oncall_manager: false, clinical_study_certificates: [],
          hospital_id: null, _networkHint: null
        })
        medicalStaffModal.show = true
      }

      const loadStaffCertificates = async (staffId) => {
        try {
          medicalStaffModal._certs = await API.getStaffCertificates(staffId)
        } catch { medicalStaffModal._certs = [] }
      }

      const saveCertificate = async () => {
        const c = medicalStaffModal._newCert
        if (!c.name?.trim()) return
        try {
          await API.createStaffCertificate(medicalStaffModal.form.id, {
            certificate_name: c.name.trim(),
            issued_date: c.issued_month ? c.issued_month + '-01' : null,
            renewal_months: c.renewal_months || 24
          })
          medicalStaffModal._addingCert = false
          await loadStaffCertificates(medicalStaffModal.form.id)
          showToast('Saved', 'Certificate added', 'success')
        } catch (e) { showToast('Error', e?.message || 'Failed to save certificate', 'error') }
      }

      const deleteCertificate = async (cert) => {
        try {
          await API.deleteStaffCertificate(medicalStaffModal.form.id, cert.id)
          await loadStaffCertificates(medicalStaffModal.form.id)
          showToast('Removed', 'Certificate removed', 'success')
        } catch (e) { showToast('Error', e?.message || 'Failed to remove certificate', 'error') }
      }

      const editMedicalStaff = (staff) => {
        clearAll('staff')
        medicalStaffModal.mode = 'edit'
        medicalStaffModal.activeTab = 'basic'
        medicalStaffModal.form = {
          ...staff,
          full_name: staff.full_name || '',
          professional_email: staff.professional_email || '', // empty string for the input field — null from DB becomes ''
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
          has_phd: staff.has_phd || false, phd_field: staff.phd_field || '',
          office_phone: staff.office_phone || '', years_experience: staff.years_experience || null,
          _coordLineId: null, // resolved post-load by research composable
          _investigadorLines: [],
          home_department_id: staff.home_department_id || null,
          has_medical_license: staff.has_medical_license || false,
          residency_start_date: staff.residency_start_date || null,
          residency_year_override: staff.residency_year_override || null,
          external_contact_name: staff.external_contact_name || null,
          external_contact_email: staff.external_contact_email || null,
          external_contact_phone: staff.external_contact_phone || null,
          clinical_study_certificates: Array.isArray(staff.clinical_study_certificates) ? [...staff.clinical_study_certificates] : [],
          hospital_id: staff.hospital_id || null,
          _networkHint: null
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
            professional_email: f.professional_email?.trim() || null, // send null not '' — Joi now accepts null
            department_id: f.department_id || currentUser?.value?.department_id || null,
            academic_degree: clean(f.academic_degree), academic_degree_id: f.academic_degree_id || null,
            specialization: clean(f.specialization),
            training_year: clean(f.training_year),
            residency_start_date: f.residency_start_date || null,
            residency_year_override: f.residency_year_override || null,
            clinical_certificate: clean(f.clinical_certificate),
            certificate_status: clean(f.certificate_status), mobile_phone: clean(f.mobile_phone),
            medical_license: clean(f.medical_license),
            has_medical_license: f.has_medical_license || false,
            can_supervise_residents: f.can_supervise_residents || false,
            other_certificate: clean(f.other_certificate),
            special_notes: clean(f.special_notes), resident_category: f.resident_category || null,
            home_department: f.home_department || null,
            home_department_id: f.home_department_id || null,
            external_institution: f.external_institution || null,
            external_contact_name: f.external_contact_name || null,
            external_contact_email: f.external_contact_email || null,
            external_contact_phone: f.external_contact_phone || null,
            is_research_coordinator: f.is_research_coordinator || false,
            is_resident_manager: f.is_resident_manager || false,
            is_oncall_manager:   f.is_oncall_manager   || false,
            can_be_pi: f.can_be_pi || false,
            can_be_coi: f.can_be_coi || false,
            has_phd: f.has_phd || false,
            phd_field: f.phd_field || null,
            office_phone: f.office_phone || null,
            years_experience: f.years_experience || null,
            hospital_id: f.hospital_id || null,
            clinical_study_certificates: f.clinical_study_certificates || []
          }
          let savedStaff
          if (medicalStaffModal.mode === 'add') {
            savedStaff = await API.createMedicalStaff(data)
            medicalStaff.value.unshift(savedStaff)
            showToast('Success', 'Medical staff added', 'success')
          } else {
            savedStaff = await API.updateMedicalStaff(f.id, data)
            const idx = medicalStaff.value.findIndex(s => s.id === savedStaff.id)
            if (idx !== -1) medicalStaff.value[idx] = savedStaff
            // FIX: also patch allStaffLookup so rotations, on-call, absences
            // all see the updated name immediately without a full page reload
            const lookupIdx = allStaffLookup.value.findIndex(s => s.id === savedStaff.id)
            if (lookupIdx !== -1) {
              allStaffLookup.value[lookupIdx] = {
                ...allStaffLookup.value[lookupIdx],
                full_name:         savedStaff.full_name,
                staff_type:        savedStaff.staff_type,
                employment_status: savedStaff.employment_status
              }
            } else {
              // New staff not yet in lookup — add them
              allStaffLookup.value.push({
                id: savedStaff.id,
                full_name: savedStaff.full_name,
                staff_type: savedStaff.staff_type,
                employment_status: savedStaff.employment_status
              })
            }
            showToast('Success', 'Medical staff updated', 'success')
          }
          // If marked as research coordinator with a specific line, update that line's coordinator_id
          if (f.is_research_coordinator && f._coordLineId && savedStaff?.id) {
            try {
              await API.assignCoordinator(f._coordLineId, savedStaff.id)
              await loadResearchLines()
            } catch (e) { console.warn('Could not update research line coordinator:', e) }
          } else if (!f.is_research_coordinator && savedStaff?.id) {
            // If coordinator toggled OFF, clear coordinator_id from any line that had this person
            const coordinated = researchLines.value.filter(l => l.coordinator_id === savedStaff.id)
            for (const line of coordinated) {
              try { await API.assignCoordinator(line.id, null) } catch {}
            }
            if (coordinated.length) await loadResearchLines()
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
        medicalStaff, allStaffLookup, hospitalsList, clinicalUnits,
        staffFilters, staffProfileModal, medicalStaffModal,
        filteredMedicalStaff, filteredMedicalStaffAll, staffTotalPages,
        loadMedicalStaff, loadHospitals, addHospitalInline,
        loadStaffCertificates, saveCertificate, deleteCertificate,
        showAddMedicalStaffModal, editMedicalStaff, saveMedicalStaff, deactivateStaffMember,
        formatTrainingYear: Utils.formatTrainingYear, formatSpecialization: Utils.formatSpecialization, effectiveResidentYear: Utils.effectiveResidentYear,
        formatPhone: Utils.formatPhone, formatLicense: Utils.formatLicense,
        getResidentCategoryInfo: Utils.getResidentCategoryInfo, formatResidentCategorySimple: Utils.formatResidentCategorySimple,
        formatResidentCategoryDetailed: Utils.formatResidentCategoryDetailed, getResidentCategoryIcon: Utils.getResidentCategoryIcon,
        getResidentCategoryTooltip: Utils.getResidentCategoryTooltip, getRoleInfo: Utils.getRoleInfo, getStaffRoles: Utils.getStaffRoles,
        isRoleTaken, getCurrentRoleHolder, handleRoleAssignment, toggleCertificate, availableCertificates,
        addStaffTypeInline,
        staffView, compactStaffWithDividers,
        clearStaffFilters,
        hasActiveStaffFilters
      }
    }

    // ============ 6.4 useOnCall ============
    function useOnCall({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff, allStaffLookup, absences }) {
      const onCallSchedule = ref([])
            const todaysOnCall = ref([])
      const loadingSchedule = ref(false)
      const onCallFilters = reactive({ date: '', shiftType: '', physician: '', coverageArea: '', search: '' })
      // ── Bulk On-call Scheduler ───────────────────────────────────
      const bulkOncall = Vue.reactive({
        show:     false,
        step:     1,         // 1=who/area/role  2=dates  3=review
        // Current block being configured
        current: {
          physician_id:   '',
          coverage_area_id: '',
          shift_type:     'primary_call',
          start_time:     '15:00',
          end_time:       '08:00',
        },
        // Calendar nav
        calYear:  new Date().getFullYear(),
        calMonth: new Date().getMonth(),   // 0-indexed
        // Queue: array of { physician_id, coverage_area_id, shift_type, start_time, end_time, dates[], conflicts[] }
        queue:    [],
        saving:   false,
        // Clone target
        cloneSource: null,  // queue index to clone dates from
      })

      // Calendar days for bulk picker
      const bulkCalDays = Vue.computed(() => {
        const year  = bulkOncall.calYear
        const month = bulkOncall.calMonth
        const firstDay = new Date(year, month, 1)
        const lastDay  = new Date(year, month + 1, 0)
        const startDow = (firstDay.getDay() + 6) % 7  // Mon=0
        const days = []
        // Pad start
        for (let i = startDow - 1; i >= 0; i--) {
          const d = new Date(year, month, -i)
          days.push({ date: Utils.normalizeDate(d), day: d.getDate(), otherMonth: true, selected: false, hasConflict: false })
        }
        // Real days
        for (let d = 1; d <= lastDay.getDate(); d++) {
          const dt   = new Date(year, month, d)
          const dateStr = Utils.normalizeDate(dt)
          const physId  = bulkOncall.current.physician_id
          // Check absence conflict
          const hasAbs = physId ? (absences?.value || []).some(a => {
            if (a.staff_member_id !== physId) return false
            const s = Utils.normalizeDate(a.start_date)
            const e = Utils.normalizeDate(a.end_date)
            return dateStr >= s && dateStr <= e && !['cancelled','returned_to_duty'].includes(a.current_status)
          }) : false
          // Is this date already selected in current block?
          const curBlock = bulkOncall.current._dates || []
          const selected = curBlock.includes(dateStr)
          days.push({ date: dateStr, day: d, otherMonth: false, selected, hasConflict: selected && hasAbs, isAbsent: hasAbs, isToday: dateStr === Utils.normalizeDate(new Date()) })
        }
        // Pad end
        const remaining = 42 - days.length
        for (let d = 1; d <= remaining; d++) {
          const dt = new Date(year, month + 1, d)
          days.push({ date: Utils.normalizeDate(dt), day: d, otherMonth: true, selected: false, hasConflict: false })
        }
        return days
      })

      const bulkToggleDate = (day) => {
        if (day.otherMonth) return
        if (!bulkOncall.current._dates) Vue.set ? Vue.set(bulkOncall.current, '_dates', []) : (bulkOncall.current._dates = [])
        const idx = bulkOncall.current._dates.indexOf(day.date)
        if (idx >= 0) bulkOncall.current._dates.splice(idx, 1)
        else bulkOncall.current._dates.push(day.date)
      }

      const bulkAddToQueue = () => {
        const cur = bulkOncall.current
        if (!cur.physician_id) { showToast('Validation', 'Select a clinician', 'warning'); return }
        if (!cur._dates || cur._dates.length === 0) { showToast('Validation', 'Select at least one date', 'warning'); return }
        const physId = cur.physician_id
        const absList = absences?.value || []
        const dates = [...(cur._dates || [])].sort()
        const conflicts = dates.filter(dateStr => absList.some(a => {
          if (a.staff_member_id !== physId) return false
          const s = Utils.normalizeDate(a.start_date)
          const e = Utils.normalizeDate(a.end_date)
          return dateStr >= s && dateStr <= e && !['cancelled','returned_to_duty'].includes(a.current_status)
        }))
        bulkOncall.queue.push({
          physician_id:     cur.physician_id,
          coverage_area_id: cur.coverage_area_id || null,
          shift_type:       cur.shift_type,
          start_time:       cur.start_time,
          end_time:         cur.end_time,
          dates,
          conflicts,
        })
        // Reset current for next clinician
        Object.assign(bulkOncall.current, { physician_id: '', coverage_area_id: '', shift_type: 'primary_call', start_time: '15:00', end_time: '08:00', _dates: [] })
        bulkOncall.step = 1
      }

      const bulkClone = (sourceIdx) => {
        const source = bulkOncall.queue[sourceIdx]
        if (!source) return
        bulkOncall.current._dates = [...source.dates]
        bulkOncall.current.coverage_area_id = source.coverage_area_id
        bulkOncall.current.shift_type = source.shift_type
        bulkOncall.current.start_time = source.start_time
        bulkOncall.current.end_time   = source.end_time
        bulkOncall.step = 1
      }

      const bulkTotalShifts = Vue.computed(() => bulkOncall.queue.reduce((sum, b) => sum + b.dates.length, 0))
      const bulkTotalConflicts = Vue.computed(() => bulkOncall.queue.reduce((sum, b) => sum + b.conflicts.length, 0))

      const bulkSave = async () => {
        if (bulkOncall.queue.length === 0) { showToast('Empty', 'Add at least one block to the queue', 'warning'); return }
        bulkOncall.saving = true
        try {
          const shifts = []
          bulkOncall.queue.forEach(block => {
            block.dates.forEach(dateStr => {
              shifts.push({
                duty_date:            dateStr,
                shift_type:           block.shift_type,
                coverage_area_id:     block.coverage_area_id,
                primary_physician_id: block.physician_id,
                start_time:           block.start_time,
                end_time:             block.end_time,
                has_conflict:         block.conflicts.includes(dateStr),
              })
            })
          })
          await API.batchCreateOnCall(shifts)
          showToast('Saved', `${shifts.length} on-call shifts created`, 'success')
          bulkOncall.show = false
          bulkOncall.queue = []
          bulkOncall.step = 1
          await loadOnCallSchedule()
        } catch(e) {
          if (e.message?.includes('Duplicate')) {
            showToast('Conflict', 'Some dates already have a primary for that area. Review and retry.', 'error')
          } else {
            showToast('Error', e.message || 'Batch save failed', 'error')
          }
        } finally { bulkOncall.saving = false }
      }

      const openBulkOncall = () => {
        bulkOncall.show  = true
        bulkOncall.step  = 1
        bulkOncall.queue = []
        Object.assign(bulkOncall.current, { physician_id: '', coverage_area_id: '', shift_type: 'primary_call', start_time: '15:00', end_time: '08:00', _dates: [] })
        bulkOncall.calYear  = new Date().getFullYear()
        bulkOncall.calMonth = new Date().getMonth()
      }

      const onCallModal = reactive({
        show: false, mode: 'add',
        showBackup: false,  // progressive disclosure — expands when user clicks "+ Assign backup"
        form: { duty_date: Utils.normalizeDate(new Date()), shift_type: 'primary_call', coverage_area_id: '', start_time: '15:00', end_time: '08:00', primary_physician_id: '', backup_physician_id: '', coverage_notes: '' }
      })

      const getPhysicianName = (id) => {
        if (!id) return 'Not assigned'
        const s = allStaffLookup?.value?.find(x => x.id === id) || medicalStaff.value.find(x => x.id === id)
        return s?.full_name || 'Not assigned'
      }
      const formatStaffType = (t) => formatStaffTypeGlobal(t)

      const validateOnCall = (form) => {
        clearAll('oncall'); let ok = true
        if (!form.duty_date) { setErr('oncall', 'duty_date', 'Date is required'); ok = false }
        if (!form.primary_physician_id) { setErr('oncall', 'primary_physician_id', 'Please select a physician'); ok = false }
        if (!form.start_time) { setErr('oncall', 'start_time', 'Start time is required'); ok = false }
        if (!form.end_time) { setErr('oncall', 'end_time', 'End time is required'); ok = false }
        return ok
      }

      const checkExistingSchedule = async (date, shiftType, excludeId = null, coverageAreaId = null) => {
        // Uniqueness rules:
        // • primary_call WITH area  → one per area per day
        // • primary_call WITHOUT area → one per day (no area assigned, global slot)
        // • backup_call / float → no global uniqueness enforced client-side
        try {
          const normalizedDate = Utils.normalizeDate(date)
          if (shiftType === 'primary_call') {
            return onCallSchedule.value.some(s => {
              if (Utils.normalizeDate(s.duty_date) !== normalizedDate) return false
              if (s.shift_type !== 'primary_call') return false
              if (excludeId && s.id === excludeId) return false
              const sArea = s.coverage_area_id || s.coverage_area?.id || null
              // Same area (both set + matching) OR both have no area
              return coverageAreaId
                ? sArea === coverageAreaId
                : !sArea
            })
          }
          return false // backup/float: no client-side duplicate block
        } catch (error) { console.error('Failed to check existing schedule:', error); return false }
      }

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
        // M6 FIX: coverage_area is not a real DB column — filter on coverage_notes instead
        if (onCallFilters.coverageArea) f = f.filter(s => s.coverage_area_id === onCallFilters.coverageArea || s.coverage_area?.id === onCallFilters.coverageArea)
        if (onCallFilters.search) {
          const q = onCallFilters.search.toLowerCase()
          f = f.filter(s => getPhysicianName(s.primary_physician_id).toLowerCase().includes(q) || (s.coverage_notes || '').toLowerCase().includes(q))
        }
        return applySort(f, 'oncall')
      })

      const filteredOnCallSchedules = computed(() => paginate(filteredOnCallAll.value, 'oncall'))
      const oncallTotalPages = computed(() => totalPages(filteredOnCallAll.value, 'oncall'))
      const todaysOnCallCount = computed(() => todaysOnCall.value.length)

      // Groups ALL on-call schedules by physician for the compact orb view
      const staffWithOnCallOrbs = computed(() => {
        const today = Utils.normalizeDate(new Date())
        // Respect same filters as detailed view
        let shifts = onCallSchedule.value || []
        // Default: hide past shifts unless date filter or search is active
        if (!onCallFilters.date && !onCallFilters.search) {
          shifts = shifts.filter(s => Utils.normalizeDate(s.duty_date) >= today)
        }
        if (onCallFilters.date)       shifts = shifts.filter(s => Utils.normalizeDate(s.duty_date) === onCallFilters.date)
        if (onCallFilters.shiftType)  shifts = shifts.filter(s => s.shift_type === onCallFilters.shiftType)
        if (onCallFilters.coverageArea) shifts = shifts.filter(s => s.coverage_area_id === onCallFilters.coverageArea || s.coverage_area?.id === onCallFilters.coverageArea)
        if (onCallFilters.physician)  shifts = shifts.filter(s => s.primary_physician_id === onCallFilters.physician || s.backup_physician_id === onCallFilters.physician)
        if (onCallFilters.search) {
          const q = onCallFilters.search.toLowerCase()
          shifts = shifts.filter(s => getPhysicianName(s.primary_physician_id).toLowerCase().includes(q) || (s.coverage_notes || '').toLowerCase().includes(q))
        }
        const map = {}
        shifts.forEach(shift => {
          const dutyDate = Utils.normalizeDate(shift.duty_date)
          const id = shift.primary_physician_id
          if (!id) return
          const staff = allStaffLookup?.value?.find(s => s.id === id) || medicalStaff.value.find(s => s.id === id)
          if (!staff) return
          if (!map[id]) map[id] = {
            id, name: staff.full_name, staffType: staff.staff_type,
            full_name: staff.full_name, staff_type: staff.staff_type,
            professional_email: staff.professional_email || '',
            department_id: staff.department_id || null,
            employment_status: staff.employment_status,
            shifts: []
          }
          const areaObj = shift.coverage_area || (coverageAreas?.value || []).find(a => a.id === shift.coverage_area_id) || null
          map[id].shifts.push({
            ...shift, dutyDate,
            isToday: dutyDate === today,
            isPast:  dutyDate < today,
            dayLabel:  new Date(dutyDate + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }),
            dateLabel: new Date(dutyDate + 'T12:00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' }),
            areaName:  areaObj?.name  || null,
            areaColor: areaObj?.color || null,
            backupName: shift.backup_physician_id ? ((allStaffLookup?.value?.find(s => s.id === shift.backup_physician_id) || medicalStaff.value.find(s => s.id === shift.backup_physician_id))?.full_name || null) : null
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

      // ── Moment A: on-call modal — physician has an absence on the selected date ──
      const onCallAbsenceConflict = computed(() => {
        const pid  = onCallModal.form.primary_physician_id
        const date = onCallModal.form.duty_date
        if (!pid || !date) return null
        const normalised = Utils.normalizeDate(date)
        const hit = (absences?.value || []).find(a => {
          if (a.staff_member_id !== pid) return false
          if (['cancelled', 'returned_to_duty'].includes(a.current_status)) return false
          const s = Utils.normalizeDate(a.start_date)
          const e = Utils.normalizeDate(a.end_date || a.start_date)
          return normalised >= s && normalised <= e
        })
        if (!hit) return null
        const reasonMap = { vacation: 'Vacation', sick_leave: 'Sick leave', conference: 'Conference', training: 'Training', personal: 'Personal leave', other: 'Absence' }
        const reason = reasonMap[hit.absence_reason] || 'Absence'
        const from   = new Date(hit.start_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        const to     = new Date(hit.end_date   + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        return { reason, from, to, status: hit.current_status }
      })

      // ── Moment B: absence modal — physician has on-call shifts during the absence period ──
      const absenceOnCallConflict = computed(() => {
        const pid   = absenceModal?.form?.staff_member_id
        const start = absenceModal?.form?.start_date
        const end   = absenceModal?.form?.end_date
        if (!pid || !start || !end) return []
        const s = Utils.normalizeDate(start)
        const e = Utils.normalizeDate(end)
        return (onCallSchedule?.value || []).filter(shift => {
          const d = Utils.normalizeDate(shift.duty_date)
          return d >= s && d <= e &&
            (shift.primary_physician_id === pid || shift.backup_physician_id === pid)
        }).map(shift => ({
          date:  new Date(shift.duty_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
          role:  shift.primary_physician_id === pid ? 'Primary' : 'Backup',
          area:  shift.coverage_area?.name || (coverageAreas?.value || []).find(a => a.id === shift.coverage_area_id)?.name || null,
          time:  `${(shift.start_time||'').slice(0,5)} → ${(shift.end_time||'').slice(0,5)}`
        }))
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
              coverageArea: item.coverage_notes || 'General Coverage',
              backupPhysician: item.backup_physician?.full_name || null,
              contactInfo: item.primary_physician?.professional_email || 'No contact info', raw: item
            }
          })
        } catch { todaysOnCall.value = [] }
      }

      const showAddOnCallModal = (physician = null) => {
        clearAll('oncall')
        onCallModal.mode = 'add'
        onCallModal.showBackup = false  // collapsed by default for new shifts
        Object.assign(onCallModal.form, {
          duty_date: Utils.normalizeDate(new Date()), shift_type: 'primary_call',
          coverage_area_id: '',
          start_time: '15:00', end_time: '08:00',
          primary_physician_id: physician?.id || '',
          backup_physician_id: '', coverage_notes: ''
          // schedule_id is generated server-side — do not set here
        })
        onCallModal.show = true
      }

      const editOnCallSchedule = (schedule) => {
        clearAll('oncall')
        onCallModal.mode = 'edit'
        const raw = schedule.shift_type || 'primary_call'
        onCallModal.form = {
          ...schedule, duty_date: Utils.normalizeDate(schedule.duty_date),
          shift_type: raw === 'float_physician' ? 'float_physician' : ['primary', 'primary_call'].includes(raw) ? 'primary_call' : 'backup_call',
          coverage_area_id: schedule.coverage_area_id || schedule.coverage_area?.id || '',
          coverage_notes: schedule.coverage_notes || ''
        }
        // Auto-expand backup field if one is already assigned
        onCallModal.showBackup = !!(schedule.backup_physician_id)
        onCallModal.show = true
      }

      const saveOnCallSchedule = async (saving) => {
        if (!validateOnCall(onCallModal.form)) { showToast('Validation Error', 'Please fix the highlighted fields', 'error'); return }

        // ── Absence conflict check ──────────────────────────────────────────
        const f0 = onCallModal.form
        if (f0.primary_physician_id && f0.duty_date) {
          const dutyDate  = Utils.normalizeDate(f0.duty_date)
          const absList   = absences?.value || []
          const onAbsence = absList.filter(a => {
            if (a.staff_member_id !== f0.primary_physician_id) return false
            const s = Utils.normalizeDate(a.start_date)
            const e = Utils.normalizeDate(a.end_date)
            return dutyDate >= s && dutyDate <= e && !['cancelled','returned_to_duty'].includes(a.current_status)
          })
          if (onAbsence.length > 0) {
            const abs     = onAbsence[0]
            const staffName = medicalStaff.value.find(x => x.id === f0.primary_physician_id)?.full_name || 'This physician'
            const reason  = abs.absence_reason?.replace(/_/g,' ') || 'absence'
            const fmt     = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            let proceed = false
            await new Promise((resolve) => {
              showConfirmation({
                title: '⚠️ Physician On Absence',
                message: `${staffName} is recorded as absent on this date (${reason}).`,
                details: `Absence period: ${fmt(abs.start_date)} → ${fmt(abs.end_date)}`,
                icon: 'fa-user-slash',
                confirmButtonText: 'Schedule Anyway',
                confirmButtonClass: 'btn-danger',
                onConfirm: () => { proceed = true; resolve() },
                onCancel:  () => resolve()
              })
            })
            if (!proceed) { saving.value = false; return }
          }
        }

        saving.value = true
        try {
          const f = onCallModal.form
          const data = {
            duty_date: Utils.normalizeDate(f.duty_date), shift_type: f.shift_type || 'primary_call',
            start_time: f.start_time || '15:00', end_time: f.end_time || '08:00',
            primary_physician_id: f.primary_physician_id, backup_physician_id: f.backup_physician_id || null,
            coverage_notes: f.coverage_notes || '',
            coverage_area_id: f.coverage_area_id || null
            // schedule_id omitted — backend always generates a collision-safe ID
          }
          if (onCallModal.mode === 'add') {
            const exists = await checkExistingSchedule(data.duty_date, data.shift_type, null, data.coverage_area_id);
            if (exists) { showToast('Duplicate', `A ${data.shift_type === 'primary_call' ? 'Primary Call' : data.shift_type === 'backup_call' ? 'Backup Call' : 'Float'} shift already exists for this date${data.coverage_area_id ? ' and area' : ''}.`, 'warning'); saving.value = false; return; }
          }
          if (onCallModal.mode === 'edit') {
            const exists = await checkExistingSchedule(data.duty_date, data.shift_type, f.id, data.coverage_area_id);
            if (exists) { showToast('Duplicate Schedule', `Another ${data.shift_type === 'primary_call' ? 'primary' : 'backup'} shift already exists for this date.`, 'warning'); saving.value = false; return; }
          }
          if (onCallModal.mode === 'add') {
            const result = await API.createOnCall(data);
            onCallSchedule.value.unshift({ ...result, duty_date: Utils.normalizeDate(result.duty_date) });
            showToast('Success', 'On-call scheduled', 'success');
          } else {
            const result = await API.updateOnCall(f.id, data);
            const idx = onCallSchedule.value.findIndex(s => s.id === result.id);
            if (idx !== -1) onCallSchedule.value[idx] = { ...result, duty_date: Utils.normalizeDate(result.duty_date) };
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
          try {
            await API.deleteOnCall(schedule.id)
            onCallSchedule.value = onCallSchedule.value.filter(s => s.id !== schedule.id)
            showToast('Success', 'Schedule deleted', 'success')
            loadTodaysOnCall()
          } catch (e) {
            showToast('Error', e?.message || 'Failed to delete schedule', 'error')
            await loadOnCallSchedule()
          }
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

          // Apply filters BEFORE creating the bucket — prevents empty date headers
          if (onCallFilters.date && date !== onCallFilters.date) return
          if (onCallFilters.shiftType && shift.shift_type !== onCallFilters.shiftType) return
          if (onCallFilters.physician && shift.primary_physician_id !== onCallFilters.physician &&
              shift.backup_physician_id !== onCallFilters.physician) return
          if (onCallFilters.search) {
            const physicianName = getPhysicianName(shift.primary_physician_id).toLowerCase()
            if (!physicianName.includes(onCallFilters.search.toLowerCase())) return
          }

          if (!groups[date]) {
            groups[date] = {
              date,
              dayOfWeek: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
              shifts: []
            }
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
        const s = shift.start_time, e = shift.end_time
        const overnight = s > e  // e.g. "15:00" > "08:00" means it crosses midnight
        return overnight
          ? (currentTime >= s || currentTime <= e)
          : (currentTime >= s && currentTime <= e)
      }

      // ── Upcoming on-call: next 14 days grouped by date (for dashboard) ──
      const upcomingOnCallDays = computed(() => {
        const today    = Utils.normalizeDate(new Date())
        const cutoff   = Utils.normalizeDate(new Date(Date.now() + 14 * 86400000))
        const fmt      = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
        const dayLabel = (d) => {
          const tomorrow = Utils.normalizeDate(new Date(Date.now() + 86400000))
          if (d === today)    return 'Today'
          if (d === tomorrow) return 'Tomorrow'
          return fmt(d)
        }

        // ── Helpers ───────────────────────────────────────────────────────
        // Check if a physician is on absence for a given date
        const isOnAbsence = (physicianId, dateStr) => {
          if (!physicianId) return false
          return (absences?.value || []).some(a => {
            if (a.staff_member_id !== physicianId) return false
            if (['cancelled','returned_to_duty'].includes(a.current_status)) return false
            const s = Utils.normalizeDate(a.start_date)
            const e = Utils.normalizeDate(a.end_date || a.start_date)
            return dateStr >= s && dateStr <= e
          })
        }

        // Count how many of the last N days this physician has a primary call
        const consecutiveNights = (physicianId, dateStr) => {
          if (!physicianId) return 0
          let count = 0
          for (let i = 1; i <= 6; i++) {
            const d = Utils.normalizeDate(new Date(new Date(dateStr + 'T12:00:00').getTime() - i * 86400000))
            const hadCall = (onCallSchedule.value || []).some(s =>
              Utils.normalizeDate(s.duty_date) === d &&
              s.primary_physician_id === physicianId &&
              ['primary_call','primary'].includes(s.shift_type)
            )
            if (hadCall) count++
            else break
          }
          return count
        }

        // Count calls this month for a physician
        const callsThisMonth = (physicianId) => {
          if (!physicianId) return 0
          const now = new Date()
          const monthStart = Utils.normalizeDate(new Date(now.getFullYear(), now.getMonth(), 1))
          const monthEnd   = Utils.normalizeDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
          return (onCallSchedule.value || []).filter(s =>
            s.primary_physician_id === physicianId &&
            ['primary_call','primary'].includes(s.shift_type) &&
            Utils.normalizeDate(s.duty_date) >= monthStart &&
            Utils.normalizeDate(s.duty_date) <= monthEnd
          ).length
        }

        // Enrich a schedule slot with intelligence flags
        const enrich = (s, dateStr) => {
          if (!s) return s
          const pid = s.primary_physician_id
          const consec = consecutiveNights(pid, dateStr)
          return {
            ...s,
            _onAbsence:  isOnAbsence(pid, dateStr),
            _consecutive: consec,           // nights in a row BEFORE this one
            _callsMonth:  callsThisMonth(pid)
          }
        }

        // ── Build map ─────────────────────────────────────────────────────
        const map = {}
        ;(onCallSchedule.value || []).forEach(s => {
          const d = Utils.normalizeDate(s.duty_date)
          if (d < today || d > cutoff) return
          if (!map[d]) map[d] = { date: d, label: dayLabel(d), isToday: d === today, areas: [], noArea: { primary: null, backup: null } }
          const areaId    = s.coverage_area_id || null
          const areaObj   = s.coverage_area || (coverageAreas?.value || []).find(a => a.id === areaId) || null
          const areaName  = areaObj?.name  || null
          const areaColor = areaObj?.color || '#00b3b3'
          if (areaId) {
            let slot = map[d].areas.find(a => a.id === areaId)
            if (!slot) { slot = { id: areaId, name: areaName, color: areaColor, primary: null, backup: null }; map[d].areas.push(slot) }
            if (['primary_call','primary'].includes(s.shift_type)) slot.primary = enrich(s, d)
            else if (s.shift_type === 'backup_call') slot.backup = s
          } else {
            if (['primary_call','primary'].includes(s.shift_type)) map[d].noArea.primary = enrich(s, d)
            else if (s.shift_type === 'backup_call') map[d].noArea.backup = s
          }
        })

        // ── Inject gap rows — only for areas marked as requiring daily coverage ──
        const requiredAreas = (coverageAreas?.value || []).filter(a => a.is_active && a.requires_coverage)
        Object.keys(map).forEach(dateStr => {
          const day = map[dateStr]
          requiredAreas.forEach(area => {
            const covered = day.areas.some(a => a.id === area.id)
            if (!covered) {
              day.areas.push({
                id: area.id, name: area.name, color: area.color,
                primary: null, backup: null, _gap: true
              })
            }
          })
          // Sort: covered areas first, gaps last; within each group alphabetical
          day.areas.sort((a, b) => {
            if (a._gap && !b._gap) return 1
            if (!a._gap && b._gap) return -1
            return (a.name || '').localeCompare(b.name || '')
          })
        })

        return Object.values(map).sort((a,b) => a.date.localeCompare(b.date))
      })

      // ── Coverage Areas ──────────────────────────────────────────────────
      const coverageAreas = ref([])

      // Filtered by applies_weekends when scheduling on a weekend date
      const filteredCoverageAreas = computed(() => {
        const date = onCallModal.form.duty_date
        if (!date) return coverageAreas.value.filter(a => a.is_active !== false)
        const dow = new Date(date + 'T12:00:00').getDay() // 0=Sun, 6=Sat
        const isWeekend = dow === 0 || dow === 6
        return coverageAreas.value.filter(a => {
          if (a.is_active === false) return false
          if (isWeekend && a.applies_weekends === false) return false
          return true
        })
      })

      const coverageAreaModal = reactive({
        show: false, mode: 'add',
        form: { id: null, name: '', code: '', color: '#00b3b3', applies_weekends: true, requires_coverage: false, is_active: true, display_order: 0 }
      })

      const loadCoverageAreas = async () => {
        try {
          const data = await API.getCoverageAreas()
          if (Array.isArray(data)) {
            coverageAreas.value = data
          } else if (data?.data && Array.isArray(data.data)) {
            coverageAreas.value = data.data
          }
        } catch (e) {
          if (e.message?.includes('not found') || e.message?.includes('42P01')) {
            coverageAreas.value = []
          }
        }
      }

      const showAddCoverageAreaModal = () => {
        coverageAreaModal.mode = 'add'
        Object.assign(coverageAreaModal.form, {
          id: null, name: '', code: '', color: '#00b3b3', applies_weekends: true, requires_coverage: false, is_active: true, display_order: 0
        })
        coverageAreaModal.show = true
      }

      const editCoverageArea = (area) => {
        coverageAreaModal.mode = 'edit'
        Object.assign(coverageAreaModal.form, {
          ...area,
          is_active: area.is_active !== false  // default true if undefined
        })
        coverageAreaModal.show = true
      }

      const saveCoverageArea = async () => {
        const f = coverageAreaModal.form
        if (!f.name?.trim()) { showToast('Validation', 'Area name is required', 'error'); return }
        if (!f.code?.trim()) {
          f.code = f.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 10)
        }
        try {
          const payload = {
            name: f.name.trim(), code: f.code.trim().toUpperCase(),
            color: f.color || '#00b3b3', applies_weekends: f.applies_weekends !== false,
            requires_coverage: f.requires_coverage === true,
            is_active: f.is_active !== false,
            display_order: parseInt(f.display_order) || 0
          }
          if (coverageAreaModal.mode === 'add') {
            const result = await API.createCoverageArea(payload)
            const newArea = result?.data || result
            if (newArea?.id) coverageAreas.value.push(newArea)
            else await loadCoverageAreas()
            showToast('Success', 'Coverage area added', 'success')
          } else {
            const result = await API.updateCoverageArea(f.id, payload)
            const updated = result?.data || result
            const idx = coverageAreas.value.findIndex(a => a.id === f.id)
            if (idx !== -1 && updated?.id) coverageAreas.value[idx] = updated
            else await loadCoverageAreas()
            showToast('Success', 'Coverage area updated', 'success')
          }
          coverageAreaModal.show = false
        } catch (e) {
          showToast('Error', e.message || 'Failed to save coverage area', 'error')
        }
      }

      const deleteCoverageArea = (area) => {
        showConfirmation({
          title: 'Delete Coverage Area', message: `Delete "${area.name}"?`,
          icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
          details: 'Existing on-call shifts using this area will have their area cleared.',
          onConfirm: async () => {
            try {
              await API.deleteCoverageArea(area.id)
              coverageAreas.value = coverageAreas.value.filter(a => a.id !== area.id)
              showToast('Deleted', `${area.name} removed`, 'success')
            } catch (e) {
              showToast('Error', e.message || 'Failed to delete coverage area', 'error')
            }
          }
        })
      }

      return {
        onCallSchedule, todaysOnCall, loadingSchedule, onCallFilters, onCallModal,
        filteredOnCallSchedules, filteredOnCallAll, oncallTotalPages, todaysOnCallCount,
        loadOnCallSchedule, loadCoverageAreas, coverageAreas, filteredCoverageAreas, coverageAreaModal, showAddCoverageAreaModal, editCoverageArea, saveCoverageArea, deleteCoverageArea, loadTodaysOnCall, showAddOnCallModal,
        editOnCallSchedule, saveOnCallSchedule, bulkOncall, bulkCalDays, bulkToggleDate, bulkAddToQueue, bulkClone, bulkTotalShifts, bulkTotalConflicts, bulkSave, openBulkOncall, deleteOnCallSchedule, contactPhysician,
        onCallAbsenceConflict, absenceOnCallConflict,
        // NEW compact view properties
        groupedOnCallSchedules,
        isShiftActive,
        staffWithOnCallOrbs,
        upcomingOnCallDays,
        getPhysicianName
      }
    }

    // ============ 6.5 useRotations ============
    function useRotations({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff, allStaffLookup, trainingUnits, rotations, currentUser }) {
      // rotations is a shared ref hoisted in main setup — do not redeclare
      const rotationFilters = reactive({ resident: '', status: '', trainingUnit: '', supervisor: '', search: '' })
      const rotationModal = reactive({
        show: false, mode: 'add',
        form: { rotation_id: '', resident_id: '', training_unit_id: '', start_date: Utils.normalizeDate(new Date()), end_date: Utils.normalizeDate(new Date(Date.now() + 30 * 86400000)), rotation_status: 'scheduled', rotation_category: 'clinical_rotation', supervising_attending_id: '' },
        availability: null,  // result from /api/rotations/availability
        checkingAvailability: false
      })

      // ── Rotation availability watcher — checks before save ──────
      // Debounced: fires when unit + dates are all set
      let _availCheckTimer = null
      const checkRotationAvailability = () => {
        clearTimeout(_availCheckTimer)
        const { training_unit_id, resident_id, start_date, end_date } = rotationModal.form
        if (!training_unit_id || !start_date || !end_date) { rotationModal.availability = null; return }
        _availCheckTimer = setTimeout(async () => {
          rotationModal.checkingAvailability = true
          try {
            const params = { training_unit_id, start_date, end_date }
            if (resident_id) params.resident_id = resident_id
            if (rotationModal.mode === 'edit' && rotationModal.form.id) params.exclude_id = rotationModal.form.id
            rotationModal.availability = await API.checkRotationAvailability(params)
          } catch { rotationModal.availability = null }
          finally { rotationModal.checkingAvailability = false }
        }, 500)
      }

      const pendingActivations = ref([])
      const activationModal = reactive({ show: false, rotations: [], selectedRotation: null, notes: '', action: 'activate' })

      const getResidentName = (id) => {
        if (!id) return 'Not assigned'
        const s = allStaffLookup?.value?.find(x => x.id === id) || medicalStaff.value.find(x => x.id === id)
        return s?.full_name || 'Not assigned'
      }
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
        const todayStr = Utils.localDateStr(today)  // local date — not UTC
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
        // M5 FIX: store as UTC timestamp number to avoid timezone/clock parsing issues
        localStorage.setItem('last_rotation_check', Date.now().toString())
      }

      const initAutoCheck = () => {
        // Silent: scheduled→active and active→completed are date facts, not decisions
        setTimeout(() => checkAndUpdateRotations(false), 2000)
        const interval = setInterval(() => {
          // M5 FIX: compare numeric timestamps — avoids timezone/clock parsing issues
          const lastCheck = localStorage.getItem('last_rotation_check')
          const now = Date.now()
          const lastCheckMs = lastCheck ? parseInt(lastCheck, 10) : 0
          if (!lastCheck || isNaN(lastCheckMs) || (now - lastCheckMs) > 4 * 60 * 60 * 1000) {
            checkAndUpdateRotations(false)
            localStorage.setItem('last_rotation_check', now.toString())
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
        if (!form.supervising_attending_id) { setErr('rotation', 'supervising_attending_id', 'Supervising attending is required'); ok = false }
        if (form.start_date && form.end_date) {
          const s = new Date(Utils.normalizeDate(form.start_date) + 'T00:00:00')
          const e = new Date(Utils.normalizeDate(form.end_date) + 'T00:00:00')
          if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e <= s) { setErr('rotation', 'end_date', 'End date must be after start date'); ok = false }
        }
        
        // Overlap check — resident can't have two rotations overlapping
        if (ok && form.resident_id && form.start_date && form.end_date) {
          const newStart = new Date(Utils.normalizeDate(form.start_date) + 'T00:00:00')
          const newEnd   = new Date(Utils.normalizeDate(form.end_date)   + 'T23:59:59')
          const editId   = form.id || form.rotation_id
          const overlap  = rotations.value.find(r =>
            r.resident_id === form.resident_id &&
            r.id !== editId &&
            ['active','scheduled'].includes(r.rotation_status) &&
            new Date(Utils.normalizeDate(r.start_date) + 'T00:00:00') <= newEnd &&
            new Date(Utils.normalizeDate(r.end_date)   + 'T23:59:59') >= newStart
          )
          if (overlap) {
            setErr('rotation', 'start_date', `Overlaps with existing rotation at ${getTrainingUnitName(overlap.training_unit_id) || 'another unit'}`)
            ok = false
          }
        }
        // Capacity check — unit has a max_residents limit
        if (ok && form.training_unit_id && form.start_date && form.end_date) {
          const unit = trainingUnits.value.find(u => u.id === form.training_unit_id)
          if (unit?.maximum_residents) {
            const newStart = new Date(Utils.normalizeDate(form.start_date) + 'T00:00:00')
            const newEnd   = new Date(Utils.normalizeDate(form.end_date)   + 'T23:59:59')
            const editId   = form.id || form.rotation_id
            const concurrent = rotations.value.filter(r =>
              r.training_unit_id === form.training_unit_id &&
              r.id !== editId &&
              ['active','scheduled'].includes(r.rotation_status) &&
              new Date(Utils.normalizeDate(r.start_date) + 'T00:00:00') <= newEnd &&
              new Date(Utils.normalizeDate(r.end_date)   + 'T23:59:59') >= newStart
            ).length
            if (concurrent >= unit.maximum_residents) {
              setErr('rotation', 'training_unit_id', `${unit.unit_name} is at full capacity (${unit.maximum_residents} residents)`)
              ok = false
            }
          }
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

      // Auto-derive rotation status from dates as user edits them
      // Uses local date (not UTC) to handle timezone offsets correctly
      watch(() => [rotationModal.form.start_date, rotationModal.form.end_date], ([start, end]) => {
        if (!start || !end) return
        const todayStr = Utils.localDateStr(new Date())
        const startStr = Utils.normalizeDate(start)
        const endStr   = Utils.normalizeDate(end)
        const terminal = ['terminated_early', 'completed', 'extended']
        if (terminal.includes(rotationModal.form.rotation_status)) return
        if (startStr > todayStr)       rotationModal.form.rotation_status = 'scheduled'
        else if (endStr < todayStr)    rotationModal.form.rotation_status = 'completed'
        else                           rotationModal.form.rotation_status = 'active'
        // Trigger availability check when dates change
        checkRotationAvailability()
      })

      // Auto-fill supervisor when unit is selected — reads supervisor_id from the unit
      watch(() => rotationModal.form.training_unit_id, (unitId) => {
        if (!unitId) return
        const unit = trainingUnits.value.find(u => u.id === unitId)
        if (unit && (unit.supervisor_id || unit.default_supervisor_id)) {
          // Only auto-fill if supervisor is not already manually set
          if (!rotationModal.form.supervising_attending_id) {
            rotationModal.form.supervising_attending_id = unit.supervisor_id || unit.default_supervisor_id
          }
        }
        // Trigger availability check when unit changes
        checkRotationAvailability()
      })

      const loadRotations = async () => {
        try {
          const raw = await API.getRotations()
          rotations.value = raw.map(r => ({
            ...r, start_date: Utils.normalizeDate(r.start_date || r.rotation_start_date),
            end_date: Utils.normalizeDate(r.end_date || r.rotation_end_date)
          }))
        } catch { showToast('Error', 'Failed to load rotations', 'error') }
      }

      const showAddRotationModal = (resident = null, unit = null) => {
        clearAll('rotation'); rotationModal.mode = 'add'
        Object.assign(rotationModal.form, {
          rotation_id: `ROT-${Date.now().toString().slice(-6)}`,
          resident_id: resident?.id || '',
          training_unit_id: unit?.id || '',
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
          // Derive status from dates — never trust what the form says.
          // If the user picked today as start date, it should be active immediately.
          // Only terminal states (terminated_early, extended, completed) are preserved
          // when editing an existing rotation.
          const todayStr = Utils.localDateStr(new Date())  // local date — not UTC
          const terminalStatuses = ['terminated_early', 'completed', 'extended']
          let derivedStatus
          if (rotationModal.mode === 'edit' && terminalStatuses.includes(f.rotation_status)) {
            // Keep terminal status when editing
            derivedStatus = f.rotation_status
          } else if (startISO > todayStr) {
            derivedStatus = 'scheduled'
          } else if (endISO < todayStr) {
            derivedStatus = 'completed'
          } else {
            // start_date <= today <= end_date
            derivedStatus = 'active'
          }

          const data = {
            rotation_id: f.rotation_id || Utils.generateId('ROT'), resident_id: f.resident_id,
            training_unit_id: f.training_unit_id, supervising_attending_id: f.supervising_attending_id || null,
            start_date: startISO, end_date: endISO,
            rotation_category: f.rotation_category || 'clinical_rotation',
            rotation_status: derivedStatus
          }
          const normalize = r => ({ ...r, start_date: Utils.normalizeDate(r.start_date), end_date: Utils.normalizeDate(r.end_date) })
          if (rotationModal.mode === 'add') {
            const rName = (medicalStaff.value || []).find(s => s.id === data.resident_id)?.full_name || 'Resident'
            const uName = (trainingUnits.value || []).find(u => u.id === data.training_unit_id)?.unit_name || 'unit'
            rotations.value.unshift(normalize(await API.createRotation(data)))
            showToast('Rotation scheduled', `${rName.split(' ')[0]} → ${uName} · ${data.start_date} – ${data.end_date}`, 'success')
          } else {
            const prev = rotations.value.find(r => r.id === f.id)
            const result = normalize(await API.updateRotation(f.id, data))
            const idx = rotations.value.findIndex(r => r.id === result.id)
            if (idx !== -1) rotations.value[idx] = result
            // Build diff summary
            const changes = []
            if (prev && prev.start_date !== data.start_date) changes.push(`Start ${prev.start_date} → ${data.start_date}`)
            if (prev && prev.end_date !== data.end_date) changes.push(`End ${prev.end_date} → ${data.end_date}`)
            if (prev && prev.training_unit_id !== data.training_unit_id) {
              const uName = (trainingUnits.value || []).find(u => u.id === data.training_unit_id)?.unit_name || 'new unit'
              changes.push(`Unit → ${uName}`)
            }
            if (prev && prev.supervising_attending_id !== data.supervising_attending_id) changes.push('Supervisor changed')
            showToast('Rotation updated', changes.length ? changes.join(' · ') : 'No changes detected', 'success')
          }
          rotationModal.show = false; clearAll('rotation')
        } catch (e) {
          let msg = e.message || 'Failed to save rotation'
          if (msg.includes('overlapping')) msg = 'Dates conflict with an existing rotation.'
          if (msg.includes('date')) msg = 'Invalid date — check start and end dates.'
          showToast('Error', msg, 'error')
        } finally { saving.value = false }
      }

      const deleteRotation = (rotation) => {
        const isActive = ['active', 'scheduled'].includes(rotation.rotation_status)
        showConfirmation({
          title: isActive ? 'Terminate Rotation' : 'Remove Rotation Record',
          message: isActive
            ? 'This will terminate the rotation early and mark it as ended. The record is kept for audit purposes.'
            : `This rotation is already ${rotation.rotation_status}. Permanently remove it from the list?`,
          icon: isActive ? 'fa-stop-circle' : 'fa-trash',
          confirmButtonText: isActive ? 'Terminate' : 'Remove',
          confirmButtonClass: 'btn-danger',
          details: `${formatDrName(getResidentName(rotation.resident_id))} · ${getTrainingUnitName(rotation.training_unit_id)}`,
          onConfirm: async () => {
            try {
              await API.deleteRotation(rotation.id)
              const idx = rotations.value.findIndex(r => r.id === rotation.id)
              if (idx !== -1) rotations.value[idx] = { ...rotations.value[idx], rotation_status: 'terminated_early' }
              showToast('Success', isActive ? 'Rotation terminated' : 'Rotation removed', 'success')
              await loadRotations()
            } catch (e) {
              showToast('Error', e?.message || 'Failed to terminate rotation', 'error')
              await loadRotations()
            }
          }
        })
      }

      // ============ [NEW] Compact view computed properties for Rotations ============
      const residentsWithRotations = computed(() => {
        // C2 FIX: was hardcoded to staff_type === 'medical_resident' — use isResidentType()
        // so custom resident types (e.g. 'mir', 'resident_externo') are included
        const residents = medicalStaff.value.filter(s => isResidentType(s.staff_type) && s.employment_status === 'active')
        
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


      // ============ [NEW] Rotation detail sheet modal ============
      const rotationViewModal = reactive({ show: false, rotation: null })

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


      // ============ Month Horizon view ============
      const monthHorizon = ref(6)
      const monthOffset  = ref(0)

      const getHorizonMonths = (n, offset) => {
        const today  = new Date()
        const months = []
        for (let i = 0; i < n; i++) {
          const d    = new Date(today.getFullYear(), today.getMonth() + offset + i, 1)
          const prev = i > 0 ? new Date(today.getFullYear(), today.getMonth() + offset + i - 1, 1) : null
          months.push({
            key:         `${d.getFullYear()}-${d.getMonth()}`,
            label:       d.toLocaleDateString('es-ES', { month: 'short' }),
            year:        d.getFullYear(),
            month:       d.getMonth(),
            isCurrent:   d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth(),
            isYearStart: !prev || d.getFullYear() !== prev.getFullYear(),
            daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
          })
        }
        return months
      }

      const getHorizonRangeLabel = () => {
        const months = getHorizonMonths(monthHorizon.value, monthOffset.value)
        if (!months.length) return ''
        const first = months[0], last = months[months.length - 1]
        if (first.year === last.year)
          return `${first.label} – ${last.label} ${last.year}`
        return `${first.label} ${first.year} – ${last.label} ${last.year}`
      }

      const getResidentRotationsInHorizon = (resident) => {
        const months = getHorizonMonths(monthHorizon.value, monthOffset.value)
        if (!months.length) return []
        const n = months.length
        const horizonStart = new Date(months[0].year, months[0].month, 1)
        const horizonEnd   = new Date(months[n-1].year, months[n-1].month + 1, 0)
        return rotations.value.filter(r =>
          r.resident_id === resident.id &&
          ['active','scheduled','completed'].includes(r.rotation_status) &&
          new Date(r.start_date) <= horizonEnd && new Date(r.end_date) >= horizonStart
        )
      }

      const getRotationBarStyle = (rotation) => {
        const months = getHorizonMonths(monthHorizon.value, monthOffset.value)
        const n = months.length
        if (!n) return { display: 'none' }
        const horizonStart = new Date(months[0].year, months[0].month, 1)
        const horizonEnd   = new Date(months[n-1].year, months[n-1].month + 1, 0)
        const rotStart     = new Date(rotation.start_date + 'T00:00:00')
        const rotEnd       = new Date(rotation.end_date   + 'T00:00:00')
        const cs = rotStart < horizonStart ? horizonStart : rotStart
        const ce = rotEnd   > horizonEnd   ? horizonEnd   : rotEnd
        if (cs > ce) return { display: 'none' }
        const totalDays   = months.reduce((s, m) => s + m.daysInMonth, 0)
        const daysToStart = Math.round((cs - horizonStart) / 86400000)
        const daysToEnd   = Math.round((ce - horizonStart) / 86400000) + 1
        const leftPct  = (daysToStart / totalDays) * 100
        const widthPct = ((daysToEnd - daysToStart) / totalDays) * 100
        return {
          left:  `calc(${leftPct.toFixed(2)}% + 3px)`,
          width: `calc(${widthPct.toFixed(2)}% - 6px)`
        }
      }

      const rotationStartsInHorizon = (rotation) => {
        const months = getHorizonMonths(monthHorizon.value, monthOffset.value)
        if (!months.length) return false
        const horizonStart = new Date(months[0].year, months[0].month, 1)
        return new Date(rotation.start_date + 'T00:00:00') >= horizonStart
      }

      const rotationEndsInHorizon = (rotation) => {
        const months = getHorizonMonths(monthHorizon.value, monthOffset.value)
        if (!months.length) return false
        const n = months.length
        const horizonEnd = new Date(months[n-1].year, months[n-1].month + 1, 0)
        return new Date(rotation.end_date + 'T00:00:00') <= horizonEnd
      }

      // ── Resident gap warnings ─────────────────────────────────────────────
      // Residents who have no rotation scheduled for any of the next 3 months
      const rgwCollapsed = ref(false)
      const residentGapWarnings = computed(() => {
        const today    = new Date(); today.setHours(0,0,0,0)
        const warnings = []
        // All active residents
        const residents = medicalStaff.value.filter(s =>
          isResidentType(s.staff_type) && s.employment_status === 'active' &&
          s.resident_category !== 'external_resident' &&
          s.resident_category !== 'rotating_other_dept'
        )
        for (const resident of residents) {
          const gaps = []
          for (let i = 0; i < 3; i++) {
            const mStart = new Date(today.getFullYear(), today.getMonth() + i, 1)
            const mEnd   = new Date(today.getFullYear(), today.getMonth() + i + 1, 0)
            const covered = rotations.value.some(r =>
              r.resident_id === resident.id &&
              ['active','scheduled'].includes(r.rotation_status) &&
              new Date(r.start_date) <= mEnd && new Date(r.end_date) >= mStart
            )
            if (!covered) {
              gaps.push(mStart.toLocaleDateString('es-ES', { month: 'short' }))
            }
          }
          if (gaps.length > 0) {
            warnings.push({
              id:       resident.id,
              name:     resident.full_name,
              year:     resident.training_year,
              gaps,
              gapCount: gaps.length
            })
          }
        }
        return warnings.sort((a,b) => b.gapCount - a.gapCount)
      })

      return {
        rotations, rotationFilters, rotationModal,
        filteredRotations, filteredRotationsAll, rotationTotalPages,
        loadRotations, showAddRotationModal, editRotation, saveRotation, deleteRotation, selectedUnitCapacity,
        checkRotationAvailability,
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
        monthHorizon,
        monthOffset,
        getHorizonMonths,
        getHorizonRangeLabel,
        getResidentRotationsInHorizon,
        getRotationBarStyle,
        rotationStartsInHorizon,
        rotationEndsInHorizon,
        residentGapWarnings, rgwCollapsed,
        getResidentName,
        getTrainingUnitName
      }
    }

    // ============ 6.6 useAbsences ============
    function useAbsences({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff, allStaffLookup, onCallSchedule }) {
      const absences = ref([])
            const absenceFilters = reactive({ staff: '', status: '', reason: '', startDate: '', search: '', hideReturned: true })
      const absenceModal = reactive({
        show: false, mode: 'add',
        form: { staff_member_id: '', absence_type: 'planned', absence_reason: 'vacation', start_date: Utils.normalizeDate(new Date()), end_date: Utils.normalizeDate(new Date(Date.now() + 7 * 86400000)), covering_staff_id: '', coverage_notes: '', coverage_arranged: false, hod_notes: '' }
      })

      const getStaffName = (id) => {
        if (!id) return 'Not assigned'
        const lookup = allStaffLookup?.value || []
        const all    = medicalStaff?.value || []
        const s = lookup.find(x => x.id === id) || all.find(x => x.id === id)
        return s?.full_name || 'Not assigned'
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

      // M4 FIX: moved deriveAbsenceStatus before filteredAbsencesAll which uses it
      const deriveAbsenceStatus = (a) => {
        if (a.current_status === 'cancelled')       return 'cancelled'
        if (a.current_status === 'returned_to_duty') return 'returned_to_duty'
        const today = Utils.normalizeDate(new Date())
        const start = Utils.normalizeDate(a.start_date)
        const end   = Utils.normalizeDate(a.end_date)
        // Use DB-aligned values for all statuses so in-memory filter and
        // any future server-side filtering stay consistent with the DB CHECK constraint
        if (end < today)    return 'returned_to_duty'
        if (start <= today) return 'currently_absent'
        return 'planned_leave'
      }

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
        // Hide past/resolved records by default — toggle via "Show Past" filter
        if (!absenceFilters.status && absenceFilters.hideReturned) {
          f = f.filter(a => !['returned_to_duty', 'cancelled'].includes(a.current_status))
        }
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

      const absenceKPIs = computed(() => {
        const today = Utils.normalizeDate(new Date())
        const all   = absences.value.map(a => ({ ...a, current_status: deriveAbsenceStatus(a) }))
        const absentNow  = all.filter(a => a.current_status === 'currently_absent')
        const upcoming   = all.filter(a => a.current_status === 'planned_leave')
        const now        = new Date()
        const thisMonth  = all.filter(a => {
          const s = new Date(a.start_date)
          return s.getMonth() === now.getMonth() && s.getFullYear() === now.getFullYear()
        })
        const noCoverage = [...absentNow, ...upcoming].filter(a => !a.coverage_arranged)
        const nextAbs    = upcoming.sort((a,b) => new Date(a.start_date)-new Date(b.start_date))[0]
        return {
          absentNow:    absentNow.length,
          absentName:   absentNow[0] ? (allStaffLookup.value.find(s => s.id === absentNow[0].staff_member_id)?.full_name || '') : '',
          absentDay:    absentNow[0] ? (()=>{
            try {
              const s = new Date(absentNow[0].start_date + 'T00:00:00')
              const t = new Date(); t.setHours(0,0,0,0)
              const d = Math.floor((t - s)/(864e5)) + 1
              return isNaN(d) || d < 1 ? 1 : d
            } catch { return 1 }
          })() : 0,
          upcoming:     upcoming.length,
          nextDate:     nextAbs ? Utils.formatDate(nextAbs.start_date) : '',
          nextName:     nextAbs ? (allStaffLookup.value.find(s => s.id === nextAbs.staff_member_id)?.full_name||'') : '',
          thisMonth:    thisMonth.length,
          coveredCount: thisMonth.filter(a=>a.coverage_arranged).length,
          noCoverage:   noCoverage.length,
        }
      })


      const loadAbsences = async () => {
        try {
          const raw = await API.getAbsences()
          const stalePatches = []

          // Filter cancelled (soft-deleted) records — they must not reappear after refresh
          const active = raw.filter(a => a.current_status !== 'cancelled')

          absences.value = active.map(a => {
            const normalized = { ...a, start_date: Utils.normalizeDate(a.start_date), end_date: Utils.normalizeDate(a.end_date) }
            const derived = deriveAbsenceStatus(normalized)
            // Silently patch stale records (ended but still 'currently_absent' in DB)
            // deriveAbsenceStatus returns 'returned_to_duty' for past absences — never 'completed'
            if (derived === 'returned_to_duty' &&
                a.current_status &&
                a.current_status !== 'returned_to_duty' &&
                a.current_status !== 'cancelled') {
              const patch = {
                staff_member_id:   a.staff_member_id,
                absence_type:      a.absence_type,
                absence_reason:    a.absence_reason,
                start_date:        Utils.normalizeDate(a.start_date),
                end_date:          Utils.normalizeDate(a.end_date),
                coverage_arranged: a.coverage_arranged || false,
                covering_staff_id: a.covering_staff_id || null,
                coverage_notes:    a.coverage_notes || '',
                hod_notes:         a.hod_notes || ''
              }
              stalePatches.push(API.updateAbsence(a.id, patch).catch(() => {}))
            }
            return { ...normalized, current_status: derived }
          })

          if (stalePatches.length) await Promise.all(stalePatches)
        } catch { showToast('Error', 'Failed to load absences', 'error') }
      }

      const showAddAbsenceModal = (staff = null) => {
        clearAll('absence'); absenceModal.mode = 'add'
        Object.assign(absenceModal.form, {
          staff_member_id: staff?.id || '', absence_type: 'planned', absence_reason: 'vacation',
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
        if (saving?.value) return
        if (saving) saving.value = true

        // ── On-call conflict check ──────────────────────────────────────────
        const f = absenceModal.form
        if (f.staff_member_id && f.start_date && f.end_date) {
          const absStart = Utils.normalizeDate(f.start_date)
          const absEnd   = Utils.normalizeDate(f.end_date)
          const conflicts = (onCallSchedule?.value || []).filter(s => {
            const d = Utils.normalizeDate(s.duty_date)
            return d >= absStart && d <= absEnd &&
              (s.primary_physician_id === f.staff_member_id || s.backup_physician_id === f.staff_member_id)
          })
          if (conflicts.length > 0) {
            const fmt    = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
            const lines  = conflicts.slice(0, 4).map(s => {
              const role = s.primary_physician_id === f.staff_member_id ? 'Primary' : 'Backup'
              return `${fmt(s.duty_date)} · ${role} · ${s.start_time}–${s.end_time}`
            }).join('\n')
            const more   = conflicts.length > 4 ? `\n+${conflicts.length - 4} more` : ''
            const staffName = medicalStaff.value.find(x => x.id === f.staff_member_id)?.full_name || 'This physician'
            await new Promise((resolve) => {
              showConfirmation({
                title: '⚠️ On-Call Conflict Detected',
                message: `${staffName} has ${conflicts.length} on-call shift${conflicts.length > 1 ? 's' : ''} during this absence period that will be left uncovered:`,
                details: lines + more,
                icon: 'fa-phone-slash',
                confirmButtonText: 'Save Anyway',
                confirmButtonClass: 'btn-danger',
                onConfirm: () => resolve(true),
                onCancel:  () => resolve(false)
              })
            }).then(async (confirmed) => {
              if (!confirmed) { saving.value = false; return }
              await _doSaveAbsence(saving)
            })
            return
          }
        }
        await _doSaveAbsence(saving)
      }

      const _doSaveAbsence = async (saving) => {
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
            const sName = (medicalStaff.value || []).find(s => s.id === f.staff_member_id)?.full_name?.split(' ')[0] || 'Staff'
            const reason = (f.absence_reason || '').replace(/_/g, ' ')
            absences.value.unshift(normalize(await API.createAbsence(data)))
            showToast('Absence recorded', `${sName} · ${reason} · ${f.start_date} – ${f.end_date}`, 'success')
          } else {
            const prevAbs = absences.value.find(a => a.id === f.id)
            const record = normalize(await API.updateAbsence(f.id, data))
            const idx = absences.value.findIndex(a => a.id === (record.id || f.id))
            if (idx !== -1) absences.value[idx] = record
            const absChanges = []
            if (prevAbs && prevAbs.start_date !== f.start_date) absChanges.push(`Start → ${f.start_date}`)
            if (prevAbs && prevAbs.end_date !== f.end_date) absChanges.push(`End → ${f.end_date}`)
            if (prevAbs && prevAbs.absence_reason !== f.absence_reason) absChanges.push(`Reason → ${(f.absence_reason||'').replace(/_/g,' ')}`)
            if (prevAbs && prevAbs.coverage_arranged !== f.coverage_arranged) absChanges.push(f.coverage_arranged ? 'Coverage arranged ✓' : 'Coverage removed')
            showToast('Absence updated', absChanges.length ? absChanges.join(' · ') : 'Saved', 'success')
          }
          absenceModal.show = false; clearAll('absence'); await loadAbsences()
        } catch (e) { showToast('Error', e.message || 'Failed to save absence', 'error') }
        finally { saving.value = false }
      }

      const deleteAbsence = (absence) => showConfirmation({
        title: 'Cancel Absence Record', message: 'This will mark the absence as cancelled. The record is retained for audit purposes but will no longer appear in the active list.',
        icon: 'fa-ban', confirmButtonText: 'Cancel Absence', confirmButtonClass: 'btn-danger',
        details: `Staff: ${getStaffName(absence.staff_member_id)}`,
        onConfirm: async () => {
          try {
            await API.deleteAbsence(absence.id)
            absences.value = absences.value.filter(a => a.id !== absence.id)
            showToast('Success', 'Absence record cancelled', 'success')
            await loadAbsences()
          } catch (e) {
            showToast('Error', e?.message || 'Failed to cancel absence record', 'error')
            await loadAbsences()
          }
        }
      })

      const purgeAbsence = (absence) => showConfirmation({
        title: 'Permanently Delete Record',
        message: `This will permanently remove this absence record from the system. This action cannot be undone and the record will not appear in any future audit trail.`,
        icon: 'fa-trash-alt',
        confirmButtonText: 'Delete Permanently',
        confirmButtonClass: 'btn-danger',
        details: `Staff: ${getStaffName(absence.staff_member_id)} · ${ABSENCE_REASON_LABELS[absence.absence_reason] || absence.absence_reason} · ${Utils.formatDate(absence.start_date)} → ${Utils.formatDate(absence.end_date)}`,
        onConfirm: async () => {
          try {
            await API.purgeAbsence(absence.id)
            absences.value = absences.value.filter(a => a.id !== absence.id)
            showToast('Deleted', 'Absence record permanently removed', 'success')
          } catch (e) {
            showToast('Error', e?.message || 'Failed to delete record', 'error')
            await loadAbsences()
          }
        }
      })

      // ── Absence Resolution Workflow ───────────────────────────────────────
      // Surfaces when an absence period has ended but no formal resolution has been recorded.
      const absenceResolutionModal = reactive({
        show: false,
        absence: null,
        action: null,        // 'confirm_return' | 'extend' | 'archive'
        returnDate: Utils.normalizeDate(new Date()),
        returnNotes: '',
        extendedEndDate: '',
        saving: false
      })

      const openResolutionModal = (absence) => {
        absenceResolutionModal.absence = absence
        absenceResolutionModal.action = 'confirm_return'
        absenceResolutionModal.returnDate = Utils.normalizeDate(new Date())
        absenceResolutionModal.returnNotes = ''
        absenceResolutionModal.extendedEndDate = Utils.normalizeDate(new Date(Date.now() + 7 * 86400000))
        absenceResolutionModal.saving = false
        absenceResolutionModal.show = true
      }

      const resolveAbsence = async () => {
        const m = absenceResolutionModal
        if (!m.absence) return
        m.saving = true
        try {
          if (m.action === 'confirm_return') {
            // Call dedicated /return endpoint — updates end_date, sets returned_to_duty, writes audit
            await API.returnToDuty(m.absence.id, {
              return_date: m.returnDate,
              notes: m.returnNotes || 'Staff confirmed returned to duty'
            })
            showToast('Confirmed', `${getStaffName(m.absence.staff_member_id)} marked as returned`, 'success')

          } else if (m.action === 'extend') {
            // Standard PUT update with new end date
            await API.updateAbsence(m.absence.id, {
              ...m.absence,
              end_date: m.extendedEndDate,
              hod_notes: (m.absence.hod_notes ? m.absence.hod_notes + '\n' : '') +
                `[EXTENDED: ${new Date().toISOString()}] New end date: ${m.extendedEndDate}` +
                (m.returnNotes ? ` — ${m.returnNotes}` : '')
            })
            showToast('Updated', 'Absence extended', 'success')

          } else if (m.action === 'archive') {
            // Soft-delete via DELETE endpoint — sets cancelled, writes audit note
            await API.deleteAbsence(m.absence.id)
            showToast('Archived', 'Absence record archived', 'success')
          }

          m.show = false
          await loadAbsences()
        } catch (e) {
          showToast('Error', e?.message || 'Failed to resolve absence', 'error')
        } finally { m.saving = false }
      }

      return {
        absences, absenceFilters, absenceModal, absenceOverlapWarning,
        filteredAbsences, filteredAbsencesAll, absenceTotalPages, absenceKPIs,
        loadAbsences, showAddAbsenceModal, editAbsence, saveAbsence, deleteAbsence, purgeAbsence,
        absenceResolutionModal, openResolutionModal, resolveAbsence,
        getStaffName
      }
    }

    // ============ 6.7 useDepartments ============
    function useDepartments({ showToast, showConfirmation, medicalStaff, trainingUnits, rotations }) {
      const departments = ref([])
            const allDepartmentsLookup = ref([])  // includes inactive — for name resolution only
      const departmentFilters = reactive({ search: '', status: '' })
      const departmentModal = reactive({ show: false, mode: 'add', form: { name: '', code: '', status: 'active', head_of_department_id: '', hospital_id: '', description: '', contact_email: '', contact_phone: '' } })

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
      const getDepartmentName = (id) => allDepartmentsLookup.value.find(d => d.id === id)?.name || departments.value.find(d => d.id === id)?.name || ''
      const getDepartmentUnits = (id) => trainingUnits.value.filter(u => u.department_id === id)
      const getDepartmentStaffCount = (id) => medicalStaff.value.filter(s => s.department_id === id).length

      // Break down residents by category for a department
      const getDeptResidentStats = (id) => {
        const residents = medicalStaff.value.filter(s => s.department_id === id && isResidentType(s.staff_type))
        return {
          total: residents.length,
          internal:  residents.filter(r => r.resident_category === 'department_internal').length,
          rotating:  residents.filter(r => r.resident_category === 'rotating_other_dept').length,
          external:  residents.filter(r => r.resident_category === 'external_resident').length,
          list: residents
        }
      }

      // Residents whose home_department_id points to this dept (rotating from here to elsewhere)
      const getDeptHomeResidents = (id) => medicalStaff.value.filter(s =>
        s.home_department_id === id && isResidentType(s.staff_type)
      )

      const loadDepartments = async () => {
        try {
          const [active, all] = await Promise.all([API.getDepartments(), API.getAllDepartments()])
          departments.value = active
          allDepartmentsLookup.value = all
        } catch { showToast('Error', 'Failed to load departments', 'error') }
      }

      const showAddDepartmentModal = () => {
        departmentModal.mode = 'add'
        Object.assign(departmentModal.form, { name: '', code: '', status: 'active', head_of_department_id: '', hospital_id: '', description: '', contact_email: '', contact_phone: '' })
        departmentModal.show = true
      }
      const editDepartment = (d) => { departmentModal.mode = 'edit'; Object.assign(departmentModal.form, { ...d }); departmentModal.show = true }

      const saveDepartment = async (saving) => {
        const f = departmentModal?.form || {}
        if (!f.name?.trim()) { showToast('Validation Error', 'Department name is required', 'error'); return }
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

      // Department detail panel
      const deptPanel = reactive({ show: false, dept: null, tab: 'staff' })

      const openDeptPanel = (dept) => {
        deptPanel.dept = dept
        deptPanel.tab = 'staff'
        deptPanel.show = true
      }

      const closeDeptPanel = () => { deptPanel.show = false }

      // Staff in this department grouped by type
      const deptPanelAttending = computed(() => {
        if (!deptPanel.dept) return []
        return medicalStaff.value.filter(s =>
          s.department_id === deptPanel.dept.id && !isResidentType(s.staff_type)
        ).sort((a,b) => a.full_name.localeCompare(b.full_name))
      })

      const deptPanelResidents = computed(() => {
        if (!deptPanel.dept) return []
        return medicalStaff.value.filter(s =>
          s.department_id === deptPanel.dept.id && isResidentType(s.staff_type)
        ).sort((a,b) => a.full_name.localeCompare(b.full_name))
      })

      // Units belonging to this department
      const deptPanelUnits = computed(() => {
        if (!deptPanel.dept) return []
        return trainingUnits.value.filter(u => u.department_id === deptPanel.dept.id)
      })

      // deptPanelRotations is defined in the main setup after rotationOps loads
      // (rotations ref not available here at construction time)

      // Get supervisor name for a unit
      const getUnitSupervisorName = (unit) => {
        if (!unit) return null
        const supId = unit.supervisor_id || unit.default_supervisor_id
        if (!supId) return null
        return medicalStaff.value.find(s => s.id === supId)?.full_name || null
      }

      // Days remaining for a rotation
      const rotDaysLeft = (r) => {
        const diff = Math.ceil((new Date(r.end_date) - new Date()) / 86400000)
        return diff > 0 ? diff : 0
      }

      const viewDepartmentStaff = (dept) => openDeptPanel(dept)

      return {
        departments, allDepartmentsLookup, departmentFilters, departmentModal, deptReassignModal,
        filteredDepartments, getDepartmentName, getDepartmentUnits, getDepartmentStaffCount, getDeptResidentStats, getDeptHomeResidents,
        loadDepartments, showAddDepartmentModal, editDepartment, saveDepartment,
        deleteDepartment, confirmDeptReassignAndDeactivate, viewDepartmentStaff,
        deptPanel, openDeptPanel, closeDeptPanel,
        deptPanelAttending, deptPanelResidents, deptPanelUnits,
        getUnitSupervisorName
      }
    }

    // ============ 6.8 useTrainingUnits ============
    function useTrainingUnits({ showToast, showConfirmation, rotations, trainingUnits, allStaffLookup, allDepartmentsLookup }) {
      // trainingUnits is a shared ref hoisted in main setup — do not redeclare
      const trainingUnitFilters = reactive({ search: '', department: '', status: '' })
      
      // ── Unit staff (attendings who work in each unit) ─────────────────────
      const unitStaffCache  = ref({})   // { [unitId]: [{ id, role, staff: {...} }] }
      const unitStaffLoading = ref({})  // { [unitId]: true/false }

      const loadUnitStaff = async (unitId) => {
        if (unitStaffLoading.value[unitId]) return
        unitStaffLoading.value[unitId] = true
        try {
          const res = await API.request(`/api/training-units/${unitId}/staff`)
          unitStaffCache.value = { ...unitStaffCache.value, [unitId]: res?.data || [] }
        } catch { unitStaffCache.value[unitId] = [] }
        finally { unitStaffLoading.value[unitId] = false }
      }

      const getUnitAttendingCount = (unitId) => (unitStaffCache.value[unitId] || []).length


      const addStaffToUnit = async (unitId, staffId, role = 'primary') => {
        try {
          const res = await API.request(`/api/training-units/${unitId}/staff`, {
            method: 'POST', body: JSON.stringify({ staff_id: staffId, role })
          })
          const updated = [...(unitStaffCache.value[unitId] || []), res.data]
          unitStaffCache.value = { ...unitStaffCache.value, [unitId]: updated }
          showToast('Clinician assigned', `Added to unit team`, 'success')
          return res.data
        } catch (e) {
          showToast('Error', e?.message || 'Failed to assign', 'error')
          throw e
        }
      }

      const removeStaffFromUnit = async (unitId, staffId) => {
        try {
          await API.request(`/api/training-units/${unitId}/staff/${staffId}`, { method: 'DELETE' })
          unitStaffCache.value = {
            ...unitStaffCache.value,
            [unitId]: (unitStaffCache.value[unitId] || []).filter(m => m.staff?.id !== staffId)
          }
          showToast('Removed', 'Clinician removed from unit team', 'info')
        } catch (e) {
          showToast('Error', e?.message || 'Failed to remove', 'error')
        }
      }
      const trainingUnitModal = reactive({ show: false, mode: 'add', form: { unit_name: '', unit_code: '', department_id: '', maximum_residents: 2, unit_status: 'active', unit_type: 'clinical_unit', supervising_attending_id: '', unit_description: '', specialty: '', location_building: '', location_floor: '' } })
      const unitResidentsModal = reactive({ show: false, unit: null, rotations: [] })
      const unitCliniciansModal = reactive({ show: false, unit: null, clinicians: [], supervisorId: '', allStaff: [] })

      const filteredTrainingUnits = computed(() => {
        // Only show units linked to Neumología/Pulmonology — filter out rotation destinations
        // A unit belongs to Neumología if: specialty=Pulmonology/Surgery/Critical Care etc (our units)
        // OR department_name contains Neumología/Pulmonology
        // Exclude units from external services (Cardiología, Medicina Interna etc that are rotation DESTINATIONS)
        // We identify ours by dept_name matching the home department name pattern
        let f = trainingUnits.value.filter(u => {
          const deptName = (u.department?.name || u.department_name || '').toLowerCase()
          // Primary check: unit's department_id is in our known departments list.
          // This covers all newly created units without needing hardcoded names.
          if (u.department_id && allDepartmentsLookup.value.some(d => d.id === u.department_id)) return true
          // Fallback: legacy units without a department_id — keep old name matching
          return deptName.includes('neumolog') || deptName.includes('pulmonolog') ||
                 deptName.includes('cirugía torácica') ||
                 u.unit_code === 'UCRI' || u.unit_code === 'PFR' || u.unit_code === 'UTB' ||
                 u.unit_code === 'SUEÑO' || u.unit_code === 'TRANSP'
        })
        if (trainingUnitFilters.search) { const q = trainingUnitFilters.search.toLowerCase(); f = f.filter(u => u.unit_name?.toLowerCase().includes(q)) }
        if (trainingUnitFilters.department) f = f.filter(u => u.department_id === trainingUnitFilters.department)
        if (trainingUnitFilters.status) {
          if (trainingUnitFilters.status === 'available') {
            f = f.filter(u => getUnitActiveRotationCount(u.id) < u.maximum_residents)
          } else if (trainingUnitFilters.status === 'full') {
            f = f.filter(u => getUnitActiveRotationCount(u.id) >= u.maximum_residents)
          } else {
            f = f.filter(u => u.unit_status === trainingUnitFilters.status)
          }
        }
        // Sort by urgency: overlap > full > partial > available
        return [...f].sort((a, b) => {
          const score = (u) => {
            if (getUnitOverlapWarning(u.id)) return 0
            const ratio = getUnitActiveRotationCount(u.id) / (u.maximum_residents || 1)
            if (ratio >= 1) return 1
            if (ratio > 0.5) return 2
            if (ratio > 0) return 3
            return 4
          }
          return score(a) - score(b)
        })
      })

      // Groups filteredTrainingUnits by department for section-header card layout
      const DEPT_NAME_MAP = {
        'Department of Pulmonology': 'Neumología',
        'Cirugía Torácica y Trasplante Pulmonar': 'Cirugía Torácica y Trasplante',
        'General Medicine': 'Medicina General',
        'INT. MEDICINE': 'Medicina Interna'
      }
      const unitsByDepartment = computed(() => {
        const depts = {}
        filteredTrainingUnits.value.forEach(u => {
          const key = u.department_id || '__none__'
          const rawName = u.department?.name || u.department_name || 'Sin departamento'
          const displayName = DEPT_NAME_MAP[rawName] || rawName
          if (!depts[key]) depts[key] = { deptId: key, deptName: displayName, units: [] }
          depts[key].units.push(u)
        })
        return Object.values(depts).sort((a, b) => {
          if (a.deptName === 'Neumología') return -1
          if (b.deptName === 'Neumología') return 1
          return a.deptName.localeCompare(b.deptName, 'es')
        })
      })

      const getUnitActiveRotationCount = (id) => {
        const today = new Date(); today.setHours(0,0,0,0)
        return rotations.value.filter(r =>
          r.training_unit_id === id &&
          r.rotation_status === 'active' &&
          new Date(r.start_date + 'T00:00:00') <= today &&
          new Date(r.end_date   + 'T00:00:00') >= today
        ).length
      }

      const getUnitScheduledCount = (id) => {
        const today = new Date(); today.setHours(0,0,0,0)
        return rotations.value.filter(r =>
          r.training_unit_id === id &&
          r.rotation_status === 'scheduled' &&
          new Date(r.start_date + 'T00:00:00') > today
        ).length
      }

      // Check for future overlap conflicts: will scheduled + active exceed capacity at any point?
      const getUnitOverlapWarning = (id) => {
        const unit = trainingUnits.value.find(u => u.id === id)
        if (!unit) return null
        const maxSlots = unit.maximum_residents
        const upcoming = rotations.value.filter(r =>
          r.training_unit_id === id &&
          ['active','scheduled'].includes(r.rotation_status)
        )
        // Check each rotation's start date — how many others overlap at that moment?
        for (const rot of upcoming) {
          const checkDate = new Date(rot.start_date + 'T00:00:00')
          const concurrent = upcoming.filter(r =>
            new Date(r.start_date + 'T00:00:00') <= checkDate && new Date(r.end_date + 'T00:00:00') >= checkDate
          ).length
          if (concurrent > maxSlots) {
            return { date: rot.start_date, concurrent, max: maxSlots }
          }
        }
        return null
      }

      const getUnitRotations = (id) => rotations.value
        .filter(r => r.training_unit_id === id && ['active', 'scheduled'].includes(r.rotation_status))
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

      const getResidentShortName = (id) => {
        const s = allStaffLookup.value.find(x => x.id === id)
               || medicalStaff.value.find(x => x.id === id)
        if (!s) {
          // Last resort: use the joined resident object already on the rotation record
          const rot = rotations.value.find(r => r.resident_id === id)
          if (rot?.resident?.full_name) {
            const parts = rot.resident.full_name.trim().split(' ')
            return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : rot.resident.full_name
          }
          return '—'
        }
        const parts = (s.full_name || '').trim().split(' ')
        return parts.length > 1 ? `${parts[0]} ${parts[parts.length-1][0]}.` : s.full_name
      }

      // ── Timeline view state ─────────────────────────────────────────────
      const trainingUnitView    = ref('timeline')  // 'timeline' | 'detail'
      const trainingUnitHorizon = ref(6)            // months to show: 3 | 6 | 12

      // Generate the array of month objects for the timeline header
      const getTimelineMonths = (horizonMonths) => {
        const today = new Date()
        const months = []
        for (let i = 0; i < horizonMonths; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
          months.push({
            key:       `${d.getFullYear()}-${d.getMonth()}`,
            label:     d.toLocaleDateString('es-ES', { month: 'short', year: i === 0 || d.getMonth() === 0 ? '2-digit' : undefined }),
            year:      d.getFullYear(),
            month:     d.getMonth(),   // 0-based
            isCurrent: i === 0
          })
        }
        return months
      }

      // For each slot (1..max), compute monthly status across the horizon
      const getUnitSlots = (unitId, maxResidents, horizonMonths) => {
        // All active+scheduled rotations for this unit, sorted by start date
        const unitRots = rotations.value.filter(r =>
          r.training_unit_id === unitId && ['active','scheduled'].includes(r.rotation_status)
        ).sort((a,b) => new Date(a.start_date) - new Date(b.start_date))

        const months = getTimelineMonths(horizonMonths)

        // Assign rotations to physical slots using a greedy bin-packing algorithm
        // so sequential rotations reuse the same slot (e.g. Slot 1: R1 Jan-Mar, then R3 Apr-Jun)
        const slots = Array.from({ length: maxResidents }, () => ({ rotations: [] }))

        for (const rot of unitRots) {
          const rotStart = new Date(rot.start_date)
          const rotEnd   = new Date(rot.end_date)
          // Find first slot where no existing rotation overlaps this one
          const targetSlot = slots.find(slot =>
            slot.rotations.every(existing => {
              const eEnd = new Date(existing.end_date)
              const eStart = new Date(existing.start_date)
              return rotEnd < eStart || rotStart > eEnd  // no overlap
            })
          )
          if (targetSlot) targetSlot.rotations.push(rot)
          // If no slot available (over-capacity), rotation not shown — capacity exceeded
        }

        return slots.map((slot, slotIdx) => {
          // Build month-by-month data — may have multiple rotations covering different months
          const monthData = months.map(m => {
            const mStart = new Date(m.year, m.month, 1)
            const mEnd   = new Date(m.year, m.month + 1, 0)

            // Find which rotation (if any) covers this month
            const coveringRot = slot.rotations.find(rot => {
              const rotStart = new Date(rot.start_date)
              const rotEnd   = new Date(rot.end_date)
              return rotStart <= mEnd && rotEnd >= mStart
            })

            let status   = 'free'
            let tooltip  = `Slot ${slotIdx + 1} — ${m.label}: Available`
            let showName = false
            let initials = null
            let residentName = null

            if (coveringRot) {
              residentName = getResidentShortName(coveringRot.resident_id)
              initials     = residentName !== '—'
                ? residentName.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()
                : '?'
              const rotStart = new Date(coveringRot.start_date)
              const rotEnd   = new Date(coveringRot.end_date)
              const fullMonth = rotStart <= mStart && rotEnd >= mEnd
              status    = fullMonth ? 'occupied' : 'partial'
              showName  = fullMonth
              const fmtStart = rotStart.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})
              const fmtEnd   = rotEnd.toLocaleDateString('es-ES',{day:'2-digit',month:'short'})
              tooltip = `${residentName} · ${fmtStart} → ${fmtEnd}`
            }

            return { key: m.key, label: m.label, year: m.year, month: m.month, isCurrent: m.isCurrent, status, tooltip, showName, initials }
          })

          // Primary resident for the slot label (current/first active rotation)
          const primaryRot = slot.rotations.find(r => r.rotation_status === 'active') || slot.rotations[0]
          const primaryName = primaryRot ? getResidentShortName(primaryRot.resident_id) : null
          const primaryInitials = primaryName && primaryName !== '—'
            ? primaryName.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()
            : null

          return {
            slotIdx,
            residentId:   primaryRot?.resident_id || null,
            residentName: primaryName,
            initials:     primaryInitials,
            rotationCount: slot.rotations.length,
            months: monthData
          }
        })
      }

      // Days until a rotation ends (for "Free in Xd" chip)
      const getDaysUntilFree = (endDate) => {
        const today = new Date(); today.setHours(0,0,0,0)
        const end   = new Date(Utils.normalizeDate(endDate) + 'T00:00:00')
        return Math.ceil((end - today) / (1000 * 60 * 60 * 24))
      }

      // ── Timeline cell popover ─────────────────────────────────────────
      const tlPopover = reactive({ show: false, unitName: '', slotIdx: 0, monthLabel: '', entries: [], x: 0, y: 0 })

      const openCellPopover = (event, unitId, unitName, slot, month) => {
        event.stopPropagation()
        // Collect ALL rotations in this slot that touch this month
        const mStart = new Date(month.year, month.month, 1)
        const mEnd   = new Date(month.year, month.month + 1, 0)
        // Get all rotations for this unit to find ones in this slot and month
        const unitRots = rotations.value.filter(r =>
          r.training_unit_id === unitId && ['active','scheduled'].includes(r.rotation_status)
        )
        // We need the same slot assignment as getUnitSlots — find rotations assigned to this slotIdx
        // Use greedy bin-packing identical to getUnitSlots
        const allSlots = Array.from({ length: 20 }, () => ({ rotations: [] }))
        const sorted = [...unitRots].sort((a,b) => new Date(a.start_date) - new Date(b.start_date))
        for (const rot of sorted) {
          const rotStart = new Date(rot.start_date)
          const rotEnd   = new Date(rot.end_date)
          const target = allSlots.find(s => s.rotations.every(e => {
            const eEnd = new Date(e.end_date); const eStart = new Date(e.start_date)
            return rotEnd < eStart || rotStart > eEnd
          }))
          if (target) target.rotations.push(rot)
        }
        const slotRots = allSlots[slot.slotIdx]?.rotations || []
        // Filter to those touching this month
        const touching = slotRots.filter(rot => {
          const s = new Date(rot.start_date); const e = new Date(rot.end_date)
          return s <= mEnd && e >= mStart
        })
        const fmt = (d) => new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'2-digit' })
        const entries = touching.length
          ? touching.map(rot => ({
              name: getResidentShortName(rot.resident_id),
              start: fmt(rot.start_date),
              end:   fmt(rot.end_date),
              status: rot.rotation_status,
              partial: new Date(rot.start_date) > mStart || new Date(rot.end_date) < mEnd
            }))
          : [{ name: '—', start: null, end: null, status: 'free', partial: false }]
        // Position near the clicked cell
        const rect = event.currentTarget.getBoundingClientRect()
        tlPopover.show = true
        tlPopover.unitName = unitName
        tlPopover.slotIdx = slot.slotIdx + 1
        tlPopover.monthLabel = month.label
        tlPopover.entries = entries
        const popoverWidth = 300
        const popoverHeight = 120 // conservative estimate
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const left = rect.left + popoverWidth > viewportWidth
          ? Math.max(4, rect.right - popoverWidth)
          : rect.left
        const top = rect.bottom + popoverHeight > viewportHeight
          ? rect.top - popoverHeight - 4
          : rect.bottom + 6
        tlPopover.x = left
        tlPopover.y = top
      }
      const closeCellPopover = () => { tlPopover.show = false }

      // ── Units Occupancy Panel ─────────────────────────────────────────────
      const occupancyPanel   = reactive({ show: false })
      const unitDetailDrawer = reactive({ show: false, unit: null })

      const getUnitMonthOccupancy = (unitId, year, month) => {
        const mStart = new Date(year, month, 1)
        const mEnd   = new Date(year, month + 1, 0)
        const unit   = trainingUnits.value.find(u => u.id === unitId)
        if (!unit) return { status: 'free', occupied: 0, scheduled: 0, total: 0 }
        const maxSlots = unit.maximum_residents
        const touching = rotations.value.filter(r =>
          r.training_unit_id === unitId &&
          ['active','scheduled'].includes(r.rotation_status) &&
          new Date(r.start_date + 'T00:00:00') <= mEnd && new Date(r.end_date + 'T00:00:00') >= mStart
        )
        // Separate truly active (date range covers any day in month) from scheduled future
        const today = new Date(); today.setHours(0,0,0,0)
        const isCurrentMonth = mStart <= today && mEnd >= today
        const active    = isCurrentMonth
          ? touching.filter(r => r.rotation_status === 'active' && new Date(r.start_date + 'T00:00:00') <= today && new Date(r.end_date + 'T00:00:00') >= today).length
          : touching.filter(r => ['active','scheduled'].includes(r.rotation_status)).length
        const scheduled = touching.filter(r => r.rotation_status === 'scheduled').length
        const occupied  = isCurrentMonth ? active : touching.length
        if (occupied === 0) return { status: 'free', occupied: 0, total: maxSlots }
        const isClosing = touching.some(r => {
          const e = new Date(r.end_date + 'T00:00:00')
          return e.getFullYear() === year && e.getMonth() === month && e < mEnd
        })
        if (occupied >= maxSlots) return { status: isClosing ? 'closing' : 'occupied', occupied, total: maxSlots }
        return { status: isClosing ? 'closing' : 'partial', occupied, total: maxSlots }
      }

      const getNextFreeMonth = (unitId) => {
        const today = new Date()
        const unit  = trainingUnits.value.find(u => u.id === unitId)
        if (!unit) return null
        for (let i = 0; i < 24; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
          const occ = getUnitMonthOccupancy(unitId, d.getFullYear(), d.getMonth())
          if (occ.occupied < occ.total) {
            return {
              label:      d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
              shortLabel: d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
              date:       `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`,
              monthsAway: i,
              freeSlots:  occ.total - occ.occupied
            }
          }
        }
        return null
      }

      const occupancyHeatmap = computed(() => {
        const today = new Date()
        const activeUnits = trainingUnits.value.filter(u => u.unit_status === 'active')
        return Array.from({ length: 12 }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
          let free = 0, partial = 0, closing = 0, full = 0
          for (const u of activeUnits) {
            const occ = getUnitMonthOccupancy(u.id, d.getFullYear(), d.getMonth())
            if      (occ.status === 'free')    free++
            else if (occ.status === 'closing') closing++
            else if (occ.status === 'partial') partial++
            else                               full++
          }
          return {
            key: `${d.getFullYear()}-${d.getMonth()}`,
            label: d.toLocaleDateString('es-ES', { month: 'short' }),
            yearLabel: (i === 0 || d.getMonth() === 0) ? `'${d.getFullYear().toString().slice(-2)}` : '',
            isCurrent: i === 0,
            free, partial, closing, full, total: activeUnits.length
          }
        })
      })

      const occupancyPanelUnits = computed(() => {
        const today = new Date()
        return trainingUnits.value
          .filter(u => u.unit_status === 'active')
          .map(u => {
            const occ      = getUnitMonthOccupancy(u.id, today.getFullYear(), today.getMonth())
            const nextFree = getNextFreeMonth(u.id)
            return { ...u, occ, nextFree }
          })
          .sort((a, b) => {
            const order = { free: 0, closing: 1, partial: 2, occupied: 3 }
            const diff  = (order[a.occ.status] ?? 4) - (order[b.occ.status] ?? 4)
            if (diff !== 0) return diff
            return (a.nextFree?.monthsAway ?? 99) - (b.nextFree?.monthsAway ?? 99)
          })
      })

      const openUnitDetail = (unit) => {
        const today = new Date()
        const occ      = getUnitMonthOccupancy(unit.id, today.getFullYear(), today.getMonth())
        const nextFree = getNextFreeMonth(unit.id)
        unitDetailDrawer.unit = { ...unit, occ, nextFree }
        unitDetailDrawer.show = true
      }

      const loadTrainingUnits = async () => {
        try {
          trainingUnits.value = await API.getTrainingUnits()
          // Pre-load attending staff for all active units (non-blocking, fills unitStaffCache)
          trainingUnits.value
            .filter(u => u.unit_status !== 'inactive')
            .forEach(u => loadUnitStaff(u.id))
        }
        catch { showToast('Error', 'Failed to load training units', 'error') }
      }

      const showAddTrainingUnitModal = (opts = {}) => {
        trainingUnitModal.mode = 'add'
        Object.assign(trainingUnitModal.form, {
          unit_name: '', unit_code: '',
          department_id: opts.department_id || '',
          maximum_residents: 2, unit_status: 'active',
          unit_type: 'clinical_unit', supervising_attending_id: '',
          unit_description: '', specialty: '', location_building: '', location_floor: ''
        })
        trainingUnitModal.show = true
      }
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
            try {
              await API.deleteTrainingUnit(unit.id)
              // Backend soft-deletes (sets unit_status = 'inactive') — remove from active list locally
              trainingUnits.value = trainingUnits.value.filter(u => u.id !== unit.id)
              showToast('Deactivated', `${unit.unit_name} deactivated`, 'success')
            } catch (e) {
              showToast('Error', e?.message || 'Failed to deactivate training unit', 'error')
              try { trainingUnits.value = await API.getTrainingUnits() } catch {}
            }
          }
        })
      }

      const openUnitClinicians = (unit, allStaff) => {
        unitCliniciansModal.unit = unit
        // Pre-populate from unitStaffCache (the new source of truth)
        const cachedStaff = unitStaffCache.value[unit.id] || []
        unitCliniciansModal.clinicians = cachedStaff.map(m => m.staff?.id).filter(Boolean)
        unitCliniciansModal.supervisorId = unit.supervisor_id || unit.supervising_attending_id || ''
        // Filter to same-department attendings/fellows only
        // If unit has a department_id, only show staff from that department
        const deptFilter = unit.department_id
          ? s => s.department_id === unit.department_id
          : () => true
        unitCliniciansModal.allStaff = allStaff.filter(s =>
          (staffTypeMap.value[s.staff_type]?.can_supervise ||
           ['attending_physician','fellow'].includes(s.staff_type)) &&
          s.employment_status === 'active' &&
          deptFilter(s)
        )
        unitCliniciansModal.show = true
      }

      // Open clinicians modal from dept panel attending row — assign attending to a unit
      const assignAttendingToUnit = (staff) => {
        // Find all units in the same department as this attending
        const deptUnits = trainingUnits.value.filter(u =>
          u.department_id === staff.department_id && u.unit_status === 'active'
        )
        if (deptUnits.length === 0) {
          showToast('No Units', 'No active units in this department', 'warning')
          return
        }
        // If attending already supervises a unit, open that unit's clinicians modal
        const currentUnit = deptUnits.find(u => u.supervisor_id === staff.id)
        const targetUnit = currentUnit || deptUnits[0]
        // Pre-select this attending
        unitCliniciansModal.unit = targetUnit
        unitCliniciansModal.clinicians = (unitStaffCache.value[targetUnit.id] || []).map(m => m.staff?.id).filter(Boolean)
        unitCliniciansModal.supervisorId = staff.id  // pre-select this attending
        const deptFilter = targetUnit.department_id
          ? s => s.department_id === targetUnit.department_id
          : () => true
        unitCliniciansModal.allStaff = medicalStaff.value.filter(s =>
          (staffTypeMap.value[s.staff_type]?.can_supervise ||
           ['attending_physician','fellow'].includes(s.staff_type)) &&
          s.employment_status === 'active' &&
          deptFilter(s)
        )
        unitCliniciansModal.show = true
      }

      const saveUnitClinicians = async () => {
        const u = unitCliniciansModal.unit
        if (!u?.id) { showToast('Error', 'No unit selected', 'error'); return }
        try {
          // 1. Update the unit's designated supervisor (backward compat field)
          const payload = {
            unit_name: u.unit_name, unit_code: u.unit_code, department_id: u.department_id,
            maximum_residents: u.maximum_residents || 5, unit_status: u.unit_status || 'active',
          }
          if (unitCliniciansModal.supervisorId) payload.supervising_attending_id = unitCliniciansModal.supervisorId
          if (u.specialty)         payload.specialty         = u.specialty
          if (u.location_building) payload.location_building = u.location_building
          if (u.location_floor)    payload.location_floor    = u.location_floor
          await API.updateTrainingUnit(u.id, payload)

          // 2. Sync clinical team to unit_staff table
          const selectedIds  = unitCliniciansModal.clinicians || []
          const currentStaff = unitStaffCache.value[u.id] || []
          const currentIds   = currentStaff.map(m => m.staff?.id).filter(Boolean)

          // Add newly selected clinicians
          const toAdd = selectedIds.filter(id => !currentIds.includes(id))
          await Promise.all(toAdd.map(staffId =>
            API.request(`/api/training-units/${u.id}/staff`, {
              method: 'POST',
              body: JSON.stringify({ staff_id: staffId, role: staffId === unitCliniciansModal.supervisorId ? 'primary' : 'secondary' })
            }).catch(() => null)  // ignore 409 duplicates
          ))

          // Remove deselected clinicians
          const toRemove = currentIds.filter(id => !selectedIds.includes(id))
          await Promise.all(toRemove.map(staffId =>
            API.request(`/api/training-units/${u.id}/staff/${staffId}`, { method: 'DELETE' }).catch(() => null)
          ))

          // Refresh cache for this unit
          await loadUnitStaff(u.id)

          // Update local trainingUnits record
          const idx = trainingUnits.value.findIndex(x => x.id === u.id)
          if (idx !== -1) {
            trainingUnits.value[idx] = {
              ...trainingUnits.value[idx],
              supervising_attending_id: unitCliniciansModal.supervisorId || null,
              supervisor_id: unitCliniciansModal.supervisorId || null,
            }
          }
          unitCliniciansModal.show = false
          showToast('Saved', `Clinical team updated · ${selectedIds.length} clinician${selectedIds.length !== 1 ? 's' : ''}`, 'success')
        } catch(e) { showToast('Error', e?.message || 'Failed to save unit staff', 'error') }
      }

      const viewUnitResidents = (unit, allRotations) => {
        unitResidentsModal.unit = unit
        unitResidentsModal.rotations = allRotations.filter(r => r.training_unit_id === unit.id && ['active', 'scheduled'].includes(r.rotation_status))
        unitResidentsModal.show = true
      }

      const saveTrainingUnit = async (saving, deptLookup) => {
        const f = trainingUnitModal.form
        if (!f.unit_name?.trim()) { showToast('Validation Error', 'Unit name is required', 'error'); return }
        if (!f.unit_code?.trim()) { showToast('Validation Error', 'Unit code is required', 'error'); return }
        if (!f.department_id) { showToast('Validation Error', 'Please select a department / service', 'error'); return }
        if (!f.maximum_residents || f.maximum_residents < 1) { showToast('Validation Error', 'Maximum residents must be at least 1', 'error'); return }
        saving.value = true
        try {
          // Exact fields from backend Joi trainingUnit schema — nothing more, nothing less
          // department_name is NOT NULL in schema — derive from departments list
          const deptRecord = deptLookup?.value?.find(d => d.id === f.department_id) || null
          const data = {
            unit_name: f.unit_name.trim(),
            unit_code: f.unit_code.trim().toUpperCase(),
            department_id: f.department_id || null,
            department_name: deptRecord?.name || f.department_name || 'Pulmonology',
            maximum_residents: parseInt(f.maximum_residents) || 5,
            unit_status: f.unit_status || 'active',
            unit_type: f.unit_type || 'training_unit',
            unit_description: f.unit_description || '',
            specialty: f.specialty || '',
            location_building: f.location_building || '',
            location_floor: f.location_floor || '',
            supervisor_id: f.supervising_attending_id || null,
            supervising_attending_id: f.supervising_attending_id || null,
          }
          if (trainingUnitModal.mode === 'add') { trainingUnits.value.unshift(await API.createTrainingUnit(data)); showToast('Success', 'Training unit created', 'success') }
          else { const result = await API.updateTrainingUnit(f.id, data); const idx = trainingUnits.value.findIndex(u => u.id === result.id); if (idx !== -1) trainingUnits.value[idx] = result; showToast('Success', 'Training unit updated', 'success') }
          trainingUnitModal.show = false
        } catch (e) { showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
        finally { saving.value = false }
      }

      return { trainingUnits, trainingUnitFilters, trainingUnitModal, unitsByDepartment, unitResidentsModal, unitCliniciansModal, filteredTrainingUnits, getUnitActiveRotationCount, getUnitRotations, getUnitScheduledCount, getUnitOverlapWarning, getResidentShortName, loadTrainingUnits, showAddTrainingUnitModal, editTrainingUnit, deleteTrainingUnit, openUnitClinicians, saveUnitClinicians, assignAttendingToUnit, viewUnitResidents, saveTrainingUnit, trainingUnitView, trainingUnitHorizon, getTimelineMonths, getUnitSlots, getDaysUntilFree, tlPopover, openCellPopover, closeCellPopover, unitStaffCache, loadUnitStaff, getUnitAttendingCount, addStaffToUnit, removeStaffFromUnit,
        occupancyPanel, unitDetailDrawer, occupancyHeatmap, occupancyPanelUnits, getUnitMonthOccupancy, getNextFreeMonth, openUnitDetail }
    }

    // ============ 6.9 useComms ============
    function useComms({ showToast, showConfirmation }) {
      const announcements  = ref([])
      const opsMetrics     = Vue.ref([])
      const opsLoading     = Vue.ref(false)
      const briefingForm   = Vue.reactive({
        show: false,
        fields: {
          interconsultas_total:         { label: 'Interconsultas',      sub_label: 'urgentes', value: '', sub: '' },
          er_patients_waiting:          { label: 'ER — Neumología',     sub_label: 'espera media (min)', value: '', sub: '' },
          beds_free_total:              { label: 'Camas libres',        sub_label: 'de las cuales UCI', value: '', sub: '' },
          discharges_pending_total:     { label: 'Altas pendientes',    sub_label: 'esperando informe', value: '', sub: '' },
          bronchoscopies_urgent:        { label: 'Broncoscopias urg.',  sub_label: 'suite libre desde (hora)', value: '', sub: '' },
        }
      })

      const loadOpsMetrics = async () => {
        opsLoading.value = true
        try {
          const res = await API.getOpsMetrics()
          opsMetrics.value = res?.data || []
        } catch(e) { opsMetrics.value = [] }
        finally { opsLoading.value = false }
      }

      const getMetric = (key) => opsMetrics.value.find(m => m.metric_key === key)
      const metricVal = (key) => getMetric(key)?.metric_value ?? null
      const metricSub = (key) => getMetric(key)?.metric_sub ?? null
      const metricVal2 = (key) => getMetric(key)?.metric_value2 ?? null

      const saveDailyBriefing = async (saving) => {
        if (saving?.value) return
        if (saving) saving.value = true
        try {
          const rows = []
          for (const [key, field] of Object.entries(briefingForm.fields)) {
            if (field.value !== '' && field.value !== null) {
              rows.push({
                metric_key:   key,
                metric_value: parseInt(field.value) || 0,
                metric_sub:   field.sub || null,
                metric_value2: null,
              })
            }
          }
          if (!rows.length) { showToast('Validation', 'Enter at least one number', 'warning'); return }
          await API.postOpsMetrics(rows)
          briefingForm.show = false
          showToast('Briefing posted', 'Pulse tiles updated for the team', 'success')
          await loadOpsMetrics()
        } catch(e) { showToast('Error', e.message || 'Failed to post briefing', 'error') }
        finally { if (saving) saving.value = false }
      }

      const updateMetricInline = async (key, value, sub = null) => {
        try {
          await API.postOpsMetrics([{ metric_key: key, metric_value: parseInt(value)||0, metric_sub: sub }])
          await loadOpsMetrics()
        } catch(e) { showToast('Error', 'Failed to update', 'error') }
      }

      const communicationsFilters = reactive({ search: '', priority: '', audience: '', type: '' })

      // ── Ops Room state ──────────────────────────────────────────
      const broadcastForm  = Vue.reactive({ show: false, type: 'broadcast', text: '', expiryHours: 4 })
      const feedFilter     = Vue.ref('all')   // all | broadcast | protocol | announcement | kudos

      // Live broadcast = announcements with priority 'urgent' that haven't expired
      const livebroadcasts = Vue.computed(() =>
        (announcements.value || []).filter(a => {
          if (a.priority_level !== 'urgent') return false
          if (!a.publish_end_date) return true
          return new Date(a.publish_end_date) > new Date()
        }).slice(0, 3)
      )

      // Feed = all non-expired announcements ordered by created_at desc
      const feedItems = Vue.computed(() => {
        let items = (announcements.value || []).slice()
        if (feedFilter.value !== 'all') {
          items = items.filter(a => (a.type || 'announcement') === feedFilter.value)
        }
        return items.slice(0, 30)
      })

      // Pulse stats derived from existing data
      const commsPulse = Vue.computed(() => {
        const today = new Date()
        const todayStr = today.toISOString().slice(0, 10)
        const onDuty = (medicalStaff?.value || []).filter(s => s.employment_status === 'active').length
        const onCall = (onCallSchedule?.value || []).filter(s => {
          const d = s.duty_date ? Utils.normalizeDate(s.duty_date) : ''
          return d === todayStr
        }).length
        const absent = (absences?.value || []).filter(a => {
          const s = Utils.normalizeDate(a.start_date)
          const e = Utils.normalizeDate(a.end_date)
          return todayStr >= s && todayStr <= e && a.current_status === 'currently_absent'
        }).length
        const activeBroadcasts = livebroadcasts.value.length
        return { onDuty, onCall, absent, activeBroadcasts }
      })

      const broadcastTypeConfig = {
        broadcast:    { label: 'Broadcast', color: '#ef4444', bg: 'rgba(239,68,68,.08)',   barColor: '#ef4444' },
        protocol:     { label: 'Protocol',  color: '#10b981', bg: 'rgba(16,185,129,.08)', barColor: '#10b981' },
        announcement: { label: 'Announcement', color: '#94a3b8', bg: 'rgba(148,163,184,.08)', barColor: '#94a3b8' },
        kudos:        { label: 'Recognition', color: '#0ea5e9', bg: 'rgba(14,165,233,.08)', barColor: '#0ea5e9' },
      }

      const getAnnouncementType = (a) => {
        if (a.priority_level === 'urgent') return 'broadcast'
        if (a.type) return a.type
        if (a.priority_level === 'high') return 'protocol'
        return 'announcement'
      }

      const openBroadcastForm = (type = 'broadcast') => {
        broadcastForm.show   = true
        broadcastForm.type   = type
        broadcastForm.text   = ''
        broadcastForm.expiryHours = type === 'broadcast' ? 4 : type === 'kudos' ? 168 : 72
      }

      const submitBroadcast = async (saving) => {
        if (!broadcastForm.text.trim()) { showToast('Validation', 'Message is required', 'warning'); return }
        if (saving?.value) return
        if (saving) saving.value = true
        try {
          const typeMap = {
            broadcast:    { priority_level: 'urgent',  type: 'broadcast'    },
            protocol:     { priority_level: 'high',    type: 'protocol'     },
            announcement: { priority_level: 'normal',  type: 'announcement' },
            kudos:        { priority_level: 'low',     type: 'kudos'        },
          }
          const cfg = typeMap[broadcastForm.type] || typeMap.announcement
          const endDate = new Date(Date.now() + broadcastForm.expiryHours * 3600000)
          await API.createAnnouncement({
            title:            broadcastForm.text.slice(0, 100),
            content:          broadcastForm.text,
            priority_level:   cfg.priority_level,
            type:             cfg.type,
            target_audience:  'all_staff',
            publish_start_date: new Date().toISOString().slice(0,10),
            publish_end_date:   endDate.toISOString().slice(0,10),
          })
          broadcastForm.show = false
          showToast('Posted', `${broadcastTypeConfig[broadcastForm.type]?.label || 'Message'} sent to department`, 'success')
          await loadAnnouncements()
        } catch(e) { showToast('Error', e.message || 'Failed to post', 'error') }
        finally { if (saving) saving.value = false }
      }

      const dismissBroadcast = async (announcement) => {
        // Mark as read locally; optionally call API to record seen
        const idx = announcements.value.findIndex(a => a.id === announcement.id)
        if (idx !== -1) announcements.value[idx] = { ...announcements.value[idx], _dismissed: true }
      }
      const communicationsModal = reactive({
        show: false, activeTab: 'announcement', mode: 'add',
        form: { id: null, title: '', content: '', priority: 'normal', target_audience: 'all_staff', target_department_id: '', updateType: 'daily', dailySummary: '', highlight1: '', highlight2: '', alerts: { erBusy: false, icuFull: false, wardFull: false, staffShortage: false }, metricName: '', metricValue: '', metricTrend: 'stable', metricChange: '', metricNote: '', alertLevel: 'low', alertMessage: '', affectedAreas: { er: false, icu: false, ward: false, surgery: false } }
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
        communicationsModal.mode = 'add'
        communicationsModal.show = true; communicationsModal.activeTab = 'announcement'
        Object.assign(communicationsModal.form, { id: null, title: '', content: '', priority: 'normal', target_audience: 'all_staff', updateType: 'daily', dailySummary: '', highlight1: '', highlight2: '', alerts: { erBusy: false, icuFull: false, wardFull: false, staffShortage: false }, metricName: '', metricValue: '', metricTrend: 'stable', metricChange: '', metricNote: '', alertLevel: 'low', alertMessage: '', affectedAreas: { er: false, icu: false, ward: false, surgery: false } })
      }

      const editAnnouncement = (ann) => {
        communicationsModal.mode = 'edit'
        communicationsModal.activeTab = 'announcement'
        Object.assign(communicationsModal.form, { id: ann.id, title: ann.title || '', content: ann.content || '', priority: ann.priority_level || 'normal', target_audience: ann.target_audience || 'all_staff' })
        communicationsModal.show = true
      }

      const announcementReadModal = reactive({ show: false, announcement: null })
      const viewAnnouncement = (a) => { announcementReadModal.announcement = a; announcementReadModal.show = true }

      const saveCommunication = async (saving, saveClinicalStatus) => {
        // Validate before setting loading — better UX
        if (communicationsModal.activeTab === 'announcement') {
          const f = communicationsModal.form
          if (!f.title?.trim()) { showToast('Validation Error', 'Title is required', 'error'); return }
          if (!f.content?.trim()) { showToast('Validation Error', 'Content is required', 'error'); return }
        }
        saving.value = true
        try {
          if (communicationsModal.activeTab === 'announcement') {
            const f = communicationsModal.form
            const payload = { title: f.title, content: f.content, priority_level: f.priority, target_audience: f.target_audience || 'all_staff', type: 'announcement' }
            if (communicationsModal.mode === 'edit' && f.id) {
              const result = await API.updateAnnouncement(f.id, payload)
              const idx = announcements.value.findIndex(a => a.id === f.id)
              if (idx !== -1) announcements.value[idx] = result
              showToast('Success', 'Announcement updated', 'success')
            } else {
              announcements.value.unshift(await API.createAnnouncement(payload))
              showToast('Success', 'Announcement posted', 'success')
            }
          } else { await saveClinicalStatus() }
          communicationsModal.show = false
        } catch (e) { showToast('Error', e?.message || 'An unexpected error occurred', 'error') }
        finally { saving.value = false }
      }

      const deleteAnnouncement = (ann) => showConfirmation({
        title: 'Delete Announcement', message: `Delete "${ann.title}"?`,
        icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger',
        onConfirm: async () => {
          try {
            await API.deleteAnnouncement(ann.id)
            announcements.value = announcements.value.filter(a => a.id !== ann.id)
            showToast('Success', 'Announcement deleted', 'success')
          } catch (e) {
            showToast('Error', e?.message || 'Failed to delete announcement', 'error')
          }
        }
      })

      return { announcements, communicationsFilters, communicationsModal, announcementReadModal, filteredAnnouncements, recentAnnouncements, unreadAnnouncements, loadAnnouncements, loadOpsMetrics, opsMetrics, opsLoading, briefingForm, getMetric, metricVal, metricSub, metricVal2, saveDailyBriefing, updateMetricInline, broadcastForm, feedFilter, livebroadcasts, feedItems, commsPulse, broadcastTypeConfig, getAnnouncementType, openBroadcastForm, submitBroadcast, dismissBroadcast, showCommunicationsModal, editAnnouncement, viewAnnouncement, saveCommunication, deleteAnnouncement }
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
            const found = currentUser.value?.email ? activeMedicalStaff.value.find(s => s.professional_email === currentUser.value.email) : null
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
      const researchLines         = ref([])
      const clinicalTrials        = ref([])
      const innovationProjects    = ref([])
                        const researchLineFilters = reactive({ search: '', active: '' })
      const trialFilters = reactive({ line: '', phase: '', status: '', search: '' })
      const projectFilters = reactive({ research_line_id: '', category: '', stage: '', funding_status: '', search: '' })

      const researchLineModal = reactive({ show: false, mode: 'add', form: { line_number: null, name: '', description: '', capabilities: 'Alcance y capacidades', sort_order: 0, active: true } })
      const clinicalTrialModal = reactive({ show: false, mode: 'add', form: { protocol_id: '', title: '', research_line_id: '', phase: 'Phase III', status: 'Reclutando', description: '', inclusion_criteria: '', exclusion_criteria: '', principal_investigator_id: '', co_investigators: [], sub_investigators: [], contact_email: '', featured_in_website: true, display_order: 0, start_date: '', end_date: '' } })
      const trialDetailModal = reactive({ show: false, trial: null, study: null })
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

      const researchLoading = ref(false)

      const loadResearchLines = async () => { try { researchLines.value = await API.getResearchLines() } catch { } }
      const loadClinicalTrials = async () => { try { clinicalTrials.value = await API.getAllClinicalTrials() } catch { } }
      const loadInnovationProjects = async () => { try { innovationProjects.value = await API.getAllInnovationProjects() } catch { } }

      // Load all three research datasets together — used by on-demand navigation
      const loadAllResearch = async () => {
        if (researchLoading.value) return  // already in flight
        researchLoading.value = true
        try {
          await Promise.all([
            loadResearchLines(),
            loadClinicalTrials(),
            loadInnovationProjects()
          ])
        } finally {
          researchLoading.value = false
        }
      }

      const showAddResearchLineModal = () => { clearAll('research'); researchLineModal.mode = 'add'; Object.assign(researchLineModal.form, { line_number: researchLines.value.length + 1, name: '', description: '', capabilities: '', sort_order: researchLines.value.length + 1, active: true, keywords: [], keywordsInput: '' }); researchLineModal.show = true }
      const showAddTrialModal = (line = null) => { clinicalTrialModal.mode = 'add'; Object.assign(clinicalTrialModal.form, { protocol_id: `HUAC-${Date.now().toString().slice(-6)}`, title: '', research_line_id: line?.id || '', phase: 'Phase III', status: 'Reclutando', description: '', inclusion_criteria: '', exclusion_criteria: '', principal_investigator_id: '', co_investigators: [], sub_investigators: [], contact_email: '', featured_in_website: true, display_order: clinicalTrials.value.length + 1, start_date: '', end_date: '' }); clinicalTrialModal.show = true }
      const showAddProjectModal = (line = null) => { innovationProjectModal.mode = 'add'; Object.assign(innovationProjectModal.form, { title: '', category: 'Dispositivo', current_stage: 'Idea', description: '', clinical_rationale: '', research_line_id: line?.id || '', lead_investigator_id: '', co_investigators: [], partner_needs: [], partner_found: false, partner_name: '', funding_status: 'not_applicable', keywords: [], keywordsInput: '', featured_in_website: true, display_order: innovationProjects.value.length + 1 }); innovationProjectModal.show = true }

      const openAssignCoordinatorModal = (line) => { assignCoordinatorModal.lineId = line.id; assignCoordinatorModal.lineName = line.research_line_name || line.name; assignCoordinatorModal.selectedCoordinatorId = line.coordinator_id || ''; assignCoordinatorModal.show = true }
      const editResearchLine = (l) => { researchLineModal.mode = 'edit'; researchLineModal.form = { ...l, research_line_name: l.research_line_name || l.name || '', keywordsInput: Array.isArray(l.keywords) ? l.keywords.join(', ') : (l.keywordsInput || '') }; researchLineModal.show = true }
      const editTrial = (t) => {
        clinicalTrialModal.mode = 'edit'
        // C3 FIX: preserve display_order from the stored record, not reset to list length
        clinicalTrialModal.form = {
          ...t,
          end_date:          t.end_date || t.estimated_end_date || '',
          start_date:        t.start_date || '',
          co_investigators:  Array.isArray(t.co_investigators)  ? [...t.co_investigators]  : (t.co_investigator_id  ? [t.co_investigator_id]  : []),
          sub_investigators: Array.isArray(t.sub_investigators) ? [...t.sub_investigators] : (t.sub_investigator_id ? [t.sub_investigator_id] : [])
        }
        clinicalTrialModal.show = true
      }
      const editProject = (p) => { innovationProjectModal.mode = 'edit'; const coI = Array.isArray(p.co_investigators) && p.co_investigators.length ? p.co_investigators : (Array.isArray(p.co_leads) ? p.co_leads : []); const kws = Array.isArray(p.keywords) && p.keywords.length ? p.keywords : (Array.isArray(p.tags) ? p.tags : []); innovationProjectModal.form = { ...p, current_stage: p.current_stage || p.development_stage || 'Idea', partner_needs: Array.isArray(p.partner_needs) ? [...p.partner_needs] : [], co_investigators: [...coI], keywords: [...kws], keywordsInput: kws.length ? kws.join(', ') : '', partner_found: p.partner_found || false, partner_name: p.partner_name || '', funding_status: p.funding_status || 'not_applicable', clinical_rationale: p.clinical_rationale || '' }; innovationProjectModal.show = true }
      const viewTrial = (t) => { trialDetailModal.trial = t; trialDetailModal.study = t; trialDetailModal.show = true }

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
        if (!f.title?.trim()) { showToast('Validation Error', 'Trial title is required', 'error'); return }
        if (!f.principal_investigator_id) { showToast('Validation Error', 'Principal investigator is required', 'error'); return }
        // FIX 8: date relationship validation
        if (f.start_date && f.end_date && f.end_date < f.start_date) { showToast('Validation Error', 'End date cannot be before start date', 'error'); return }
        saving.value = true
        try {
          const payload = { ...f }
          // Mirror end_date → estimated_end_date so both DB columns stay in sync
          if (payload.end_date) payload.estimated_end_date = payload.end_date
          delete payload.co_investigator_id // legacy field
          delete payload.sub_investigator_id // legacy field
          if (clinicalTrialModal.mode === 'add') { clinicalTrials.value.unshift(await API.createClinicalTrial(payload)); showToast('Success', 'Clinical study created', 'success') }
          else { const result = await API.updateClinicalTrial(payload.id, payload); const idx = clinicalTrials.value.findIndex(t => t.id === result.id); if (idx !== -1) clinicalTrials.value[idx] = result; showToast('Success', 'Clinical study updated', 'success') }
          clinicalTrialModal.show = false; await loadClinicalTrials(); loadAnalyticsSummary()
        } catch (e) { showToast('Error', e?.message || 'Failed to save study', 'error') }
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
          // m3 FIX: removed legacy co_leads/tags mirroring — backend B6 whitelist
          // no longer passes these through to Supabase, so mirroring was silently dropped anyway.
          // co_investigators and keywords are sent directly under their correct column names.
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
      const deleteClinicalTrial = (trial) => showConfirmation({ title: 'Delete Study', message: `Delete "${trial.title}"?`, icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger', details: `Protocol: ${trial.protocol_id}`, onConfirm: async () => { await API.deleteClinicalTrial(trial.id); await loadClinicalTrials(); showToast('Success', 'Study deleted', 'success'); loadAnalyticsSummary() } })
      const deleteInnovationProject = (project) => showConfirmation({ title: 'Delete Project', message: `Delete "${project.title}"?`, icon: 'fa-trash', confirmButtonText: 'Delete', confirmButtonClass: 'btn-danger', onConfirm: async () => { await API.deleteInnovationProject(project.id); await loadInnovationProjects(); showToast('Success', 'Project deleted', 'success'); loadAnalyticsSummary(); loadPartnerCollaborations() } })

      // ── Quick research profile built entirely from local refs (no API call) ──
      const getStaffResearchQuick = (staffId) => {
        if (!staffId) return null
        const coordinatorLines = researchLines.value.filter(l => l.coordinator_id === staffId)
        const trialsAsPI  = clinicalTrials.value.filter(t => t.principal_investigator_id === staffId)
        const trialsAsCoI = clinicalTrials.value.filter(t => (t.co_investigators || []).includes(staffId))
        const trialsAsSub = clinicalTrials.value.filter(t => (t.sub_investigators || []).includes(staffId))
        const projectsAsLead = innovationProjects.value.filter(p => p.lead_investigator_id === staffId)
        const projectsAsCoI  = innovationProjects.value.filter(p => (p.co_investigators || []).includes(staffId))

        const allTrials = [...new Map([...trialsAsPI, ...trialsAsCoI, ...trialsAsSub].map(t => [t.id, t])).values()]
        const allProjects = [...new Map([...projectsAsLead, ...projectsAsCoI].map(p => [p.id, p])).values()]

        if (!coordinatorLines.length && !allTrials.length && !allProjects.length) return null

        return {
          isCoordinator: coordinatorLines.length > 0,
          coordinatorLines: coordinatorLines.map(l => ({ id: l.id, line_number: l.line_number, name: l.research_line_name || l.name })),
          trials: {
            asPI: trialsAsPI.length, asCoI: trialsAsCoI.length, asSubI: trialsAsSub.length,
            active: allTrials.filter(t => ['Activo','Reclutando'].includes(t.status)).length,
            list: allTrials.map(t => ({
              id: t.id, title: t.title, phase: t.phase, status: t.status,
              role: trialsAsPI.find(x => x.id === t.id) ? 'Principal Investigator'
                  : trialsAsCoI.find(x => x.id === t.id) ? 'Co-Investigator' : 'Sub-Investigator'
            }))
          },
          projects: {
            asLead: projectsAsLead.length,
            list: allProjects.map(p => ({
              id: p.id, title: p.title, current_stage: p.current_stage,
              role: projectsAsLead.find(x => x.id === p.id) ? 'Lead' : 'Co-Investigator'
            }))
          },
          allResearchLines: (() => {
            const lineMap = {}
            coordinatorLines.forEach(l => {
              if (!lineMap[l.id]) lineMap[l.id] = { id: l.id, line_number: l.line_number, name: l.research_line_name || l.name, roles: [], trialsCount: 0, projectsCount: 0 }
              lineMap[l.id].roles.push('Coordinator')
            })
            ;[...trialsAsPI, ...trialsAsCoI, ...trialsAsSub].forEach(t => {
              const lineId = t.research_line_id; if (!lineId) return
              const line = researchLines.value.find(l => l.id === lineId); if (!line) return
              if (!lineMap[lineId]) lineMap[lineId] = { id: lineId, line_number: line.line_number, name: line.research_line_name || line.name, roles: [], trialsCount: 0, projectsCount: 0 }
              const role = trialsAsPI.find(x => x.id === t.id) ? 'Principal Investigator' : trialsAsCoI.find(x => x.id === t.id) ? 'Co-Investigator' : 'Sub-Investigator'
              if (!lineMap[lineId].roles.includes(role)) lineMap[lineId].roles.push(role)
              lineMap[lineId].trialsCount++
            })
            ;[...projectsAsLead, ...projectsAsCoI].forEach(p => {
              const lineId = p.research_line_id; if (!lineId) return
              const line = researchLines.value.find(l => l.id === lineId); if (!line) return
              if (!lineMap[lineId]) lineMap[lineId] = { id: lineId, line_number: line.line_number, name: line.research_line_name || line.name, roles: [], trialsCount: 0, projectsCount: 0 }
              const role = projectsAsLead.find(x => x.id === p.id) ? 'Project Lead' : 'Co-Investigator'
              if (!lineMap[lineId].roles.includes(role)) lineMap[lineId].roles.push(role)
              lineMap[lineId].projectsCount++
            })
            return Object.values(lineMap).sort((a,b) => a.line_number - b.line_number)
          })()
        }
      }

      return { researchLines, clinicalTrials, innovationProjects, researchLoading, researchLineFilters, trialFilters, projectFilters, researchLineModal, clinicalTrialModal, innovationProjectModal, assignCoordinatorModal, trialDetailModal, filteredResearchLines, filteredTrials, filteredTrialsAll, filteredProjects, filteredProjectsAll, trialTotalPages, projectTotalPages, getResearchLineName, getClinicianResearchLines, loadResearchLines, loadClinicalTrials, loadInnovationProjects, loadAllResearch, showAddResearchLineModal, showAddTrialModal, showAddProjectModal, openAssignCoordinatorModal, editResearchLine, editTrial, editProject, viewTrial, saveResearchLine, saveClinicalTrial, saveInnovationProject, saveCoordinatorAssignment, deleteResearchLine, deleteClinicalTrial, deleteInnovationProject, addKeyword, removeKeyword, handleKeywordKey, getStaffResearchQuick }
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

      // ── Research Hub unified state ────────────────────────────────────────
      const researchHubTab = ref('lines')
      const selectedResearchLine = ref(null)
      const researchDetailPanel = ref(false)
      // Mission Control: which line row is selected in the left panel
      const activeMissionLine = ref(null)

      const openLineDetail = (line) => {
        selectedResearchLine.value = line
        activeMissionLine.value = line
      }
      const closeLineDetail = () => {
        researchDetailPanel.value = false
        setTimeout(() => { selectedResearchLine.value = null }, 300)
      }

      // Portfolio KPIs — computed from local refs, instant, no API needed
      const portfolioKPIs = computed(() => {
        try {
          const totalLines    = (researchLines.value || []).length
          const activeLines   = (researchLines.value || []).filter(l => l.active !== false).length
          const totalTrials   = (clinicalTrials.value || []).length
          const activeTrials  = (clinicalTrials.value || []).filter(t => ['Activo','Reclutando'].includes(t.status)).length
          const recruitingTrials = (clinicalTrials.value || []).filter(t => t.status === 'Reclutando').length
          const totalProjects = (innovationProjects.value || []).length
          const lateStageProjects = (innovationProjects.value || []).filter(p => ['Piloto','Validación','Escalamiento','Comercialización'].includes(p.current_stage)).length
          const totalEnrolled = (clinicalTrials.value || []).reduce((s, t) => s + (t.actual_enrollment || 0), 0)
          const totalTarget   = (clinicalTrials.value || []).reduce((s, t) => s + (t.enrollment_target || 0), 0)
          return { totalLines, activeLines, totalTrials, activeTrials, recruitingTrials, totalProjects, lateStageProjects, totalEnrolled, totalTarget }
        } catch { return { totalLines: 0, activeLines: 0, totalTrials: 0, activeTrials: 0, recruitingTrials: 0, totalProjects: 0, lateStageProjects: 0, totalEnrolled: 0, totalTarget: 0 } }
      })

      // Line accent colours — cycles through 6 department colours
      const LINE_ACCENTS = [
        { bg: 'linear-gradient(135deg,#3b82f6,#6366f1)', light: '#eff6ff', color: '#1e40af' },
        { bg: 'linear-gradient(135deg,#10b981,#0891b2)', light: '#d1fae5', color: '#065f46' },
        { bg: 'linear-gradient(135deg,#22d3ee,#0ea5e9)', light: '#e0f7fa', color: '#0e7490' },
        { bg: 'linear-gradient(135deg,#f59e0b,#f97316)', light: '#fef3c7', color: '#92400e' },
        { bg: 'linear-gradient(135deg,#a78bfa,#8b5cf6)', light: '#ede9fe', color: '#5b21b6' },
        { bg: 'linear-gradient(135deg,#fb7185,#ec4899)', light: '#fce7f3', color: '#9d174d' },
      ]
      const getLineAccent = (lineNumber) => LINE_ACCENTS[((lineNumber || 1) - 1) % 6]

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

      return { researchDashboard, researchLinesPerformance, partnerCollaborations, trialsTimeline, analyticsSummary, loadingAnalytics, exportModal, analyticsActiveTab, researchHubTab, selectedResearchLine, researchDetailPanel, openLineDetail, closeLineDetail, loadResearchDashboard, loadResearchLinesPerformance, loadPartnerCollaborations, loadTrialsTimeline, loadAnalyticsSummary, loadStaffResearchProfile, handleExport, showExportModal,
        activeMissionLine, portfolioKPIs, getLineAccent, LINE_ACCENTS }
    }

    // ============ 6.13 useDashboard ============

    // ============================================================
    // NEWS & BLOG — useNews composable
    // ============================================================
    function useNews({ showToast, showConfirmation, medicalStaff, researchLines }) {
      const newsPosts      = ref([])
      const newsLoading    = ref(false)
      const activeNewsMenu = ref(null)
      const newsLoaded     = ref(false) // FIX Bug4: tracks whether fetch has been attempted, not just if results exist
      const newsModal      = reactive({
        show: false, mode: 'add', _tab: 'meta',
        form: {
          id: null, post_type: 'article', title: '', body: '', featured_image_url: '',
          author_id: '', research_line_id: '', is_public: false,
          status: 'draft', expires_at: '',
          journal_name: '', authors_text: '', doi: ''
        }
      })
      const newsFilters    = reactive({ type: '', status: '', search: '', scope: '' })
      const newsWordCount  = computed(() => {
        const t = newsModal.form.body || ''
        return t.trim() === '' ? 0 : t.trim().split(/\s+/).length
      })
      const newsWordLimit  = computed(() => newsModal.form.post_type === 'update' ? 80 : newsModal.form.post_type === 'photo_story' ? 120 : 400)

      // ── Helpers ─────────────────────────────────────────────
      const formatAuthorName = (staffId) => {
        const s = (medicalStaff.value || []).find(m => m.id === staffId)
        if (!s) return '—'
        const parts = (s.full_name || '').trim().split(' ')
        const last  = parts[parts.length - 1]
        return `Dr. ${last}`
      }
      const getLineName = (lineId) => {
        const l = (researchLines.value || []).find(r => r.id === lineId)
        return l ? `L${l.line_number} — ${l.research_line_name || l.name}` : '—'
      }
      const autoExpiry = (type) => {
        const d = new Date()
        if (type === 'update')  d.setDate(d.getDate() + 90)
        if (type === 'article') d.setMonth(d.getMonth() + 18)
    if (type === 'photo_story') d.setMonth(d.getMonth() + 12)
        if (type === 'publication') return ''
        return d.toISOString().split('T')[0]
      }

      // Auto-update expiry when post type changes in add mode
      watch(() => newsModal.form.post_type, (newType) => {
        if (newsModal.mode === 'add' && newType !== 'publication') {
          newsModal.form.expires_at = autoExpiry(newType)
        }
        if (newType === 'publication') {
          newsModal.form.expires_at = ''
        }
      })

      // ── Filtered list ────────────────────────────────────────
      const filteredNews = computed(() => {
        let posts = newsPosts.value || []
        if (newsFilters.type)   posts = posts.filter(p => p.post_type === newsFilters.type)
        if (newsFilters.status) posts = posts.filter(p => p.status === newsFilters.status)
        if (newsFilters.scope === 'public')   posts = posts.filter(p => p.is_public)
        if (newsFilters.scope === 'internal') posts = posts.filter(p => !p.is_public)
        if (newsFilters.search) {
          const q = newsFilters.search.toLowerCase()
          posts = posts.filter(p =>
            (p.title || '').toLowerCase().includes(q) ||
            (p.body  || '').toLowerCase().includes(q)
          )
        }
        return posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      })

      // ── CRUD ────────────────────────────────────────────────
      const loadNews = async () => {
        newsLoading.value = true
        try {
          // CRITICAL FIX: GET /api/news returns { data: [...] } not a raw array.
          // Must unwrap .data — if we use getList/ensureArray the Object.values()
          // fallback would flatten the nested author/research_line join objects.
          const res = await API.request('/api/news')
          newsPosts.value = res?.data || Utils.ensureArray(res) || []
        } catch { newsPosts.value = [] }
        finally { newsLoading.value = false; newsLoaded.value = true }
      }

      const showAddNewsModal = () => {
        newsModal.mode = 'add'
        Object.assign(newsModal.form, {
          id: null, post_type: 'article', title: '', body: '', featured_image_url: '',
          author_id: '', research_line_id: '', is_public: false,
          status: 'draft', expires_at: autoExpiry('article'),
          journal_name: '', authors_text: '', doi: ''
        })
        newsModal.show = true
      }

      const editNews = (post) => {
        newsModal.mode = 'edit'
        newsModal._tab = 'content'  // open on content tab when editing
        const _s = (v) => v == null ? '' : String(v)
        Object.assign(newsModal.form, {
          ...post,
          body:               _s(post.body),
          featured_image_url: _s(post.featured_image_url),
          journal_name:       _s(post.journal_name),
          authors_text:       _s(post.authors_text),
          doi:                _s(post.doi),
          research_line_id:   post.research_line_id || '',
          author_id:          post.author_id || '',
          expires_at:         post.expires_at ? post.expires_at.split('T')[0] : ''
        })
        newsModal.show = true
      }

      const saveNews = async () => {
        const _t = (v) => (v == null ? '' : String(v)).trim()
        if (!_t(newsModal.form.title)) { showToast('Validation', 'Title is required', 'warning'); return }
        if (newsModal.form.post_type === 'photo_story' && !_t(newsModal.form.featured_image_url)) {
          showToast('Validation', 'Photo Story requires an image URL', 'warning'); return
        }
        if (newsModal.form.post_type !== 'publication' && !newsModal.form.author_id) {
          showToast('Validation', 'Author is required', 'warning'); return
        }
        if (newsModal.form.post_type !== 'publication' && newsWordCount.value > newsWordLimit.value) {
          showToast('Validation', `Exceeds ${newsWordLimit.value} word limit`, 'warning'); return
        }
        const payload = {
          post_type:          newsModal.form.post_type,
          title:              _t(newsModal.form.title),
          body:               _t(newsModal.form.body) || null,
          author_id:          newsModal.form.author_id || null,
          research_line_id:   newsModal.form.research_line_id || null,
          is_public:          newsModal.form.is_public,
          status:             newsModal.form.status,
          featured_image_url: _t(newsModal.form.featured_image_url) || null,
          expires_at:         newsModal.form.expires_at || null,
          journal_name:       _t(newsModal.form.journal_name) || null,
          authors_text:       _t(newsModal.form.authors_text) || null,
          doi:                _t(newsModal.form.doi) || null,
          word_count:         newsWordCount.value
        }
        if (payload.status === 'published' && !payload.expires_at && newsModal.form.post_type !== 'publication') {
          payload.expires_at = autoExpiry(newsModal.form.post_type)
        }
        try {
          if (newsModal.mode === 'add') {
            await API.request('/api/news', { method: 'POST', body: payload })
            showToast('Published', 'Post created', 'success')
          } else {
            await API.request(`/api/news/${newsModal.form.id}`, { method: 'PUT', body: payload })
            showToast('Updated', 'Post saved', 'success')
          }
          newsModal.show = false
          await loadNews()
        } catch (e) { showToast('Error', e.message, 'error') }
      }

      // Strip joined/virtual fields before any PUT to backend
      const cleanPost = (post) => {
        const { author, research_line, ...rest } = post
        return rest
      }

      const publishNews = async (post) => {
        try {
          const expiry = post.expires_at || (post.post_type !== 'publication' ? autoExpiry(post.post_type) : null)
          await API.request(`/api/news/${post.id}`, { method: 'PUT', body: {
            ...cleanPost(post), status: 'published',
            published_at: new Date().toISOString(),
            expires_at: expiry
          }})
          showToast('Published', 'Post is now live', 'success')
          await loadNews()
        } catch (e) { showToast('Error', e.message, 'error') }
      }

      const archiveNews = async (post) => {
        showConfirmation({
          title: 'Archive Post',
          message: `Archive "${post.title}"? It will be hidden from view but not deleted.`,
          onConfirm: async () => {
            try {
              await API.request(`/api/news/${post.id}`, { method: 'PUT', body: { ...cleanPost(post), status: 'archived' }})
              showToast('Archived', 'Post archived', 'info')
              await loadNews()
            } catch (e) { showToast('Error', e.message, 'error') }
          }
        })
      }

      const deleteNews = async (post) => {
        showConfirmation({
          title: 'Delete Post',
          message: `Permanently delete "${post.title}"? This cannot be undone.`,
          onConfirm: async () => {
            try {
              await API.request(`/api/news/${post.id}`, { method: 'DELETE' })
              showToast('Deleted', 'Post deleted', 'success')
              await loadNews()
            } catch (e) { showToast('Error', e.message, 'error') }
          }
        })
      }

      const togglePublic = async (post) => {
        try {
          await API.request(`/api/news/${post.id}`, { method: 'PUT', body: { ...cleanPost(post), is_public: !post.is_public }})
          showToast('Updated', post.is_public ? 'Now internal only' : 'Now public on website', 'success')
          await loadNews()
        } catch (e) { showToast('Error', e.message, 'error') }
      }

      return {
        newsPosts, newsLoading, newsLoaded, newsModal, newsFilters, filteredNews,
        newsWordCount, newsWordLimit, activeNewsMenu,
        loadNews, showAddNewsModal, editNews, saveNews,
        publishNews, archiveNews, deleteNews, togglePublic,
        formatAuthorName, getLineName, autoExpiry
      }
    }

    function useDashboard({ medicalStaff, rotations, absences, onCallSchedule, trainingUnits = ref([]) }) {
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
        // M1 FIX: was hardcoded to 'medical_resident' — use isResidentType() for dynamic types
        const nr = medicalStaff.value.filter(s => isResidentType(s.staff_type) && s.employment_status === 'active').length

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

      // ── Situational awareness — "What is happening today" narrative ──
      const situationItems = computed(() => {
        const items = []
        const todayDate = new Date(); todayDate.setHours(0,0,0,0)
        const in7  = new Date(todayDate.getTime() + 7  * 86400000)
        const in30 = new Date(todayDate.getTime() + 30 * 86400000)

        // Rotations ending this week
        const endingThisWeek = rotations.value.filter(r => {
          if (r.rotation_status !== 'active') return false
          const e = new Date(r.end_date + 'T00:00:00')
          return e >= todayDate && e <= in7
        })
        if (endingThisWeek.length > 0) {
          const names = endingThisWeek.slice(0,2).map(r => {
            const s = medicalStaff.value.find(x => x.id === r.resident_id)
            return s ? Utils.formatDrName(s.full_name) : 'Unknown'
          }).join(', ')
          const more = endingThisWeek.length > 2 ? ` +${endingThisWeek.length-2}` : ''
          items.push({ icon: 'fa-clock', type: 'warn', text: `${endingThisWeek.length} rotation${endingThisWeek.length>1?'s':''} ending this week — ${names}${more}`, action: 'resident_rotations', actionFilter: { rotationStatus: 'active' } })
        }

        // Free slots opening within 30 days
        const freeSlots = []
        trainingUnits.value.forEach(unit => {
          const activeRots = rotations.value.filter(r => r.training_unit_id === unit.id && r.rotation_status === 'active')
          activeRots.forEach(r => {
            const end = new Date(r.end_date + 'T00:00:00')
            if (end >= todayDate && end <= in30 && activeRots.length >= unit.maximum_residents) {
              freeSlots.push({ unit: unit.unit_name, date: r.end_date })
            }
          })
        })
        if (freeSlots.length > 0) {
          const first = freeSlots[0]
          const fmtDate = new Date(first.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
          items.push({ icon: 'fa-calendar-plus', type: 'info', text: `Slot opens in ${first.unit} from ${fmtDate}`, action: 'training_units' })
        }

        // Starting next 7 days
        const startingThisWeek = rotations.value.filter(r => {
          if (r.rotation_status !== 'scheduled') return false
          const s = new Date(r.start_date + 'T00:00:00')
          return s >= todayDate && s <= in7
        })
        if (startingThisWeek.length > 0) {
          items.push({ icon: 'fa-play-circle', type: 'ok', text: `${startingThisWeek.length} rotation${startingThisWeek.length>1?'s':''} starting this week`, action: 'resident_rotations' })
        }

        // Residents with no rotation in the next month
        const unassigned = medicalStaff.value.filter(s => {
          if (!isResidentType(s.staff_type) || s.employment_status !== 'active') return false
          const mStart = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1)
          const mEnd   = new Date(todayDate.getFullYear(), todayDate.getMonth() + 2, 0)
          return !rotations.value.some(r =>
            r.resident_id === s.id &&
            ['active','scheduled'].includes(r.rotation_status) &&
            new Date(r.start_date) <= mEnd && new Date(r.end_date) >= mStart
          )
        })
        if (unassigned.length > 0) {
          const names = unassigned.slice(0,2).map(s => Utils.formatDrName(s.full_name) || '').join(', ')
          const more  = unassigned.length > 2 ? ` +${unassigned.length - 2}` : ''
          items.push({ icon: 'fa-user-clock', type: 'warn', text: `${unassigned.length} resident${unassigned.length>1?'s':''} unassigned next month — ${names}${more}`, action: 'resident_rotations', urgent: unassigned.length > 2 })
        }

        // On-call gaps in next 7 days
        const ocGaps = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(todayDate.getTime() + i * 86400000)
          const ds = Utils.normalizeDate(d)
          const hasPrimary = onCallSchedule.value.some(s => Utils.normalizeDate(s.duty_date) === ds && ['primary_call','primary','weekend_coverage'].includes(s.shift_type))
          if (!hasPrimary) ocGaps.push(d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }))
        }
        if (ocGaps.length > 0) {
          items.push({ icon: 'fa-phone-slash', type: 'danger', text: `${ocGaps.length} day${ocGaps.length>1?'s':''} without primary on-call — ${ocGaps.slice(0,2).join(', ')}${ocGaps.length>2?'…':''}`, action: 'oncall_schedule', urgent: true })
        }

        // Gap + slot match — pair residents finishing soon with units opening soon
        const gapSlotMatches = []
        const endingSoon = rotations.value.filter(r => {
          if (r.rotation_status !== 'active') return false
          const e = new Date(r.end_date + 'T00:00:00')
          return e >= todayDate && e <= in30
        })
        endingSoon.forEach(rot => {
          const resident = medicalStaff.value.find(s => s.id === rot.resident_id)
          if (!resident) return
          // Find units with free slots opening around the same time
          trainingUnits.value.forEach(unit => {
            const active = rotations.value.filter(r =>
              r.training_unit_id === unit.id && r.rotation_status === 'active'
            )
            if (active.length < unit.maximum_residents) {
              gapSlotMatches.push({
                residentName: resident.full_name,
                residentId: resident.id,
                unitName: unit.unit_name,
                unitId: unit.id,
                endDate: rot.end_date
              })
            }
          })
        })
        if (gapSlotMatches.length > 0) {
          const m = gapSlotMatches[0]
          items.push({
            icon: 'fa-link', type: 'info',
            text: `${Utils.formatDrName(m.residentName)} finishing rotation — ${m.unitName} has a free slot`,
            action: 'resident_rotations',
            actionFilter: { resident: m.residentId }
          })
        }

        // Add "all covered" positive if nothing is wrong but we have data
        if (items.length === 0 && medicalStaff.value.length > 0) {
          const todayStr = Utils.normalizeDate(new Date())
          const hasCoverage = onCallSchedule.value.some(s =>
            Utils.normalizeDate(s.duty_date) === todayStr &&
            ['primary_call','primary','weekend_coverage'].includes(s.shift_type)
          )
          const hasActiveRotations = rotations.value.some(r => r.rotation_status === 'active')
          items.push({
            icon: 'fa-check-circle',
            type: 'ok',
            text: [
              hasCoverage ? 'On-call covered' : null,
              hasActiveRotations ? `${rotations.value.filter(r=>r.rotation_status==='active').length} rotations active` : null,
              `${medicalStaff.value.filter(s=>s.employment_status==='active').length} staff available`,
            ].filter(Boolean).join(' · '),
            action: null
          })
        }
        return items.sort((a,b) => {
          const p = { danger: 0, warn: 1, info: 2, ok: 3 }
          return (p[a.type] ?? 4) - (p[b.type] ?? 4)
        })
      })

      // Top 3 priority items for the dashboard briefing card
      const dailyBriefing = computed(() => {
        const dataReady = medicalStaff.value.length > 0 || rotations.value.length > 0 || onCallSchedule.value.length > 0
        if (!dataReady) return []
        return situationItems.value.slice(0, 4)
      })

      // systemSummary — department health overview for dashboard
      const systemSummary = computed(() => {
        const today = Utils.normalizeDate(new Date())
        const activeStaff     = medicalStaff.value.filter(s => s.employment_status === 'active').length
        const onLeave         = medicalStaff.value.filter(s => s.employment_status === 'on_leave').length
        const activeRotations = rotations.value.filter(r => r.rotation_status === 'active').length
        const scheduledRots   = rotations.value.filter(r => r.rotation_status === 'scheduled').length
        const todayHasCoverage= onCallSchedule.value.some(s =>
          Utils.normalizeDate(s.duty_date) === today &&
          ['primary_call','primary','weekend_coverage'].includes(s.shift_type)
        )
        const dangerAlerts = situationItems.value.filter(i => i.type === 'danger').length
        const warnAlerts   = situationItems.value.filter(i => i.type === 'warn').length
        const healthScore  = Math.max(0, 100
          - (dangerAlerts * 25)
          - (warnAlerts   * 10)
          - (onLeave > 0 && !todayHasCoverage ? 15 : 0)
        )
        return {
          activeStaff, onLeave, activeRotations, scheduledRots, todayHasCoverage,
          dangerAlerts, warnAlerts, healthScore,
          healthLabel: healthScore >= 80 ? 'Optimal' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Attention' : 'Action required',
          healthColor: healthScore >= 80 ? 'var(--nm-teal,#00b3b3)' : healthScore >= 60 ? '#3b82f6' : healthScore >= 40 ? '#f59e0b' : '#ef4444',
        }
      })

      const currentTimeFormatted = computed(() => Utils.formatTime(currentTime.value))
      return { systemStats, currentTime, currentTimeFormatted, loadSystemStats, updateDashboardStats, situationItems, dailyBriefing, systemSummary }
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
          ['medical_staff', 15], ['rotations', 15], ['oncall', 15], ['absences', 15], ['trials', 15], ['projects', 15], ['research_lines', 20]
        ])

        const { fieldErrors, setErr, clearErr: clearFieldError, clearAll } = makeValidation(['rotation', 'staff', 'absence', 'oncall', 'research'])

        // ── Shared refs hoisted above all composables ──────────────────────
        // Both useTrainingUnits and useRotations need each other's data.
        // Hoisting the refs here breaks the circular dependency cleanly:
        // both composables receive the same reactive container,
        // so when either load function fills it all consumers see it immediately.
        const trainingUnits = ref([])
        const rotations     = ref([])
        // researchLines hoisted so useStaff can clear coordinator assignments on role revoke
        const researchLinesShared = ref([])
        // allDepartmentsLookup hoisted so useTrainingUnits can filter units by department
        // without requiring useDepartments to be initialised first
        const allDepartmentsLookupShared = ref([])

        const staffOps = useStaff({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, fieldErrors, setErr, clearAll, currentUser, researchLines: researchLinesShared, loadResearchLines: async () => { try { researchLinesShared.value = await API.getResearchLines() } catch {} } })
        const { medicalStaff, allStaffLookup, hospitalsList } = staffOps

        const { trainingUnitFilters, trainingUnitModal, unitsByDepartment, unitResidentsModal, unitCliniciansModal,
          filteredTrainingUnits, getUnitActiveRotationCount, getUnitRotations, getUnitScheduledCount, getUnitOverlapWarning, getResidentShortName,
          loadTrainingUnits, showAddTrainingUnitModal,
          editTrainingUnit, deleteTrainingUnit, openUnitClinicians, saveUnitClinicians,
          assignAttendingToUnit,
          viewUnitResidents, saveTrainingUnit,
          trainingUnitView, trainingUnitHorizon, getTimelineMonths, getUnitSlots, getDaysUntilFree,
          tlPopover, openCellPopover, closeCellPopover,
          occupancyPanel, unitDetailDrawer, occupancyHeatmap, occupancyPanelUnits,
          getUnitMonthOccupancy, getNextFreeMonth, openUnitDetail
        } = useTrainingUnits({ showToast, showConfirmation, trainingUnits, rotations, allStaffLookup, allDepartmentsLookup: allDepartmentsLookupShared })

        const rotationOps = useRotations({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff, allStaffLookup, trainingUnits, rotations, currentUser })

        // Destructure getHorizonMonths so absence timeline functions can use it without qualification
        const { getHorizonMonths } = rotationOps

        const { departments, allDepartmentsLookup, departmentFilters, departmentModal, deptReassignModal,
          filteredDepartments, getDepartmentName, getDepartmentUnits, getDepartmentStaffCount, getDeptResidentStats, getDeptHomeResidents,
          loadDepartments, showAddDepartmentModal, editDepartment, saveDepartment,
          deleteDepartment, confirmDeptReassignAndDeactivate, viewDepartmentStaff,
          deptPanel, openDeptPanel, closeDeptPanel,
          deptPanelAttending, deptPanelResidents, deptPanelUnits,
          getUnitSupervisorName } = useDepartments({
          showToast, showConfirmation, medicalStaff, trainingUnits, rotations
        })

        // deptPanelRotations — uses the shared rotations ref, needs deptPanelUnits
        const deptPanelRotations = computed(() => {
          if (!deptPanel.dept) return []
          const unitIds = new Set(deptPanelUnits.value.map(u => u.id))
          return rotations.value.filter(r =>
            unitIds.has(r.training_unit_id) &&
            ['active','scheduled'].includes(r.rotation_status)
          ).sort((a,b) => new Date(a.end_date + 'T00:00:00') - new Date(b.end_date + 'T00:00:00'))
        })

        const rotDaysLeft = (r) => {
          if (!r) return 0
          const diff = Math.ceil((new Date(Utils.normalizeDate(r.end_date) + 'T00:00:00') - new Date()) / 86400000)
          return diff > 0 ? diff : 0
        }

        const absenceOps = useAbsences({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff, allStaffLookup, onCallSchedule: ref([]) })
        const { absences } = absenceOps

        // ── Unit staff absence impact (needs absences in scope) ──────────────
        const getUnitAbsentAttendingCount = (unitId) => {
          const staff = unitStaffCache.value[unitId] || []
          const today = new Date().toISOString().slice(0, 10)
          return staff.filter(a => {
            if (!a.staff?.id) return false
            return absences.value.some(ab =>
              ab.staff_member_id === a.staff.id &&
              !['cancelled','returned_to_duty'].includes(ab.current_status) &&
              ab.start_date <= today && ab.end_date >= today
            )
          }).length
        }
        const getUnitPresentAttendingCount = (unitId) =>
          (unitStaffCache.value[unitId] || []).length - getUnitAbsentAttendingCount(unitId)
        const isUnitUnderstaffed = (unitId) => {
          const total = (unitStaffCache.value[unitId] || []).length
          if (total === 0) return false
          const absent = getUnitAbsentAttendingCount(unitId)
          return absent > 0 && (absent / total) >= 0.5
        }
        const isStaffAbsentToday = (staffId) => {
          const today = new Date().toISOString().slice(0, 10)
          return absences.value.some(ab =>
            ab.staff_member_id === staffId &&
            !['cancelled','returned_to_duty'].includes(ab.current_status) &&
            ab.start_date <= today && ab.end_date >= today
          )
        }

        const getAbsenceUnitImpact = (staffId) => {
          return Object.entries(unitStaffCache.value)
            .filter(([, members]) => members.some(m => m.staff?.id === staffId))
            .map(([unitId]) => {
              const unit = trainingUnits.value.find(u => u.id === unitId)
              const total = (unitStaffCache.value[unitId] || []).length
              const absent = getUnitAbsentAttendingCount(unitId)
              return { unitId, unitName: unit?.unit_name || 'Unit', total, absent,
                       remaining: total - absent - 1 }
            })
            .filter(u => u.total > 0)
        }

        const onCallOps = useOnCall({ showToast, showConfirmation, paginate, totalPages, resetPage, applySort, setErr, clearAll, medicalStaff, allStaffLookup, absences })
        const { onCallSchedule } = onCallOps

        
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
                coverage_notes: existing.coverage_notes || ''
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
        // Keep the hoisted ref in sync so useStaff coordinator-clear logic sees live data
        watch(researchOps.researchLines, (v) => { researchLinesShared.value = v }, { immediate: true })
        // Keep hoisted dept lookup in sync so useTrainingUnits filteredTrainingUnits always has fresh data
        watch(allDepartmentsLookup, (v) => { allDepartmentsLookupShared.value = v }, { immediate: true })
        // Wrap loadResearchDashboard so it always receives the live research data refs —
        // the raw function takes parameters; calling it bare from the template passes nothing.
        const loadResearchDashboard = () => analyticsOps.loadResearchDashboard(
          researchOps.researchLines,
          researchOps.clinicalTrials,
          researchOps.innovationProjects
        )
        const dashOps = useDashboard({ medicalStaff, rotations, absences, onCallSchedule, trainingUnits })

        const newsOps = useNews({ showToast, showConfirmation, medicalStaff, researchLines: researchOps.researchLines })

        // ── EMERGENCY CALLOUTS (DUTY LOG) ─────────────────────────────
        const callouts        = ref([])
        const calloutsLoading = ref(false)
        const calloutSummary  = ref([])
        const calloutPeriod   = reactive({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
        const calloutModal    = reactive({
          show: false, mode: 'add',
          form: { id: null, staff_id: '', called_at: '', end_time: '', reason_category: 'respiratory_emergency', time_type: 'night', notes: '', coverage_area_id: '' }
        })
        const suggestCalloutArea = (staffId) => {
          if (!staffId) return
          const today = Utils.normalizeDate(new Date())
          // Find the shift this physician is on tonight
          const shift = (onCallSchedule?.value || []).find(s =>
            s.primary_physician_id === staffId &&
            Utils.normalizeDate(s.duty_date) === today &&
            s.coverage_area_id
          )
          if (shift?.coverage_area_id && !calloutModal.form.coverage_area_id) {
            calloutModal.form.coverage_area_id = shift.coverage_area_id
          }
        }

        const calloutReasonLabels = {
          respiratory_emergency: 'Respiratory emergency',
          bronchospasm:          'Bronchospasm',
          haemoptysis:           'Haemoptysis',
          post_procedure:        'Post-procedure complication',
          icu_transfer:          'ICU transfer support',
          patient_deterioration: 'Patient deterioration',
          other:                 'Other'
        }
        const calloutTimeTypes = { night:'Night', weekend:'Weekend', daytime:'Daytime', holiday:'Holiday' }

        let _calloutsLoadedKey = ''
        const loadCallouts = async (force = false) => {
          const key = `${calloutPeriod.year}-${calloutPeriod.month}`
          if (!force && _calloutsLoadedKey === key && callouts.value.length > 0) return
          calloutsLoading.value = true
          try {
            const p = new URLSearchParams({ year: calloutPeriod.year, month: calloutPeriod.month, limit: 200 })
            const res = await API.request(`/api/emergency-callouts?${p}`)
            callouts.value = res.data || []
            if (res._tableNotFound) {
              showToast('Setup needed', 'Run the emergency_callouts SQL migration in Supabase. See System Guide.', 'warning')
            }
            _calloutsLoadedKey = key
          } catch(e) { showToast('Error', 'Failed to load duty log', 'error') }
          finally { calloutsLoading.value = false }
        }

        const loadCalloutSummary = async () => {
          try {
            const p = new URLSearchParams({ year: calloutPeriod.year, month: calloutPeriod.month })
            calloutSummary.value = await API.request(`/api/emergency-callouts/summary?${p}`) || []
          } catch(e) { /* silently ignore */ }
        }

        const openLogCalloutModal = () => {
          const now = new Date()
          const pad = n => String(n).padStart(2,'0')
          Object.assign(calloutModal.form, { id:null, staff_id:'', called_at:`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`, end_time:'', reason_category:'respiratory_emergency', time_type: now.getHours() >= 22 || now.getHours() < 7 ? 'night' : now.getDay() === 0 || now.getDay() === 6 ? 'weekend' : 'daytime', notes:'', coverage_area_id:'' })
          calloutModal.mode = 'add'; calloutModal.show = true
        }

        const editCallout = (c) => {
          Object.assign(calloutModal.form, { id:c.id, staff_id:c.staff_id, called_at:c.called_at?.slice(0,16)||'', end_time:c.end_time?.slice(0,16)||'', reason_category:c.reason_category||'other', time_type:c.time_type||'night', notes:c.notes||'' })
          calloutModal.mode = 'edit'; calloutModal.show = true
        }

        const saveCallout = async () => {
          const f = calloutModal.form
          if (!f.staff_id || !f.called_at) { showToast('Validation', 'Physician and call time are required', 'warning'); return }
          try {
            const payload = { staff_id:f.staff_id, called_at:f.called_at, end_time:f.end_time||null, reason_category:f.reason_category, time_type:f.time_type, notes:f.notes }
            if (calloutModal.mode === 'add') {
              await API.request('/api/emergency-callouts', { method:'POST', body: payload })
              showToast('Logged', 'Emergency call-out recorded', 'success')
            } else {
              await API.request(`/api/emergency-callouts/${f.id}`, { method:'PUT', body: payload })
              showToast('Updated', 'Call-out record updated', 'success')
            }
            calloutModal.show = false
            await loadCallouts(); await loadCalloutSummary()
          } catch(e) { showToast('Error', e.message || 'Failed to save', 'error') }
        }

        const deleteCallout = async (c) => {
          showConfirmation({ title:'Delete call-out record', message:`Remove this call-out entry for ${c.staff?.full_name || 'this physician'}?`, confirmButtonText:'Delete', confirmButtonClass:'btn-danger',
            onConfirm: async () => {
              try {
                await API.request(`/api/emergency-callouts/${c.id}`, { method:'DELETE' })
                showToast('Deleted', 'Call-out record removed', 'success')
                await loadCallouts(); await loadCalloutSummary()
              } catch(e) { showToast('Error', e.message || 'Failed to delete', 'error') }
            }
          })
        }

        // ── Callout analytics computeds (moved from template to avoid block-body) ──
        const calloutsByArea = Vue.computed(() => {
          const cas = coverageAreas?.value || []
          const acc = {}
          ;(callouts.value || []).filter(c => c.coverage_area_id).forEach(c => {
            const name = cas.find(a => a.id === c.coverage_area_id)?.name || c.coverage_area_id
            acc[name] = (acc[name] || 0) + 1
          })
          return Object.entries(acc).sort((a,b) => b[1]-a[1]).slice(0, 6)
        })
        const calloutsByReason = Vue.computed(() => {
          const acc = {}
          ;(callouts.value || []).forEach(c => {
            const k = c.reason_category || 'other'
            acc[k] = (acc[k] || 0) + 1
          })
          return Object.entries(acc).sort((a,b) => b[1]-a[1]).slice(0, 6)
        })

        const calloutKPIs = computed(() => {
          const c = callouts.value
          const now = new Date()
          const thisMonth = c.filter(x => { const d = new Date(x.called_at); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })
          const ytd = c.filter(x => new Date(x.called_at).getFullYear() === now.getFullYear())
          return {
            thisMonth: thisMonth.length,
            night:     thisMonth.filter(x => x.time_type === 'night').length,
            weekend:   thisMonth.filter(x => x.time_type === 'weekend').length,
            holiday:   thisMonth.filter(x => x.time_type === 'holiday').length,
            ytd:       ytd.length,
          }
        })

        const availablePhysicians = computed(() => medicalStaff.value.filter(s =>
          s.employment_status === 'active' && s.staff_type &&
          (staffTypeMap.value[s.staff_type] != null
            ? true  // any active known type is eligible for scheduling
            : ['attending_physician','fellow','nurse_practitioner','medical_resident'].includes(s.staff_type))
        ))

        const calloutFairnessAlert = computed(() => {
          if (!availablePhysicians?.value?.length) return false
          const totals = availablePhysicians.value.map(p =>
            (onCallOps.filteredOnCallSchedules.value || []).filter(s => s.primary_physician_id === p.id || s.backup_physician_id === p.id).length +
            (calloutSummary.value.find(s => s.staff_id === p.id)?.total || 0)
          )
          const avg = totals.reduce((a,b) => a+b, 0) / Math.max(1, totals.length)
          return avg > 0 && totals.some(t => t > avg * 1.5)
        })

        // calloutDistribution — per-physician duty load with deviation from avg
        const calloutDistribution = computed(() => {
          if (!availablePhysicians?.value?.length) return []
          const physicians = availablePhysicians.value
          const items = physicians.map(p => {
            const scheduled = (onCallOps.filteredOnCallSchedules.value || []).filter(
              s => s.primary_physician_id === p.id || s.backup_physician_id === p.id
            ).length
            const summary = calloutSummary.value.find(s => s.staff_id === p.id) || {}
            const callouts = summary.total || 0
            const night    = summary.night || 0
            const weekend  = summary.weekend || 0
            const total    = scheduled + callouts
            return { id: p.id, name: p.full_name, staffType: p.staff_type, scheduled, callouts, night, weekend, total }
          })
          const avg = items.reduce((s,i) => s + i.total, 0) / Math.max(1, items.length)
          return items
            .map(i => ({ ...i, avg, deviation: avg > 0 ? Math.round((i.total / avg - 1) * 100) : 0 }))
            .sort((a,b) => b.total - a.total)
        })

        // auto-load when on-call view is active
        watch(() => currentView.value, v => {
          if (v === 'oncall_schedule')  { loadCallouts(); loadCalloutSummary(); onCallOps.loadCoverageAreas() }
          if (v === 'communications')   { commsOps.loadAnnouncements(); commsOps.loadOpsMetrics() }
        }, { immediate: false })

        // ── NEWS READER DRAWER ────────────────────────────────────────
        const newsDrawer = reactive({ show: false, post: null })
        const openNewsDrawer = (post) => { newsDrawer.post = post; newsDrawer.show = true }
        const closeNewsDrawer = () => { newsDrawer.show = false; newsDrawer.post = null }
        const newsDrawerPrev = computed(() => {
          if (!newsDrawer.post) return null
          const list = newsOps.filteredNews.value
          const idx = list.findIndex(p => p.id === newsDrawer.post.id)
          return idx > 0 ? list[idx - 1] : null
        })
        const newsDrawerNext = computed(() => {
          if (!newsDrawer.post) return null
          const list = newsOps.filteredNews.value
          const idx = list.findIndex(p => p.id === newsDrawer.post.id)
          return idx < list.length - 1 ? list[idx + 1] : null
        })
        const newsDrawerBodyParagraphs = computed(() => {
          const body = newsDrawer.post?.body
          if (!body) return []
          const chunks = body.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
          if (chunks.length <= 1) {
            const sentences = body.match(/[^.!?]+[.!?]+/g) || [body]
            const paras = []
            for (let i = 0; i < sentences.length; i += 3)
              paras.push(sentences.slice(i, i + 3).join(' ').trim())
            return paras
          }
          return chunks
        })
        // FIX: newsDrawerAuthorFull must be declared BEFORE newsDrawerInitials uses it
        const newsDrawerAuthorFull = computed(() => {
          const id = newsDrawer.post?.author_id
          if (!id) return ''
          const s = (medicalStaff.value || []).find(m => m.id === id)
          return s?.full_name || ''
        })
        const newsDrawerInitials = computed(() => {
          const name = newsDrawerAuthorFull.value || ''
          const parts = name.trim().split(/\s+/).filter(w => w.replace('.','').length > 1)
          if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
          return name[0]?.toUpperCase() || '?'
        })
        const newsDrawerReadMins = computed(() => {
          const wc = newsDrawer.post?.word_count
          return wc ? Math.max(1, Math.round(wc / 200)) : null
        })
        const newsDrawerLineName = computed(() => {
          const id = newsDrawer.post?.research_line_id
          if (!id) return ''
          return newsOps.getLineName(id)
        })
        // ── END NEWS READER DRAWER ────────────────────────────────────

        const { newsPosts, newsLoading, newsLoaded, newsModal, newsFilters, filteredNews,
                newsWordCount, newsWordLimit,
                loadNews, showAddNewsModal, editNews, saveNews,
                publishNews, archiveNews, deleteNews, togglePublic: toggleNewsPublic,
                formatAuthorName: newsAuthorName, getLineName: newsLineName } = newsOps

        const openAssignRotationFromUnit = (unit, startDate) => {
          occupancyPanel.show   = false
          unitDetailDrawer.show = false
          rotationOps.showAddRotationModal(null, unit)
          if (startDate) rotationOps.rotationModal.form.start_date = startDate
        }
        const { systemStats, updateDashboardStats, loadSystemStats, situationItems, dailyBriefing, systemSummary } = dashOps

        // ============ NEW COMPACT VIEW STATE ============
        const rotationView = ref('detailed') // 'compact', 'detailed', 'month'
        const onCallView = ref('detailed')
        const oncallTab  = ref('schedule')
        const oncallMonthOffset = ref(0)  // 0 = current month, -1 = prev, +1 = next

        // ── Monthly view computed helpers ─────────────────────────────────
        const _ocmDate = Vue.computed(() =>
          new Date(new Date().getFullYear(), new Date().getMonth() + oncallMonthOffset.value, 1)
        )
        const oncallMonthEmptyCells = Vue.computed(() => {
          const dow = _ocmDate.value.getDay()
          const blanks = dow === 0 ? 6 : dow - 1
          return Array.from({ length: blanks }, (_, i) => i)
        })
        const oncallMonthDays = Vue.computed(() => {
          const d = _ocmDate.value
          const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
          return Array.from({ length: n }, (_, i) => i + 1)
        })
        const getOncallShiftsForDay = (day) => {
          const d = _ocmDate.value
          const yr = d.getFullYear()
          const mo = String(d.getMonth() + 1).padStart(2, '0')
          const dy = String(day).padStart(2, '0')
          const iso = `${yr}-${mo}-${dy}`
          return (onCallOps.onCallSchedule?.value || []).filter(s => (s.duty_date || '').slice(0, 10) === iso)
        }
        const isOncallCellToday = (day) => {
          const d = _ocmDate.value
          const t = new Date()
          return d.getFullYear() === t.getFullYear() &&
                 d.getMonth() === t.getMonth() &&
                 day === t.getDate()
        }
        const oncallMonthSummary = Vue.computed(() => {
          const d = _ocmDate.value
          const yr = d.getFullYear()
          const mo = String(d.getMonth() + 1).padStart(2, '0')
          const covered = [...new Set(
            (onCallOps.onCallSchedule?.value || [])
              .filter(s => (s.duty_date || '').startsWith(`${yr}-${mo}`))
              .map(s => s.duty_date)
          )]
          const daysInMonth = new Date(yr, d.getMonth() + 1, 0).getDate()
          return `${covered.length}/${daysInMonth} days scheduled`
        })

        // ============ EXISTING COMPUTED PROPERTIES ============
        // Name lookups — canonical versions live in their composables and are
        // exposed via ...staffOps / ...rotationOps spreads in the return below.
        // These aliases unify access from templates that call them directly.
        const getStaffName       = (id) => { if (!id) return 'Not assigned'; const s = allStaffLookup.value.find(x => x.id === id) || medicalStaff.value.find(x => x.id === id); return s?.full_name || 'Not assigned' }
        const getSupervisorName  = (id) => getStaffName(id)
        const getPhysicianName   = (id) => getStaffName(id)
        const getResidentName    = (id) => getStaffName(id)
        const getTrainingUnitName = (id) => trainingUnits.value.find(u => u.id === id)?.unit_name || 'Not assigned'
        const calculateAbsenceDuration = (s, e) => Utils.dateDiff(s, e)
        const getDaysRemaining = (d) => Utils.daysUntil(d)

        // isToday(dateStr) — true if the given YYYY-MM-DD string is today's date
        const isToday = (dateStr) => {
          if (!dateStr) return false
          const today = new Date(); today.setHours(0,0,0,0)
          const d = new Date(dateStr); d.setHours(0,0,0,0)
          return d.getTime() === today.getTime()
        }

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
        // Returns active + scheduled rotations for a resident (used in profile Rotations tab)
        const getUpcomingRotations = (staffId) => {
          if (!staffId) return []
          return rotations.value.filter(r =>
            r.resident_id === staffId && ['active', 'scheduled'].includes(r.rotation_status)
          ).sort((a, b) => {
            // active first, then by start date
            if (a.rotation_status === 'active' && b.rotation_status !== 'active') return -1
            if (a.rotation_status !== 'active' && b.rotation_status === 'active') return 1
            return (a.start_date || '').localeCompare(b.start_date || '')
          })
        }
                const getRotationHistory = (staffId) => { if (!staffId) return []; return rotations.value.filter(r => r.resident_id === staffId && !['active', 'scheduled'].includes(r.rotation_status)).sort((a, b) => Utils.normalizeDate(b.end_date || b.rotation_end_date).localeCompare(Utils.normalizeDate(a.end_date || a.rotation_end_date))) }
        const getRotationDaysLeft = (staffId) => { const r = getCurrentRotationForStaff(staffId); return r ? getDaysRemaining(r.end_date || r.rotation_end_date) : 0 }
        const getCurrentRotationSupervisor = (staffId) => { const r = getCurrentRotationForStaff(staffId); return r?.supervising_attending_id ? getStaffName(r.supervising_attending_id) : 'Not assigned' }
        const hasProfessionalCredentials = (staff) => !!(staff?.academic_degree || staff?.specialization || staff?.training_year || staff?.clinical_certificate || staff?.medical_license)

        const toggleProfileSection = (key) => {
          if (!staffOps.staffProfileModal.collapsed) staffOps.staffProfileModal.collapsed = {}
          staffOps.staffProfileModal.collapsed[key] = !staffOps.staffProfileModal.collapsed[key]
        }

        // Load certificates into profile modal on demand
        const loadStaffCertificates = async (staffId) => {
          if (!staffId) return
          staffOps.staffProfileModal.loadingCerts = true
          staffOps.staffProfileModal.certificates = []
          try {
            const data = await API.request(`/api/medical-staff/${staffId}/certificates`)
            staffOps.staffProfileModal.certificates = Array.isArray(data) ? data : []
          } catch { staffOps.staffProfileModal.certificates = [] }
          finally { staffOps.staffProfileModal.loadingCerts = false }
        }

        const viewStaffDetails = async (staff) => {
          if (!staff || !staff.id) { console.warn('viewStaffDetails: staff object is undefined or missing id'); return; }
          staffOps.staffProfileModal.staff = staff; staffOps.staffProfileModal.activeTab = 'activity'; staffOps.staffProfileModal.show = true
          // Instant local profile from refs — shown immediately with no loading state
          const quickProfile = researchOps.getStaffResearchQuick(staff.id)
          if (quickProfile) staffOps.staffProfileModal.researchProfile = quickProfile
          // Prefetch ALL tab data in parallel — no waiting for tab clicks
          const prefetchAll = [
            // Certificates — previously only loaded on tab click
            loadStaffCertificates(staff.id),
            // Research profile
            hasPermission('analytics', 'read') ? analyticsOps.loadStaffResearchProfile(staffOps.staffProfileModal, staff.id) : Promise.resolve(),
            // Leave balance
            API.getLeaveBalance(staff.id).then(b => { staffOps.staffProfileModal.leaveBalance = b }).catch(() => { staffOps.staffProfileModal.leaveBalance = null }),
          ]
          // Supervision (attending/supervisors only)
          if (staff.staff_type === 'attending_physician' || staffTypeMap.value[staff.staff_type]?.can_supervise) {
            staffOps.staffProfileModal.loadingSupervision = true
            prefetchAll.push(
              API.getSupervisedResidents(staff.id)
                .then(d => { staffOps.staffProfileModal.supervisionData = d })
                .catch(() => { staffOps.staffProfileModal.supervisionData = { current: [], currentCount: 0, pastCount: 0, totalDaysSupervised: 0 } })
                .finally(() => { staffOps.staffProfileModal.loadingSupervision = false })
            )
          }
          // Fire all in parallel — no sequential waiting
          await Promise.allSettled(prefetchAll)
        }

        const formatStaffType = (t) => formatStaffTypeGlobal(t)  // single definition — composable copies removed
        const formatStaffTypeShortFn = (t) => formatStaffTypeShort(t)
        const getStaffTypeClass = (t) => getStaffTypeClassGlobal(t)
        const formatEmploymentStatus = (s) => ({ active: 'Active', on_leave: 'On Leave', inactive: 'Inactive' }[s] || s)
        const formatAbsenceReason = (r) => ABSENCE_REASON_LABELS[r] || r
        const formatRotationStatus = (s) => ROTATION_STATUS_LABELS[s] || s
        const getUserRoleDisplay = (r) => USER_ROLE_LABELS[r] || r
        const formatAudience = (a) => {
          const base = { all_staff: 'All Staff', all: 'All (incl. admin)', residents_only: 'Residents Only', attending_only: 'Attendings Only', medical_staff: 'Medical Staff', residents: 'Residents', attendings: 'Attendings' }
          if (base[a]) return base[a]
          if (a?.startsWith('dept_')) {
            const deptId = a.replace('dept_', '')
            const dept = departments.value.find(d => d.id === deptId) || allDepartmentsLookup.value.find(d => d.id === deptId)
            return dept ? `${dept.name} — All` : 'Department'
          }
          return a || '—'
        }
        // Only the 4 values the DB CHECK constraint allows:
        const formatStudyStatus = (s) => ({
          'Reclutando': 'Recruiting', 'Activo': 'Active',
          'Completado': 'Completed', 'En preparación': 'In preparation'
        }[s] || s)
        const getCurrentViewTitle = () => VIEW_TITLES[currentView.value] || 'neumDesk'
        const getCurrentViewSubtitle = () => {
          const v = currentView.value
          try {
            // ── Medical Staff ──────────────────────────────────────────────
            if (v === 'medical_staff') {
              const staff = medicalStaff.value || []
              const active = staff.filter(s => s.employment_status === 'active').length
              const residents = staff.filter(s => s.employment_status === 'active' && isResidentType(s.staff_type)).length
              const attendings = active - residents
              if (!active) return 'No active staff'
              return `${attendings} attending${attendings !== 1 ? 's' : ''} · ${residents} resident${residents !== 1 ? 's' : ''}`
            }
            // ── On-call ────────────────────────────────────────────────────
            if (v === 'oncall_schedule') {
              const today = Utils.normalizeDate(new Date())
              const todayShifts = (onCallOps.onCallSchedule?.value || []).filter(s =>
                Utils.normalizeDate(s.duty_date) === today
              )
              if (!todayShifts.length) return 'No shifts scheduled today'
              const areas = [...new Set(todayShifts.map(s =>
                s.coverage_area?.name || (onCallOps.coverageAreas?.value || []).find(a => a.id === s.coverage_area_id)?.name
              ).filter(Boolean))]
              return areas.length
                ? `Tonight: ${areas.slice(0,3).join(', ')}${areas.length > 3 ? ` +${areas.length - 3}` : ''}`
                : `${todayShifts.length} shift${todayShifts.length !== 1 ? 's' : ''} scheduled today`
            }
            // ── Rotations ──────────────────────────────────────────────────
            if (v === 'resident_rotations') {
              const rots = rotations.value || []
              const active = rots.filter(r => r.rotation_status === 'active').length
              const endingSoon = rots.filter(r => r.rotation_status === 'active' && getDaysRemaining(r.end_date) >= 0 && getDaysRemaining(r.end_date) <= 7).length
              if (!active) return 'No active rotations'
              const end = endingSoon ? ` · ${endingSoon} ending this week` : ''
              return `${active} active${end}`
            }
            // ── Training Units ─────────────────────────────────────────────
            if (v === 'training_units') {
              const units = trainingUnits.value || []
              const active = units.filter(u => u.unit_status === 'active').length
              const withSlots = units.filter(u => {
                const cur = (rotations.value || []).filter(r => r.training_unit_id === u.id && r.rotation_status === 'active').length
                return u.unit_status === 'active' && cur < (u.maximum_residents || 999)
              }).length
              if (!active) return 'No active units'
              return `${active} unit${active !== 1 ? 's' : ''} · ${withSlots} with open slot${withSlots !== 1 ? 's' : ''}`
            }
            // ── Staff Absence ──────────────────────────────────────────────
            if (v === 'staff_absence') {
              const kpis = absenceOps.absenceKPIs?.value
              if (!kpis) return 'Loading…'
              if (kpis.absentNow === 0 && kpis.upcoming === 0) return 'All staff present · No planned leave'
              const parts = []
              if (kpis.absentNow > 0) parts.push(`${kpis.absentNow} absent today`)
              if (kpis.noCoverage > 0) parts.push(`${kpis.noCoverage} need cover`)
              else if (kpis.upcoming > 0) parts.push(`${kpis.upcoming} planned`)
              return parts.join(' · ')
            }
            // ── Research ──────────────────────────────────────────────────
            if (['research_hub','research_lines','clinical_trials','innovation_projects','analytics_dashboard','analytics_performance','analytics_partners'].includes(v)) {
              const lines = researchOps.researchLines?.value?.length || 0
              const trials = researchOps.clinicalTrials?.value?.filter(t => t.study_status === 'Reclutando' || t.study_status === 'Activo').length || 0
              const projects = researchOps.innovationProjects?.value?.length || 0
              if (!lines && !trials) return 'No research data loaded yet'
              return `${lines} line${lines !== 1 ? 's' : ''} · ${trials} active stud${trials !== 1 ? 'ies' : 'y'} · ${projects} project${projects !== 1 ? 's' : ''}`
            }
            // ── News ──────────────────────────────────────────────────────
            if (v === 'news') {
              const posts = newsOps.newsPosts?.value || []
              const published = posts.filter(p => p.status === 'published').length
              const drafts = posts.filter(p => p.status === 'draft').length
              if (!posts.length) return 'No posts yet'
              return `${published} published${drafts ? ` · ${drafts} draft${drafts !== 1 ? 's' : ''}` : ''}`
            }
            // ── Dashboard ─────────────────────────────────────────────────
            if (v === 'dashboard') {
              const hour = new Date().getHours()
              const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
              const name = currentUser.value?.full_name?.split(' ')[0] || ''
              return name ? `${greeting}, ${name}` : greeting
            }
          } catch { /* fallback below */ }
          return ''
        }
        const getSearchPlaceholder = () => 'Search...'

        const getStaffTypeIcon = (t) => ({ attending_physician: 'fa-user-md', medical_resident: 'fa-user-graduate', fellow: 'fa-user-tie', nurse_practitioner: 'fa-user-nurse' }[t] || 'fa-user')
        // ── Unified avatar helpers ────────────────────────────────────────────
        const nmAv = (name, staffType, size = 'md') => Utils.avatarClass(staffType || '', name || '', size)
        const nmAvI = (name) => Utils.getInitials(name || '')
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
        // Dynamic: uses staffTypeMap flags instead of hardcoded type key lists
        // Falls back to legacy keys so nothing breaks if staffTypeMap isn't loaded yet

        const availableResidents = computed(() => {
          // Use isResidentType() which handles both staffTypeMap lookup AND fallback
          const residents = medicalStaff.value.filter(s =>
            s.employment_status === 'active' && isResidentType(s.staff_type)
          )
          // Sort: free residents first, currently rotating last
          const activeRotatingIds = new Set(
            rotations.value
              .filter(r => r.rotation_status === 'active')
              .map(r => r.resident_id)
          )
          return residents.sort((a, b) => {
            const aRot = activeRotatingIds.has(a.id) ? 1 : 0
            const bRot = activeRotatingIds.has(b.id) ? 1 : 0
            return aRot - bRot
          })
        })
        const availableAttendings = computed(() => medicalStaff.value.filter(s =>
          s.employment_status === 'active' && s.staff_type &&
          (staffTypeMap.value[s.staff_type] != null
            ? staffTypeMap.value[s.staff_type].can_supervise
            : s.staff_type === 'attending_physician')
        ))
        const availableHeadsOfDepartment = computed(() => availableAttendings.value)
        const availableReplacementStaff = computed(() => medicalStaff.value.filter(s => s.employment_status === 'active'))

        const showUserProfileModal = () => {
          // Find linked staff record by email match
          const linkedStaff = (currentUser.value?.email || currentUser.value?.full_name)
            ? medicalStaff.value.find(s =>
                s.professional_email === currentUser.value?.email ||
                s.full_name === currentUser.value?.full_name)
            : null
          userProfileModal.form = {
            full_name: currentUser.value?.full_name || '',
            email: currentUser.value?.email || '',
            department_id: currentUser.value?.department_id || '',
            linked_staff_id: linkedStaff?.id || null
          }
          userProfileModal.show = true; userMenuOpen.value = false
        }

        const saveUserProfile = async () => {
          saving.value = true
          try {
            // Update display name in app_users
            if (currentUser.value) {
              currentUser.value.full_name = userProfileModal.form.full_name
              currentUser.value.department_id = userProfileModal.form.department_id
            }
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(currentUser.value))
            // If this user has a linked staff record, open it for full profile editing
            if (userProfileModal.form.linked_staff_id) {
              const staffRecord = medicalStaff.value.find(s => s.id === userProfileModal.form.linked_staff_id)
              if (staffRecord) {
                userProfileModal.show = false
                viewStaffDetails(staffRecord)
                showToast('Profile', 'Edit your full clinical profile below', 'info')
                return
              }
            }
            userProfileModal.show = false; showToast('Success', 'Profile updated', 'success')
          }
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

        // switchView(view, filters) — supports cross-navigation with pre-applied filters
        // filters example: { department: deptId, category: 'external_resident' }
        const switchView = async (view, filters = {}) => {
          currentView.value = view; ui.mobileMenuOpen.value = false
          // Apply pre-filters if provided (cross-view navigation)
          if (filters.department) {
            if (staffFilters && staffFilters.department !== undefined) staffFilters.department = filters.department
            if (trainingUnitFilters && trainingUnitFilters.department !== undefined) trainingUnitFilters.department = filters.department
          }
          if (filters.residentCategory && staffFilters) { staffFilters.staffType = 'medical_resident'; staffFilters.residentCategory = filters.residentCategory }
          if (filters.status && staffFilters) staffFilters.status = filters.status
          if (filters.staffType && staffFilters) staffFilters.staffType = filters.staffType
          if (filters.rotationStatus && rotationFilters) rotationFilters.status = filters.rotationStatus
          if (filters.trainingUnit && rotationFilters) rotationFilters.trainingUnit = filters.trainingUnit
          ui.searchResultsOpen.value = false
          if (pagination[view]) pagination[view].page = 1
          // Trigger entrance animation on content area
          const ca = document.querySelector('.content-area')
          if (ca) { ca.classList.remove('content-view-enter'); void ca.offsetWidth; ca.classList.add('content-view-enter') }
          if (view === 'news') {
            currentView.value = 'news'
            // FIX Bug4: use newsLoaded flag, not length — empty result shouldn't trigger refetch
            if (!newsLoaded.value && !newsLoading.value) loadNews()
            return
          }
          if (view === 'communications') {
            currentView.value = 'communications'
            commsOps.loadAnnouncements()
            commsOps.loadOpsMetrics()
            return
          }
          if (view === 'system_settings') {
            currentView.value = 'system_settings'
            if (!staffTypesList.value.length) loadStaffTypes(true)
            if (!rotationServices.value.length) loadRotationServices()
            if (!onCallOps.coverageAreas.value.length) onCallOps.loadCoverageAreas()
            return
          }
          if (view === 'research_hub') {
            // Direct navigation — default to lines tab
            if (!analyticsOps.researchHubTab.value) analyticsOps.researchHubTab.value = 'lines'
            currentView.value = 'research_hub'
            // Load on-demand if background batch hasn't completed yet
            if (!researchOps.researchLines.value.length && !researchOps.researchLoading.value) {
              researchOps.loadAllResearch()
            }
            return
          } else if (view === 'research_lines') {
            analyticsOps.researchHubTab.value = 'lines'
            currentView.value = 'research_hub'
            if (filters.line) researchOps.trialFilters.line = filters.line
            if (!researchOps.researchLines.value.length && !researchOps.researchLoading.value) {
              researchOps.loadAllResearch()
            }
            return
          } else if (view === 'clinical_trials') {
            analyticsOps.researchHubTab.value = 'trials'
            currentView.value = 'research_hub'
            if (filters.line) researchOps.trialFilters.line = filters.line
            if (!researchOps.clinicalTrials.value.length && !researchOps.researchLoading.value) {
              researchOps.loadAllResearch()
            }
            return
          } else if (view === 'innovation_projects') {
            analyticsOps.researchHubTab.value = 'projects'
            currentView.value = 'research_hub'
            if (!researchOps.innovationProjects.value.length && !researchOps.researchLoading.value) {
              researchOps.loadAllResearch()
            }
            return
          }
        }

        const toggleStatsSidebar = () => { ui.statsSidebarOpen.value = !ui.statsSidebarOpen.value }

        // Research Hub drill-down helpers — need access to both analyticsOps and researchOps
        const drillToTrials = (lineId) => {
          if (lineId) researchOps.trialFilters.line = lineId
          analyticsOps.researchHubTab.value = 'trials'
          analyticsOps.researchDetailPanel.value = false
          currentView.value = 'research_hub'
        }
        const drillToProjects = (lineId) => {
          if (lineId) researchOps.projectFilters.research_line_id = lineId
          analyticsOps.researchHubTab.value = 'projects'
          analyticsOps.researchDetailPanel.value = false
          currentView.value = 'research_hub'
        }
        const handleGlobalSearch = () => {
          if (!ui.globalSearchQuery.value.trim()) { ui.searchResultsOpen.value = false; return }
          ui.searchResultsOpen.value = true
        }

        const globalSearchResults = Vue.computed(() => {
          const q = (ui.globalSearchQuery.value || '').toLowerCase().trim()
          if (!q || q.length < 2) return {}
          const results = {}
          const close = () => { ui.searchResultsOpen.value = false; ui.globalSearchQuery.value = '' }

          // ── Staff ──────────────────────────────────────────────────────
          const staff = (staffOps.medicalStaff.value || []).filter(s =>
            (s.full_name || '').toLowerCase().includes(q) ||
            (s.professional_email || '').toLowerCase().includes(q) ||
            (s.staff_id || '').toLowerCase().includes(q)
          ).slice(0, 4)
          if (staff.length) results.staff = staff.map(s => ({
            id: s.id, name: s.full_name,
            meta: rotationOps.formatStaffType ? rotationOps.formatStaffType(s.staff_type) : s.staff_type,
            icon: 'fa-user-md', action: () => { staffOps.viewStaffDetails(s); close() }
          }))

          // ── Rotations ──────────────────────────────────────────────────
          const rots = (rotationOps.rotations.value || []).filter(r => {
            const rn = (staffOps.medicalStaff.value || []).find(s => s.id === r.resident_id)
            const un = (trainingUnits.value || []).find(u => u.id === r.training_unit_id)
            return (rn && (rn.full_name || '').toLowerCase().includes(q)) ||
                   (un && (un.unit_name || '').toLowerCase().includes(q))
          }).slice(0, 3)
          if (rots.length) results.rotations = rots.map(r => {
            const rn = (staffOps.medicalStaff.value || []).find(s => s.id === r.resident_id)
            const un = (trainingUnits.value || []).find(u => u.id === r.training_unit_id)
            return { id: r.id, name: rn ? rn.full_name : 'Resident',
              meta: `${un?.unit_name || 'Rotation'} · ${r.rotation_status}`,
              icon: 'fa-calendar-check', action: () => { switchView('resident_rotations'); close() } }
          })

          // ── On-call shifts ─────────────────────────────────────────────
          const today = Utils.normalizeDate(new Date())
          const oncall = (onCallOps.onCallSchedule?.value || []).filter(s => {
            const d = Utils.normalizeDate(s.duty_date)
            if (d < today) return false
            const pName = (staffOps.medicalStaff.value || []).find(x => x.id === s.primary_physician_id)?.full_name || ''
            const aName = s.coverage_area?.name || (onCallOps.coverageAreas?.value || []).find(a => a.id === s.coverage_area_id)?.name || ''
            return pName.toLowerCase().includes(q) || aName.toLowerCase().includes(q)
          }).slice(0, 3)
          if (oncall.length) results.oncall = oncall.map(s => {
            const pName = (staffOps.medicalStaff.value || []).find(x => x.id === s.primary_physician_id)?.full_name || '—'
            const aName = s.coverage_area?.name || (onCallOps.coverageAreas?.value || []).find(a => a.id === s.coverage_area_id)?.name || ''
            return { id: s.id, name: pName,
              meta: `On-call · ${aName || 'No area'} · ${Utils.normalizeDate(s.duty_date)}`,
              icon: 'fa-phone', action: () => { switchView('oncall_schedule'); close() } }
          })

          // ── Absences ───────────────────────────────────────────────────
          const abs = (absenceOps.absences?.value || []).filter(a => {
            if (['cancelled','returned_to_duty'].includes(a.current_status)) return false
            const sName = (staffOps.medicalStaff.value || []).find(x => x.id === a.staff_member_id)?.full_name || ''
            return sName.toLowerCase().includes(q)
          }).slice(0, 3)
          if (abs.length) results.absences = abs.map(a => {
            const sName = (staffOps.medicalStaff.value || []).find(x => x.id === a.staff_member_id)?.full_name || '—'
            const reason = a.absence_reason?.replace(/_/g, ' ') || 'Absence'
            return { id: a.id, name: sName,
              meta: `${reason} · ${Utils.normalizeDate(a.start_date)} → ${Utils.normalizeDate(a.end_date || a.start_date)}`,
              icon: 'fa-user-clock', action: () => { switchView('staff_absence'); close() } }
          })

          // ── Coverage areas ─────────────────────────────────────────────
          const areas = (onCallOps.coverageAreas?.value || []).filter(a =>
            (a.name || '').toLowerCase().includes(q) || (a.code || '').toLowerCase().includes(q)
          ).slice(0, 2)
          if (areas.length) results.areas = areas.map(a => ({
            id: a.id, name: a.name,
            meta: `Coverage area · ${a.code}${a.requires_coverage ? ' · Required' : ''}`,
            icon: 'fa-map-marker-alt', action: () => { switchView('oncall_schedule'); close() }
          }))

          // ── Training units ─────────────────────────────────────────────
          const units = (trainingUnits.value || []).filter(u =>
            (u.unit_name || '').toLowerCase().includes(q) ||
            (u.unit_code || '').toLowerCase().includes(q)
          ).slice(0, 2)
          if (units.length) results.units = units.map(u => ({
            id: u.id, name: u.unit_name,
            meta: `Training unit · ${u.unit_status}`,
            icon: 'fa-hospital', action: () => { switchView('training_units'); close() }
          }))

          // ── Research ───────────────────────────────────────────────────
          const lines = (researchOps.researchLines.value || []).filter(l =>
            (l.research_line_name || l.name || '').toLowerCase().includes(q) ||
            (l.description || '').toLowerCase().includes(q)
          ).slice(0, 2)
          if (lines.length) results.research = lines.map(l => ({
            id: l.id, name: l.research_line_name || l.name,
            meta: 'Research line', icon: 'fa-flask',
            action: () => { switchView('research_lines'); close() }
          }))

          return results
        })

        const clearSearch = () => { ui.globalSearchQuery.value = ''; ui.searchResultsOpen.value = false }

        // ── Academic Degrees Management ────────────────────────────────────────
        const academicDegreeModal = reactive({
          show: false, mode: 'add',
          form: { id: null, name: '', abbreviation: '', display_order: 0, is_active: true }
        })
        const openAddAcademicDegree = () => {
          Object.assign(academicDegreeModal.form, { id: null, name: '', abbreviation: '', display_order: (academicDegrees.value.length + 1) * 10, is_active: true })
          academicDegreeModal.mode = 'add'
          academicDegreeModal.show = true
        }
        const openEditAcademicDegree = (deg) => {
          Object.assign(academicDegreeModal.form, { id: deg.id, name: deg.name, abbreviation: deg.abbreviation || '', display_order: deg.display_order || 0, is_active: deg.is_active !== false })
          academicDegreeModal.mode = 'edit'
          academicDegreeModal.show = true
        }
        const saveAcademicDegree = async () => {
          const f = academicDegreeModal.form
          if (!f.name?.trim()) { showToast('Validation', 'Degree name is required', 'warn'); return }
          try {
            if (academicDegreeModal.mode === 'add') {
              const created = await API.createAcademicDegree({ name: f.name.trim(), abbreviation: f.abbreviation?.trim() || null, display_order: f.display_order, is_active: f.is_active })
              academicDegrees.value.push(created)
              showToast('Success', 'Academic degree added', 'success')
            } else {
              const updated = await API.updateAcademicDegree(f.id, { name: f.name.trim(), abbreviation: f.abbreviation?.trim() || null, display_order: f.display_order, is_active: f.is_active })
              const idx = academicDegrees.value.findIndex(d => d.id === f.id)
              if (idx !== -1) academicDegrees.value[idx] = updated
              showToast('Success', 'Academic degree updated', 'success')
            }
            academicDegreeModal.show = false
            await loadAcademicDegrees()
          } catch (e) { showToast('Error', e?.message || 'Failed to save degree', 'error') }
        }
        const deleteAcademicDegree = (deg) => {
          showConfirmation({
            title: 'Delete Degree', message: `Delete "${deg.name}"? This cannot be undone.`,
            confirmText: 'Delete', confirmButtonClass: 'btn-danger',
            onConfirm: async () => {
              try {
                await API.deleteAcademicDegree(deg.id)
                academicDegrees.value = academicDegrees.value.filter(d => d.id !== deg.id)
                showToast('Success', 'Degree deleted', 'success')
              } catch (e) { showToast('Error', e?.message || 'Failed to delete', 'error') }
            }
          })
        }

        // ── Staff Types Management ─────────────────────────────────────────────
        // Loads dynamic staff types from DB and builds the reactive lookup map
        // ── Rotation Services ────────────────────────────────────────────
        const rotationServicesLoading = ref(false)
        const rotationServiceModal = reactive({
          show: false, mode: 'add',
          form: { name: '', service_type: 'rotation_service', contact_name: '', contact_email: '', contact_phone: '' }
        })

        const loadRotationServices = async () => {
          rotationServicesLoading.value = true
          try { rotationServices.value = await API.getRotationServices() }
          catch { console.error('Failed to load rotation services') }
          finally { rotationServicesLoading.value = false }
        }

        const openAddRotationService = () => {
          rotationServiceModal.mode = 'add'
          Object.assign(rotationServiceModal.form, { name: '', service_type: 'rotation_service', contact_name: '', contact_email: '', contact_phone: '' })
          rotationServiceModal.show = true
        }

        const openEditRotationService = (svc) => {
          rotationServiceModal.mode = 'edit'
          Object.assign(rotationServiceModal.form, { id: svc.id, name: svc.name, service_type: svc.service_type, contact_name: svc.contact_name || '', contact_email: svc.contact_email || '', contact_phone: svc.contact_phone || '' })
          rotationServiceModal.show = true
        }

        const saveRotationService = async () => {
          const f = rotationServiceModal.form
          if (!f.name?.trim()) { showToast('Validation', 'Service name is required', 'warn'); return }
          try {
            if (rotationServiceModal.mode === 'add') {
              await API.createRotationService(f)
              showToast('Success', 'Rotation service added', 'success')
            } else {
              await API.updateRotationService(f.id, f)
              showToast('Success', 'Rotation service updated', 'success')
            }
            rotationServiceModal.show = false
            await loadRotationServices()
          } catch (e) { showToast('Error', e?.message || 'Failed to save', 'error') }
        }

        const deleteRotationService = async (svc) => {
          showConfirmation({
            title: 'Remove Rotation Service',
            message: `Remove "${svc.name}" from the rotation services list?`,
            icon: 'fa-trash', confirmButtonText: 'Remove', confirmButtonClass: 'btn-danger',
            details: 'If residents are linked to this service, it will be deactivated instead of deleted.',
            onConfirm: async () => {
              try {
                await API.deleteRotationService(svc.id)
                await loadRotationServices()
                showToast('Done', 'Rotation service removed', 'success')
              } catch (e) { showToast('Error', e?.message || 'Failed to remove', 'error') }
            }
          })
        }

        const staffTypesLoading = ref(false) // FIX Bug6: dedicated loading flag for Settings skeleton
        const loadStaffTypes = async (includeInactive = false) => {
          staffTypesLoading.value = true
          try {
            const raw = await API.getStaffTypes(includeInactive)
            staffTypesList.value = raw
            // Build the fast-lookup map: { type_key → { display_name, badge_class, is_resident_type, can_supervise } }
            const map = {}
            raw.forEach(t => { map[t.type_key] = t })
            staffTypeMap.value = map
          } catch { console.error('Failed to load staff types') }
          finally { staffTypesLoading.value = false }
        }

        // ── Academic Degrees ────────────────────────────────────────────────
        const ACADEMIC_DEGREES_FALLBACK = [
          { id: 'LMed',     name: 'Licenciado en Medicina',                abbreviation: 'LMed'     },
          { id: 'GMed',     name: 'Grado en Medicina',                     abbreviation: 'GMed'     },
          { id: 'MIR',      name: 'Médico Interno Residente',              abbreviation: 'MIR'      },
          { id: 'PhD',      name: 'Doctor en Medicina (PhD)',              abbreviation: 'PhD'      },
          { id: 'MU',       name: 'Máster Universitario',                  abbreviation: 'MU'       },
          { id: 'EspNeum',  name: 'Especialista en Neumología',            abbreviation: 'Esp-Neum' },
          { id: 'DUE',      name: 'Diplomado Universitario en Enfermería', abbreviation: 'DUE'      },
          { id: 'GEnf',     name: 'Grado en Enfermería',                   abbreviation: 'GEnf'     },
          { id: 'TSID',     name: 'Técnico Superior Imagen Diagnóstica',   abbreviation: 'TSID'     },
          { id: 'LFarm',    name: 'Licenciado en Farmacia',                abbreviation: 'LFarm'    },
        ]

        const loadAcademicDegrees = async () => {
          try {
            const data = await API.getAcademicDegrees()
            const sorted = (data.length ? data : ACADEMIC_DEGREES_FALLBACK)
              .slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
            academicDegrees.value = sorted
          } catch {
            academicDegrees.value = ACADEMIC_DEGREES_FALLBACK
          }
        }

        // Staff Types manager modal (lives in System Settings)
        const staffTypeModal = reactive({
          show: false, mode: 'add',
          form: { type_key: '', display_name: '', badge_class: 'badge-secondary', is_resident_type: false, can_supervise: false, display_order: 0 },
          saving: false, deleting: false
        })
        const openAddStaffType = () => {
          Object.assign(staffTypeModal.form, { type_key: '', display_name: '', badge_class: 'badge-secondary', is_resident_type: false, can_supervise: false, display_order: staffTypesList.value.length * 10 })
          staffTypeModal.mode = 'add'
          staffTypeModal.show = true
        }
        const openEditStaffType = (t) => {
          Object.assign(staffTypeModal.form, { ...t })
          staffTypeModal.mode = 'edit'
          staffTypeModal.show = true
        }
        const saveStaffType = async () => {
          if (!staffTypeModal.form.display_name?.trim()) { showToast('Validation', 'Display name is required', 'error'); return }
          if (staffTypeModal.mode === 'add' && !staffTypeModal.form.type_key?.trim()) { showToast('Validation', 'Type key is required', 'error'); return }
          staffTypeModal.saving = true
          try {
            if (staffTypeModal.mode === 'add') {
              await API.createStaffType(staffTypeModal.form)
              showToast('Success', `Staff type "${staffTypeModal.form.display_name}" created`, 'success')
            } else {
              await API.updateStaffType(staffTypeModal.form.id, staffTypeModal.form)
              showToast('Success', `Staff type updated`, 'success')
            }
            await loadStaffTypes(true)
            staffTypeModal.show = false
          } catch (e) { showToast('Error', e.message || 'Failed to save staff type', 'error') }
          finally { staffTypeModal.saving = false }
        }
        const deleteStaffType = async (t) => {
          showConfirmation({
            title: 'Remove Staff Type',
            message: `Remove "${t.display_name}"? If staff members use this type it will be deactivated rather than deleted.`,
            icon: 'fa-trash', confirmButtonText: 'Remove', confirmButtonClass: 'btn-danger',
            onConfirm: async () => {
              try {
                const res = await API.deleteStaffType(t.id)
                showToast('Success', res?.message || 'Staff type removed', 'success')
                await loadStaffTypes(true)
              } catch (e) { showToast('Error', e.message || 'Failed to remove staff type', 'error') }
            }
          })
        }
        const toggleStaffTypeActive = async (t) => {
          try {
            await API.updateStaffType(t.id, { is_active: !t.is_active })
            showToast('Success', `Staff type ${t.is_active ? 'deactivated' : 'activated'}`, 'success')
            await loadStaffTypes(true)
          } catch (e) { showToast('Error', 'Failed to update staff type', 'error') }
        }

        const warmBackend = async () => {
          // Fire a lightweight ping to wake Railway from sleep before the real requests hit.
          // /health requires no auth and returns immediately once the container is warm.
          // We don't await the result — just send and move on. By the time the main
          // requests arrive the container will already be processing.
          try { fetch(`${CONFIG.API_BASE_URL}/health`).catch(() => {}) } catch {}
        }

        // ── Core system settings ────────────────────────────────────────────
        const activeSvcId = ref(null)
        const systemSettings = reactive({
          hospital_name: 'neumDesk Hospital',
          max_residents_per_unit: 10,
          default_rotation_duration: 12,
          enable_audit_logging: true,
          notifications_enabled: true,
          absence_notifications: true,
          maintenance_mode: false
        })
        const loadSystemSettings = async () => {
          try {
            const data = await API.request('/api/settings')
            if (data && typeof data === 'object') Object.assign(systemSettings, data)
          } catch { /* silently use defaults */ }
        }
        const saveSystemSettings = async () => {
          try {
            await API.request('/api/settings', { method: 'PUT', body: { ...systemSettings } })
            showToast('Saved', 'System settings updated', 'success')
          } catch (e) { showToast('Error', e?.message || 'Failed to save settings', 'error') }
        }

        const getUnitFillColor = (unit, rotations) => {
        const cur = (rotations?.value || rotations || []).filter(r => r.training_unit_id === unit.id && r.rotation_status === 'active').length
        const max = unit.maximum_residents || 1
        const pct = cur / max
        return pct >= 1 ? '#e24b4a' : pct >= 0.75 ? '#ef9f27' : cur === 0 ? 'var(--nm-surface3)' : '#10b981'
      }

      const loadAllData = async () => {
          loading.value = true
          try {
            // Wake Railway immediately — runs in background while we set up
            warmBackend()

            // loadAcademicDegrees is synchronous (uses fallback data) — free.
            // loadStaffTypes needs ONE network call — run it in parallel with the
            // first main batch. staffTypeMap will be populated by the time any
            // staff dropdown renders because Vue defers rendering until microtasks settle.
            await Promise.all([
              loadStaffTypes(),
              loadAcademicDegrees(),
              loadRotationServices(),
              onCallOps.loadCoverageAreas(),
              loadSystemSettings(),
              staffOps.loadMedicalStaff(),
              loadDepartments(),
              loadTrainingUnits()
            ])

            // Second batch: depends on staff + units being loaded
            await Promise.all([
              rotationOps.loadRotations(),
              onCallOps.loadOnCallSchedule(),
              absenceOps.loadAbsences()
            ])

            updateDashboardStats()

            // Third batch: non-critical, fire and forget
            Promise.all([
              onCallOps.loadTodaysOnCall(),
              commsOps.loadAnnouncements(),
              liveOps.loadClinicalStatus(),
              liveOps.loadActiveMedicalStaff(),
              researchOps.loadResearchLines(),
              loadSystemStats(),
              loadNews() // FIX Bug7: kept here but newsLoaded flag prevents duplicate call if user already navigated to news
            ]).then(() => updateDashboardStats())

            // Low priority — research analytics
            Promise.all([
              researchOps.loadClinicalTrials(),
              researchOps.loadInnovationProjects(),
              analyticsOps.loadAnalyticsSummary()
            ])

          } catch { showToast('Error', 'Failed to load some data', 'error') }
          finally { loading.value = false }
        }

        watch([medicalStaff, rotations, trainingUnits, absences], () => updateDashboardStats(), { deep: true })

        // ── isOnline — declared at root scope so template can access it ──
        const isOnline = ref(navigator.onLine)
        // Update when API layer fires events
        window.addEventListener('neumax:online',  () => { isOnline.value = true  })
        window.addEventListener('neumax:offline', () => { isOnline.value = false })

        onMounted(() => {
          const token = localStorage.getItem(CONFIG.TOKEN_KEY)
          const user = localStorage.getItem(CONFIG.USER_KEY)
          if (token && user) {
            try {
              // Validate token with backend before showing the app.
              // This blocks access from shared/QR sessions with expired tokens.
              const parsed = JSON.parse(user)
              currentUser.value = parsed  // optimistic — show splash while validating
              currentView.value = 'dashboard'
              // Validate in background — if invalid, session-expired event fires
              API.request('/api/auth/me').then(data => {
                if (data && data.id) {
                  currentUser.value = { ...parsed, ...data }
                  loadAllData()
                } else {
                  window.dispatchEvent(new CustomEvent('neumax:session-expired'))
                }
              }).catch(() => {
                window.dispatchEvent(new CustomEvent('neumax:session-expired'))
              })
            }
            catch { currentView.value = 'login' }
          } else { currentView.value = 'login' }

          // Session expiry — redirect to login cleanly from anywhere in the app
          // ── Online / offline / maintenance ──
          window.addEventListener('neumax:online', () => {
            isOnline.value = true
            showToast('Connection restored', 'Back online — syncing…', 'success', 3000)
            if (currentUser.value) {
              try { staffOps.loadMedicalStaff(true); rotationOps.loadRotations(true) } catch {}
            }
          })
          window.addEventListener('neumax:offline', () => {
            isOnline.value = false
            showToast('No connection', 'You are offline. Changes cannot be saved until you reconnect.', 'warning', 0)
          })
          window.addEventListener('neumax:maintenance', () => {
            showToast('System Maintenance', 'The system is temporarily offline for maintenance.', 'warning', 0)
          })

          // ── Dashboard auto-refresh every 5 min ──
          const dashRefreshInterval = setInterval(() => {
            if (currentUser.value && currentView.value === 'dashboard') {
              try { dashOps.loadSystemStats() } catch {}
            }
          }, 300000)

          window.addEventListener('neumax:session-expired', () => {
            currentUser.value = null
            currentView.value = 'login'
            // Close all open panels/modals
            try {
              const modals = [staffOps.medicalStaffModal, staffOps.staffProfileModal,
                departmentModal, trainingUnitModal, unitResidentsModal, unitCliniciansModal,
                rotationOps.rotationModal, rotationOps.rotationViewModal,
                onCallOps.onCallModal, absenceOps.absenceModal, commsOps.communicationsModal]
              modals.forEach(m => { if (m && 'show' in m) m.show = false })
              if (deptPanel) deptPanel.show = false
            } catch {}
            // Set friendly message on login page
            loginError.value = 'Your session has expired. Please log in again.'
            showToast('Session Expired', 'Your session has expired. Please log in again.', 'warning', 6000)
          })

          window.addEventListener('neumax:maintenance', () => { ui.isMaintenanceMode.value = true })

          const statusInterval = setInterval(() => { if (currentUser.value && !liveOps.isLoadingStatus.value) liveOps.loadClinicalStatus() }, 60000)
          const timeInterval = setInterval(() => { dashOps.currentTime.value = new Date() }, 60000)

          let rotationCheckInterval = null
          if (rotationOps.initAutoCheck) rotationCheckInterval = rotationOps.initAutoCheck()

          document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return
            const modals = [staffOps.medicalStaffModal, staffOps.staffProfileModal, departmentModal, trainingUnitModal, unitResidentsModal, unitCliniciansModal, rotationOps.rotationModal, rotationOps.rotationViewModal, onCallOps.onCallModal, absenceOps.absenceModal, commsOps.communicationsModal, userProfileModal, ui.confirmationModal, researchOps.researchLineModal, researchOps.clinicalTrialModal, researchOps.innovationProjectModal, researchOps.assignCoordinatorModal, analyticsOps.exportModal, rotationOps.activationModal]
            modals.forEach(m => { if (m.show) m.show = false })
          })

          onUnmounted(() => { clearInterval(statusInterval); clearInterval(timeInterval); clearInterval(dashRefreshInterval); if (rotationCheckInterval) clearInterval(rotationCheckInterval) })
        })

        // ── ⌘K Command Palette (defined here — full access to all refs) ──
        const cmdQuery       = ref('')
        const cmdSelectedIdx = ref(0)
        watch(cmdQuery, () => { cmdSelectedIdx.value = 0 })

        // ── GLOBAL PHYSICIAN POPOVER ──────────────────────────────────────────
        const popover = Vue.reactive({ staff: null, visible: false })
        let _popoverTimer = null

        const showPopover = (staffObj, event) => {
          if (!staffObj) return
          clearTimeout(_popoverTimer)
          _popoverTimer = setTimeout(() => {
            popover.staff = staffObj
            const el = document.getElementById('staffPopover')
            if (!el) return
            const rect = event.currentTarget?.getBoundingClientRect?.() || event.target?.getBoundingClientRect?.() || { top: event.clientY, left: event.clientX, width: 0, height: 0 }
            const vpW = window.innerWidth, vpH = window.innerHeight
            const pw = 300, ph = 360  // approx popover size
            let left = rect.left + rect.width / 2 - pw / 2
            let top  = rect.bottom + 8
            if (left + pw > vpW - 12) left = vpW - pw - 12
            if (left < 12) left = 12
            if (top + ph > vpH - 12) top = rect.top - ph - 8
            el.style.left = left + 'px'
            el.style.top  = top  + 'px'
            el.classList.add('visible')
            popover.visible = true
          }, 220)
        }

        const hidePopover = () => {
          clearTimeout(_popoverTimer)
          const el = document.getElementById('staffPopover')
          if (el) el.classList.remove('visible')
          setTimeout(() => { popover.staff = null; popover.visible = false }, 200)
        }

        // Keep popover open when hovering over it
        if (typeof document !== 'undefined') {
          document.addEventListener('mouseover', (e) => {
            const pop = document.getElementById('staffPopover')
            if (pop && pop.contains(e.target)) return  // inside popover = stay
            if (!e.target.closest('[data-popover-staff]')) hidePopover()
          }, { passive: true })
        }

        // ── ABSENCE COVERAGE CALENDAR ─────────────────────────────────────────
        const absenceCalendarOffset = Vue.ref(0) // months from now

        const absenceMoveMonth = (delta) => { absenceCalendarOffset.value += delta }

        const absenceCalendarTitle = Vue.computed(() => {
          const d = new Date()
          d.setMonth(d.getMonth() + absenceCalendarOffset.value)
          return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        })

        const absenceCalendarCells = Vue.computed(() => {
          const d = new Date()
          d.setMonth(d.getMonth() + absenceCalendarOffset.value)
          const year = d.getFullYear(), month = d.getMonth()
          const firstDay = new Date(year, month, 1).getDay()  // 0=Sun
          const startOffset = (firstDay === 0) ? 6 : firstDay - 1  // Mon-first
          const daysInMonth  = new Date(year, month+1, 0).getDate()
          const daysInPrev   = new Date(year, month, 0).getDate()
          const cells = []
          const today = new Date(); today.setHours(0,0,0,0)

          // Fill prev month overflow
          for (let i = startOffset; i > 0; i--) {
            cells.push({ date: null, day: daysInPrev - i + 1, otherMonth: true, absences: [] })
          }
          // Fill current month
          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const cellDate = new Date(year, month, day)
            const dayAbsences = (absences.value || []).filter(a => {
              if (!a.start_date || !a.end_date) return false
              const s = new Date(a.start_date + 'T00:00:00')
              const e = new Date(a.end_date + 'T23:59:59')
              return cellDate >= s && cellDate <= e
            })
            const isToday = cellDate.getTime() === today.getTime()
            // Coverage risk: multiple senior staff absent = risk
            const seniorAbsent = dayAbsences.filter(a => {
              const staff = medicalStaff.value.find(s => s.id === a.staff_member_id)
              return staff && !isResidentType(staff.staff_type)
            }).length
            cells.push({
              date: dateStr, day, otherMonth: false, isToday,
              absences: dayAbsences,
              riskLevel: seniorAbsent >= 2 ? 'gap' : seniorAbsent === 1 ? 'risk' : dayAbsences.length > 0 ? 'covered' : 'clear'
            })
          }
          // Fill to complete grid (multiple of 7)
          let next = 1
          while (cells.length % 7 !== 0) {
            cells.push({ date: null, day: next++, otherMonth: true, absences: [] })
          }
          return cells
        })



        const cmdItems = computed(() => {
          const q = cmdQuery.value.toLowerCase().trim()
          const views = [
            { type:'view', id:'dashboard',         label:'Overview',       sub:'Dashboard'       },
            { type:'view', id:'medical_staff',      label:'Medical Staff',  sub:'Clinical'        },
            { type:'view', id:'oncall_schedule',    label:'On-call',        sub:'Clinical · live' },
            { type:'view', id:'training_units',     label:'Clinical Units', sub:'Structure'       },
            { type:'view', id:'resident_rotations', label:'Rotations',      sub:'Structure'       },
            { type:'view', id:'staff_absence',      label:'Absence',        sub:'Administration'  },
            { type:'view', id:'system_settings',    label:'Settings',       sub:'Administration'  },
            { type:'view', id:'research_hub',       label:'Research Hub',   sub:'Research'        },
            { type:'view', id:'news',               label:'News & Posts',   sub:'Research'        },
          ]
          const staffItems = !q ? [] : medicalStaff.value
            .filter(s => s.full_name?.toLowerCase().includes(q))
            .slice(0,5)
            .map(s => ({ type:'staff', id:s.id, label:s.full_name, sub:formatStaffType(s.staff_type) || 'Staff member' }))
          const unitItems = !q ? [] : trainingUnits.value
            .filter(u => u.unit_name?.toLowerCase().includes(q))
            .slice(0,3)
            .map(u => ({ type:'unit', id:u.id, label:u.unit_name, sub:'Clinical unit' }))
          // Action items — shown when query matches action keywords or staff name with action verb
          const actionItems = []
          const actionKeywords = ['add','new','log','create','assign','absence','rotation','callout','call-out','duty','guardia','aviso']
          const hasActionWord = actionKeywords.some(k => q.includes(k))
          if (q.includes('rotation') || q.includes('assign') || (hasActionWord && q.includes('rotat'))) {
            actionItems.push({ type:'action', id:'add_rotation', label:'Add rotation', sub:'Assign a resident to a unit', icon:'fa-calendar-plus', fn: () => rotationOps.showAddRotationModal() })
          }
          if (q.includes('absence') || q.includes('ausencia') || (hasActionWord && q.includes('abs'))) {
            actionItems.push({ type:'action', id:'add_absence', label:'Log absence', sub:'Record a new absence', icon:'fa-user-minus', fn: () => { switchView('staff_absence'); Vue.nextTick(() => absenceOps?.showAddAbsenceModal?.()) } })
          }
          if (q.includes('callout') || q.includes('call-out') || q.includes('aviso') || q.includes('guardia') || (hasActionWord && q.includes('call'))) {
            actionItems.push({ type:'action', id:'log_callout', label:'Log call-out', sub:'Record an emergency duty call', icon:'fa-phone', fn: () => { switchView('oncall_schedule'); Vue.nextTick(() => { if (typeof openLogCalloutModal === 'function') openLogCalloutModal() }) } })
          }
          if (!q || q.includes('staff') || q.includes('medico') || q.includes('doctor') || (hasActionWord && (q.includes('new') || q.includes('add')))) {
            if (q && hasActionWord) actionItems.push({ type:'action', id:'add_staff', label:'Add staff member', sub:'Register a new physician or resident', icon:'fa-user-plus', fn: () => { switchView('medical_staff'); Vue.nextTick(() => staffOps?.showAddMedicalStaffModal?.()) } })
          }
          // Staff action items — when query contains a staff name + action word
          const staffActionItems = !q ? [] : medicalStaff.value
            .filter(s => s.full_name?.toLowerCase().includes(q) && hasActionWord)
            .slice(0,3)
            .flatMap(s => [
              { type:'action', id:'rot_'+s.id, label:'Assign rotation — ' + (s.full_name.split(' ').slice(-1)[0]), sub:'Open rotation modal pre-filled', fn: () => rotationOps.showAddRotationModal(s) },
              { type:'action', id:'abs_'+s.id, label:'Log absence — ' + (s.full_name.split(' ').slice(-1)[0]),    sub:'Open absence modal pre-filled',  fn: () => { switchView('staff_absence'); Vue.nextTick(() => absenceOps?.showAddAbsenceModal?.(s)) } },
            ])
          const viewItems = views.filter(v => !q || v.label.toLowerCase().includes(q) || v.sub.toLowerCase().includes(q))
          return [...actionItems, ...staffActionItems, ...staffItems, ...unitItems, ...viewItems].slice(0, 12)
        })

        const executeCmdItem = (item) => {
          if (!item) return
          ui.cmdPaletteOpen.value = false
          cmdQuery.value = ''
          if (item.type === 'action' && item.fn) { item.fn(); return }
          if (item.type === 'view')  switchView(item.id)
          else if (item.type === 'unit')  switchView('training_units')
          else if (item.type === 'staff') switchView('medical_staff')
        }

        // Focus cmd input whenever palette opens
        watch(() => ui.cmdPaletteOpen.value, (open) => {
          if (open) {
            Vue.nextTick(() => {
              const inp = document.querySelector('.cmd-input-row input')
              if (inp) inp.focus()
            })
          }
        })

        // Arrow key navigation for palette (needs cmdItems in scope)
        window.addEventListener('keydown', (e) => {
          if (!ui.cmdPaletteOpen.value) return
          if (e.key === 'ArrowDown') { e.preventDefault(); cmdSelectedIdx.value = Math.min(cmdSelectedIdx.value + 1, Math.max(cmdItems.value.length - 1, 0)) }
          if (e.key === 'ArrowUp')   { e.preventDefault(); cmdSelectedIdx.value = Math.max(cmdSelectedIdx.value - 1, 0) }
          if (e.key === 'Enter') { e.preventDefault(); executeCmdItem(cmdItems.value[cmdSelectedIdx.value]) }
        })



      // ═══════════════════════════════════════════════════════════════
      //  CLINICAL INTELLIGENCE LAYER — hover popovers + availability
      // ═══════════════════════════════════════════════════════════════

      // ── Hover popover system ──
      const hoverPopover = Vue.reactive({
        show: false, x: 0, y: 0,
        staffId: null, data: null, entering: false,
        _timer: null, _hideTimer: null
      })

      const getStaffPulseState = (staffId) => {
        if (!staffId) return 'inactive'
        const staff = medicalStaff.value.find(s => s.id === staffId)
        if (!staff) return 'inactive'
        if (staff.employment_status === 'on_leave') return 'leave'
        const today = Utils.normalizeDate(new Date())
        const onCallToday = onCallSchedule.value.some(s =>
          Utils.normalizeDate(s.duty_date) === today && s.primary_physician_id === staffId
        )
        if (onCallToday) return 'oncall'
        const rot = rotations.value.find(r => r.resident_id === staffId && r.rotation_status === 'active')
        if (rot) {
          const daysLeft = Math.ceil((new Date(rot.end_date) - new Date()) / 86400000)
          if (daysLeft <= 7) return 'ending'
        }
        if (staff.employment_status === 'inactive') return 'inactive'
        return 'available'
      }

      const getStaffNextEvent = (staffId) => {
        if (!staffId) return null
        const today = new Date(); today.setHours(0,0,0,0)
        // Check current rotation ending soon
        const rot = rotations.value.find(r =>
          r.resident_id === staffId && r.rotation_status === 'active'
        )
        if (rot) {
          const end = new Date(rot.end_date + 'T00:00:00')
          const daysLeft = Math.ceil((end - today) / 86400000)
          if (daysLeft <= 14) return { type: 'ending', label: `Rotation ends in ${daysLeft}d`, color: 'ending' }
        }
        // Check next on-call
        const nextOC = onCallSchedule.value
          .filter(s => s.primary_physician_id === staffId)
          .filter(s => new Date(s.duty_date + 'T00:00:00') >= today)
          .sort((a,b) => a.duty_date.localeCompare(b.duty_date))[0]
        if (nextOC) {
          const d = new Date(nextOC.duty_date + 'T00:00:00')
          const diff = Math.ceil((d - today) / 86400000)
          const label = diff === 0 ? 'On call today' : diff === 1 ? 'On call tomorrow' : `On call ${d.toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short'})}`
          return { type: 'oncall', label, color: 'oncall' }
        }
        // Check upcoming leave
        const nextLeave = absences.value
          .filter(a => a.staff_member_id === staffId)
          .filter(a => new Date(a.end_date + 'T00:00:00') >= today && a.current_status !== 'returned_to_duty')
          .sort((a,b) => a.start_date.localeCompare(b.start_date))[0]
        if (nextLeave) {
          const start = new Date(nextLeave.start_date + 'T00:00:00')
          const diff = Math.ceil((start - today) / 86400000)
          const label = diff <= 0 ? 'On leave now' : `Leave in ${diff}d`
          return { type: 'leave', label, color: 'leave' }
        }
        // Check scheduled rotation
        const nextRot = rotations.value.find(r =>
          r.resident_id === staffId && r.rotation_status === 'scheduled'
        )
        if (nextRot) {
          const start = new Date(nextRot.start_date + 'T00:00:00')
          const diff = Math.ceil((start - today) / 86400000)
          if (diff <= 30) return { type: 'rotation', label: `Rotation starts in ${diff}d`, color: 'rotation' }
        }
        return null
      }

      const buildStaffPopoverData = (staffId) => {
        const staff = medicalStaff.value.find(s => s.id === staffId)
        if (!staff) return null
        const pulse = getStaffPulseState(staffId)
        const nextEvent = getStaffNextEvent(staffId)
        const currentRot = rotations.value.find(r => r.resident_id === staffId && r.rotation_status === 'active')
        const upcomingOC = onCallSchedule.value
          .filter(s => s.primary_physician_id === staffId)
          .filter(s => new Date(s.duty_date + 'T00:00:00') >= new Date())
          .sort((a,b) => a.duty_date.localeCompare(b.duty_date))
          .slice(0, 3)
        const currentLeave = absences.value.find(a => {
          const today = Utils.normalizeDate(new Date())
          return a.staff_member_id === staffId &&
            Utils.normalizeDate(a.start_date) <= today &&
            Utils.normalizeDate(a.end_date) >= today
        })
        const certCount = 0 // loaded separately on drawer open
        return { staff, pulse, nextEvent, currentRot, upcomingOC, currentLeave }
      }

      const showIntelPopover = (staffIdOrObj, event) => {
        // Accept both a UUID string and a full staff object
        const staffId = (typeof staffIdOrObj === 'object' && staffIdOrObj !== null)
          ? (staffIdOrObj.id || staffIdOrObj)
          : staffIdOrObj
        if (hoverPopover._timer) clearTimeout(hoverPopover._timer)
        if (hoverPopover._hideTimer) clearTimeout(hoverPopover._hideTimer)
        hoverPopover._timer = setTimeout(() => {
          const data = buildStaffPopoverData(staffId)
          if (!data) return
          const rect = event.currentTarget?.getBoundingClientRect?.() || { right: event.clientX, top: event.clientY, bottom: event.clientY }
          hoverPopover.x = Math.min(rect.right + 10, window.innerWidth - 300)
          hoverPopover.y = Math.min(rect.top - 10, window.innerHeight - 280)
          hoverPopover.staffId = staffId
          hoverPopover.data = data
          hoverPopover.show = true
          hoverPopover.entering = true
          setTimeout(() => { hoverPopover.entering = false }, 200)
        }, 280)
      }

      const hideIntelPopover = () => {
        if (hoverPopover._timer) { clearTimeout(hoverPopover._timer); hoverPopover._timer = null }
        hoverPopover._hideTimer = setTimeout(() => { hoverPopover.show = false }, 150)
      }

      // ── Absence calendar computed ──
      const absCalendarMonth = Vue.ref(new Date().getMonth())
      const absCalendarYear  = Vue.ref(new Date().getFullYear())

      const absCalendarDays = Vue.computed(() => {
        const year = absCalendarYear.value
        const month = absCalendarMonth.value
        const firstDay = new Date(year, month, 1)
        const lastDay  = new Date(year, month + 1, 0)
        const startDow = (firstDay.getDay() + 6) % 7 // Mon=0
        const days = []
        // Pad with previous month days
        for (let i = startDow - 1; i >= 0; i--) {
          const d = new Date(year, month, -i)
          days.push({ date: Utils.normalizeDate(d), day: d.getDate(), otherMonth: true, absences: [], risk: 'low' })
        }
        // Current month days
        for (let d = 1; d <= lastDay.getDate(); d++) {
          const date = new Date(year, month, d)
          const dateStr = Utils.normalizeDate(date)
          const dayAbsences = absences.value.filter(a => {
            const s = Utils.normalizeDate(a.start_date)
            const e = Utils.normalizeDate(a.end_date)
            return s <= dateStr && e >= dateStr &&
              a.current_status !== 'returned_to_duty' && a.current_status !== 'cancelled'
          })
          // Risk: high if senior staff absent, medium if any
          const seniorAbsent = dayAbsences.filter(a => {
            const staff = medicalStaff.value.find(s => s.id === a.staff_member_id)
            return staff && !isResidentType(staff.staff_type)
          }).length
          const risk = seniorAbsent >= 2 ? 'high' : seniorAbsent === 1 ? 'medium' : dayAbsences.length > 0 ? 'low' : 'none'
          const isToday = dateStr === Utils.normalizeDate(new Date())
          days.push({ date: dateStr, day: d, otherMonth: false, absences: dayAbsences, risk, isToday })
        }
        // Pad to complete grid (multiples of 7)
        const remaining = (7 - (days.length % 7)) % 7
        for (let d = 1; d <= remaining; d++) {
          const date = new Date(year, month + 1, d)
          days.push({ date: Utils.normalizeDate(date), day: d, otherMonth: true, absences: [], risk: 'low' })
        }
        return days
      })

      const absCalendarTitle = Vue.computed(() => {
        return new Date(absCalendarYear.value, absCalendarMonth.value, 1)
          .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      })

      const absCalPrevMonth = () => {
        if (absCalendarMonth.value === 0) { absCalendarMonth.value = 11; absCalendarYear.value-- }
        else absCalendarMonth.value--
      }
      const absCalNextMonth = () => {
        if (absCalendarMonth.value === 11) { absCalendarMonth.value = 0; absCalendarYear.value++ }
        else absCalendarMonth.value++
      }

      // Absence view mode
      const absenceViewMode = Vue.ref('table') // 'table' | 'calendar' | 'timeline'
      const absTimelineHorizon  = Vue.ref(3)   // 1 | 3 | 6 months
      const absTimelineOffset   = Vue.ref(0)   // months from today
      const absTimelinePlanning = Vue.ref(false) // false=review, true=planning

      // ── Absence colour map ───────────────────────────────────────────
      const ABS_COLOURS = {
        vacation:   { bg: '#0ea5e9', label: 'Vacation'   },
        sick_leave: { bg: '#ef4444', label: 'Sick leave' },
        conference: { bg: '#10b981', label: 'Conference' },
        training:   { bg: '#8b5cf6', label: 'Training'   },
        personal:   { bg: '#64748b', label: 'Personal'   },
        other:      { bg: '#94a3b8', label: 'Other'      },
      }

      // ── Staff rows for timeline ──────────────────────────────────────
      // Review: only staff with absences in horizon
      // Planning: all active staff
      const absTimelineStaff = Vue.computed(() => {
        const months   = getHorizonMonths(absTimelineHorizon.value, absTimelineOffset.value)
        if (!months.length) return { attendings: [], residents: [] }
        const hStart   = new Date(months[0].year, months[0].month, 1)
        const hEnd     = new Date(months[months.length-1].year, months[months.length-1].month + 1, 0)
        const allStaff = (medicalStaff.value || []).filter(s => s.employment_status !== 'inactive')

        // In Review mode: only show active/planned absences (skip returned_to_duty)
        const relevantAbsences = (absences.value || []).filter(a =>
          !['returned_to_duty', 'cancelled'].includes(a.current_status)
        )

        const hasAbsInHorizon = (staffId) =>
          relevantAbsences.some(a => {
            const s = new Date(a.start_date + 'T00:00:00')
            const e = new Date((a.end_date || a.start_date) + 'T00:00:00')
            return a.staff_member_id === staffId && s <= hEnd && e >= hStart
          })

        const eligible = absTimelinePlanning.value
          ? allStaff
          : allStaff.filter(s => hasAbsInHorizon(s.id))

        const attendings = eligible.filter(s => !isResidentType(s.staff_type))
        const residents  = eligible.filter(s =>  isResidentType(s.staff_type))
        return { attendings, residents }
      })

      // ── Get absence bars for one staff member in the horizon ─────────
      const getStaffAbsencesInHorizon = (staffId) => {
        const months = getHorizonMonths(absTimelineHorizon.value, absTimelineOffset.value)
        if (!months.length) return []
        const hStart = new Date(months[0].year, months[0].month, 1)
        const hEnd   = new Date(months[months.length-1].year, months[months.length-1].month + 1, 0)
        return (absences.value || []).filter(a => {
          if (a.staff_member_id !== staffId) return false
          if (['returned_to_duty', 'cancelled'].includes(a.current_status)) return false
          const s = new Date(a.start_date + 'T00:00:00')
          const e = new Date((a.end_date || a.start_date) + 'T00:00:00')
          return s <= hEnd && e >= hStart
        })
      }

      // ── Bar style (reuses rotation logic exactly) ────────────────────
      const getAbsenceBarStyle = (absence) => {
        const months    = getHorizonMonths(absTimelineHorizon.value, absTimelineOffset.value)
        const n         = months.length
        if (!n) return { display: 'none' }
        const hStart    = new Date(months[0].year, months[0].month, 1)
        const hEnd      = new Date(months[n-1].year, months[n-1].month + 1, 0)
        const absStart  = new Date(absence.start_date + 'T00:00:00')
        const absEnd    = new Date((absence.end_date || absence.start_date) + 'T00:00:00')
        const cs        = absStart < hStart ? hStart : absStart
        const ce        = absEnd   > hEnd   ? hEnd   : absEnd
        if (cs > ce) return { display: 'none' }
        const totalDays = months.reduce((s, m) => s + m.daysInMonth, 0)
        const daysToStart = Math.round((cs - hStart) / 86400000)
        const daysToEnd   = Math.round((ce - hStart) / 86400000) + 1
        const leftPct   = (daysToStart / totalDays) * 100
        const widthPct  = ((daysToEnd - daysToStart) / totalDays) * 100
        const clippedL  = absStart < hStart
        const clippedR  = absEnd   > hEnd
        return {
          left:         `calc(${leftPct.toFixed(2)}% + ${clippedL ? '0' : '3'}px)`,
          width:        `calc(${widthPct.toFixed(2)}% - ${clippedL || clippedR ? '3' : '6'}px)`,
          background:   ABS_COLOURS[absence.absence_reason]?.bg || '#94a3b8',
          borderRadius: clippedL && clippedR ? '0' : clippedL ? '0 4px 4px 0' : clippedR ? '4px 0 0 4px' : '4px',
        }
      }

      // ── Coverage lane: attendings NOT absent per month ───────────────
      const absTimelineCoverage = Vue.computed(() => {
        const months     = getHorizonMonths(absTimelineHorizon.value, absTimelineOffset.value)
        const totalAtt   = (medicalStaff.value || []).filter(s =>
          !isResidentType(s.staff_type) && s.employment_status === 'active').length
        return months.map(m => {
          const mStart = new Date(m.year, m.month, 1)
          const mEnd   = new Date(m.year, m.month + 1, 0)
          const absentAtt = (absences.value || []).filter(a => {
            if (['returned_to_duty', 'cancelled'].includes(a.current_status)) return false
            if (isResidentType((medicalStaff.value || []).find(s => s.id === a.staff_member_id)?.staff_type)) return false
            const s = new Date(a.start_date + 'T00:00:00')
            const e = new Date((a.end_date || a.start_date) + 'T00:00:00')
            return s <= mEnd && e >= mStart
          }).length
          const available = Math.max(0, totalAtt - absentAtt)
          const pct       = totalAtt > 0 ? available / totalAtt : 1
          const state     = pct >= 0.7 ? 'ok' : pct >= 0.4 ? 'warn' : 'critical'
          return { ...m, available, total: totalAtt, pct, state }
        })
      })

      // ── Today position as % across the horizon ───────────────────────
      const absTimelineTodayPct = Vue.computed(() => {
        const months = getHorizonMonths(absTimelineHorizon.value, absTimelineOffset.value)
        if (!months.length) return -1
        const hStart     = new Date(months[0].year, months[0].month, 1)
        const hEnd       = new Date(months[months.length-1].year, months[months.length-1].month + 1, 0)
        const today      = new Date()
        if (today < hStart || today > hEnd) return -1
        const totalDays  = months.reduce((s, m) => s + m.daysInMonth, 0)
        const daysToday  = Math.round((today - hStart) / 86400000)
        return (daysToday / totalDays) * 100
      })

      // ── Horizon label (reuse rotation logic) ────────────────────────
      const getAbsHorizonLabel = () => {
        const months = getHorizonMonths(absTimelineHorizon.value, absTimelineOffset.value)
        if (!months.length) return ''
        if (months.length === 1) return `${months[0].label} ${months[0].year}`
        const first = months[0]; const last = months[months.length-1]
        if (first.year === last.year)
          return `${first.label} – ${last.label} ${last.year}`
        return `${first.label} ${first.year} – ${last.label} ${last.year}`
      }

      // ── 30-day coverage strip for absence ──
      const absCoverage30 = Vue.computed(() => {
        const days = []
        const total = medicalStaff.value.filter(s => s.employment_status === 'active').length
        for (let i = 0; i < 30; i++) {
          const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0,0,0,0)
          const dateStr = Utils.normalizeDate(d)
          const absent = absences.value.filter(a => {
            const s = Utils.normalizeDate(a.start_date)
            const e = Utils.normalizeDate(a.end_date)
            return s <= dateStr && e >= dateStr &&
              a.current_status !== 'returned_to_duty' && a.current_status !== 'cancelled'
          }).length
          const available = Math.max(0, total - absent)
          const pct = total > 0 ? (available / total) : 1
          const label = d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })
          days.push({ date: dateStr, absent, available, pct, label, isToday: i === 0 })
        }
        return days
      })

      // ── Unit 30-day timeline ──
      const getUnit30DayTimeline = (unitId) => {
        const unit = trainingUnits.value.find(u => u.id === unitId)
        if (!unit) return []
        const days = []
        for (let i = 0; i < 30; i++) {
          const d = new Date(); d.setDate(d.getDate() + i)
          const dateStr = Utils.normalizeDate(d)
          const active = rotations.value.filter(r =>
            r.training_unit_id === unitId &&
            ['active','scheduled'].includes(r.rotation_status) &&
            Utils.normalizeDate(r.start_date) <= dateStr &&
            Utils.normalizeDate(r.end_date) >= dateStr
          ).length
          const full = active >= (unit.maximum_residents || 1)
          const isToday = i === 0
          days.push({ active, full, isToday })
        }
        return days
      }

      // ── Dept pulse bar stats ──
      const deptPulseStats = Vue.computed(() => {
        const today = Utils.normalizeDate(new Date())
        const active = medicalStaff.value.filter(s => s.employment_status === 'active').length
        const onLeave = absences.value.filter(a => {
          const s = Utils.normalizeDate(a.start_date)
          const e = Utils.normalizeDate(a.end_date)
          return s <= today && e >= today && a.current_status !== 'returned_to_duty'
        }).length
        const onCallToday = [...new Set(
          onCallSchedule.value
            .filter(s => Utils.normalizeDate(s.duty_date) === today)
            .map(s => s.primary_physician_id)
        )].length
        const rotationCount = rotations.value.filter(r => r.rotation_status === 'active').length
        return { active, onLeave, onCallToday, rotationCount }
      })


        return {
          // Existing returns
          loading, saving, currentUser, loginForm, loginLoading, hasPermission,
          ...Object.fromEntries(Object.entries(ui).filter(([k]) => k !== 'showToast')),
          showToast, showConfirmation, ui,
          ...staffOps,  // medicalStaff, allStaffLookup, hospitalsList (clinicalUnits removed — unused)
          deleteMedicalStaff,          // override useStaff's deactivateStaffMember with full workflow
          reassignmentModal, confirmReassignAndDeactivate,
          ...onCallOps,
          ...rotationOps,
          ...absenceOps,
          formatTrainingYear: Utils.formatTrainingYear, formatStudyStatus, formatSpecialization: Utils.formatSpecialization, effectiveResidentYear: Utils.effectiveResidentYear,
          formatPhone: Utils.formatPhone, formatLicense: Utils.formatLicense,
          getResidentCategoryInfo: Utils.getResidentCategoryInfo, formatResidentCategorySimple: Utils.formatResidentCategorySimple,
          formatResidentCategoryDetailed: Utils.formatResidentCategoryDetailed, getResidentCategoryIcon: Utils.getResidentCategoryIcon,
          getResidentCategoryTooltip: Utils.getResidentCategoryTooltip, getRoleInfo: Utils.getRoleInfo, getStaffRoles: Utils.getStaffRoles,
          getDaysRemainingColor: Utils.getDaysRemainingColor, isToday,
          normalizeDate: Utils.normalizeDate, formatDateShort: Utils.formatDateShort,
          departments, allDepartmentsLookup, departmentFilters, departmentModal, deptReassignModal,
          filteredDepartments, getDepartmentName, getDepartmentUnits, getDepartmentStaffCount, getDeptResidentStats, getDeptHomeResidents,
          loadDepartments, showAddDepartmentModal, editDepartment, saveDepartment,
          deleteDepartment, confirmDeptReassignAndDeactivate, viewDepartmentStaff,
          deptPanel, openDeptPanel, closeDeptPanel,
          deptPanelAttending, deptPanelResidents, deptPanelUnits, deptPanelRotations,
          getUnitSupervisorName, rotDaysLeft,
          trainingUnits, trainingUnitFilters, trainingUnitModal, unitsByDepartment, unitResidentsModal, unitCliniciansModal, filteredTrainingUnits,
          getUnitActiveRotationCount, getUnitRotations, getUnitScheduledCount, getUnitOverlapWarning, getResidentShortName, loadTrainingUnits, showAddTrainingUnitModal,
        trainingUnitView, trainingUnitHorizon, getTimelineMonths, getUnitSlots, getDaysUntilFree, tlPopover, openCellPopover, closeCellPopover,
          occupancyPanel, unitDetailDrawer, occupancyHeatmap, occupancyPanelUnits,
          getUnitMonthOccupancy, getNextFreeMonth, openUnitDetail, openAssignRotationFromUnit,
          editTrainingUnit, deleteTrainingUnit, saveTrainingUnit, assignAttendingToUnit,
          openUnitClinicians: (unit) => openUnitClinicians(unit, medicalStaff.value),
          saveUnitClinicians,
          viewUnitResidents: (unit) => viewUnitResidents(unit, rotations.value),
          checkRotationAvailability: rotationOps.checkRotationAvailability,
          rotationAvailability: rotationOps.rotationModal,  // exposes .availability state
          ...commsOps,
          saveCommunication: (sv) => commsOps.saveCommunication(sv ?? saving, liveOps.saveClinicalStatus),
          ...liveOps,
          ...researchOps,
          researchLoading: researchOps.researchLoading,
          saveResearchLine: () => researchOps.saveResearchLine(saving),
          saveClinicalTrial: () => researchOps.saveClinicalTrial(saving),
          saveInnovationProject: () => researchOps.saveInnovationProject(saving),
          ...analyticsOps,
          loadResearchDashboard, // override with wired wrapper that passes research data refs
          ...dashOps,
          handleLogin, handleLogout,
          switchView, situationItems, dailyBriefing, systemSummary, toggleStatsSidebar,
          popover, showPopover, hidePopover,
          absenceCalendarOffset, absenceCalendarCells, absenceCalendarTitle, absenceMoveMonth,
          hoverPopover, showIntelPopover, hideIntelPopover,
          getStaffPulseState, getStaffNextEvent,
          absCalendarDays, absCalendarTitle, absCalendarMonth, absCalendarYear,
          absCalPrevMonth, absCalNextMonth, absenceViewMode, absTimelineHorizon, absTimelineOffset, absTimelinePlanning, absTimelineStaff, getStaffAbsencesInHorizon, getAbsenceBarStyle, absTimelineCoverage, absTimelineTodayPct, getAbsHorizonLabel, ABS_COLOURS,
          absCoverage30, getUnit30DayTimeline, deptPulseStats, handleGlobalSearch, globalSearchResults, clearSearch, isOnline,
          getPhaseColor: (p) => Utils.getPhaseColor(p),
          getStageColor: (s) => Utils.getStageColor(s), loadStaffCertificates,
          newsPosts, newsLoading, newsLoaded, newsModal, newsFilters, filteredNews,
          newsWordCount, newsWordLimit,
          loadNews, showAddNewsModal, editNews, saveNews,
          publishNews, archiveNews, deleteNews, toggleNewsPublic,
          newsAuthorName, newsLineName,
          newsDrawer, openNewsDrawer, closeNewsDrawer,
          newsDrawerPrev, newsDrawerNext, newsDrawerBodyParagraphs,
          newsDrawerInitials, newsDrawerAuthorFull, newsDrawerReadMins, newsDrawerLineName,
          drillToTrials, drillToProjects,
          portfolioKPIs:     researchOps.portfolioKPIs,
          getLineAccent:     getLineAccentGlobal,

          systemSettings, saveSystemSettings, loadSystemSettings, activeSvcId,
          staffTypesList, staffTypeMap, academicDegrees, loadAcademicDegrees, formatStaffTypeGlobal, getStaffTypeClassGlobal, isResidentType,
          staffTypesLoading, staffTypeModal, openAddStaffType, openEditStaffType, saveStaffType, deleteStaffType, toggleStaffTypeActive, loadStaffTypes,
          rotationServices, rotationServicesLoading, rotationServiceModal,
          loadRotationServices, openAddRotationService, openEditRotationService, saveRotationService, deleteRotationService,
          academicDegreeModal, openAddAcademicDegree, openEditAcademicDegree, saveAcademicDegree, deleteAcademicDegree,
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
          compactStaffWithDividers: staffOps.compactStaffWithDividers,
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
          getUpcomingRotations, getUpcomingLeave, getRotationHistory, getRotationDaysLeft,
          getCurrentRotationSupervisor, hasProfessionalCredentials,
          getRotationServiceName,

          // ── Inline handler methods (extracted from templates — Vue doesn't allow const/if inline) ──
          // ── view resident from rotation row (lines 1928, 6365) ──
          openResidentProfile: (residentId) => {
            const s = medicalStaff.value.find(x => x.id === residentId)
            if (s) staffOps.viewStaffDetails(s)
          },
          // ── toggle PI/CoI investigator role on staff form (line 4913) ──
          toggleInvestigadorRole: () => {
            const f = staffOps.medicalStaffModal.form
            const isOn = f.can_be_pi || f.can_be_coi
            f.can_be_pi = !isOn
            f.can_be_coi = !isOn
            if (isOn) {
              f._investigadorLines = []
              f.is_research_coordinator = false
              f._coordLineId = null
            }
          },
          // ── toggle a research line on the investigador list (line 4942) ──
          toggleInvestigadorLine: (lineId) => {
            const f = staffOps.medicalStaffModal.form
            const lines = f._investigadorLines || []
            const idx = lines.indexOf(lineId)
            if (idx > -1) lines.splice(idx, 1)
            else lines.push(lineId)
            f._investigadorLines = [...lines]
          },

          onAddHospitalInline: async () => {
            const h = await staffOps.addHospitalInline(
              staffOps.medicalStaffModal._newHospitalName,
              staffOps.medicalStaffModal._newHospitalNetwork
            )
            if (h) {
              staffOps.medicalStaffModal.form.hospital_id = h.id
              staffOps.medicalStaffModal.form._networkHint = h.parent_complex
              staffOps.medicalStaffModal._addingHospital = false
              staffOps.medicalStaffModal._newHospitalName = ''
            }
          },
          onRotationServiceChange: () => {
            const id = staffOps.medicalStaffModal.form.home_department_id
            const svc = rotationServices.value.find(s => s.id === id)
            if (!svc) return
            const f = staffOps.medicalStaffModal.form
            if (!f.external_contact_name  && svc.contact_name)  f.external_contact_name  = svc.contact_name
            if (!f.external_contact_email && svc.contact_email) f.external_contact_email = svc.contact_email
            if (!f.external_contact_phone && svc.contact_phone) f.external_contact_phone = svc.contact_phone
          },
          onUnitNameInput: () => {
            if (trainingUnitModal.mode === 'add') {
              trainingUnitModal.form.unit_code = trainingUnitModal.form.unit_name
                .split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 6)
            }
          },

          formatStaffType, formatStaffTypeShortFn, getStaffTypeClass, formatEmploymentStatus, formatAbsenceReason,
          formatRotationStatus, getUserRoleDisplay, formatAudience, formatStudyStatus,
          getCurrentViewTitle, getCurrentViewSubtitle, getSearchPlaceholder,
          showPassword, loginError, loginFieldErrors, clearLoginError, handleForgotPassword,
          normalizeDate: (d) => Utils.normalizeDate(d),
          formatDate: (d) => Utils.formatDate(d),
          formatDrName: (n) => Utils.formatDrName(n),
          formatNewsDate: (d) => Utils.formatNewsDate(d),
          formatDateShort: (d) => Utils.formatDateShort(d),
          formatDatePlusDays: (d, n) => Utils.formatDatePlusDays(d, n),
          formatRelativeDate: (d) => Utils.formatRelativeDate(d),
          formatTime: (d) => Utils.formatTime(d),
          formatClinicalDuration: (s, e) => Utils.formatClinicalDuration(s, e),
          formatRelativeTime: (d) => Utils.formatRelativeTime(d),
          formatTimeAgo: (d) => Utils.formatRelativeTime(d),
          getInitials: (n) => Utils.getInitials(n),
          getTomorrow: () => Utils.getTomorrow(),
          getStaffTypeIcon, getAbsenceReasonIcon, nmAv, nmAvI, getAbsenceUnitImpact, getUnitAbsentAttendingCount, getUnitPresentAttendingCount, isUnitUnderstaffed, isStaffAbsentToday, calculateCapacityPercent, getUnitFillColor,
          getPreviewCardClass, getPreviewIcon, getPreviewReasonText,
          getPreviewStatusClass, getPreviewStatusText, updatePreview, requestFullDossier,
          getPhaseColor: Utils.getPhaseColor, getPartnerTypeColor: Utils.getPartnerTypeColor, getStageColor: Utils.getStageColor, getStageConfig: Utils.getStageConfig, PROJECT_STAGES: PROJECT_STAGES_DATA, formatPercentage: Utils.formatPercentage,
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
          saveTrainingUnit: () => saveTrainingUnit(saving, allDepartmentsLookup),
          saveRotation: () => rotationOps.saveRotation(saving),
          saveOnCallSchedule: () => onCallOps.saveOnCallSchedule(saving),
          saveOnCall: () => onCallOps.saveOnCallSchedule(saving),
          saveAbsence: () => absenceOps.saveAbsence(saving),
          saveUserProfile, hasPermission,
          dismissAlert: ui.dismissAlert, activeAlertsCount: ui.activeAlertsCount,
          
          // NEW: Compact view properties - now coming from composables
          rotationView,
          onCallView, oncallTab, oncallMonthOffset, calloutsByArea, calloutsByReason,
          oncallMonthEmptyCells, oncallMonthDays, getOncallShiftsForDay, isOncallCellToday, oncallMonthSummary,
          residentsWithRotations: rotationOps.residentsWithRotations,
          groupedOnCallSchedules: onCallOps.groupedOnCallSchedules,
          staffWithOnCallOrbs: onCallOps.staffWithOnCallOrbs,
          upcomingOnCallDays:  onCallOps.upcomingOnCallDays,
          getRotationsForDay: rotationOps.getRotationsForDay,
          rotationViewModal: rotationOps.rotationViewModal,
          monthHorizon: rotationOps.monthHorizon,
          monthOffset:  rotationOps.monthOffset,
          getHorizonMonths:              rotationOps.getHorizonMonths,
          getHorizonRangeLabel:          rotationOps.getHorizonRangeLabel,
          getResidentRotationsInHorizon: rotationOps.getResidentRotationsInHorizon,
          getRotationBarStyle:           rotationOps.getRotationBarStyle,
          rotationStartsInHorizon:       rotationOps.rotationStartsInHorizon,
          rotationEndsInHorizon:         rotationOps.rotationEndsInHorizon,
          isRotationActive: rotationOps.isRotationActive,
          isShiftActive: onCallOps.isShiftActive,
          viewRotationDetails: rotationOps.viewRotationDetails,
          residentGapWarnings: rotationOps.residentGapWarnings,
          rgwCollapsed: rotationOps.rgwCollapsed,
          cmdQuery, cmdSelectedIdx, cmdItems, executeCmdItem,
          isOffline: ui.isOffline, isMaintenanceMode: ui.isMaintenanceMode,   
          callouts, calloutsLoading, calloutSummary, calloutPeriod, calloutModal,
          calloutFairnessAlert,
          calloutKPIs, calloutDistribution, calloutFairnessAlert, calloutReasonLabels, calloutTimeTypes,
          openLogCalloutModal, suggestCalloutArea, editCallout, saveCallout, deleteCallout,
          loadCallouts, loadCalloutSummary,
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
