import React from 'react';
import { Course, Assignment, TopicMastery, ActivityLog } from '../../../types';
import { 
  Play, 
  ArrowRight, 
  AlertCircle, 
  Bot, 
  BrainCircuit, 
  FileCheck2
} from 'lucide-react';

export interface DashboardViewProps {
  courses: Course[];
  assignments: Assignment[];
  topicMastery: TopicMastery[];
  activities: ActivityLog[];
  onNavigate: (tab: string, extra?: any) => void;
  onSelectCourse: (course: Course) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  courses,
  assignments,
  topicMastery,
  activities,
  onNavigate,
  onSelectCourse
}) => {
  const activeCourse = courses[0] || null;
  const pendingAssignments = assignments.filter(a => a.status === 'pending');
  const evaluatedAssignments = assignments.filter(a => a.status === 'evaluated');
  const weakTopics = topicMastery.filter(t => t.status === 'needs_review');

  return (
    <div className="space-y-6 pb-10">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1E4E1] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1A] tracking-tight">
              Welcome back, Alex
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#E8EAE8] text-[#4F6D58]">
              Spring 2026
            </span>
          </div>
          <p className="text-xs text-[#5C615C] mt-0.5">
            Personalized learning path powered by course-grounded AI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('ai-tutor')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#4F6D58] bg-white hover:bg-[#F0F2F0] rounded-xl border border-[#E1E4E1] transition-colors cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask Tutor</span>
          </button>
          <button
            onClick={() => onNavigate('exercise-center')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#4F6D58] hover:bg-[#3E5746] rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Practice</span>
          </button>
        </div>
      </div>

      {/* Current Active Course Banner */}
      {activeCourse && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#4F6D58] text-white shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-[#3E5746] text-white font-bold border border-white/20">
                  {activeCourse.code}
                </span>
                <span className="text-white/80 font-medium">
                  {activeCourse.instructor}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {activeCourse.title}
              </h2>

              <p className="text-xs text-white/90 font-medium">
                Current Lesson: <strong className="text-white">Lesson 2.2: Tree Traversals</strong>
              </p>

              {/* Progress bar */}
              <div className="space-y-1 pt-1 max-w-md">
                <div className="flex items-center justify-between text-[11px] text-white/80 font-semibold">
                  <span>Course Completion</span>
                  <span>{activeCourse.progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#3E5746] overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-300" 
                    style={{ width: `${activeCourse.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row sm:flex-col gap-2 shrink-0">
              <button
                onClick={() => {
                  onSelectCourse(activeCourse);
                  onNavigate('lesson-view', { lessonId: 'les-202' });
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#1A1C1A] hover:bg-[#2D3E32] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Resume Lesson</span>
              </button>

              <button
                onClick={() => {
                  onSelectCourse(activeCourse);
                  onNavigate('course-detail');
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#3E5746] hover:bg-[#324739] text-white font-semibold text-xs flex items-center justify-center gap-1 border border-white/20 transition-colors cursor-pointer"
              >
                <span>Syllabus</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Next Actions & Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Next Steps & Feedback */}
        <div className="lg:col-span-2 space-y-5">
          
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#5C615C] uppercase tracking-wider">
              Recommended Next Actions
            </h2>

            {/* Weak Topic Card */}
            {weakTopics.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-[#4F6D58] transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-[#1A1C1A] truncate">
                        Practice {weakTopics[0].topic}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                        {weakTopics[0].masteryPercent}% Mastery
                      </span>
                    </div>
                    <p className="text-xs text-[#5C615C] mt-0.5">
                      Targeted practice set to strengthen recursion and call stack mechanics.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('exercise-center', { topic: weakTopics[0].topic })}
                  className="px-3.5 py-1.5 rounded-xl bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold shrink-0 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
                >
                  Start Practice
                </button>
              </div>
            )}

            {/* Upcoming Assignment */}
            {pendingAssignments.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-[#4F6D58] transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#F8F9F8] text-[#4F6D58] flex items-center justify-center shrink-0 mt-0.5 border border-[#E1E4E1]">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-[#1A1C1A] truncate">
                        {pendingAssignments[0].title}
                      </h3>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F8F9F8] text-[#5C615C] font-semibold border border-[#E1E4E1]">
                        Due {pendingAssignments[0].dueDate}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C615C] mt-0.5">
                      {pendingAssignments[0].courseTitle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('assignments')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1A1C1A] hover:bg-[#2D3E32] text-white text-xs font-bold shrink-0 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  Submit
                </button>
              </div>
            )}
          </div>

          {/* Latest Evaluation Feedback Summary */}
          {evaluatedAssignments.length > 0 && evaluatedAssignments[0].evaluation && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-[#5C615C] uppercase tracking-wider">
                Recent AI Evaluation Feedback
              </h2>

              <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#E1E4E1] pb-2.5">
                  <div>
                    <h3 className="text-xs font-bold text-[#1A1C1A]">
                      {evaluatedAssignments[0].title}
                    </h3>
                    <p className="text-[11px] text-[#5C615C]">
                      Evaluated on {evaluatedAssignments[0].evaluation.submittedAt}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#4F6D58]">
                      {evaluatedAssignments[0].evaluation.overallScorePercent}%
                    </span>
                    <span className="text-xs font-bold ml-1.5 px-1.5 py-0.5 rounded bg-[#E8EAE8] text-[#4F6D58]">
                      Grade {evaluatedAssignments[0].evaluation.gradeLetter}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#1A1C1A] leading-relaxed bg-[#F8F9F8] p-3 rounded-lg border border-[#E1E4E1]">
                  "{evaluatedAssignments[0].evaluation.executiveSummary}"
                </p>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-wrap gap-1.5">
                    {evaluatedAssignments[0].evaluation.strongTopics.map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#E8EAE8] text-[#4F6D58] font-semibold">
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => onNavigate('assignments')}
                    className="text-xs font-bold text-[#4F6D58] hover:underline shrink-0 cursor-pointer"
                  >
                    View Report →
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Col: Topic Mastery & Activity */}
        <div className="space-y-5">
          
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#5C615C] uppercase tracking-wider">
              Topic Mastery & Activity
            </h2>

            <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] space-y-4 shadow-2xs">
              
              {/* Stat chips */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-[#F8F9F8] border border-[#E1E4E1]">
                  <span className="text-[11px] text-[#5C615C] block">Avg Score</span>
                  <span className="text-base font-bold text-[#1A1C1A]">88%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F8F9F8] border border-[#E1E4E1]">
                  <span className="text-[11px] text-[#5C615C] block">Mastered</span>
                  <span className="text-base font-bold text-[#4F6D58]">3 of 8</span>
                </div>
              </div>

              {/* Topic Bars */}
              <div className="space-y-2 pt-1 border-t border-[#E1E4E1]">
                <div className="flex items-center justify-between text-xs font-bold text-[#1A1C1A]">
                  <span>Core Topics</span>
                  <button 
                    onClick={() => onNavigate('progress')}
                    className="text-[11px] font-bold text-[#4F6D58] hover:underline cursor-pointer"
                  >
                    All Topics
                  </button>
                </div>

                <div className="space-y-2">
                  {topicMastery.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#1A1C1A] text-[11px] truncate max-w-[150px]">
                          {item.topic}
                        </span>
                        <span className="font-bold text-[11px] text-[#4F6D58]">
                          {item.masteryPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#E1E4E1] overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.masteryPercent >= 80 ? 'bg-[#4F6D58]' :
                            item.masteryPercent >= 60 ? 'bg-[#4F6D58]/80' : 'bg-amber-600'
                          }`}
                          style={{ width: `${item.masteryPercent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-2 pt-2 border-t border-[#E1E4E1]">
                <span className="text-xs font-bold text-[#1A1C1A] block">
                  Recent Activity
                </span>

                <div className="space-y-2">
                  {activities.slice(0, 3).map((act) => (
                    <div key={act.id} className="text-xs flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F6D58] mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1A1C1A] text-[11px] truncate">{act.title}</p>
                        <p className="text-[10px] text-[#5C615C]">{act.timestamp} • {act.courseCode}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
