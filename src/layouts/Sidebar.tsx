import React from 'react';
import { Role } from '../types';
import { 
  LayoutDashboard, 
  Compass, 
  Bot, 
  BrainCircuit, 
  FileCheck2, 
  TrendingUp, 
  Layers, 
  GraduationCap, 
  FolderGit2, 
  ListChecks,
  X
} from 'lucide-react';

export interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  role: Role;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onNavigate, 
  role,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const studentNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'explore-courses', label: 'Courses', icon: Compass },
    { id: 'ai-tutor', label: 'Teaching Agent', icon: Bot, badge: 'AI' },
    { id: 'exercise-center', label: 'Practice Engine', icon: BrainCircuit, badge: 'AI' },
    { id: 'assignments', label: 'Assignments', icon: FileCheck2 },
    { id: 'progress', label: 'Mastery Analytics', icon: TrendingUp },
    { id: 'lti-preview', label: 'LTI LMS Embed', icon: Layers },
  ];

  const teacherNavItems = [
    { id: 'teacher-dashboard', label: 'Instructor Portal', icon: GraduationCap },
    { id: 'teacher-knowledge', label: 'Course Knowledge Base', icon: FolderGit2 },
    { id: 'teacher-exercises', label: 'Exercise Review Queue', icon: ListChecks, badge: '3' },
  ];

  const navItems = role === 'student' ? studentNavItems : teacherNavItems;

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full p-4">
      <div className="space-y-6">
        
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between lg:hidden pb-3 border-b border-[#E1E4E1]">
          <span className="text-xs font-bold text-[#1A1C1A] uppercase tracking-wider">
            {role === 'student' ? 'Student Workspace' : 'Instructor Portal'}
          </span>
          <button 
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-[#5C615C] hover:text-[#1A1C1A] hover:bg-[#F0F2F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#4F6D58] text-white shadow-2xs'
                    : 'text-[#5C615C] hover:text-[#1A1C1A] hover:bg-[#F0F2F0]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#5C615C]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-[#E8EAE8] text-[#4F6D58]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Subtle agent indicator */}
      <div className="p-3 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] text-[11px] text-[#5C615C] space-y-1.5">
        <div className="flex items-center justify-between font-bold text-[#1A1C1A]">
          <span>Grounded RAG</span>
          <span className="w-2 h-2 rounded-full bg-[#4F6D58]"></span>
        </div>
        <p className="text-[10px] leading-tight text-[#5C615C]">
          Directly synced with official course syllabus and lecture notes.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-60 bg-white border-r border-[#E1E4E1] shrink-0 min-h-[calc(100vh-3.75rem)]">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Panel */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={onCloseMobile}
          />

          {/* Drawer Content */}
          <div className="relative w-68 max-w-[80vw] bg-white h-full shadow-xl z-10 border-r border-[#E1E4E1]">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
