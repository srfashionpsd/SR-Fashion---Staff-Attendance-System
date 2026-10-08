import { AttendanceRecord, AttendanceStatus, Shift } from '../types';

export const DEFAULT_SHIFT: Shift = {
  id: 'shift_default',
  name: 'Standard Shift (12 PM - 10 PM)',
  startTime: '12:00',
  endTime: '22:00',
  graceInMinutes: 15, // Up to 12:15 PM is On Time. 12:16 PM is Late.
  graceOutMinutes: 15, // Up to 10:15 PM is Normal. 10:16 PM+ requires Admin Review.
  isDefault: true,
};

/**
 * Parses "HH:mm" 24h string into minutes from midnight (0 to 1439)
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Converts minutes from midnight into "HH:mm" 24h string
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Converts 24h "HH:mm" to 12h format e.g. "12:16 PM", "10:15 PM"
 */
export function formatTo12Hour(timeStr?: string): string {
  if (!timeStr) return '—';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // '0' should be '12'
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get current date and time in Asia/Kolkata (IST)
 */
export function getISTDateTime(overrideDate?: Date): {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  formatted12h: string; // "12:08 PM"
  fullDisplay: string;
} {
  const d = overrideDate || new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(d);
  
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '12';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;
  const formatted12h = formatTo12Hour(timeStr);

  const displayDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);

  return {
    dateStr,
    timeStr,
    formatted12h,
    fullDisplay: `${displayDate} • ${formatted12h}`,
  };
}

/**
 * Strict IN Rule Calculation
 * Scheduled IN: 12:00 PM (720 min)
 * Grace: 15 mins (up to 12:15 PM, 735 min)
 * 12:15 -> On Time
 * 12:16 -> 16 minutes Late
 * 12:20 -> 20 minutes Late
 * 12:45 -> 45 minutes Late
 *
 * If prior to 12:00 PM, lateMinutes = 0, status = 'present' (On Time)
 */
export function calculateInStatus(
  inTimeStr: string,
  shift: Shift = DEFAULT_SHIFT,
  adjustedInMinutes: number = 0
): {
  status: 'present' | 'late';
  lateMinutes: number;
  description: string;
} {
  const inMinutes = timeStringToMinutes(inTimeStr);
  const scheduledInMinutes = timeStringToMinutes(shift.startTime); // 720 (12:00)
  const graceThresholdMinutes = scheduledInMinutes + shift.graceInMinutes; // 735 (12:15)

  // Effective in time after any admin approved adjustment (e.g. -10 min credit)
  const effectiveInMinutes = inMinutes - adjustedInMinutes;

  if (effectiveInMinutes <= graceThresholdMinutes) {
    return {
      status: 'present',
      lateMinutes: 0,
      description: 'ON TIME',
    };
  } else {
    // 12:16 is 16 minutes late: actual IN - 12:00 PM
    const lateMins = effectiveInMinutes - scheduledInMinutes;
    return {
      status: 'late',
      lateMinutes: lateMins,
      description: `${lateMins} min Late`,
    };
  }
}

/**
 * Strict OUT Rule Calculation
 * Scheduled OUT: 10:00 PM (1320 min)
 * Grace: 15 mins (up to 10:15 PM, 1335 min)
 * 10:00 -> Normal
 * 10:05 -> Normal
 * 10:15 -> Normal
 * 10:16 -> Admin Review Required (1 min beyond 10:15 PM grace, 16 mins beyond 10:00 PM)
 * 10:25 -> Admin Review Required (10 mins beyond 10:15 PM grace, 25 mins beyond 10:00 PM)
 *
 * System does NOT automatically convert into anything. Admin review required.
 */
export function calculateOutStatus(
  outTimeStr: string,
  shift: Shift = DEFAULT_SHIFT,
  adjustedOutMinutes: number = 0
): {
  isNormal: boolean;
  reviewRequired: boolean;
  extendedOutMinutes: number; // minutes beyond permitted grace period (10:15 PM)
  totalBeyondScheduledMinutes: number; // minutes beyond 10:00 PM
  description: string;
} {
  const outMinutes = timeStringToMinutes(outTimeStr);
  const scheduledOutMinutes = timeStringToMinutes(shift.endTime); // 1320 (22:00)
  const graceThresholdMinutes = scheduledOutMinutes + shift.graceOutMinutes; // 1335 (22:15)

  const effectiveOutMinutes = outMinutes - adjustedOutMinutes;

  if (effectiveOutMinutes <= graceThresholdMinutes) {
    return {
      isNormal: true,
      reviewRequired: false,
      extendedOutMinutes: 0,
      totalBeyondScheduledMinutes: Math.max(0, effectiveOutMinutes - scheduledOutMinutes),
      description: 'Normal',
    };
  } else {
    // Punched out at 10:16 PM or later
    const beyondGraceMinutes = effectiveOutMinutes - graceThresholdMinutes;
    const totalBeyondScheduled = effectiveOutMinutes - scheduledOutMinutes;
    return {
      isNormal: false,
      reviewRequired: true,
      extendedOutMinutes: beyondGraceMinutes,
      totalBeyondScheduledMinutes: totalBeyondScheduled,
      description: 'Extended OUT Time — Admin Review Required',
    };
  }
}

/**
 * Calculates total worked minutes between IN and OUT
 */
export function calculateWorkingMinutes(inTime?: string, outTime?: string): number {
  if (!inTime || !outTime) return 0;
  const inM = timeStringToMinutes(inTime);
  const outM = timeStringToMinutes(outTime);
  if (outM <= inM) return 0;
  return outM - inM;
}

/**
 * Formats duration in minutes to human readable string e.g. "9h 45m"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Resolves overall status for an attendance record
 */
export function evaluateOverallStatus(
  record: Partial<AttendanceRecord>,
  isHoliday: boolean = false,
  isLeave: boolean = false
): AttendanceStatus {
  if (isHoliday) return 'holiday';
  if (isLeave) return 'leave';

  if (!record.inTime && !record.outTime) {
    return 'absent';
  }

  // Missing punch checks
  if ((record.inTime && !record.outTime) || (!record.inTime && record.outTime)) {
    // If it's earlier in the day and person is currently working, they are present or late
    // Once day concludes or if flagged missing, it's missing_punch
    if (record.inTime && !record.outTime) {
      return (record.lateMinutes && record.lateMinutes > 0) ? 'late' : 'present';
    }
    return 'missing_punch';
  }

  // Both IN and OUT exist
  if (record.lateMinutes && record.lateMinutes > 0) {
    return 'late';
  }

  return 'present';
}
