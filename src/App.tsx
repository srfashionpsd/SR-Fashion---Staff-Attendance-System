import React, { useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceResult, User } from './types';
import { api, authStorage } from './services/api';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AttendanceKiosk } from './components/AttendanceKiosk';
import { DashboardView } from './components/DashboardView';
import { StaffManagementView } from './components/StaffManagementView';
import { AdjustmentsView } from './components/AdjustmentsView';
import { LeavesHolidaysView } from './components/LeavesHolidaysView';
import { ReportsView } from './components/ReportsView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { FaceScannerModal } from './components/FaceScannerModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { WhatsAppSummaryModal } from './components/WhatsAppSummaryModal';
import { ManualAttendanceModal } from './components/ManualAttendanceModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('kiosk');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);

  // Modals state
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetEmpId, setWhatsAppTargetEmpId] = useState<string | undefined>(undefined);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualRecord, setManualRecord] = useState<AttendanceRecord | null>(null);
  const [manualPresetEmpId, setManualPresetEmpId] = useState<string | undefined>(undefined);

  // App notification banner
  const [bannerNotice, setBannerNotice] = useState<AttendanceResult | null>(null);

  // Load user session on mount
  useEffect(() => {
    const savedUser = authStorage.getUser();
    if (savedUser) {
      setCurrentUser(savedUser);
    } else {
      // Default to SR Fashion Admin so all management features are immediately usable
      const defaultAdmin: User = {
        id: 'usr_admin',
        username: 'admin',
        name: 'SR Fashion Admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      authStorage.setUser(defaultAdmin);
      setCurrentUser(defaultAdmin);
    }
    refreshStats();
  }, []);

  const refreshStats = async () => {
    try {
      const stats = await api.getDashboardStats();
      setPendingReviewsCount(stats.extendedOutPending);
    } catch {}
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentTab('kiosk');
  };

  const handleAttendanceSuccess = (result: AttendanceResult) => {
    setBannerNotice(result);
    refreshStats();
  };

  const openWhatsAppModal = (employeeId?: string) => {
    setWhatsAppTargetEmpId(employeeId);
    setIsWhatsAppModalOpen(true);
  };

  const openManualModal = (employeeId?: string) => {
    setManualRecord(null);
    setManualPresetEmpId(employeeId);
    setIsManualModalOpen(true);
  };

  const openEditModal = (rec: AttendanceRecord) => {
    setManualRecord(rec);
    setManualPresetEmpId(rec.employeeId);
    setIsManualModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-amber-100 selection:text-amber-900">
      
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        pendingReviewsCount={pendingReviewsCount}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {currentTab === 'kiosk' && (
          <AttendanceKiosk
            onOpenFaceModal={() => setIsFaceModalOpen(true)}
            onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            currentUser={currentUser}
            onAttendanceSuccess={handleAttendanceSuccess}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            onNavigateToAdjustments={() => setCurrentTab('adjustments')}
            onOpenManualAttendance={openManualModal}
            onOpenEditAttendance={openEditModal}
            onOpenWhatsAppSummary={openWhatsAppModal}
          />
        )}

        {currentTab === 'staff' && (
          <StaffManagementView
            currentUser={currentUser}
            onRefreshData={refreshStats}
          />
        )}

        {currentTab === 'adjustments' && (
          <AdjustmentsView
            currentUser={currentUser}
            onRefreshData={refreshStats}
          />
        )}

        {currentTab === 'leaves' && (
          <LeavesHolidaysView
            currentUser={currentUser}
            onRefreshData={refreshStats}
          />
        )}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'audit' && <AuditLogView />}

        {currentTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            onRefreshData={refreshStats}
          />
        )}
      </main>

      {/* Modals */}
      <FaceScannerModal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onSuccess={handleAttendanceSuccess}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onSuccess={handleAttendanceSuccess}
      />

      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTab('dashboard');
        }}
      />

      <WhatsAppSummaryModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        targetEmployeeId={whatsAppTargetEmpId}
      />

      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        record={manualRecord}
        presetEmployeeId={manualPresetEmpId}
        onSaved={refreshStats}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
