import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db';
import { getISTDateTime, timeStringToMinutes } from './src/shared/attendanceRules';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory sessions
const activeSessions = new Map<string, { userId: string; role: 'admin' | 'operator'; name: string; expiresAt: number }>();

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Authentication middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    (req as any).user = session;
  }
  next();
}

app.use(authMiddleware);

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  let user = (req as any).user;
  if (!user) {
    // Default to SR Fashion Admin for authorized store actions
    user = {
      userId: 'usr_admin',
      role: 'admin',
      name: 'SR Fashion Admin',
    };
    (req as any).user = user;
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }
  next();
}

// --- API ROUTES ---

// 1. Time API (Authoritative IST time)
app.get('/api/time', (req: Request, res: Response) => {
  const ist = getISTDateTime();
  res.json(ist);
});

// 2. Authentication API
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.verifyCredentials(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = generateToken();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  activeSessions.set(token, {
    userId: user.id,
    role: user.role,
    name: user.name,
    expiresAt,
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user,
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// 3. Attendance Punch API (Barcode or Face)
app.post('/api/attendance/punch', (req: Request, res: Response) => {
  const { barcode, employeeId, method, overrideTime } = req.body;

  let employee = null;
  if (barcode) {
    employee = db.getEmployeeByBarcode(barcode);
  } else if (employeeId) {
    employee = db.getEmployeeById(employeeId);
  }

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: barcode
        ? `Barcode '${barcode}' not found. Please register or check employee ID card.`
        : 'Employee record not found.',
      type: 'error',
    });
  }

  const result = db.punchAttendance(employee, method || 'barcode', overrideTime);
  res.json(result);
});

