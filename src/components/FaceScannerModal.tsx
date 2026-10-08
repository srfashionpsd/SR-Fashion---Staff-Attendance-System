import React, { useState, useEffect, useRef } from 'react';
import { AttendanceResult, Employee } from '../types';
import { FaceService } from '../services/faceRecognition';
import { api } from '../services/api';
import {
  Camera,
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface FaceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: AttendanceResult) => void;
}

export const FaceScannerModal: React.FC<FaceScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusText, setStatusText] = useState<'starting' | 'scanning' | 'recognized' | 'not_recognized' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState('');
  const [matchedStaff, setMatchedStaff] = useState<Employee | null>(null);
  const [manualSelectionMode, setManualSelectionMode] = useState(false);
  const scanIntervalRef = useRef<any>(null);

  // Initialize camera ONLY when modal opens
  useEffect(() => {
    if (!isOpen) {
      cleanupCamera();
      return;
    }

    setStatusText('starting');
    setErrorMessage('');
    setMatchedStaff(null);

    // Fetch active employees
    api.getEmployees(true).then((emps) => {
      setEmployees(emps);
    }).catch(() => {});

    // Start video
    let isMounted = true;
    const start = async () => {
      try {
        if (!videoRef.current) return;
        await FaceService.startCamera(videoRef.current);
        if (!isMounted) {
          FaceService.stopCamera();
          return;
        }
        setStatusText('scanning');
        startScanLoop();
      } catch (err: any) {
        console.error('Camera access error:', err);
        setStatusText('error');
        setErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Camera access permission denied. Please allow camera permissions.'
            : 'Unable to start camera. Please verify device camera is connected.'
        );
      }
    };

    // Small delay to let modal mount
    const timeout = setTimeout(start, 200);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      cleanupCamera();
    };
  }, [isOpen]);

  const cleanupCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    FaceService.stopCamera();
  };

  const handleClose = () => {
    cleanupCamera();
    onClose();
  };

  // Scan loop runs every 180ms for instant face detection
  const startScanLoop = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    let attempts = 0;
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || statusText === 'recognized') return;
      attempts++;

      const extraction = FaceService.extractFeatures(videoRef.current);
      if (!extraction) return;

      // Check match against enrolled staff
      const match = FaceService.matchEmployee(extraction.features, employees);

      if (match) {
        // MATCH FOUND!
        cleanupCamera(); // Stop camera immediately!
        setStatusText('recognized');
        setMatchedStaff(match.employee);
        await triggerAttendance(match.employee);
        return;
      }

      // If after 25 attempts (~4.5 seconds) no enrolled face match found
      if (attempts >= 25) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
        setStatusText('not_recognized');
      }
    }, 180);
  };

  const triggerAttendance = async (emp: Employee) => {
    try {
      cleanupCamera();
      const res = await api.punchAttendance({
        employeeId: emp.id,
        method: 'face',
      });
      onSuccess(res);
      handleClose();
    } catch (err: any) {
      setStatusText('error');
      setErrorMessage(err.message || 'Error recording face attendance');
    }
  };

  const handleRetry = () => {
    setStatusText('scanning');
    setErrorMessage('');
    setMatchedStaff(null);
    startScanLoop();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Face Attendance</h3>
              <p className="text-xs text-slate-400">SR Fashion Staff Recognition</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport Stage */}
        <div className="relative p-6 flex flex-col items-center">
          
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-4 border-amber-400/80 shadow-2xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Luxury Face Alignment Oval Guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-56 rounded-[50%] border-2 border-dashed border-amber-400/70 shadow-sm animate-pulse flex items-center justify-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300/80 bg-slate-950/60 px-2 py-0.5 rounded">
                  Align Face Inside
                </span>
              </div>
            </div>

            {/* Status Overlay */}
            {statusText === 'starting' && (
              <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                <span className="text-xs font-semibold text-slate-300">Activating camera...</span>
              </div>
            )}

            {statusText === 'recognized' && matchedStaff && (
              <div className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                <span className="text-sm font-bold text-white">{matchedStaff.name}</span>
                <span className="text-xs text-emerald-300">Face Verified! Recording...</span>
              </div>
            )}
          </div>

          {/* Status Message or Error */}
          <div className="mt-4 text-center w-full">
            {employees.length === 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1 mb-2">
                <span className="text-xs font-bold text-amber-400">No staff profiles registered yet</span>
                <p className="text-[11px] text-slate-300">
                  Please go to <strong>Staff Directory</strong>, add employees, and click "Face" to enroll their face profile.
                </p>
              </div>
            )}

            {statusText === 'scanning' && employees.length > 0 && (
              <p className="text-xs text-amber-300/90 flex items-center justify-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                Scanning facial biometric points... Keep still.
              </p>
            )}

            {statusText === 'not_recognized' && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Face not recognized</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Staff face not matching enrolled profiles or face not enrolled yet.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={handleRetry}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold uppercase transition flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Face Scan</span>
                  </button>
                  <button
                    onClick={() => setManualSelectionMode(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Select Staff
                  </button>
                </div>
              </div>
            )}

            {statusText === 'error' && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Camera Notice</span>
                </div>
                <p className="text-xs text-rose-200">{errorMessage}</p>
                <button
                  onClick={() => setManualSelectionMode(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Select Staff Profile Manually
                </button>
              </div>
            )}
          </div>

          {/* Quick Staff Verification Fallback */}
          {manualSelectionMode && (
            <div className="mt-4 w-full bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 block">
                Quick Staff Verification (Manual Face Check):
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => triggerAttendance(emp)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 hover:bg-amber-950/60 hover:border-amber-500/50 border border-slate-800 text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{emp.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2">ID: {emp.employeeId}</span>
                    </div>
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Note */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Camera stream terminates automatically when attendance is saved.</span>
        </div>

      </div>
    </div>
  );
};
