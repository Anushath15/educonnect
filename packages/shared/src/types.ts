export type UserRole =
  | 'super_admin'
  | 'school_admin'
  | 'principal'
  | 'vice_principal'
  | 'teacher'
  | 'class_teacher'
  | 'staff'
  | 'student'
  | 'parent';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  schoolId: string;
  name: string;
  avatarUrl?: string;
}

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  schoolId: string;
  iat: number;
  exp: number;
}

export interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  district: string;
  state: string;
  phone: string;
  email: string;
  logoUrl?: string;
  plan: SubscriptionPlan;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlan = 'basic' | 'standard' | 'premium';

export interface StaffProfile {
  id: string;
  userId: string;
  schoolId: string;
  employeeId: string;
  name: string;
  role: UserRole;
  department: string;
  subjects: string[];
  phone: string;
  email: string;
  joiningDate: string;
  isActive: boolean;
}

export interface TimetableSlot {
  id: string;
  schoolId: string;
  day: WeekDay;
  periodNumber: number;
  startTime: string;
  endTime: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  isBreak: boolean;
}

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface SubstitutionRequest {
  id: string;
  schoolId: string;
  absentTeacherId: string;
  substituteTeacherId?: string;
  slotId: string;
  date: string;
  reason: string;
  status: SubstitutionStatus;
  createdAt: string;
  updatedAt: string;
}

export type SubstitutionStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'rejected'
  | 'completed';

export interface SwapRequest {
  id: string;
  schoolId: string;
  requesterId: string;
  targetTeacherId: string;
  requesterSlotId: string;
  targetSlotId: string;
  date: string;
  status: SwapStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ResourceBooking {
  id: string;
  schoolId: string;
  resourceId: string;
  bookedByUserId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
}

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Resource {
  id: string;
  schoolId: string;
  name: string;
  type: ResourceType;
  capacity?: number;
  location: string;
  isActive: boolean;
}

export type ResourceType =
  | 'classroom'
  | 'lab'
  | 'auditorium'
  | 'sports_ground'
  | 'library'
  | 'projector'
  | 'other';

export interface Notification {
  id: string;
  userId: string;
  schoolId: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export type NotificationType =
  | 'substitution_assigned'
  | 'substitution_request'
  | 'swap_request'
  | 'swap_approved'
  | 'swap_rejected'
  | 'booking_approved'
  | 'booking_rejected'
  | 'announcement'
  | 'general';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