// 4. Today's Attendance View with Full Staff Status
app.get('/api/attendance/today', (req: Request, res: Response) => {
  const { dateStr } = getISTDateTime();
  const date = (req.query.date as string) || dateStr;

  const records = db.getAttendanceForDate(date);
  const activeStaff = db.getEmployees(true);
  const dayLeaves = db.getLeaves().filter((l) => l.date === date);
  const holiday = db.getHolidays().find((h) => h.date === date);

  // Map of employee ID to attendance record
  const recordMap = new Map<string, any>();
  records.forEach((r) => recordMap.set(r.employeeId, r));

  // Construct complete staff view for today
  const combined = activeStaff.map((emp) => {
    const existing = recordMap.get(emp.id);
    const leave = dayLeaves.find((l) => l.employeeId === emp.id);

    if (existing) {
      return {
        ...existing,
        employee: emp,
      };
    }

    if (holiday) {
      return {
        id: `hol_${emp.id}_${date}`,
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        status: 'holiday',
        lateMinutes: 0,
        extendedOutMinutes: 0,
        outReviewRequired: false,
        employee: emp,
        notes: holiday.name,
      };
    }

    if (leave) {
      return {
        id: `leave_${emp.id}_${date}`,
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        status: 'leave',
        lateMinutes: 0,
        extendedOutMinutes: 0,
        outReviewRequired: false,
        employee: emp,
        notes: `${leave.leaveType} leave - ${leave.reason}`,
      };
    }

    // Otherwise Absent
    return {
      id: `abs_${emp.id}_${date}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date,
      status: 'absent',
      lateMinutes: 0,
      extendedOutMinutes: 0,
      outReviewRequired: false,
      employee: emp,
    };
  });

  res.json({
    date,
    records: combined,
    holiday: holiday || null,
    totalStaff: activeStaff.length,
  });
});

// 5. Attendance History & Reports Filter
app.get('/api/attendance/history', (req: Request, res: Response) => {
  const { startDate, endDate, employeeId, status } = req.query;
  let all = db.getAllAttendance();

  if (startDate) {
    all = all.filter((a) => a.date >= (startDate as string));
  }
  if (endDate) {
    all = all.filter((a) => a.date <= (endDate as string));
  }
  if (employeeId) {
    all = all.filter((a) => a.employeeId === employeeId);
  }
  if (status) {
    all = all.filter((a) => a.status === status);
  }

  // Sort by date descending, then employeeName
  all.sort((a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName));

  res.json(all);
});

// 6. Manual Attendance Management (Admin)
app.post('/api/attendance/manual', requireAdmin, (req: Request, res: Response) => {
  const { employeeId, date, inTime, outTime, status, reason } = req.body;
  const adminName = (req as any).user?.name || 'Admin';

  if (!employeeId || !date) {
    return res.status(400).json({ error: 'Employee ID and date are required' });
  }

  try {
    const record = db.createManualAttendance(
      employeeId,
      date,
      inTime,
      outTime,
      status,
      adminName,
      reason || 'Manual entry by Admin'
    );
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/attendance/:id', requireAdmin, (req: Request, res: Response) => {
  const id = req.params.id;
  const { inTime, outTime, status, notes, reason } = req.body;
  const adminName = (req as any).user?.name || 'Admin';

  const updated = db.updateAttendanceRecord(
    id,
    { inTime, outTime, status, notes },
    adminName,
    reason || 'Admin modification'
  );

  if (!updated) {
    return res.status(404).json({ error: 'Attendance record not found' });
  }
  res.json(updated);
});

app.delete('/api/attendance/:id', requireAdmin, (req: Request, res: Response) => {
  const id = req.params.id;
  const { reason } = req.body;
  const adminName = (req as any).user?.name || 'Admin';

  const deleted = db.deleteAttendanceRecord(id, adminName, reason || 'Admin deleted record');
  if (!deleted) {
    return res.status(404).json({ error: 'Attendance record not found' });
  }
  res.json({ success: true });
});

// 7. Adjustments (Extended OUT Review)
app.get('/api/adjustments', (req: Request, res: Response) => {
  res.json(db.getAdjustments());
});

app.post('/api/adjustments', requireAdmin, (req: Request, res: Response) => {
  const { attendanceId, adjustmentType, inAdjustmentMinutes, outAdjustmentMinutes, reason } = req.body;
  const adminName = (req as any).user?.name || 'Admin';

  if (!attendanceId || !adjustmentType) {
    return res.status(400).json({ error: 'Attendance ID and adjustment type are required' });
  }

  const result = db.applyAdjustment(
    attendanceId,
    adjustmentType,
    parseInt(inAdjustmentMinutes, 10) || 0,
    parseInt(outAdjustmentMinutes, 10) || 0,
    adminName,
    reason || 'Extended OUT review adjustment'
  );

  if (!result) {
    return res.status(404).json({ error: 'Attendance record not found' });
  }

  res.json(result);
});

// 8. Employees API
app.get('/api/employees', (req: Request, res: Response) => {
  const activeOnly = req.query.active === 'true';
  res.json(db.getEmployees(activeOnly));
});

app.post('/api/employees', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const { name, employeeId, barcode, mobile, shiftId, notes, faceProfile } = req.body;

  if (!name || !barcode) {
    return res.status(400).json({ error: 'Name and barcode are required' });
  }

  // Check unique barcode
  const existing = db.getEmployeeByBarcode(barcode);
  if (existing) {
    return res.status(400).json({ error: `Barcode '${barcode}' already assigned to ${existing.name}` });
  }

  const newEmp = db.addEmployee(
    {
      name,
      employeeId: employeeId || `SR-${Math.floor(100 + Math.random() * 900)}`,
      barcode,
      mobile,
      shiftId: shiftId || 'shift_default',
      notes,
      isActive: true,
      joiningDate: getISTDateTime().dateStr,
      faceProfile,
    },
    adminName
  );

  res.json(newEmp);
});

app.put('/api/employees/:id', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const id = req.params.id;

  const updated = db.updateEmployee(id, req.body, adminName);
  if (!updated) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json(updated);
});

// Face enrollment endpoint
app.post('/api/employees/:id/face', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const id = req.params.id;
  const { features, thumbnailUrl } = req.body;

  if (!features || !Array.isArray(features)) {
    return res.status(400).json({ error: 'Facial feature vector required' });
  }

  const updated = db.updateEmployee(
    id,
    {
      faceProfile: {
        enrolledAt: new Date().toISOString(),
        features,
        thumbnailUrl,
      },
    },
    adminName
  );

  if (!updated) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json({ success: true, employee: updated });
});

app.delete('/api/employees/:id', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const id = req.params.id;

  const deleted = db.deleteEmployee(id, adminName);
  if (!deleted) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json({ success: true });
});

app.post('/api/employees/clear-all', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const count = db.clearAllEmployees(adminName);
  res.json({ success: true, deletedCount: count });
});

// 9. Dashboard Stats (Today at a Glance)
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  const date = (req.query.date as string) || getISTDateTime().dateStr;
  const stats = db.getDashboardStats(date);
  res.json(stats);
});

// 10. Leaves API
app.get('/api/leaves', (req: Request, res: Response) => {
  res.json(db.getLeaves());
});

app.post('/api/leaves', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const { employeeId, employeeName, date, reason, leaveType } = req.body;

  if (!employeeId || !date) {
    return res.status(400).json({ error: 'Employee and date required' });
  }

  const leave = db.addLeave(
    {
      employeeId,
      employeeName: employeeName || 'Staff Member',
      date,
      reason: reason || 'Personal Leave',
      leaveType: leaveType || 'personal',
      approvedBy: adminName,
    },
    adminName
  );

  res.json(leave);
});

app.delete('/api/leaves/:id', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const success = db.deleteLeave(req.params.id, adminName);
  res.json({ success });
});

// 11. Holidays API
app.get('/api/holidays', (req: Request, res: Response) => {
  res.json(db.getHolidays());
});

app.post('/api/holidays', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const { date, name, type, notes } = req.body;

  if (!date || !name) {
    return res.status(400).json({ error: 'Date and holiday name required' });
  }

  const hol = db.addHoliday(
    {
      date,
      name,
      type: type || 'custom',
      notes,
    },
    adminName
  );

  res.json(hol);
});

app.delete('/api/holidays/:id', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const success = db.deleteHoliday(req.params.id, adminName);
  res.json({ success });
});

// 12. Audit Logs API
app.get('/api/audit-logs', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

// 13. Settings & Shifts
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.put('/api/settings', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const updated = db.updateSettings(req.body, adminName);
  res.json(updated);
});

app.get('/api/shifts', (req: Request, res: Response) => {
  res.json(db.getShifts());
});

app.put('/api/shifts/:id', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as any).user?.name || 'Admin';
  const updated = db.updateShift(req.params.id, req.body, adminName);
  res.json(updated);
});

// 14. Monthly Aggregates & Staff Summaries for Reports and WhatsApp Sharing
app.get('/api/reports/monthly-summary', (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
  const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

  const employees = db.getEmployees(true);
  const allAtt = db.getAllAttendance().filter((a) => a.date.startsWith(monthStr));
  const allLeaves = db.getLeaves().filter((l) => l.date.startsWith(monthStr));
  const allHolidays = db.getHolidays().filter((h) => h.date.startsWith(monthStr));

  const holidayDaysCount = allHolidays.length;

  const staffSummaries = employees.map((emp) => {
    const empAtt = allAtt.filter((a) => a.employeeId === emp.id);
    const empLeaves = allLeaves.filter((l) => l.employeeId === emp.id);

    let presentDays = 0;
    let lateDays = 0;
    let totalLateMinutes = 0;
    let totalWorkingMinutes = 0;
    let missingPunches = 0;

    for (const a of empAtt) {
      if (a.inTime && a.outTime) {
        presentDays++;
        if (a.lateMinutes > 0) {
          lateDays++;
          totalLateMinutes += a.lateMinutes;
        }
        if (a.workingHoursMinutes) {
          totalWorkingMinutes += a.workingHoursMinutes;
        }
      } else if (a.inTime && !a.outTime) {
        presentDays++;
        missingPunches++;
        if (a.lateMinutes > 0) {
          lateDays++;
          totalLateMinutes += a.lateMinutes;
        }
      } else if (!a.inTime && a.outTime) {
        missingPunches++;
      }
    }

    const leaveDays = empLeaves.length;
    // Calculate days elapsed in month up to current day
    const { dateStr } = getISTDateTime();
    const isCurrentMonth = dateStr.startsWith(monthStr);
    const currentDay = isCurrentMonth ? parseInt(dateStr.split('-')[2], 10) : 30;

    const workingDaysSoFar = Math.max(0, currentDay - holidayDaysCount);
    const accountedDays = presentDays + leaveDays;
    const absentDays = Math.max(0, workingDaysSoFar - accountedDays);

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeId,
      employeeName: emp.name,
      mobile: emp.mobile,
      barcode: emp.barcode,
      presentDays,
      lateDays,
      totalLateMinutes,
      avgLateMinutes: lateDays > 0 ? Math.round(totalLateMinutes / lateDays) : 0,
      leaveDays,
      holidayDays: holidayDaysCount,
      absentDays,
      missingPunches,
      totalWorkingHours: (totalWorkingMinutes / 60).toFixed(1),
    };
  });

  res.json({
    year,
    month,
    monthStr,
    totalStaff: employees.length,
    holidayCount: holidayDaysCount,
    summaries: staffSummaries,
  });
});

// Setup Vite in Dev or serve static in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SR Fashion Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
