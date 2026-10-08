import React, { useState, useEffect, useRef } from 'react';
import { Employee, Shift, User } from '../types';
import { api } from '../services/api';
import { FaceService } from '../services/faceRecognition';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Camera,
  CreditCard,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  QrCode,
  ShieldAlert,
  Phone,
  Calendar,
  Sparkles,
  Trash2,
  AlertTriangle,
  Info
} from 'lucide-react';

interface StaffManagementViewProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);

  // Toast notifications & Confirm Dialog
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isFaceEnrollOpen, setIsFaceEnrollOpen] = useState(false);
  const [enrollingEmp, setEnrollingEmp] = useState<Employee | null>(null);
  const [barcodeBadgeEmp, setBarcodeBadgeEmp] = useState<Employee | null>(null);

  // Form states & Inline error
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    barcode: '',
    mobile: '',
    shiftId: 'shift_default',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [isSavingEmp, setIsSavingEmp] = useState(false);

  // Face enrollment camera state
  const enrollVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedThumb, setCapturedThumb] = useState<string | null>(null);
  const [capturedFeatures, setCapturedFeatures] = useState<number[] | null>(null);
  const [faceEnrollError, setFaceEnrollError] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, shiftList] = await Promise.all([
        api.getEmployees(false),
        api.getShifts(),
      ]);
      setEmployees(empList);
      setShifts(shiftList);
    } catch (err: any) {
      console.error('Failed to load employees:', err);
      showToast('Could not load staff list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      emp.name.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q) ||
      emp.barcode.toLowerCase().includes(q) ||
      (emp.mobile && emp.mobile.includes(q));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && emp.isActive) ||
      (statusFilter === 'inactive' && !emp.isActive);

    return matchesSearch && matchesStatus;
  });

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingEmp(null);
    setFormError('');
    setFormData({
      name: '',
      employeeId: `SR-${Math.floor(100 + Math.random() * 900)}`,
      barcode: `SRF${Math.floor(100 + Math.random() * 900)}`,
      mobile: '',
      shiftId: shifts[0]?.id || 'shift_default',
      notes: '',
    });
    setIsAddEditOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setFormError('');
    setFormData({
      name: emp.name,
      employeeId: emp.employeeId,
      barcode: emp.barcode,
      mobile: emp.mobile || '',
      shiftId: emp.shiftId,
      notes: emp.notes || '',
    });
    setIsAddEditOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Staff name is required');
      return;
    }
    if (!formData.barcode.trim()) {
      setFormError('ID Barcode is required');
      return;
    }

    setIsSavingEmp(true);
    try {
      if (editingEmp) {
        await api.updateEmployee(editingEmp.id, {
          name: formData.name.trim(),
          employeeId: formData.employeeId.trim(),
          barcode: formData.barcode.trim(),
          mobile: formData.mobile.trim(),
          shiftId: formData.shiftId,
          notes: formData.notes.trim(),
        });
        showToast(`${formData.name.trim()} updated successfully!`, 'success');
      } else {
        await api.addEmployee({
          name: formData.name.trim(),
          employeeId: formData.employeeId.trim(),
          barcode: formData.barcode.trim(),
          mobile: formData.mobile.trim(),
          shiftId: formData.shiftId,
          notes: formData.notes.trim(),
          isActive: true,
        });
        showToast(`${formData.name.trim()} registered successfully!`, 'success');
      }
      setIsAddEditOpen(false);
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFormError(err.message || 'Error saving staff member');
    } finally {
      setIsSavingEmp(false);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    try {
      const nextStatus = !emp.isActive;
      await api.updateEmployee(emp.id, { isActive: nextStatus });
      showToast(`${emp.name} is now ${nextStatus ? 'Active' : 'Disabled'}`, 'info');
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Error updating status', 'error');
    }
  };

  const handleDeleteEmployee = (emp: Employee) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${emp.name}?`,
      description: `Permanently delete ${emp.name} (Employee ID: ${emp.employeeId}, Barcode: ${emp.barcode}) from SR Fashion? Their attendance records will also be removed.`,
      confirmLabel: 'Delete Permanently',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.deleteEmployee(emp.id);
          showToast(`${emp.name} deleted successfully!`, 'success');
          await loadData();
          if (onRefreshData) onRefreshData();
        } catch (err: any) {
          showToast(err.message || 'Error deleting employee', 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleClearAllEmployees = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove ALL Staff Members?',
      description: 'Are you sure you want to remove ALL registered staff members right now? All employee profiles and records will be deleted from SR Fashion. This cannot be undone.',
      confirmLabel: 'Yes, Delete All Staff',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.clearAllEmployees();
          showToast('All staff members have been removed. System is ready for fresh registration.', 'success');
          await loadData();
          if (onRefreshData) onRefreshData();
        } catch (err: any) {
          showToast(err.message || 'Error clearing staff', 'error');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleQuickPopulateStaff = async () => {
    const sampleStaff = [
      { name: 'Ayesha Shaikh', employeeId: 'SR-101', barcode: 'SRF101', mobile: '9823011223', notes: 'Senior Sales' },
      { name: 'Sana Khan', employeeId: 'SR-102', barcode: 'SRF102', mobile: '9823022334', notes: 'Fashion Stylist' },
      { name: 'Ahmed Patel', employeeId: 'SR-103', barcode: 'SRF103', mobile: '9823033445', notes: 'Floor Supervisor' },
      { name: 'Rehan Qureshi', employeeId: 'SR-104', barcode: 'SRF104', mobile: '9823044556', notes: 'Inventory Lead' },
      { name: 'Imran Syed', employeeId: 'SR-105', barcode: 'SRF105', mobile: '9823055667', notes: 'Customer Relations' },
    ];
    try {
      for (const s of sampleStaff) {
        await api.addEmployee({ ...s, shiftId: 'shift_default', isActive: true });
      }
      showToast('5 sample staff members added successfully!', 'success');
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Error populating staff', 'error');
    }
  };

  // --- Face Enrollment Submodal ---
  const handleOpenEnrollFace = (emp: Employee) => {
    setEnrollingEmp(emp);
    setCapturedThumb(null);
    setCapturedFeatures(null);
    setFaceEnrollError('');
    setIsFaceEnrollOpen(true);
    setCameraActive(false);
  };

  const startEnrollCamera = async () => {
    setFaceEnrollError('');
    try {
      if (!enrollVideoRef.current) return;
      await FaceService.startCamera(enrollVideoRef.current);
      setCameraActive(true);
    } catch (err: any) {
      setFaceEnrollError('Camera error: ' + (err.message || 'Unable to start camera'));
    }
  };

  const captureEnrollFace = () => {
    setFaceEnrollError('');
    if (!enrollVideoRef.current) return;
    const extracted = FaceService.extractFeatures(enrollVideoRef.current);
    if (!extracted) {
      setFaceEnrollError('Could not detect face. Please position clearly in center.');
      return;
    }
    setCapturedFeatures(extracted.features);
    setCapturedThumb(extracted.thumbnailUrl);
    FaceService.stopCamera();
    setCameraActive(false);
  };

  const saveEnrollment = async () => {
    if (!enrollingEmp || !capturedFeatures || !capturedThumb) return;
    try {
      await api.enrollFace(enrollingEmp.id, capturedFeatures, capturedThumb);
      showToast(`Face enrolled successfully for ${enrollingEmp.name}!`, 'success');
      setIsFaceEnrollOpen(false);
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setFaceEnrollError('Error saving face enrollment: ' + (err.message || 'Failed'));
    }
  };

  const closeFaceModal = () => {
    FaceService.stopCamera();
    setCameraActive(false);
    setIsFaceEnrollOpen(false);
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 relative">
      
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
              {toast.type === 'error' && <XCircle className="w-5 h-5" />}
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

      {/* Confirmation Dialog Modal */}
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
                <p className="text-xs text-slate-500 mt-0.5">SR Fashion Master Confirmation</p>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <span>SR Fashion Staff</span>
            <span>•</span>
            <span>Master Profile Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif font-['Cinzel',serif]">
            STAFF MANAGEMENT
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage employee ID barcodes, biometrics face profiles, shifts, and active status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {employees.length > 0 && (
            <button
              onClick={handleClearAllEmployees}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Staff</span>
            </button>
          )}
          {employees.length === 0 && (
            <button
              onClick={handleQuickPopulateStaff}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Quick Setup (5 Staff)</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, employee ID (SR-101), barcode, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Staff ({employees.length})</option>
            <option value="active">Active Only ({employees.filter((e) => e.isActive).length})</option>
            <option value="inactive">Inactive ({employees.filter((e) => !e.isActive).length})</option>
          </select>
        </div>
      </div>

      {/* Staff Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => {
          const hasFace = !!emp.faceProfile?.features;
          return (
            <div
              key={emp.id}
              className={`p-5 rounded-2xl border-2 transition-all bg-white relative overflow-hidden flex flex-col justify-between ${
                emp.isActive ? 'border-slate-200 hover:border-amber-400 shadow-xs' : 'border-slate-200 bg-slate-50 opacity-70'
              }`}
            >
              <div>
                
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-300 text-amber-700 font-bold flex items-center justify-center text-base overflow-hidden flex-shrink-0">
                      {emp.faceProfile?.thumbnailUrl ? (
                        <img src={emp.faceProfile.thumbnailUrl} alt={emp.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{emp.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}</span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {emp.employeeId}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            emp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> ID Barcode
                    </span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {emp.barcode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Face Enrollment
                    </span>
                    {hasFace ? (
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Enrolled
                      </span>
                    ) : (
                      <span className="text-amber-700 font-bold text-[11px]">
                        Not Enrolled
                      </span>
                    )}
                  </div>

                  {emp.mobile && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Mobile
                      </span>
                      <span className="font-mono text-slate-700">{emp.mobile}</span>
                    </div>
                  )}

                  {emp.notes && (
                    <div className="text-[11px] text-slate-500 italic mt-1 truncate">
                      "{emp.notes}"
                    </div>
                  )}
                </div>

              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                
                {/* Face Enroll Button */}
                <button
                  onClick={() => handleOpenEnrollFace(emp)}
                  className="p-1.5 text-xs font-semibold text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Enroll or Update Staff Face"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Face</span>
                </button>

                {/* Barcode Badge Button */}
                <button
                  onClick={() => setBarcodeBadgeEmp(emp)}
                  className="p-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="View & Print ID Barcode Badge"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Badge</span>
                </button>

                {/* Edit Profile */}
                <button
                  onClick={() => handleOpenEdit(emp)}
                  className="p-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Edit Profile"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {/* Toggle Active */}
                <button
                  onClick={() => handleToggleStatus(emp)}
                  className={`p-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    emp.isActive
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title={emp.isActive ? 'Deactivate' : 'Reactivate'}
                >
                  {emp.isActive ? 'Disable' : 'Enable'}
                </button>

                {/* Permanently Delete Employee */}
                <button
                  onClick={() => handleDeleteEmployee(emp)}
                  className="p-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Delete Employee Permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

              </div>

            </div>
          );
        })}
      </div>

      {/* Empty State when no employees are registered */}
      {filteredEmployees.length === 0 && (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              {employees.length === 0 ? 'No Staff Members Registered Yet' : 'No Matching Staff Found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {employees.length === 0
                ? 'Your staff roster is clean and ready. Click the button below to register your first SR Fashion staff member with their ID Card barcode or face profile.'
                : 'Try adjusting your search query or status filter.'}
            </p>
          </div>
          {employees.length === 0 && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider shadow-md transition active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Your First Employee</span>
            </button>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT EMPLOYEE */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingEmp ? `Edit ${editingEmp.name}` : 'Register New Employee'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ayesha Shaikh"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    ID Barcode *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 uppercase font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 9823011223"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Assigned Shift
                </label>
                <select
                  value={formData.shiftId}
                  onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Notes / Role
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Senior Boutique Associate"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={isSavingEmp}
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEmp}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 transition"
                >
                  {isSavingEmp ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: FACE ENROLLMENT MODAL */}
      {isFaceEnrollOpen && enrollingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-slate-100">
                  Enroll Face: {enrollingEmp.name}
                </h3>
              </div>
              <button onClick={closeFaceModal} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Align staff face inside the camera preview and click <strong>Capture Face Profile</strong> to generate the biometric template.
            </p>

            {faceEnrollError && (
              <div className="p-3 bg-rose-950/70 border border-rose-500/50 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{faceEnrollError}</span>
              </div>
            )}

            <div className="relative w-60 h-60 mx-auto rounded-2xl overflow-hidden border-2 border-amber-400 bg-black flex items-center justify-center">
              {capturedThumb ? (
                <img src={capturedThumb} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={enrollVideoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}

              {!cameraActive && !capturedThumb && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
                  <Camera className="w-10 h-10 text-amber-400" />
                  <button
                    onClick={startEnrollCamera}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Start Camera
                  </button>
                </div>
              )}
            </div>

            {cameraActive && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={captureEnrollFace}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Capture Face Template</span>
                </button>
              </div>
            )}

            {capturedThumb && (
              <div className="space-y-3 pt-2">
                <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Facial signature extracted successfully!</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={startEnrollCamera}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold uppercase hover:bg-slate-700"
                  >
                    Retake
                  </button>
                  <button
                    onClick={saveEnrollment}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider"
                  >
                    Save & Enroll
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: BARCODE ID BADGE PREVIEW */}
      {barcodeBadgeEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setBarcodeBadgeEmp(null)} className="p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable ID Badge */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-white border-2 border-amber-400 shadow-xl space-y-3">
              <div className="w-12 h-12 rounded-full overflow-hidden mx-auto ring-2 ring-amber-400">
                <img src="/sr_fashion_logo.jpg" alt="SR Fashion Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-serif font-black text-amber-400 text-lg tracking-wider">
                  SR FASHION
                </h4>
                <p className="text-[10px] text-slate-300 uppercase tracking-widest">
                  Official Staff ID Card
                </p>
              </div>

              <div className="py-2 border-y border-slate-800">
                <div className="text-base font-bold text-white">{barcodeBadgeEmp.name}</div>
                <div className="text-xs text-amber-300 font-mono">ID: {barcodeBadgeEmp.employeeId}</div>
              </div>

              {/* Barcode Visual Representation */}
              <div className="bg-white p-3 rounded-lg text-slate-950 font-mono">
                <div className="text-2xl tracking-widest font-black uppercase">
                  || | ||| || ||| |
                </div>
                <div className="text-xs font-bold tracking-widest mt-1">
                  {barcodeBadgeEmp.barcode}
                </div>
              </div>

              <p className="text-[9px] text-slate-400">
                Eidgah Kaman Road, Degloor Naka, Nanded
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Print ID Badge
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
