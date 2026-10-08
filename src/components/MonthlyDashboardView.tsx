import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StaffMonthlySummaryItem } from '../services/whatsapp';
import {
  Calendar,
  Share2,
  Download,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface MonthlyDashboardViewProps {
  onOpenWhatsAppSummary: (employeeId?: string) => void;
}

export const MonthlyDashboardView: React.FC<MonthlyDashboardViewProps> = ({
  onOpenWhatsAppSummary,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [summaries, setSummaries] = useState<StaffMonthlySummaryItem[]>([]);
  const [holidayCount, setHolidayCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const res = await api.getMonthlySummary(selectedYear, selectedMonth);
      setSummaries(res.summaries);
      setHolidayCount(res.holidayCount);
    } catch (err) {
      console.error('Error fetching monthly summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedYear, selectedMonth]);

  const filteredSummaries = summaries.filter(
    (s) =>
      s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportCSV = () => {
    const monthName = months.find((m) => m.value === selectedMonth)?.label || '';
    const headers = [
      'Employee Code',
      'Employee Name',
      'Present Days',
      'Absent Days',
      'Leave Days',
      'Holiday Days',
      'Late Days',
      'Total Late Minutes',
      'Avg Late Minutes',
      'Missing Punches',
      'Total Working Hours',
    ];

    const rows = filteredSummaries.map((s) => [
      `"${s.employeeCode}"`,
      `"${s.employeeName}"`,
      s.presentDays,
      s.absentDays,
      s.leaveDays,
      s.holidayDays,
      s.lateDays,
      s.totalLateMinutes,
      s.avgLateMinutes,
      s.missingPunches,
      `"${s.totalWorkingHours}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SR_Fashion_Monthly_Attendance_${monthName}_${selectedYear}.csv`);
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
            <span>SR Fashion Reports</span>
            <span>•</span>
            <span>Monthly Staff Summaries</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif font-['Cinzel',serif]">
            MONTHLY ATTENDANCE DASHBOARD
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly aggregates, total hours, late metrics, and one-tap WhatsApp summaries.
          </p>
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
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Month/Year Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>Select Period:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Staff-Wise Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-3 text-center">Present</th>
                <th className="py-3 px-3 text-center">Absent</th>
                <th className="py-3 px-3 text-center">Leave</th>
                <th className="py-3 px-3 text-center">Holiday</th>
                <th className="py-3 px-3 text-center">Late Days</th>
                <th className="py-3 px-3 text-center">Late Mins</th>
                <th className="py-3 px-3 text-center">Avg Late</th>
                <th className="py-3 px-3 text-center">Missing</th>
                <th className="py-3 px-3 text-center">Total Hours</th>
                <th className="py-3 px-4 text-right">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSummaries.map((s) => (
                <tr key={s.employeeId} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 text-sm">{s.employeeName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {s.employeeCode}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-700">
                    {s.presentDays}d
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-rose-600">
                    {s.absentDays}d
                  </td>
                  <td className="py-3 px-3 text-center font-medium text-blue-600">
                    {s.leaveDays}d
                  </td>
                  <td className="py-3 px-3 text-center font-medium text-purple-600">
                    {s.holidayDays}d
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        s.lateDays > 0 ? 'bg-amber-100 text-amber-900' : 'text-slate-500'
                      }`}
                    >
                      {s.lateDays}d
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {s.totalLateMinutes > 0 ? `${s.totalLateMinutes}m` : '0m'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">
                    {s.avgLateMinutes > 0 ? `${s.avgLateMinutes}m` : '—'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.missingPunches > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                        {s.missingPunches}
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                    {s.totalWorkingHours} hrs
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onOpenWhatsAppSummary(s.employeeId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
