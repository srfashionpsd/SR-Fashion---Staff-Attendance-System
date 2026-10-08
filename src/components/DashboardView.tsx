import React, { useState, useEffect } from 'react';
import { AttendanceRecord, DashboardStats, Employee, User } from '../types';
import { api } from '../services/api';
import { formatTo12Hour, formatDuration } from '../shared/attendanceRules';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarDays,
  PartyPopper,
  AlertOctagon,
  Clock,
  Search,
  Filter,
  SlidersHorizontal,
  Edit,
  Share2,
  PlusCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: User | null;
  onNavigateToAdjustments: () => void;
  onOpenManualAttendance: (employeeId?: string) => void;
  onOpenEditAttendance: (record: AttendanceRecord) => void;
  onOpenWhatsAppSummary: (employeeId?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onNavigateToAdjustments,
  onOpenManualAttendance,
  onOpenEditAttendance,
  onOpenWhatsAppSummary,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayRecords, setTodayRecords] = useState<(AttendanceRecord & { employee?: Employee })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, todayData] = await Promise.all([
        api.getDashboardStats(),
        api.getTodayAttendance(),
      ]);
      setStats(statsData);
      setTodayRecords(todayData.records);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filtered staff list
  const filteredRecords = todayRecords.filter((record) => {
    const matchesSearch =
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employee?.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employee?.barcode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      record.status === statusFilter ||
      (statusFilter === 'review' && record.outReviewRequired);

    return matchesSearch && matchesStatus;
  });

  // Identify items requiring urgent Admin Action
  const pendingActions = todayRecords.filter(
    (r) => (r.outReviewRequired && r.outReviewStatus === 'pending') || r.status === 'missing_punch'
  );

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* SECTION 1: TODAY AT A GLANCE (The first thing admin sees) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <span>SR Fashion Management</span>
              <span>•</span>
              <span>Daily Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif font-['Cinzel',serif]">
              TODAY AT A GLANCE
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenWhatsAppSummary()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Full Store WhatsApp</span>
            </button>
            <button
              onClick={() => onOpenManualAttendance()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Manual Attendance</span>
            </button>
          </div>
        </div>

        {/* 6 Key Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          {/* Present */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-bold uppercase tracking-wider">Present</span>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.present ?? '—'}
              </span>
              <span className="text-xs text-slate-400">staff</span>
            </div>
          </div>

          {/* Absent */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-xs font-bold uppercase tracking-wider">Absent</span>
              <XCircle className="w-5 h-5" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.absent ?? '—'}
              </span>
              <span className="text-xs text-slate-400">staff</span>
            </div>
          </div>

          {/* Late */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-bold uppercase tracking-wider">Late</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.late ?? '—'}
              </span>
              <span className="text-xs text-slate-400">(&gt; 12:15 PM)</span>
            </div>
          </div>

          {/* Leave */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-xs font-bold uppercase tracking-wider">Leave</span>
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.leave ?? '—'}
              </span>
              <span className="text-xs text-slate-400">approved</span>
            </div>
          </div>

          {/* Holiday */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-xs font-bold uppercase tracking-wider">Holiday</span>
              <PartyPopper className="w-5 h-5" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.isTodayHoliday ? 'YES' : '0'}
              </span>
              <span className="text-xs text-slate-400">
                {stats?.isTodayHoliday ? stats.todayHolidayName : 'working day'}
              </span>
            </div>
          </div>

          {/* Missing Punch */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-500">
              <span className="text-xs font-bold uppercase tracking-wider">Missing Punch</span>
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {stats?.missingPunch ?? 0}
              </span>
              <span className="text-xs text-slate-400">punches</span>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2: ADMIN ACTION REQUIRED (Pending Extended OUT or Missing Punches) */}
      {(pendingActions.length > 0 || (stats && stats.extendedOutPending > 0)) && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-400/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              <h2 className="text-sm font-extrabold text-amber-950 uppercase tracking-wider">
                ADMIN ACTION REQUIRED ({pendingActions.length} Pending)
              </h2>
            </div>
            <button
              onClick={onNavigateToAdjustments}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Adjustments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingActions.map((actionRecord) => (
              <div
                key={actionRecord.id}
                className="bg-white p-3.5 rounded-xl border border-amber-300 shadow-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {actionRecord.employeeName}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900">
                      Extended OUT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    OUT: <strong className="font-mono">{formatTo12Hour(actionRecord.outTime)}</strong> (
                    {actionRecord.extendedOutMinutes}m beyond 10:15 PM grace)
                  </p>
                </div>

                <button
                  onClick={onNavigateToAdjustments}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: TODAY'S STAFF TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Today's Staff Attendance</h2>
            <p className="text-xs text-slate-500">
              Live attendance status for all {todayRecords.length} registered employees
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff name / code..."
                className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 w-44 sm:w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 font-medium"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
              <option value="review">Admin Review Required</option>
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">IN Time</th>
                <th className="py-3 px-3">OUT Time</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Worked</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec) => {
                const isLate = rec.status === 'late' || (rec.lateMinutes && rec.lateMinutes > 0);
                const isReview = rec.outReviewRequired;

                return (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                    
                    {/* Employee info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{rec.employeeName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {rec.employee?.employeeId || 'SR-STAFF'} • {rec.employee?.barcode}
                      </div>
                    </td>

                    {/* IN */}
                    <td className="py-3 px-3 font-mono font-medium">
                      {rec.inTime ? (
                        <div className="flex items-center gap-1.5">
                          <span>{formatTo12Hour(rec.inTime)}</span>
                          {isLate && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                              +{rec.lateMinutes}m
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* OUT */}
                    <td className="py-3 px-3 font-mono font-medium">
                      {rec.outTime ? (
                        <div className="flex items-center gap-1.5">
                          <span>{formatTo12Hour(rec.outTime)}</span>
                          {isReview && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded">
                              Review
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Method */}
                    <td className="py-3 px-3 capitalize text-slate-500">
                      {rec.inMethod || rec.outMethod || '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      {rec.status === 'present' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Present
                        </span>
                      )}
                      {rec.status === 'late' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                          {rec.lateMinutes} min Late
                        </span>
                      )}
                      {rec.status === 'absent' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          Absent
                        </span>
                      )}
                      {rec.status === 'leave' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          Leave
                        </span>
                      )}
                      {rec.status === 'holiday' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                          Holiday
                        </span>
                      )}
                      {rec.status === 'missing_punch' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-200 text-rose-900">
                          Missing Punch
                        </span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {rec.workingHoursMinutes ? formatDuration(rec.workingHoursMinutes) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onOpenWhatsAppSummary(rec.employeeId)}
                        title="Share WhatsApp Summary"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenEditAttendance(rec)}
                        title="Edit Punch / Times"
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            No attendance records matched the search criteria.
          </div>
        )}
      </div>

    </div>
  );
};
