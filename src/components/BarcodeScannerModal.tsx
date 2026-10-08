import React, { useState, useEffect } from 'react';
import { AttendanceResult, Employee } from '../types';
import { api } from '../services/api';
import {
  ScanLine,
  X,
  CreditCard,
  User,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: AttendanceResult) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setBarcodeInput('');
    setErrorMsg('');
    api.getEmployees(true).then(setEmployees).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScan = async (code: string) => {
    if (!code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.punchAttendance({ barcode: code.trim(), method: 'barcode' });
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Barcode scan failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(barcodeInput);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Scan Staff ID Card</h3>
              <p className="text-xs text-slate-400">SR Fashion Barcode Attendance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Hardware Barcode Scanner prompt */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <CreditCard className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-950">USB Barcode Scanner Ready</h4>
              <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                Scan the physical barcode on the staff ID card with your barcode gun scanner, or type the code below.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              ID Card Barcode Number
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  autoFocus
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="e.g. SRF101 or SR-101"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none font-mono text-base tracking-wider uppercase font-bold"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !barcodeInput.trim()}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs uppercase tracking-wider transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <span>Punch</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold mt-1">⚠️ {errorMsg}</p>
            )}
          </form>

          {/* Staff Directory Quick Chips */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-500">
              <span>Registered Staff Cards:</span>
              <span className="text-slate-400 font-normal">Click to test punch</span>
            </div>

            {employees.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleScan(emp.barcode)}
                    disabled={isSubmitting}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-amber-900 truncate">
                        {emp.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Code: {emp.barcode}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 group-hover:bg-amber-200 text-slate-600 group-hover:text-amber-900 ml-1">
                      Scan
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No staff cards registered yet. Add staff in <strong>Staff Directory</strong> to generate barcodes.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
