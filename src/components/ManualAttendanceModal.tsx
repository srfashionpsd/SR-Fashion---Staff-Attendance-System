import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Employee } from '../types';
import { api } from '../services/api';
import {
  Edit,
  X,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: AttendanceRecord | null;
  presetEmployeeId?: string;
  onSaved: () => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  record,
  presetEmployeeId,
  onSaved,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [inTime, setInTime] = useState('12:00');
  const [outTime, setOutTime] = useState('22:00');
  const [status, setStatus] = useState<string>('present');
  const [reason, setReason] = useState('Manual admin entry / correction');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Admin removed attendance record');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setShowDeleteConfirm(false);
    api.getEmployees(true).then((emps) => {
      setEmployees(emps);
      if (presetEmployeeId) setEmployeeId(presetEmployeeId);
      else if (record) setEmployeeId(record.employeeId);
      else if (emps.length > 0 && !employeeId) setEmployeeId(emps[0].id);
    }).catch(() => {});

    if (record) {
      setDate(record.date);
      setInTime(record.inTime || '');
      setOutTime(record.outTime || '');
      setStatus(record.status);
      setReason('');
    } else {
      setInTime('12:00');
      setOutTime('22:00');
      setStatus('present');
      setReason('Admin manual punch override');
    }
  }, [isOpen, record, presetEmployeeId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    if (!reason.trim()) {
      setErrorMsg('Audit Reason is mandatory for admin modifications.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (record) {
        await api.updateAttendance(record.id, {
          inTime: inTime || undefined,
          outTime: outTime || undefined,
          status,
          reason: reason.trim(),
        });
      } else {
        await api.createManualAttendance({
          employeeId,
          date,
          inTime: inTime || undefined,
          outTime: outTime || undefined,
          status,
          reason: reason.trim(),
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!record) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await api.deleteAttendance(record.id, deleteReason.trim() || 'Admin deleted record');
      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {record ? 'Edit Attendance Record' : 'Manual Attendance Marking'}
              </h3>
              <p className="text-xs text-slate-400">Admin Control & Audit Verification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
            ⚠️ {errorMsg}
          </div>
        )}

        {showDeleteConfirm ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Confirm Delete Attendance Record
            </h4>
            <p className="text-xs text-rose-700">
              Are you sure you want to permanently delete this attendance record for {record?.employeeName} ({record?.date})?
            </p>
            <div>
              <label className="block text-[11px] font-bold text-rose-800 mb-1">
                Mandatory Reason for Deletion *
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Reason for audit log..."
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-rose-300 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting || !deleteReason.trim()}
                onClick={handleDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Employee *
              </label>
              <select
                disabled={!!record}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white font-medium"
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
                Date *
              </label>
              <input
                type="date"
                required
                disabled={!!record}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  IN Time (24h)
                </label>
                <input
                  type="time"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  OUT Time (24h)
                </label>
                <input
                  type="time"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Status Override
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="present">Present (On Time)</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="holiday">Holiday</option>
                <option value="missing_punch">Missing Punch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Reason for Modification *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Staff forgot ID card / corrected morning punch"
                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 text-slate-800"
              />
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>This change will be permanently logged in the Admin Audit Log.</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              {record ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              ) : <div></div>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
