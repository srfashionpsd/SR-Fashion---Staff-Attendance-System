import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AttendanceAdjustment,
  AttendanceRecord,
  AttendanceResult,
  AuditLog,
  Employee,
  HolidayRecord,
  LeaveRecord,
  Shift,
  ShopSettings,
  User,
  DashboardStats,
} from '../types';
import {
  calculateInStatus,
  calculateOutStatus,
  calculateWorkingMinutes,
  DEFAULT_SHIFT,
  getISTDateTime,
  timeStringToMinutes,
} from '../shared/attendanceRules';

interface DatabaseSchema {
  users: User[];
  userPasswords: Record<string, string>; // userId -> sha256 password hash
  employees: Employee[];
  shifts: Shift[];
  attendance: AttendanceRecord[];
  adjustments: AttendanceAdjustment[];
  leaves: LeaveRecord[];
  holidays: HolidayRecord[];
  auditLogs: AuditLog[];
  settings: ShopSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export class Database {
  private data: DatabaseSchema;
  private isSaving = false;
  private savePending = false;

  constructor() {
    this.data = this.loadInitial();
  }

  private loadInitial(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.employees && parsed.users) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error reading database file, creating fresh seed:', err);
    }

    const seeded = this.createSeedData();
    this.persistSync(seeded);
    return seeded;
  }

  private persistSync(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database file synchronously:', e);
    }
  }

  private persist() {
    if (this.isSaving) {
      this.savePending = true;
      return;
    }
    this.isSaving = true;
    fs.writeFile(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8', (err) => {
      this.isSaving = false;
      if (err) {
        console.error('Failed to write database file:', err);
      }
      if (this.savePending) {
        this.savePending = false;
        this.persist();
      }
    });
  }

  private createSeedData(): DatabaseSchema {
    const adminUser: User = {
      id: 'usr_admin',
      username: 'admin',
      name: 'SR Fashion Admin',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    const operatorUser: User = {
      id: 'usr_operator',
      username: 'operator',
      name: 'Attendance Operator',
      role: 'operator',
      createdAt: new Date().toISOString(),
    };

    const userPasswords: Record<string, string> = {
      [adminUser.id]: hashPassword('admin123'),
      [operatorUser.id]: hashPassword('op123'),
    };

    const shifts: Shift[] = [DEFAULT_SHIFT];

    const employees: Employee[] = [];

    const { dateStr } = getISTDateTime();

    const attendance: AttendanceRecord[] = [];

    const leaves: LeaveRecord[] = [];

    const holidays: HolidayRecord[] = [
      {
        id: 'hol_01',
        date: '2026-03-21',
        name: 'Eid-ul-Fitr',
        type: 'festival',
        notes: 'Annual Festival Closure',
      },
      {
        id: 'hol_02',
        date: '2026-05-28',
        name: 'Eid-ul-Adha',
        type: 'festival',
        notes: 'Annual Festival Closure',
      },
      {
        id: 'hol_03',
        date: '2026-08-15',
        name: 'Independence Day',
        type: 'festival',
        notes: 'National Holiday',
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'aud_01',
        adminName: 'System Initializer',
        action: 'System Bootstrapped',
        date: dateStr,
        reason: 'Initial setup of SR Fashion attendance engine',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'aud_02',
        adminName: 'Admin',
        action: 'Leave Approved',
        employeeId: 'emp_106',
        employeeName: 'Zoya Begum',
        date: dateStr,
        reason: 'Personal Leave granted for family occasion',
        timestamp: new Date().toISOString(),
      },
    ];

    const settings: ShopSettings = {
      shopName: 'SR Fashion',
      tagline: 'Sabki Pasand SR Fashion',
      address: 'Eidgah Kaman Road, Near Dabak Pul, Degloor Naka, Nanded',
      phone: '7588756669',
      instagram: '@srfashion_nanded',
      timezone: 'Asia/Kolkata',
      defaultShiftId: DEFAULT_SHIFT.id,
    };

    return {
      users: [adminUser, operatorUser],
      userPasswords,
      employees,
      shifts,
      attendance,
      adjustments: [],
      leaves,
      holidays,
      auditLogs,
      settings,
    };
  }

  // --- Auth methods ---
  public verifyCredentials(username: string, pass: string): User | null {
    const user = this.data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (!user) return null;

    const hash = hashPassword(pass);
    // Allow master PIN/fallback "admin123" or phone "7588756669"
    if (this.data.userPasswords[user.id] === hash || pass === 'admin123' || (user.role === 'admin' && pass === '7588756669')) {
      return user;
    }
    return null;
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  // --- Employees ---
  public getEmployees(onlyActive = false): Employee[] {
    return onlyActive ? this.data.employees.filter((e) => e.isActive) : [...this.data.employees];
  }

  public getEmployeeById(id: string): Employee | undefined {
    return this.data.employees.find((e) => e.id === id || e.employeeId === id);
  }

  public getEmployeeByBarcode(barcode: string): Employee | undefined {
    const clean = barcode.trim().toUpperCase();
    return this.data.employees.find(
      (e) => e.barcode.trim().toUpperCase() === clean || e.employeeId.trim().toUpperCase() === clean
    );
  }

  public addEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>, adminName: string): Employee {
    const newEmp: Employee = {
      ...employee,
      id: `emp_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.employees.push(newEmp);
    this.addAuditLog({
      adminName,
      action: 'Employee Added',
      employeeId: newEmp.id,
      employeeName: newEmp.name,
      date: getISTDateTime().dateStr,
      newValue: `ID: ${newEmp.employeeId}, Barcode: ${newEmp.barcode}`,
      reason: 'New employee registered',
    });
    this.persist();
    return newEmp;
  }

  public updateEmployee(id: string, updates: Partial<Employee>, adminName: string): Employee | null {
    const idx = this.data.employees.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const old = this.data.employees[idx];
    const updated: Employee = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.employees[idx] = updated;

    this.addAuditLog({
      adminName,
      action: 'Employee Updated',
      employeeId: updated.id,
      employeeName: updated.name,
      date: getISTDateTime().dateStr,
      originalValue: JSON.stringify({ name: old.name, barcode: old.barcode, active: old.isActive }),
      newValue: JSON.stringify({ name: updated.name, barcode: updated.barcode, active: updated.isActive }),
      reason: 'Staff profile updated',
    });

    this.persist();
    return updated;
  }

  public deleteEmployee(id: string, adminName: string): boolean {
    const idx = this.data.employees.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    const removed = this.data.employees.splice(idx, 1)[0];

    // Remove associated attendance, leaves and adjustments
    this.data.attendance = this.data.attendance.filter((a) => a.employeeId !== id);
    this.data.leaves = this.data.leaves.filter((l) => l.employeeId !== id);
    this.data.adjustments = this.data.adjustments.filter((adj) => adj.employeeId !== id);

    this.addAuditLog({
      adminName,
      action: 'Employee Deleted',
      employeeId: removed.id,
      employeeName: removed.name,
      date: getISTDateTime().dateStr,
      originalValue: `ID: ${removed.employeeId}, Barcode: ${removed.barcode}`,
      reason: 'Employee permanently removed by admin',
    });

    this.persist();
    return true;
  }

  public clearAllEmployees(adminName: string): number {
    const count = this.data.employees.length;
    this.data.employees = [];
    this.data.attendance = [];
    this.data.leaves = [];
    this.data.adjustments = [];

    this.addAuditLog({
      adminName,
      action: 'All Staff Removed',
      date: getISTDateTime().dateStr,
      originalValue: `${count} staff members`,
      newValue: '0 staff members',
      reason: 'Database cleared by administrator for live store roster setup',
    });

    this.persist();
    return count;
  }

  // --- Attendance Core Workflow ---
  public getAttendanceForDate(dateStr: string): AttendanceRecord[] {
    return this.data.attendance.filter((a) => a.date === dateStr);
  }

  public getAllAttendance(): AttendanceRecord[] {
    return [...this.data.attendance];
  }

  /**
   * Main scan/face punch method enforcing strict rules and duplicate prevention
   */
  public punchAttendance(
    employee: Employee,
    method: 'barcode' | 'face',
    overrideTime?: string
  ): AttendanceResult {
    const { dateStr, timeStr, formatted12h } = getISTDateTime();
    const effectiveTime = overrideTime || timeStr;
    const shift = this.data.shifts.find((s) => s.id === employee.shiftId) || DEFAULT_SHIFT;

    // Check if employee is inactive
    if (!employee.isActive) {
      return {
        success: false,
        message: `${employee.name} is marked INACTIVE. Please contact Admin.`,
        type: 'error',
        employee,
      };
    }

    // Check if today is a Holiday
    const holiday = this.data.holidays.find((h) => h.date === dateStr);
    if (holiday) {
      return {
        success: false,
        message: `Today is a Holiday: ${holiday.name}. Shop is officially closed.`,
        type: 'error',
        employee,
      };
    }

    // Check if employee is on approved leave today
    const leave = this.data.leaves.find((l) => l.employeeId === employee.id && l.date === dateStr);
    if (leave) {
      return {
        success: false,
        message: `${employee.name} is on approved Leave today (${leave.reason}).`,
        type: 'error',
        employee,
      };
    }

    // Look for existing attendance record today
    let record = this.data.attendance.find((a) => a.employeeId === employee.id && a.date === dateStr);

    if (!record) {
      // 1. First punch of the day: Mark IN
      const inCalc = calculateInStatus(effectiveTime, shift);

      record = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        employeeId: employee.id,
        employeeName: employee.name,
        date: dateStr,
        inTime: effectiveTime,
        inMethod: method,
        status: inCalc.status,
        lateMinutes: inCalc.lateMinutes,
        extendedOutMinutes: 0,
        outReviewRequired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.data.attendance.push(record);
      this.persist();

      return {
        success: true,
        message: `Welcome, ${employee.name}. IN marked successfully at ${formatted12h}.`,
        type: 'in',
        record,
        employee,
        timeFormatted: formatted12h,
        statusText: inCalc.description,
        lateMinutes: inCalc.lateMinutes,
      };
    }

    // Record already exists for today. Check IN and OUT status.
    if (record.inTime && !record.outTime) {
      // DUPLICATE IN CHECK:
      // If punch happens within 10 minutes of IN punch:
      const inMinutes = timeStringToMinutes(record.inTime);
      const currentMinutes = timeStringToMinutes(effectiveTime);
      const minutesElapsed = currentMinutes - inMinutes;

      if (minutesElapsed < 10 && minutesElapsed >= 0) {
        return {
          success: false,
          message: 'Already Checked In',
          type: 'duplicate_in',
          record,
          employee,
          timeFormatted: formatted12h,
          statusText: 'Already Checked In',
        };
      }

      // Mark OUT punch!
      const outCalc = calculateOutStatus(effectiveTime, shift);
      record.outTime = effectiveTime;
      record.outMethod = method;
      record.extendedOutMinutes = outCalc.extendedOutMinutes;
      record.outReviewRequired = outCalc.reviewRequired;
      if (outCalc.reviewRequired) {
        record.outReviewStatus = 'pending';
      }
      record.workingHoursMinutes = calculateWorkingMinutes(record.inTime, effectiveTime);
      record.updatedAt = new Date().toISOString();

      this.persist();

      let msg = `Goodbye, ${employee.name}. OUT marked successfully at ${formatted12h}.`;
      let statusDesc = 'Normal';
      if (outCalc.reviewRequired) {
        msg = `OUT marked at ${formatted12h}. Extended OUT Time — Admin Review Required (${outCalc.extendedOutMinutes} min beyond grace).`;
        statusDesc = 'Admin Review Required';
      }

      return {
        success: true,
        message: msg,
        type: 'out',
        record,
        employee,
        timeFormatted: formatted12h,
        statusText: statusDesc,
        extendedOutMinutes: outCalc.extendedOutMinutes,
        reviewRequired: outCalc.reviewRequired,
      };
    }

    // Both IN and OUT are already present!
    return {
      success: false,
      message: `${employee.name} has already Checked Out for Today.`,
      type: 'duplicate_out',
      record,
      employee,
      timeFormatted: formatted12h,
      statusText: 'Shift Completed',
    };
  }

  // --- Manual Attendance Editing by Admin ---
  public updateAttendanceRecord(
    id: string,
    updates: Partial<AttendanceRecord>,
    adminName: string,
    reason: string
  ): AttendanceRecord | null {
    const idx = this.data.attendance.findIndex((a) => a.id === id);
    if (idx === -1) return null;

    const old = this.data.attendance[idx];
    const updated: AttendanceRecord = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Re-evaluate lateMinutes and workingHours if IN or OUT updated
    const shift = this.data.shifts.find((s) => s.isDefault) || DEFAULT_SHIFT;
    if (updated.inTime) {
      const inCalc = calculateInStatus(updated.inTime, shift, updated.adjustedInMinutes || 0);
      updated.lateMinutes = inCalc.lateMinutes;
      if (updated.status !== 'absent' && updated.status !== 'leave' && updated.status !== 'holiday') {
        updated.status = inCalc.status;
      }
    }
    if (updated.outTime) {
      const outCalc = calculateOutStatus(updated.outTime, shift, updated.adjustedOutMinutes || 0);
      updated.extendedOutMinutes = outCalc.extendedOutMinutes;
      updated.outReviewRequired = outCalc.reviewRequired;
    }
    if (updated.inTime && updated.outTime) {
      updated.workingHoursMinutes = calculateWorkingMinutes(updated.inTime, updated.outTime);
    }

    this.data.attendance[idx] = updated;

    this.addAuditLog({
      adminName,
      action: 'Attendance Record Updated',
      employeeId: updated.employeeId,
      employeeName: updated.employeeName,
      date: updated.date,
      originalValue: `IN: ${old.inTime || '—'}, OUT: ${old.outTime || '—'}, Status: ${old.status}`,
      newValue: `IN: ${updated.inTime || '—'}, OUT: ${updated.outTime || '—'}, Status: ${updated.status}`,
      reason: reason || 'Manual admin correction',
    });

    this.persist();
    return updated;
  }

  public deleteAttendanceRecord(id: string, adminName: string, reason: string): boolean {
    const idx = this.data.attendance.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    const removed = this.data.attendance.splice(idx, 1)[0];

    this.addAuditLog({
      adminName,
      action: 'Attendance Record Removed',
      employeeId: removed.employeeId,
      employeeName: removed.employeeName,
      date: removed.date,
      originalValue: `IN: ${removed.inTime}, OUT: ${removed.outTime}`,
      reason: reason || 'Attendance deleted by admin',
    });

    this.persist();
    return true;
  }

  public createManualAttendance(
    employeeId: string,
    date: string,
    inTime: string,
    outTime: string | undefined,
    statusOverride: string | undefined,
    adminName: string,
    reason: string
  ): AttendanceRecord {
    const employee = this.data.employees.find((e) => e.id === employeeId);
    if (!employee) throw new Error('Employee not found');

    const shift = this.data.shifts.find((s) => s.id === employee.shiftId) || DEFAULT_SHIFT;
    const inCalc = inTime ? calculateInStatus(inTime, shift) : { status: 'absent' as const, lateMinutes: 0 };
    const outCalc = outTime ? calculateOutStatus(outTime, shift) : { reviewRequired: false, extendedOutMinutes: 0 };

    const record: AttendanceRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: employee.id,
      employeeName: employee.name,
      date,
      inTime: inTime || undefined,
      outTime: outTime || undefined,
      inMethod: 'manual',
      outMethod: outTime ? 'manual' : undefined,
      status: (statusOverride as any) || (inTime ? inCalc.status : 'absent'),
      lateMinutes: inCalc.lateMinutes,
      extendedOutMinutes: outCalc.extendedOutMinutes,
      outReviewRequired: outCalc.reviewRequired,
      workingHoursMinutes: calculateWorkingMinutes(inTime, outTime),
      notes: reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Remove any existing record for that employee on that day
    const existingIdx = this.data.attendance.findIndex((a) => a.employeeId === employeeId && a.date === date);
    if (existingIdx !== -1) {
      this.data.attendance.splice(existingIdx, 1);
    }

    this.data.attendance.push(record);

    this.addAuditLog({
      adminName,
      action: 'Manual Attendance Added',
      employeeId: employee.id,
      employeeName: employee.name,
      date,
      newValue: `IN: ${inTime || '—'}, OUT: ${outTime || '—'}, Status: ${record.status}`,
      reason: reason || 'Manually added by admin',
    });

    this.persist();
    return record;
  }

  // --- Extended OUT Review & 3 Adjustment Options ---
  public applyAdjustment(
    attendanceId: string,
    adjustmentType: 'adjust_in' | 'adjust_out' | 'adjust_both',
    inAdjustmentMinutes: number,
    outAdjustmentMinutes: number,
    adminName: string,
    reason: string
  ): AttendanceAdjustment | null {
    const att = this.data.attendance.find((a) => a.id === attendanceId);
    if (!att) return null;

    const originalIn = att.inTime;
    const originalOut = att.outTime;

    const adjRecord: AttendanceAdjustment = {
      id: `adj_${Date.now()}`,
      attendanceId: att.id,
      employeeId: att.employeeId,
      employeeName: att.employeeName,
      date: att.date,
      adminName,
      adjustmentType,
      originalInTime: originalIn,
      originalOutTime: originalOut,
      inAdjustmentMinutes,
      outAdjustmentMinutes,
      reason,
      createdAt: new Date().toISOString(),
    };

    // Apply adjustments to attendance record while preserving original values in audit
    att.isAdjusted = true;
    att.adjustedInMinutes = (att.adjustedInMinutes || 0) + inAdjustmentMinutes;
    att.adjustedOutMinutes = (att.adjustedOutMinutes || 0) + outAdjustmentMinutes;
    att.outReviewRequired = false;
    att.outReviewStatus = 'resolved';

    // Recalculate with adjustment
    const shift = this.data.shifts.find((s) => s.isDefault) || DEFAULT_SHIFT;
    if (att.inTime && inAdjustmentMinutes) {
      const inCalc = calculateInStatus(att.inTime, shift, att.adjustedInMinutes);
      att.lateMinutes = inCalc.lateMinutes;
      att.status = inCalc.status;
    }
    if (att.outTime && outAdjustmentMinutes) {
      const outCalc = calculateOutStatus(att.outTime, shift, att.adjustedOutMinutes);
      att.extendedOutMinutes = outCalc.extendedOutMinutes;
    }

    att.updatedAt = new Date().toISOString();
    this.data.adjustments.push(adjRecord);

    this.addAuditLog({
      adminName,
      action: `Adjustment Applied (${adjustmentType})`,
      employeeId: att.employeeId,
      employeeName: att.employeeName,
      date: att.date,
      originalValue: `Original OUT: ${originalOut}, IN: ${originalIn}`,
      newValue: `IN Adj: ${inAdjustmentMinutes}m, OUT Adj: ${outAdjustmentMinutes}m`,
      reason: `Extended OUT review: ${reason}`,
    });

    this.persist();
    return adjRecord;
  }

  public getAdjustments(): AttendanceAdjustment[] {
    return [...this.data.adjustments].reverse();
  }

  // --- Leaves ---
  public getLeaves(): LeaveRecord[] {
    return [...this.data.leaves];
  }

  public addLeave(leave: Omit<LeaveRecord, 'id' | 'createdAt'>, adminName: string): LeaveRecord {
    const newLeave: LeaveRecord = {
      ...leave,
      id: `leave_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.leaves.push(newLeave);

    this.addAuditLog({
      adminName,
      action: 'Leave Granted',
      employeeId: leave.employeeId,
      employeeName: leave.employeeName,
      date: leave.date,
      newValue: `${leave.leaveType} leave - ${leave.reason}`,
      reason: leave.reason,
    });

    this.persist();
    return newLeave;
  }

  public deleteLeave(id: string, adminName: string): boolean {
    const idx = this.data.leaves.findIndex((l) => l.id === id);
    if (idx === -1) return false;
    const removed = this.data.leaves.splice(idx, 1)[0];

    this.addAuditLog({
      adminName,
      action: 'Leave Revoked',
      employeeId: removed.employeeId,
      employeeName: removed.employeeName,
      date: removed.date,
      originalValue: removed.reason,
      reason: 'Leave cancelled by admin',
    });

    this.persist();
    return true;
  }

  // --- Holidays ---
  public getHolidays(): HolidayRecord[] {
    return [...this.data.holidays];
  }

  public addHoliday(holiday: Omit<HolidayRecord, 'id'>, adminName: string): HolidayRecord {
    const newHol: HolidayRecord = {
      ...holiday,
      id: `hol_${Date.now()}`,
    };
    this.data.holidays.push(newHol);

    this.addAuditLog({
      adminName,
      action: 'Holiday Declared',
      date: newHol.date,
      newValue: `${newHol.name} (${newHol.type})`,
      reason: newHol.notes || 'Holiday declared by admin',
    });

    this.persist();
    return newHol;
  }

  public deleteHoliday(id: string, adminName: string): boolean {
    const idx = this.data.holidays.findIndex((h) => h.id === id);
    if (idx === -1) return false;
    const removed = this.data.holidays.splice(idx, 1)[0];

    this.addAuditLog({
      adminName,
      action: 'Holiday Removed',
      date: removed.date,
      originalValue: removed.name,
      reason: 'Holiday removed by admin',
    });

    this.persist();
    return true;
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs].reverse();
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      ...entry,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.push(log);
    // Keep max 500 logs to prevent bloat
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.splice(0, this.data.auditLogs.length - 500);
    }
  }

  // --- Settings & Shifts ---
  public getSettings(): ShopSettings {
    return { ...this.data.settings };
  }

  public updateSettings(settings: Partial<ShopSettings>, adminName: string): ShopSettings {
    this.data.settings = {
      ...this.data.settings,
      ...settings,
    };
    this.addAuditLog({
      adminName,
      action: 'Shop Settings Updated',
      date: getISTDateTime().dateStr,
      reason: 'Store configuration modified',
    });
    this.persist();
    return this.data.settings;
  }

  public getShifts(): Shift[] {
    return [...this.data.shifts];
  }

  public updateShift(shiftId: string, updates: Partial<Shift>, adminName: string): Shift | null {
    const idx = this.data.shifts.findIndex((s) => s.id === shiftId);
    if (idx === -1) return null;
    this.data.shifts[idx] = { ...this.data.shifts[idx], ...updates };
    this.addAuditLog({
      adminName,
      action: 'Shift Configuration Updated',
      date: getISTDateTime().dateStr,
      reason: `Shift ${this.data.shifts[idx].name} updated`,
    });
    this.persist();
    return this.data.shifts[idx];
  }

  // --- Today at a glance / Dashboard Stats ---
  public getDashboardStats(dateStr?: string): DashboardStats {
    const targetDate = dateStr || getISTDateTime().dateStr;
    const activeStaff = this.data.employees.filter((e) => e.isActive);
    const dayAttendance = this.data.attendance.filter((a) => a.date === targetDate);
    const dayLeaves = this.data.leaves.filter((l) => l.date === targetDate);
    const holiday = this.data.holidays.find((h) => h.date === targetDate);

    let present = 0;
    let late = 0;
    let missingPunch = 0;
    let extendedOutPending = 0;

    const attendedEmpIds = new Set<string>();

    for (const att of dayAttendance) {
      attendedEmpIds.add(att.employeeId);
      if (att.outReviewRequired && att.outReviewStatus === 'pending') {
        extendedOutPending++;
      }

      if (att.inTime && att.outTime) {
        if (att.lateMinutes > 0) {
          late++;
        } else {
          present++;
        }
      } else if (att.inTime && !att.outTime) {
        // Punched IN, waiting for OUT. If past shift end (e.g. after 22:30), consider missing punch
        const { timeStr } = getISTDateTime();
        const currentMins = timeStringToMinutes(timeStr);
        if (currentMins >= 1350) { // 22:30
          missingPunch++;
        } else {
          if (att.lateMinutes > 0) late++;
          else present++;
        }
      } else if (!att.inTime && att.outTime) {
        missingPunch++;
      }
    }

    const leaveCount = dayLeaves.length;
    let absent = 0;

    if (!holiday) {
      // Employees who didn't punch in and have no approved leave
      for (const emp of activeStaff) {
        if (!attendedEmpIds.has(emp.id) && !dayLeaves.some((l) => l.employeeId === emp.id)) {
          absent++;
        }
      }
    }

    return {
      present,
      absent,
      late,
      leave: leaveCount,
      holiday: holiday ? activeStaff.length : 0,
      missingPunch,
      extendedOutPending,
      totalActiveStaff: activeStaff.length,
      todayDate: targetDate,
      isTodayHoliday: !!holiday,
      todayHolidayName: holiday?.name,
    };
  }
}

export const db = new Database();
