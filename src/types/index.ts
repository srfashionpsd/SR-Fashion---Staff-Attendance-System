export type Role = 'admin' | 'operator';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string; // "12:00" in 24h
  endTime: string;   // "22:00" in 24h
  graceInMinutes: number;  // 15 mins (12:15 PM is on time, 12:16 is late)
  graceOutMinutes: number; // 15 mins (10:15 PM is normal, 10:16+ needs review)
  isDefault: boolean;
}

export interface Employee {
  id: string;
  employeeId: string; // e.g. "SR-101"
  name: string;
  mobile?: string;
  barcode: string; // e.g. "SRF101"
  faceProfile?: {
    enrolledAt: string;
    features: number[]; // 64-128 numerical vector
    thumbnailUrl?: string; // base64 preview or avatar
  };
  avatarUrl?: string;
  joiningDate: string;
  isActive: boolean;
  shiftId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'leave'
  | 'holiday'
  | 'missing_punch';

export type AttendanceMethod = 'barcode' | 'face' | 'manual';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // "YYYY-MM-DD"
  inTime?: string; // "HH:mm" in 24h or formatted ISO
  outTime?: string; // "HH:mm" in 24h
  inMethod?: AttendanceMethod;
  outMethod?: AttendanceMethod;
  status: AttendanceStatus;
  lateMinutes: number;
  extendedOutMinutes: number; // minutes beyond 10:15 PM
  outReviewRequired: boolean; // true if punched out >= 10:16 PM and pending review
  outReviewStatus?: 'pending' | 'resolved' | 'dismissed';
  isAdjusted?: boolean;
  adjustedInMinutes?: number;
  adjustedOutMinutes?: number;
  workingHoursMinutes?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdjustmentType = 'adjust_in' | 'adjust_out' | 'adjust_both';

export interface AttendanceAdjustment {
  id: string;
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  adminName: string;
  adjustmentType: AdjustmentType;
  originalInTime?: string;
  originalOutTime?: string;
  newInTime?: string;
  newOutTime?: string;
  inAdjustmentMinutes: number;
  outAdjustmentMinutes: number;
  reason: string;
  createdAt: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  reason: string;
  leaveType: 'personal' | 'sick' | 'emergency' | 'casual';
  approvedBy: string;
  createdAt: string;
}

export interface HolidayRecord {
  id: string;
  date: string;
  name: string;
  type: 'festival' | 'weekly' | 'emergency' | 'custom';
  notes?: string;
}

export interface AuditLog {
  id: string;
  adminName: string;
  action: string;
  employeeId?: string;
  employeeName?: string;
  date: string;
  originalValue?: string;
  newValue?: string;
  reason: string;
  timestamp: string;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  instagram: string;
  timezone: string; // "Asia/Kolkata"
  defaultShiftId: string;
}

export interface DashboardStats {
  present: number;
  absent: number;
  late: number;
  leave: number;
  holiday: number;
  missingPunch: number;
  extendedOutPending: number;
  totalActiveStaff: number;
  todayDate: string;
  isTodayHoliday: boolean;
  todayHolidayName?: string;
}

export interface AttendanceResult {
  success: boolean;
  message: string;
  type: 'in' | 'out' | 'duplicate_in' | 'duplicate_out' | 'error';
  record?: AttendanceRecord;
  employee?: Employee;
  timeFormatted?: string;
  statusText?: string;
  lateMinutes?: number;
  extendedOutMinutes?: number;
  reviewRequired?: boolean;
}
