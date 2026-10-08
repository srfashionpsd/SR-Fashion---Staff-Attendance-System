import React, { useState, useEffect } from 'react';
import { Employee, HolidayRecord, LeaveRecord, User } from '../types';
import { api } from '../services/api';
import {
  CalendarDays,
  PartyPopper,
  PlusCircle,
  Trash2,
  CheckCircle2,
  X,
  AlertCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface LeavesHolidaysViewProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const LeavesHolidaysView: React.FC<LeavesHolidaysViewProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);

  // In-app confirmation dialog & toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [formError, setFormError] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Forms
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    leaveType: 'personal' as const,
    reason: '',
  });

  const [holidayForm, setHolidayForm] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    type: 'festival' as const,
    notes: '',
  });

  const loadData = async () => {
    try {
      const [lList, hList, eList] = await Promise.all([
        api.getLeaves(),
        api.getHolidays(),
        api.getEmployees(true),
      ]);
      setLeaves(lList);
      setHolidays(hList);
      setEmployees(eList);
      if (eList.length > 0 && !leaveForm.employeeId) {
        setLeaveForm((prev) => ({ ...prev, employeeId: eList[0].id }));
      }
    } catch (err: any) {
      console.error('Error loading leaves and holidays:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const emp = employees.find((e) => e.id === leaveForm.employeeId);
    if (!emp) return;

    try {
      await api.addLeave({
        employeeId: emp.id,
        employeeName: emp.name,
        date: leaveForm.date,
        reason: leaveForm.reason || 'Personal Leave',
        leaveType: leaveForm.leaveType,
      });
      setIsLeaveModalOpen(false);
      showToast(`Leave granted for ${emp.name}`, 'success');
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFormError(err.message || 'Error granting leave');
    }
  };

  const handleDeleteLeave = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Revoke Approved Leave?',
      description: 'Are you sure you want to revoke this approved leave record? This will update attendance calculations accordingly.',
      confirmLabel: 'Revoke Leave',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteLeave(id);
          showToast('Leave revoked successfully', 'success');
          await loadData();
          if (onRefreshData) onRefreshData();
        } catch (err: any) {
          showToast(err.message || 'Error revoking leave', 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      await api.addHoliday({
        date: holidayForm.date,
        name: holidayForm.name,
        type: holidayForm.type,
        notes: holidayForm.notes,
      });
      setIsHolidayModalOpen(false);
      showToast(`Holiday "${holidayForm.name}" created`, 'success');
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFormError(err.message || 'Error creating holiday');
    }
  };

  const handleDeleteHoliday = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Official Holiday?',
      description: 'Are you sure you want to remove this official holiday? Staff will be required to work on this date unless granted individual leave.',
      confirmLabel: 'Remove Holiday',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteHoliday(id);
          showToast('Holiday removed', 'success');
          await loadData();
          if (onRefreshData) onRefreshData();
        } catch (err: any) {
          showToast(err.message || 'Error deleting holiday', 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-[99] max-w-sm w-full p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 bg-white border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl flex-shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-100 text-emerald-700' :
              toast.type === 'error' ? 'bg-rose-100 text-rose-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <p className="text-xs font-semibold text-slate-800 leading-snug">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl flex-shrink-0 ${
                confirmDialog.isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {confirmDialog.isDestructive ? <Trash2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">SR Fashion Calendar</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {confirmDialog.description}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2 ${
                  confirmDialog.isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {confirmDialog.isDestructive && <Trash2 className="w-4 h-4" />}
                <span>{confirmDialog.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
          <span>SR Fashion Calendar</span>
          <span>•</span>
          <span>Official Leave & Holiday Registry</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif font-['Cinzel',serif]">
          LEAVES & OFFICIAL HOLIDAYS
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Holidays are never counted as Absent or Late. Approved leaves are isolated and tracked with explicit audit reasons.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 1: OFFICIAL HOLIDAYS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PartyPopper className="w-5 h-5 text-purple-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Official Store Holidays</h2>
                <p className="text-xs text-slate-500">Eid, Festivals, & Emergency Closures</p>
              </div>
            </div>
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Declare Holiday</span>
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 bg-purple-50/30 flex items-center justify-between transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{h.name}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                      {h.type}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-purple-900 font-semibold mt-0.5">
                    📅 {h.date}
                  </div>
                  {h.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">"{h.notes}"</p>}
                </div>

                <button
                  onClick={() => handleDeleteHoliday(h.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Remove Holiday"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {holidays.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No store holidays currently declared.
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: APPROVED STAFF LEAVES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Approved Staff Leaves</h2>
                <p className="text-xs text-slate-500">Tracked separately from Absences</p>
              </div>
            </div>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Grant Leave</span>
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {leaves.map((l) => (
              <div
                key={l.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-blue-50/30 flex items-center justify-between transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{l.employeeName}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                      {l.leaveType}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-blue-900 font-semibold mt-0.5">
                    📅 {l.date} • Approved by: {l.approvedBy}
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">"{l.reason}"</p>
                </div>

                <button
                  onClick={() => handleDeleteLeave(l.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Revoke Leave"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {leaves.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No approved staff leaves recorded.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: GRANT LEAVE */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Grant Staff Leave</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Employee *
                </label>
                <select
                  required
                  value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Leave Date *
                </label>
                <input
                  type="date"
                  required
                  value={leaveForm.date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value as any })}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  <option value="personal">Personal Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="emergency">Emergency Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason (Mandatory)
                </label>
                <input
                  type="text"
                  required
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="e.g. Family wedding / Medical checkup"
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider"
                >
                  Approve Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DECLARE HOLIDAY */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Declare Store Holiday</h3>
              <button onClick={() => setIsHolidayModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHoliday} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  required
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  placeholder="e.g. Eid-ul-Fitr, Independence Day, Renovation"
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Holiday Date *
                </label>
                <input
                  type="date"
                  required
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Type
                </label>
                <select
                  value={holidayForm.type}
                  onChange={(e) => setHolidayForm({ ...holidayForm, type: e.target.value as any })}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  <option value="festival">Festival / Eid</option>
                  <option value="weekly">Weekly Holiday</option>
                  <option value="emergency">Emergency Closure</option>
                  <option value="custom">Custom Store Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={holidayForm.notes}
                  onChange={(e) => setHolidayForm({ ...holidayForm, notes: e.target.value })}
                  placeholder="Optional notice details"
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider"
                >
                  Declare Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
