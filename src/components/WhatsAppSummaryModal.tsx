import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  generateFullStaffWhatsAppSummary,
  generateIndividualWhatsAppSummary,
  openWhatsAppShare,
  StaffMonthlySummaryItem
} from '../services/whatsapp';
import {
  Share2,
  X,
  Copy,
  Check,
  Phone,
  MessageCircle
} from 'lucide-react';

interface WhatsAppSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetEmployeeId?: string;
}

export const WhatsAppSummaryModal: React.FC<WhatsAppSummaryModalProps> = ({
  isOpen,
  onClose,
  targetEmployeeId,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [mode, setMode] = useState<'individual' | 'full'>(targetEmployeeId ? 'individual' : 'full');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(targetEmployeeId || '');
  const [summaries, setSummaries] = useState<StaffMonthlySummaryItem[]>([]);
  const [copied, setCopied] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (!isOpen) return;
    if (targetEmployeeId) {
      setMode('individual');
      setSelectedEmpId(targetEmployeeId);
    }
    api.getMonthlySummary(selectedYear, selectedMonth).then((res) => {
      setSummaries(res.summaries);
      if (!selectedEmpId && res.summaries.length > 0) {
        setSelectedEmpId(res.summaries[0].employeeId);
      }
    }).catch(() => {});
  }, [isOpen, selectedYear, selectedMonth, targetEmployeeId]);

  if (!isOpen) return null;

  const currentMonthName = months[selectedMonth - 1];
  const selectedStaffItem = summaries.find((s) => s.employeeId === selectedEmpId) || summaries[0];

  const generatedText =
    mode === 'individual' && selectedStaffItem
      ? generateIndividualWhatsAppSummary(selectedStaffItem, currentMonthName, selectedYear)
      : generateFullStaffWhatsAppSummary(summaries, currentMonthName, selectedYear);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const targetMobile = mode === 'individual' && selectedStaffItem ? selectedStaffItem.mobile : undefined;
    openWhatsAppShare(generatedText, targetMobile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">One-Tap WhatsApp Summary</h3>
              <p className="text-xs text-slate-400">SR Fashion Monthly Attendance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Mode */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setMode('full')}
            className={`py-2 text-xs font-bold uppercase rounded-lg transition cursor-pointer ${
              mode === 'full' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Full Staff Summary
          </button>
          <button
            onClick={() => setMode('individual')}
            className={`py-2 text-xs font-bold uppercase rounded-lg transition cursor-pointer ${
              mode === 'individual' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Individual Employee
          </button>
        </div>

        {/* Employee selector if Individual */}
        {mode === 'individual' && (
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Select Staff Member:
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white font-medium"
            >
              {summaries.map((s) => (
                <option key={s.employeeId} value={s.employeeId}>
                  {s.employeeName} ({s.employeeCode})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Formatted Message Preview */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
            WhatsApp Message Preview:
          </label>
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border border-slate-800 shadow-inner">
            {generatedText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Open in WhatsApp</span>
          </button>
        </div>

      </div>
    </div>
  );
};
