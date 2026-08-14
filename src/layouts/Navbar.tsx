import React from 'react';
import { Course, Role } from '../types';
import { 
  BookOpen, 
  Layers, 
  ChevronRight, 
  Menu, 
  X
} from 'lucide-react';

export interface NavbarProps {
  currentCourse: Course | null;
  role: Role;
  onRoleChange: (newRole: Role) => void;
  isLtiWidgetMode: boolean;
  onToggleLtiMode: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCourse,
  role,
  onRoleChange,
  isLtiWidgetMode,
  onToggleLtiMode,
  onNavigate,
  isMobileMenuOpen,
  onToggleMobileMenu
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E1E4E1] text-[#1A1C1A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
        
        {/* Left: Mobile Toggle & Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 -ml-2 rounded-xl text-[#5C615C] hover:text-[#1A1C1A] hover:bg-[#F0F2F0] transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-left group focus:outline-none cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#4F6D58] text-white flex items-center justify-center font-bold text-base shadow-2xs group-hover:bg-[#3E5746] transition-colors">
              E
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-[#1A1C1A] group-hover:text-[#4F6D58] transition-colors">
                Etutor
              </span>
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#E8EAE8] text-[#4F6D58] font-bold border border-[#D1D4D1]">
                AI Middleware
              </span>
            </div>
          </button>

          {/* Context Badge on Desktop */}
          {currentCourse && (
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-[#E1E4E1] text-xs">
              <button 
                onClick={() => onNavigate('course-detail')}
                className="flex items-center gap-1.5 text-[#5C615C] hover:text-[#1A1C1A] font-medium bg-[#F8F9F8] hover:bg-[#F0F2F0] px-2 py-1 rounded-lg border border-[#E1E4E1] transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#4F6D58]" />
                <span className="font-bold text-[#1A1C1A]">{currentCourse.code}</span>
                <ChevronRight className="w-3 h-3 text-[#5C615C]" />
              </button>
            </div>
          )}
        </div>

        {/* Right: LTI Toggle, Role Switcher, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* LTI Widget Preview Toggle */}
          <button
            onClick={onToggleLtiMode}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isLtiWidgetMode 
                ? 'bg-[#1A1C1A] text-white border-[#1A1C1A]' 
                : 'bg-[#F8F9F8] text-[#5C615C] border-[#E1E4E1] hover:bg-[#F0F2F0] hover:text-[#1A1C1A]'
            }`}
            title="Toggle LTI Embed Preview"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isLtiWidgetMode ? 'Exit LTI View' : 'LTI Embed'}
            </span>
          </button>

          {/* Role Switcher */}
          <div className="flex items-center bg-[#F0F2F0] p-0.5 rounded-xl border border-[#E1E4E1]">
            <button
              onClick={() => onRoleChange('student')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                role === 'student' 
                  ? 'bg-[#4F6D58] text-white shadow-2xs' 
                  : 'text-[#5C615C] hover:text-[#1A1C1A]'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => onRoleChange('teacher')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                role === 'teacher' 
                  ? 'bg-[#4F6D58] text-white shadow-2xs' 
                  : 'text-[#5C615C] hover:text-[#1A1C1A]'
              }`}
            >
              Teacher
            </button>
          </div>

          {/* User Avatar */}
          <div className="w-7 h-7 rounded-full bg-[#E8EAE8] border border-[#D1D4D1] flex items-center justify-center text-xs font-bold text-[#4F6D58] shrink-0">
            {role === 'student' ? 'A' : 'P'}
          </div>

        </div>

      </div>
    </header>
  );
};
