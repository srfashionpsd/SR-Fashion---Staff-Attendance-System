import React, { useState, useEffect } from 'react';
import { AttendanceAdjustment, AttendanceRecord, User } from '../types';
import { api } from '../services/api';
import { formatTo12Hour } from '../shared/attendanceRules';
import {
  SlidersHorizontal,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  Info,
  Calendar
} from 'lucide-react';

interface AdjustmentsViewProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const AdjustmentsView: React.FC<AdjustmentsViewProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [pendingReviews, setPendingReviews] = useState<AttendanceRecord[]>([]);
  const [pastAdjustments, setPastAdjustments] = useState<AttendanceAdjustment[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Form state for 3 Adjustment Options
  const [adjustmentType, setAdjustmentType] = useState<'adjust_in' | 'adjust_out' | 'adjust_both'>('adjust_in');
  const [inMinutes, setInMinutes] = useState<number>(10);
  const [outMinutes, setOutMinutes] = useState<number>(0);
  const [reason, setReason] = useState<string>('Extended closing shift duties');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [todayRes, adjRes] = await Promise.all([
        api.getTodayAttendance(),
        api.getAdjustments(),
      ]);

      // All records needing review
      const pending = todayRes.records.filter((r) => r.outReviewRequired && r.outReviewStatus === 'pending');
      setPendingReviews(pending);
      setPastAdjustments(adjRes);

      if (pending.length > 0 && !selectedRecord) {
        setSelectedRecord(pending[0]);
        // Default inMinutes to the extra extended minutes
        setInMinutes(pending[0].extendedOutMinutes || 10);
      }
    } catch (err) {
      console.error('Failed to load adjustments data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectRecord = (rec: AttendanceRecord) => {
    setSelectedRecord(rec);
    setInMinutes(rec.extendedOutMinutes || 10);
    setOutMinutes(0);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || isSubmitting) return;

    setIsSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.applyAdjustment({
        attendanceId: selectedRecord.id,
        adjustmentType,
        inAdjustmentMinutes: adjustmentType === 'adjust_in' || adjustmentType === 'adjust_both' ? inMinutes : 0,
        outAdjustmentMinutes: adjustmentType === 'adjust_out' || adjustmentType === 'adjust_both' ? outMinutes : 0,
        reason: reason || 'Extended OUT review adjustment',
      });

      setSuccessMsg(`Adjustment successfully applied for ${selectedRecord.employeeName}. Audit record logged.`);
      if (onRefreshData) onRefreshData();
      await loadData();
      setSelectedRecord(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Title */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
          <span>SR Fashion Attendance Engine</span>
          <span>•</span>
          <span>Strict OUT Rule System</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif font-['Cinzel',serif]">
          EXTENDED OUT TIME & NEXT-DAY ADJUSTMENTS
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl mt-1">
          When staff punches out after 10:15 PM, the system flags <strong>Admin Review Required</strong>. As Admin, choose whether to adjust Next-Day IN, OUT-time calculation, or Both. Original timestamps are strictly preserved in the permanent audit trail.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Review Section: Pending Extended OUT List & Decision Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Pending Review Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Pending Reviews ({pendingReviews.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400">Scheduled: 10:00 PM (10:15 PM Grace)</span>
          </div>

          {pendingReviews.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">All Extended OUT punches reviewed</p>
              <p className="text-xs text-slate-400">No staff currently waiting for shift adjustments.</p>
            </div>
          ) : (
            pendingReviews.map((rec) => {
              const isSelected = selectedRecord?.id === rec.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => handleSelectRecord(rec)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 shadow-md'
                      : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-900">{rec.employeeName}</div>
                      <div className="text-xs text-slate-500">Date: {rec.date}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-900 border border-purple-200">
                      Needs Review
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Actual OUT Time</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {formatTo12Hour(rec.outTime)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Extra Beyond 10:15 PM</span>
                      <strong className="text-purple-700 font-mono text-sm">
                        +{rec.extendedOutMinutes} minutes
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: The 3 Adjustment Options Panel (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {selectedRecord
                    ? `Admin Adjustment for ${selectedRecord.employeeName}`
                    : 'Select a staff member from the left to adjust'}
                </h2>
              </div>
              {selectedRecord && (
                <p className="text-xs text-slate-500 mt-1">
                  Original OUT: <strong className="font-mono text-slate-800">{formatTo12Hour(selectedRecord.outTime)}</strong> • Grace Ended: 10:15 PM • Extra: <strong>{selectedRecord.extendedOutMinutes} mins</strong>
                </p>
              )}
            </div>

            {selectedRecord ? (
              <form onSubmit={handleApplyAdjustment} className="space-y-6">
                
                {/* 3 STRICT OPTIONS AS SPECIFIED IN REQUIREMENT 12 */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Adjustment Type:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* OPTION 1: Adjust IN */}
                    <label
                      className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition ${
                        adjustmentType === 'adjust_in'
                          ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="adj_type"
                          checked={adjustmentType === 'adjust_in'}
                          onChange={() => setAdjustmentType('adjust_in')}
                          className="accent-amber-600"
                        />
                        <span className="text-xs font-bold text-slate-900 uppercase">
                          OPTION 1
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-black text-slate-900 block">
                          Adjust IN Time
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Modifies Next Day's IN calculation credit
                        </p>
                      </div>
                    </label>

                    {/* OPTION 2: Adjust OUT */}
                    <label
                      className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition ${
                        adjustmentType === 'adjust_out'
                          ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="adj_type"
                          checked={adjustmentType === 'adjust_out'}
                          onChange={() => setAdjustmentType('adjust_out')}
                          className="accent-amber-600"
                        />
                        <span className="text-xs font-bold text-slate-900 uppercase">
                          OPTION 2
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-black text-slate-900 block">
                          Adjust OUT Time
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Modifies OUT-time calculation / overtime
                        </p>
                      </div>
                    </label>

                    {/* OPTION 3: Adjust BOTH */}
                    <label
                      className={`p-3.5 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition ${
                        adjustmentType === 'adjust_both'
                          ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="adj_type"
                          checked={adjustmentType === 'adjust_both'}
                          onChange={() => setAdjustmentType('adjust_both')}
                          className="accent-amber-600"
                        />
                        <span className="text-xs font-bold text-slate-900 uppercase">
                          OPTION 3
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-black text-slate-900 block">
                          Adjust BOTH
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Modifies both IN and OUT calculations
                        </p>
                      </div>
                    </label>

                  </div>
                </div>

                {/* Minute Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(adjustmentType === 'adjust_in' || adjustmentType === 'adjust_both') && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Next-Day IN Adjustment (Minutes)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="180"
                          value={inMinutes}
                          onChange={(e) => setInMinutes(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono text-sm font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          mins
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        E.g. 10 mins adjustment allows staff to arrive at 12:25 PM next day and be counted On Time.
                      </p>
                    </div>
                  )}

                  {(adjustmentType === 'adjust_out' || adjustmentType === 'adjust_both') && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        OUT Adjustment (Minutes)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="180"
                          value={outMinutes}
                          onChange={(e) => setOutMinutes(parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono text-sm font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          mins
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Approved minutes added to staff working records.
                      </p>
                    </div>
                  )}
                </div>

                {/* Reason & Audit Note */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Audit Reason / Comment (Mandatory)
                  </label>
                  <input
                    type="text"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Approved closing festival rush / customer fitting extension"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs text-slate-800"
                  />
                </div>

                {/* Audit Safety Warning */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Original punch (<strong className="font-mono">{formatTo12Hour(selectedRecord.outTime)}</strong>) is permanently preserved in the database audit log.
                  </span>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Apply Admin Adjustment'}
                  </button>
                </div>

              </form>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Select an extended punch record to apply adjustments.
              </div>
            )}

          </div>
        </div>

      </div>

      {/* SECTION 4: PAST APPROVED ADJUSTMENTS AUDIT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" />
              <span>Past Approved Adjustments & Audit Records</span>
            </h2>
            <p className="text-xs text-slate-500">Historical trail of all extended shift resolutions</p>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {pastAdjustments.length} Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Original OUT</th>
                <th className="py-2.5 px-3">Applied Adjustment</th>
                <th className="py-2.5 px-3">Approved By</th>
                <th className="py-2.5 px-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pastAdjustments.map((adj) => (
                <tr key={adj.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono">{adj.date}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{adj.employeeName}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
                      {adj.adjustmentType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">{formatTo12Hour(adj.originalOutTime)}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {adj.inAdjustmentMinutes > 0 && `IN: -${adj.inAdjustmentMinutes}m `}
                    {adj.outAdjustmentMinutes > 0 && `OUT: +${adj.outAdjustmentMinutes}m`}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{adj.adminName}</td>
                  <td className="py-2.5 px-3 text-slate-500 italic max-w-xs truncate">{adj.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {pastAdjustments.length === 0 && (
            <div className="py-6 text-center text-slate-400 text-xs">
              No adjustments recorded yet.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
