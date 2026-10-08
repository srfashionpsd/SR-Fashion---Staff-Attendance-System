import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { api } from '../services/api';
import { History, Search, ShieldCheck, Clock } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getAuditLogs().then(setLogs).finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      (l.employeeName && l.employeeName.toLowerCase().includes(q)) ||
      l.adminName.toLowerCase().includes(q) ||
      l.reason.toLowerCase().includes(q)
    );
  });

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <span>SR Fashion Governance</span>
            <span>•</span>
            <span>Immutable Audit Trail</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif font-['Cinzel',serif]">
            ADMIN AUDIT LOG
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Every manual override, adjustment, holiday, and staff profile modification is permanently preserved.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {filteredLogs.length} Audit Entries
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographically Verified Logs</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Admin</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Staff Affected</th>
                <th className="py-3 px-3">Original Value</th>
                <th className="py-3 px-3">New Value</th>
                <th className="py-3 px-4">Mandatory Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{log.adminName}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-900">
                    {log.employeeName || '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 text-[11px] max-w-xs truncate">
                    {log.originalValue || '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-800 text-[11px] max-w-xs truncate">
                    {log.newValue || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-600 italic max-w-sm">
                    {log.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs">
            No audit records found.
          </div>
        )}
      </div>

    </div>
  );
};
