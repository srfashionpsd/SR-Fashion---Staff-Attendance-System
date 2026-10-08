import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Employee } from '../types';
import { api } from '../services/api';
import { formatTo12Hour, formatDuration } from '../shared/attendanceRules';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<string>('daily');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const reportOptions = [
    { id: 'daily', label: '1. Daily Report' },
    { id: 'weekly', label: '2. Weekly Report' },
    { id: 'monthly', label: '3. Monthly Report' },
    { id: 'yearly', label: '4. Yearly Report' },
    { id: 'staff_wise', label: '5. Staff-wise Report' },
    { id: 'late', label: '6. Late Report' },
    { id: 'absent', label: '7. Absent Report' },
    { id: 'leave', label: '8. Leave Report' },
    { id: 'holiday', label: '9. Holiday Report' },
    { id: 'missing_punch', label: '10. Missing Punch Report' },
    { id: 'working_hours', label: '11. Working Hours Report' },
    { id: 'manual_adjustments', label: '12. Manual Adjustment Report' },
  ];

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(() => {});
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Adjust date ranges based on report type preset
      let sDate = startDate;
      let eDate = endDate;
      const today = new Date();

      if (reportType === 'daily') {
        sDate = today.toISOString().split('T')[0];
        eDate = sDate;
      } else if (reportType === 'weekly') {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        sDate = weekAgo.toISOString().split('T')[0];
        eDate = today.toISOString().split('T')[0];
      } else if (reportType === 'monthly') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        sDate = firstDay.toISOString().split('T')[0];
        eDate = today.toISOString().split('T')[0];
      } else if (reportType === 'yearly') {
        sDate = `${today.getFullYear()}-01-01`;
        eDate = `${today.getFullYear()}-12-31`;
      }

      let statusParam: string | undefined = undefined;
      if (reportType === 'late') statusParam = 'late';
      if (reportType === 'absent') statusParam = 'absent';
      if (reportType === 'leave') statusParam = 'leave';
      if (reportType === 'holiday') statusParam = 'holiday';
      if (reportType === 'missing_punch') statusParam = 'missing_punch';

      let res = await api.getAttendanceHistory({
        startDate: sDate,
        endDate: eDate,
        employeeId: selectedEmpId || undefined,
        status: statusParam,
      });

      if (reportType === 'manual_adjustments') {
        res = res.filter((r) => r.isAdjusted || r.inMethod === 'manual');
      }

      setRecords(res);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, selectedEmpId, startDate, endDate]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Employee Name',
      'IN Time',
      'OUT Time',
      'Status',
      'Late (Mins)',
      'Working Hours (Mins)',
      'Adjusted',
      'Notes',
    ];

    const rows = records.map((r) => [
      `"${r.date}"`,
      `"${r.employeeName}"`,
      `"${formatTo12Hour(r.inTime)}"`,
      `"${formatTo12Hour(r.outTime)}"`,
      `"${r.status}"`,
      r.lateMinutes || 0,
      r.workingHoursMinutes || 0,
      r.isAdjusted ? 'Yes' : 'No',
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SR_Fashion_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <span>SR Fashion Analytics</span>
            <span>•</span>
            <span>Audited Attendance Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif font-['Cinzel',serif]">
            ATTENDANCE REPORTS (12 REPORT MODES)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive audit reports with custom date ranges, employee drill-down, and CSV export.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Filtered CSV</span>
        </button>
      </div>

      {/* Report Type Selector Pills */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {reportOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setReportType(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                reportType === opt.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Parameters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block font-bold uppercase text-slate-500 mb-1">
            Filter Employee:
          </label>
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium"
          >
            <option value="">All Employees ({employees.length})</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.employeeId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold uppercase text-slate-500 mb-1">
            Start Date:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 font-mono font-medium"
          />
        </div>

        <div>
          <label className="block font-bold uppercase text-slate-500 mb-1">
            End Date:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-300 font-mono font-medium"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {records.length} Records Generated
          </span>
          <span className="text-xs text-slate-400">
            Timestamps calculated under Asia/Kolkata (IST)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">IN Time</th>
                <th className="py-3 px-3">OUT Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Late Mins</th>
                <th className="py-3 px-3">Hours</th>
                <th className="py-3 px-4">Audit Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono">{r.date}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{r.employeeName}</td>
                  <td className="py-3 px-3 font-mono">{formatTo12Hour(r.inTime)}</td>
                  <td className="py-3 px-3 font-mono">{formatTo12Hour(r.outTime)}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'late'
                          ? 'bg-amber-100 text-amber-900'
                          : r.status === 'absent'
                          ? 'bg-rose-100 text-rose-800'
                          : r.status === 'leave'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {r.lateMinutes > 0 ? `+${r.lateMinutes}m` : '0m'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {r.workingHoursMinutes ? formatDuration(r.workingHoursMinutes) : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                    {r.notes || (r.isAdjusted ? 'Adjusted by Admin' : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs">
            No attendance records found for the selected report filters.
          </div>
        )}
      </div>

    </div>
  );
};
