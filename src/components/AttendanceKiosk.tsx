import React, { useState, useEffect, useRef } from 'react';
import { AttendanceResult, Employee, User } from '../types';
import { api } from '../services/api';
import { getISTDateTime } from '../shared/attendanceRules';
import {
  ScanLine,
  Camera,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Search
} from 'lucide-react';

interface AttendanceKioskProps {
  onOpenFaceModal: () => void;
  onOpenBarcodeModal: () => void;
  onOpenLogin: () => void;
  currentUser: User | null;
  onAttendanceSuccess?: (result: AttendanceResult) => void;
}

export const AttendanceKiosk: React.FC<AttendanceKioskProps> = ({
  onOpenFaceModal,
  onOpenBarcodeModal,
  onOpenLogin,
  currentUser,
  onAttendanceSuccess,
}) => {
  const [currentTime, setCurrentTime] = useState(getISTDateTime());
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmation, setConfirmation] = useState<AttendanceResult | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [recentEmployees, setRecentEmployees] = useState<Employee[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // USB Barcode Scanner hardware buffer:
  // USB barcode scanners fire rapid keystrokes (< 40ms between characters) ending with Enter.
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getISTDateTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employees for quick reference
  useEffect(() => {
    api.getEmployees(true).then((emps) => {
      setRecentEmployees(emps.slice(0, 6));
    }).catch(() => {});
  }, []);

  // Auto dismiss confirmation card after 2.5 seconds (quick turnaround for queues)
  useEffect(() => {
    if (!confirmation) return;
    setCountdown(2);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setConfirmation(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [confirmation]);

  // Keep input focused so barcode scanner is always ready
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global listener for USB Barcode Scanners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a standard input or modal
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      // If typing inside our specific barcode input, let standard onSubmit handle it
      if (activeEl === inputRef.current) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 3) {
          const code = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = '';
          processBarcode(code);
        }
        return;
      }

      // If character arrived within 60ms of previous, consider it scanner stroke
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (timeDiff > 200 && !isInput) {
          barcodeBufferRef.current = '';
        }
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const processBarcode = async (code: string) => {
    if (!code || isProcessing) return;
    setIsProcessing(true);
    setBarcodeInput('');

    try {
      const res = await api.punchAttendance({ barcode: code.trim(), method: 'barcode' });
      setConfirmation(res);
      if (onAttendanceSuccess) onAttendanceSuccess(res);
    } catch (err: any) {
      setConfirmation({
        success: false,
        message: err.message || 'Error processing barcode',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
      // Refocus input for next scan
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      processBarcode(barcodeInput.trim());
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      {/* Top Header & Timing Banner */}
      <div className="text-center space-y-2 mb-4">
        
        {/* Subtle Brand Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold tracking-wider uppercase shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Staff Attendance Machine</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-serif font-['Cinzel',serif]">
          SR FASHION ATTENDANCE
        </h1>
        
        {/* Live Date & Authoritative IST Time */}
        <div className="flex items-center justify-center gap-3 text-slate-700 text-sm sm:text-base font-medium">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-xs">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-slate-800">{currentTime.fullDisplay}</span>
            <span className="text-xs px-1.5 py-0.2 bg-slate-100 rounded text-slate-500 font-mono">IST</span>
          </div>
        </div>

        {/* Shift Timings Note */}
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Standard Shift: <strong className="text-slate-700">12:00 PM – 10:00 PM</strong> • Grace IN: <strong>12:15 PM</strong> • Grace OUT: <strong>10:15 PM</strong>
        </p>
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 flex flex-col justify-center items-center my-4 w-full max-w-2xl mx-auto">
        
        {/* RESULT / CONFIRMATION MODAL OVERLAY OR CARD */}
        {confirmation && (
          <div
            className={`w-full mb-6 p-6 rounded-2xl border-2 shadow-xl transition-all duration-300 transform scale-100 ${
              confirmation.type === 'in'
                ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-500 text-emerald-950'
                : confirmation.type === 'out'
                ? confirmation.reviewRequired
                  ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-500 text-purple-950'
                  : 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-500 text-blue-950'
                : confirmation.type === 'duplicate_in' || confirmation.type === 'duplicate_out'
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-500 text-amber-950'
                : 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-500 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-4">
              
              {/* Icon */}
              <div className="p-3 rounded-full bg-white shadow-sm flex-shrink-0">
                {confirmation.type === 'in' && <CheckCircle2 className="w-8 h-8 text-emerald-600" />}
                {confirmation.type === 'out' && (
                  confirmation.reviewRequired ? (
                    <ShieldAlert className="w-8 h-8 text-purple-600" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-blue-600" />
                  )
                )}
                {(confirmation.type === 'duplicate_in' || confirmation.type === 'duplicate_out') && (
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                )}
                {confirmation.type === 'error' && <AlertCircle className="w-8 h-8 text-rose-600" />}
              </div>

              {/* Message Details */}
              <div className="flex-1 space-y-1">
                {confirmation.employee && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      ID: {confirmation.employee.employeeId}
                    </span>
                    <span className="text-xs text-slate-500">
                      Auto-closing in {countdown}s
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold">
                  {confirmation.type === 'in' && `Welcome, ${confirmation.employee?.name || 'Staff'}`}
                  {confirmation.type === 'out' && `Goodbye, ${confirmation.employee?.name || 'Staff'}`}
                  {confirmation.type === 'duplicate_in' && 'Already Checked In'}
                  {confirmation.type === 'duplicate_out' && 'Shift Already Completed'}
                  {confirmation.type === 'error' && 'Attendance Notice'}
                </h3>

                <p className="text-sm font-medium opacity-90">{confirmation.message}</p>

                {/* Status Badges */}
                {confirmation.timeFormatted && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded bg-white font-mono text-xs font-bold shadow-xs">
                      🕒 {confirmation.timeFormatted}
                    </span>

                    {confirmation.statusText && (
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-bold uppercase shadow-xs ${
                          confirmation.statusText === 'ON TIME'
                            ? 'bg-emerald-600 text-white'
                            : confirmation.statusText.includes('Late')
                            ? 'bg-amber-600 text-white'
                            : confirmation.statusText.includes('Admin Review')
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {confirmation.statusText}
                      </span>
                    )}

                    {confirmation.lateMinutes !== undefined && confirmation.lateMinutes > 0 && (
                      <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                        ⚠️ {confirmation.lateMinutes} mins late from 12:00 PM
                      </span>
                    )}

                    {confirmation.extendedOutMinutes !== undefined && confirmation.extendedOutMinutes > 0 && (
                      <span className="px-2.5 py-1 rounded bg-purple-100 text-purple-900 text-xs font-bold border border-purple-300">
                        ⏱️ {confirmation.extendedOutMinutes} mins beyond 10:15 PM grace
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Countdown progress bar & quick dismiss */}
            <div className="flex items-center justify-between gap-3 mt-4">
              <div className="flex-1 bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-current opacity-60 transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 2) * 100}%` }}
                ></div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                className="px-2.5 py-0.5 rounded bg-black/10 hover:bg-black/20 text-[11px] font-bold uppercase transition cursor-pointer"
              >
                Scan Next ⚡
              </button>
            </div>
          </div>
        )}

        {/* TWO LARGE PRIMARY ACTIONS (as requested) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full">
          
          {/* ACTION 1: SCAN ID CARD */}
          <button
            onClick={onOpenBarcodeModal}
            className="group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl bg-white border-2 border-slate-200 hover:border-amber-500 shadow-sm hover:shadow-lg transition-all duration-200 active:scale-98 cursor-pointer overflow-hidden text-center"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -z-0 opacity-70 group-hover:scale-110 transition-transform"></div>
            
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shadow-inner z-10">
              <ScanLine className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase font-serif z-10">
              SCAN ID CARD
            </span>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs z-10">
              Plug USB Barcode scanner or tap to scan barcode
            </p>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider z-10">
              <span>Ready to Scan</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* ACTION 2: FACE ATTENDANCE */}
          <button
            onClick={onOpenFaceModal}
            className="group relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-amber-400 shadow-md hover:shadow-xl transition-all duration-200 active:scale-98 cursor-pointer overflow-hidden text-center text-white"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center mb-4 group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors shadow-inner z-10">
              <Camera className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-wide uppercase font-serif z-10">
              FACE ATTENDANCE
            </span>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xs z-10">
              Camera opens on-demand & closes immediately
            </p>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider z-10">
              <span>Start Camera Recognition</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        {/* USB Barcode Hardware Ready Bar & Manual Input */}
        <div className="w-full mt-6 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <form onSubmit={handleManualBarcodeSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <ScanLine className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Hardware Barcode scanner listener active (or type ID e.g. SRF101)..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 focus:bg-white font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing || !barcodeInput.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              {isProcessing ? 'Processing...' : 'Punch'}
            </button>
          </form>

          {/* Quick Staff Testing Chips or Clean State Notice */}
          {recentEmployees.length > 0 ? (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Quick Test Staff:</span>
              {recentEmployees.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => processBarcode(emp.barcode)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-100 hover:text-amber-900 border border-slate-200 transition text-[11px] font-medium cursor-pointer"
                  title={`Scan ${emp.name} (${emp.barcode})`}
                >
                  {emp.name.split(' ')[0]} ({emp.barcode})
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-500 flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span>Hardware USB Barcode scanner listener active. Scan any registered staff ID card.</span>
              <span className="text-[11px] text-amber-800 font-bold">Roster Clean & Ready</span>
            </div>
          )}
        </div>

        {/* THIRD LARGE ACTION: ADMIN LOGIN BUTTON (as requested) */}
        {!currentUser && (
          <div className="mt-5 w-full flex justify-center">
            <button
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4 text-slate-600" />
              <span>Admin Login / Management Portal</span>
            </button>
          </div>
        )}
      </div>

      {/* Rules Notice Badge at Bottom */}
      <div className="w-full max-w-2xl mx-auto bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center text-xs text-amber-950 font-medium">
        🛡️ <span className="font-bold">Strict Shop Rules:</span> 12:15 PM is On Time. 12:16 PM is Late. 10:15 PM OUT is Normal. 10:16 PM+ requires Admin Review. Duplicate scans are blocked automatically.
      </div>
    </div>
  );
};
