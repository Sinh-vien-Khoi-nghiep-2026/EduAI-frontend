import React, { useState } from 'react';
import { Course } from '../../../types';
import { 
  BookOpen, 
  CheckCircle2, 
  Bot, 
  ArrowRight,
  Clock,
  FolderOpen
} from 'lucide-react';

export interface CourseDetailProps {
  course: Course;
  onNavigateToLesson: (lessonId: string) => void;
  onNavigateToTutor: () => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  onNavigateToLesson,
  onNavigateToTutor
}) => {
  const [activeTab, setActiveTab] = useState<'syllabus' | 'knowledge_base'>('syllabus');

  return (
    <div className="space-y-6 pb-12">
      
      {/* Course Hero Banner */}
      <div className="p-6 rounded-2xl bg-[#4F6D58] text-white shadow-md border border-[#3E5746] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#3E5746] text-white border border-white/20">
                {course.code}
              </span>
              <span className="text-xs text-white/90">{course.department}</span>
              <span className="text-xs text-white/70">• {course.instructor}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{course.title}</h1>
            <p className="text-xs text-white/85 max-w-3xl leading-relaxed">{course.description}</p>
          </div>

          <button
            onClick={onNavigateToTutor}
            className="px-4 py-2.5 bg-[#1A1C1A] hover:bg-[#2D3E32] text-white text-xs font-bold rounded-xl transition-colors shadow-xs shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <Bot className="w-4 h-4 text-white" />
            <span>Open Teaching Agent</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="pt-2 border-t border-white/20 flex items-center justify-between gap-4 text-xs text-white/90">
          <div className="flex items-center gap-2">
            <span>Enrolled Students: <strong className="text-white">{course.enrolledStudentsCount}</strong></span>
            <span>•</span>
            <span>Knowledge Base: <strong className="text-white font-bold">{course.knowledgeBase.length} Official Items</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Course Progress:</span>
            <div className="w-32 h-2 rounded-full bg-[#3E5746] overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${course.progressPercent}%` }}></div>
            </div>
            <span className="font-bold text-white">{course.progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#E1E4E1] pb-1">
        <button
          onClick={() => setActiveTab('syllabus')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'syllabus'
              ? 'bg-[#4F6D58] text-white'
              : 'text-[#5C615C] hover:bg-[#F0F2F0] hover:text-[#1A1C1A]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Modules & Lessons ({course.modules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('knowledge_base')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'knowledge_base'
              ? 'bg-[#4F6D58] text-white'
              : 'text-[#5C615C] hover:bg-[#F0F2F0] hover:text-[#1A1C1A]'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Official Knowledge Base RAG ({course.knowledgeBase.length})</span>
        </button>
      </div>

      {/* SYLLABUS VIEW */}
      {activeTab === 'syllabus' && (
        <div className="space-y-6">
          {course.modules.map((mod, modIdx) => (
            <div key={mod.id} className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="border-b border-[#E1E4E1] pb-3">
                <span className="text-[11px] font-bold text-[#4F6D58] uppercase tracking-wider">
                  Module {modIdx + 1}
                </span>
                <h3 className="text-base font-bold text-[#1A1C1A] mt-0.5">{mod.title}</h3>
                <p className="text-xs text-[#5C615C] mt-0.5">{mod.description}</p>
              </div>

              <div className="space-y-3">
                {mod.lessons.map((les) => (
                  <div
                    key={les.id}
                    className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#4F6D58]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {les.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#4F6D58] shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#5C615C] shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-[#1A1C1A]">{les.title}</h4>
                        <span className="text-[10px] text-[#5C615C]">({les.durationMinutes} mins)</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pl-6">
                        {les.keyConcepts.map((kc, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.2 rounded bg-white text-[#1A1C1A] border border-[#E1E4E1] font-medium">
                            {kc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigateToLesson(les.id)}
                      className="px-4 py-2 rounded-xl bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold shrink-0 transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{les.completed ? 'Review Lesson' : 'Start Lesson'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KNOWLEDGE BASE VIEW */}
      {activeTab === 'knowledge_base' && (
        <div className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#1A1C1A]">
              Course-Centric Knowledge Base
            </h3>
            <p className="text-xs text-[#5C615C] mt-0.5">
              Etutor Multi-Agent AI answers questions based strictly on these verified academic sources.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {course.knowledgeBase.map((kb) => (
              <div key={kb.id} className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#E8EAE8] text-[#4F6D58] border border-[#D1D4D1]">
                    {kb.type}
                  </span>
                  <span className="text-[10px] text-[#5C615C]">{kb.pagesOrSize}</span>
                </div>
                <h4 className="text-xs font-bold text-[#1A1C1A]">{kb.title}</h4>
                <p className="text-[11px] text-[#5C615C]">{kb.summary}</p>
                {kb.snippet && (
                  <p className="text-[10px] font-mono bg-white p-2 rounded-lg border border-[#E1E4E1] text-[#1A1C1A]">
                    "{kb.snippet}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
