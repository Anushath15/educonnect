// ============================================================
// packages/shared/src/constants.ts
// ============================================================

// --- Role permissions map ---
// What each role is allowed to do
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'], // full access
  school_admin: [
    'manage_staff',
    'manage_timetable',
    'manage_substitutions',
    'manage_resources',
    'view_reports',
    'manage_school_settings',
  ],
  principal: [
    'approve_substitutions',
    'approve_swaps',
    'approve_bookings',
    'view_timetable',
    'view_staff',
    'view_reports',
  ],
  vice_principal: [
    'approve_substitutions',
    'approve_swaps',
    'approve_bookings',
    'view_timetable',
    'view_staff',
  ],
  class_teacher: [
    'view_timetable',
    'request_substitution',
    'request_swap',
    'book_resource',
    'view_own_profile',
  ],
  teacher: [
    'view_timetable',
    'request_substitution',
    'request_swap',
    'book_resource',
    'view_own_profile',
  ],
  staff: [
    'view_timetable',
    'book_resource',
    'view_own_profile',
  ],
  student: [
    'view_timetable',
    'view_own_profile',
  ],
  parent: [
    'view_child_timetable',
    'view_child_attendance',
  ],
};

// --- Subscription plan limits ---
export const PLAN_LIMITS: Record<string, {
  maxStaff: number;
  maxStudents: number;
  aiTimetable: boolean;
  pricePerYear: number;
}> = {
  basic: {
    maxStaff: 30,
    maxStudents: 500,
    aiTimetable: false,
    pricePerYear: 12000, // ₹12,000
  },
  standard: {
    maxStaff: 75,
    maxStudents: 1500,
    aiTimetable: true,
    pricePerYear: 25000, // ₹25,000
  },
  premium: {
    maxStaff: 200,
    maxStudents: 5000,
    aiTimetable: true,
    pricePerYear: 38000, // ₹38,000
  },
};

// --- Week days ---
export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

// --- Period config defaults ---
export const DEFAULT_PERIODS_PER_DAY = 8;
export const DEFAULT_PERIOD_DURATION_MINUTES = 45;
export const DEFAULT_BREAK_DURATION_MINUTES = 15;

// --- Tamil Nadu districts (for school registration) ---
export const TN_DISTRICTS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi',
  'Dindigul', 'Thanjavur', 'Ranipet', 'Sivaganga', 'Virudhunagar',
  'Nagapattinam', 'Kanyakumari', 'Dharmapuri', 'Krishnagiri', 'Namakkal',
  'Perambalur', 'Ariyalur', 'Karur', 'Nilgiris', 'Pudukkottai',
  'Ramanathapuram', 'Theni', 'Tiruvannamalai', 'Villupuram', 'Cuddalore',
  'Kallakurichi', 'Chengalpattu', 'Kancheepuram', 'Tiruvarur', 'Tenkasi',
  'Mayiladuthurai',
] as const;

export type TNDistrict = typeof TN_DISTRICTS[number];

// --- API route prefixes ---
export const API_ROUTES = {
  AUTH: '/api/auth',
  SCHOOLS: '/api/schools',
  STAFF: '/api/staff',
  TIMETABLE: '/api/timetable',
  SUBSTITUTIONS: '/api/substitutions',
  SWAPS: '/api/swaps',
  RESOURCES: '/api/resources',
  NOTIFICATIONS: '/api/notifications',
  STUDENTS: '/api/students',
} as const;

// --- Pagination defaults ---
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// --- Date / time formats ---
export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// --- Redis key prefixes (used in backend) ---
export const REDIS_KEYS = {
  SESSION: 'session:',
  TIMETABLE: 'timetable:',
  OTP: 'otp:',
  RATE_LIMIT: 'rate_limit:',
} as const;