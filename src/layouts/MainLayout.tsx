import React from 'react';
import { Course, Role } from '../types';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export interface MainLayoutProps {
  currentCourse: Course | null;
  role: Role;
  onRoleChange: (newRole: Role) => void;
  isLtiWidgetMode: boolean;
  onToggleLtiMode: () => void;
  activeTab: string;
  onNavigate: (tab: string, extra?: any) => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentCourse,
  role,
  onRoleChange,
  isLtiWidgetMode,
  onToggleLtiMode,
  activeTab,
  onNavigate,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  children
}) => {
  return (
    <div className="min-h-screen bg-[#F0F2F0] text-[#1A1C1A] flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        currentCourse={currentCourse}
        role={role}
        onRoleChange={onRoleChange}
        isLtiWidgetMode={isLtiWidgetMode}
        onToggleLtiMode={onToggleLtiMode}
        activeTab={activeTab}
        onNavigate={onNavigate}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={onToggleMobileMenu}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onNavigate={onNavigate}
          role={role}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={onCloseMobileMenu}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
