import React, { useState, useEffect } from 'react';
import { Shift, ShopSettings, User } from '../types';
import { api } from '../services/api';
import {
  Settings,
  Clock,
  Store,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftForm, setShiftForm] = useState({
    name: 'Standard Shift',
    startTime: '12:00',
    endTime: '22:00',
    graceInMinutes: 15,
    graceOutMinutes: 15,
  });
  const [settingsForm, setSettingsForm] = useState({
    shopName: 'SR Fashion',
    tagline: 'Sabki Pasand SR Fashion',
    address: 'Eidgah Kaman Road, Near Dabak Pul, Degloor Naka, Nanded',
    phone: '7588756669',
    instagram: '@srfashion_nanded',
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    Promise.all([api.getSettings(), api.getShifts()]).then(([sData, shiftData]) => {
      setSettings(sData);
      setSettingsForm({
        shopName: sData.shopName,
        tagline: sData.tagline,
        address: sData.address,
        phone: sData.phone,
        instagram: sData.instagram,
      });
      setShifts(shiftData);
      if (shiftData[0]) {
        setShiftForm({
          name: shiftData[0].name,
          startTime: shiftData[0].startTime,
          endTime: shiftData[0].endTime,
          graceInMinutes: shiftData[0].graceInMinutes,
          graceOutMinutes: shiftData[0].graceOutMinutes,
        });
      }
    });
  }, []);

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const defaultShift = shifts[0];
    if (!defaultShift) return;
    setErrorMsg('');

    try {
      await api.updateShift(defaultShift.id, shiftForm);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating shift');
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      await api.updateSettings(settingsForm);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating store settings');
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      
      {/* Title */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
          <span>SR Fashion Configuration</span>
          <span>•</span>
          <span>Shift Rules & Store Profile</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif font-['Cinzel',serif]">
          SYSTEM SETTINGS
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure default shift timings, grace periods, and official store branding attributes.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Settings saved successfully and logged in audit history!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Shift Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Clock className="w-5 h-5 text-amber-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Shift Timings & Strict Attendance Engine</h2>
            <p className="text-xs text-slate-500">Configures scheduled IN/OUT and automatic grace intervals</p>
          </div>
        </div>

        <form onSubmit={handleSaveShift} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Shift Name
              </label>
              <input
                type="text"
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Scheduled Shift IN (Default 12:00 PM)
              </label>
              <input
                type="time"
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Scheduled Shift OUT (Default 10:00 PM)
              </label>
              <input
                type="time"
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                IN Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={shiftForm.graceInMinutes}
                onChange={(e) => setShiftForm({ ...shiftForm, graceInMinutes: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Up to 12:15 PM is On Time. 12:16 PM is Late.
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                OUT Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={shiftForm.graceOutMinutes}
                onChange={(e) => setShiftForm({ ...shiftForm, graceOutMinutes: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                10:15 PM is Normal. 10:16 PM+ triggers Admin Review.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Update Shift Engine
            </button>
          </div>
        </form>
      </div>

      {/* 2. Business Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Store className="w-5 h-5 text-amber-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Official Business Details</h2>
            <p className="text-xs text-slate-500">Shop identity used in receipts, footer, and WhatsApp summaries</p>
          </div>
        </div>

        <form onSubmit={handleSaveStore} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={settingsForm.shopName}
                onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Tagline
              </label>
              <input
                type="text"
                value={settingsForm.tagline}
                onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Store Address
            </label>
            <input
              type="text"
              value={settingsForm.address}
              onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Instagram Handle
              </label>
              <input
                type="text"
                value={settingsForm.instagram}
                onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Save Store Profile
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
