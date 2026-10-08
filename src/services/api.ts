import {
  AttendanceAdjustment,
  AttendanceRecord,
  AttendanceResult,
  AuditLog,
  DashboardStats,
  Employee,
  HolidayRecord,
  LeaveRecord,
  Shift,
  ShopSettings,
  User,
} from '../types';

const TOKEN_KEY = 'sr_fashion_token';
const USER_KEY = 'sr_fashion_user';

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
  getUser: (): User | null => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: User) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(USER_KEY),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
      else if (data.message) errorMsg = data.message;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Time
  getAuthoritativeTime: () => request<{ dateStr: string; timeStr: string; formatted12h: string; fullDisplay: string }>('/api/time'),

  // Auth
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    authStorage.setToken(res.token);
    authStorage.setUser(res.user);
    return res;
  },
  getCurrentUser: () => request<{ authenticated: boolean; user?: User }>('/api/auth/me'),
  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {}
    authStorage.removeToken();
    authStorage.removeUser();
  },

  // Attendance Kiosk
  punchAttendance: (data: { barcode?: string; employeeId?: string; method: 'barcode' | 'face'; overrideTime?: string }) =>
    request<AttendanceResult>('/api/attendance/punch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Today's Staff View
  getTodayAttendance: (date?: string) =>
    request<{ date: string; records: (AttendanceRecord & { employee?: Employee })[]; holiday: HolidayRecord | null; totalStaff: number }>(
      `/api/attendance/today${date ? `?date=${date}` : ''}`
    ),

  // History & Reports
  getAttendanceHistory: (params: { startDate?: string; endDate?: string; employeeId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.employeeId) query.append('employeeId', params.employeeId);
    if (params.status) query.append('status', params.status);
    return request<AttendanceRecord[]>(`/api/attendance/history?${query.toString()}`);
  },

  createManualAttendance: (data: {
    employeeId: string;
    date: string;
    inTime?: string;
    outTime?: string;
    status?: string;
    reason?: string;
  }) =>
    request<AttendanceRecord>('/api/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAttendance: (id: string, data: { inTime?: string; outTime?: string; status?: string; notes?: string; reason?: string }) =>
    request<AttendanceRecord>(`/api/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAttendance: (id: string, reason?: string) =>
    request<{ success: boolean }>(`/api/attendance/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),

  // Adjustments (Extended OUT Review)
  getAdjustments: () => request<AttendanceAdjustment[]>('/api/adjustments'),
  applyAdjustment: (data: {
    attendanceId: string;
    adjustmentType: 'adjust_in' | 'adjust_out' | 'adjust_both';
    inAdjustmentMinutes: number;
    outAdjustmentMinutes: number;
    reason: string;
  }) =>
    request<AttendanceAdjustment>('/api/adjustments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Employees
  getEmployees: (activeOnly = false) => request<Employee[]>(`/api/employees?active=${activeOnly}`),
  addEmployee: (emp: Partial<Employee>) =>
    request<Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(emp),
    }),
  updateEmployee: (id: string, updates: Partial<Employee>) =>
    request<Employee>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  enrollFace: (id: string, features: number[], thumbnailUrl: string) =>
    request<{ success: boolean; employee: Employee }>(`/api/employees/${id}/face`, {
      method: 'POST',
      body: JSON.stringify({ features, thumbnailUrl }),
    }),
  deleteEmployee: (id: string) =>
    request<{ success: boolean }>(`/api/employees/${id}`, {
      method: 'DELETE',
    }),
  clearAllEmployees: () =>
    request<{ success: boolean; deletedCount: number }>('/api/employees/clear-all', {
      method: 'POST',
    }),

  // Dashboard Stats
  getDashboardStats: (date?: string) => request<DashboardStats>(`/api/dashboard/stats${date ? `?date=${date}` : ''}`),

  // Leaves & Holidays
  getLeaves: () => request<LeaveRecord[]>('/api/leaves'),
  addLeave: (leave: Partial<LeaveRecord>) =>
    request<LeaveRecord>('/api/leaves', {
      method: 'POST',
      body: JSON.stringify(leave),
    }),
  deleteLeave: (id: string) => request<{ success: boolean }>(`/api/leaves/${id}`, { method: 'DELETE' }),

  getHolidays: () => request<HolidayRecord[]>('/api/holidays'),
  addHoliday: (holiday: Partial<HolidayRecord>) =>
    request<HolidayRecord>('/api/holidays', {
      method: 'POST',
      body: JSON.stringify(holiday),
    }),
  deleteHoliday: (id: string) => request<{ success: boolean }>(`/api/holidays/${id}`, { method: 'DELETE' }),

  // Audit Logs
  getAuditLogs: () => request<AuditLog[]>('/api/audit-logs'),

  // Settings & Shifts
  getSettings: () => request<ShopSettings>('/api/settings'),
  updateSettings: (settings: Partial<ShopSettings>) =>
    request<ShopSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  getShifts: () => request<Shift[]>('/api/shifts'),
  updateShift: (id: string, shift: Partial<Shift>) =>
    request<Shift>(`/api/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(shift),
    }),

  // Monthly summary for Reports & WhatsApp
  getMonthlySummary: (year: number, month: number) =>
    request<{
      year: number;
      month: number;
      monthStr: string;
      totalStaff: number;
      holidayCount: number;
      summaries: Array<{
        employeeId: string;
        employeeCode: string;
        employeeName: string;
        mobile?: string;
        barcode: string;
        presentDays: number;
        lateDays: number;
        totalLateMinutes: number;
        avgLateMinutes: number;
        leaveDays: number;
        holidayDays: number;
        absentDays: number;
        missingPunches: number;
        totalWorkingHours: string;
      }>;
    }>(`/api/reports/monthly-summary?year=${year}&month=${month}`),
};
