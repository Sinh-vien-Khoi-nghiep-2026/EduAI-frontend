import React, { useState } from 'react';
import { Assignment, SubmissionEvaluation } from '../../../types';
import { assignmentsApi } from '../api/assignmentsApi';
import { 
  FileCheck2, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle,
  FileCode
} from 'lucide-react';

export interface AssignmentsViewProps {
  assignments: Assignment[];
  onUpdateAssignment: (updated: Assignment) => void;
  onNavigateToExercise: (topic: string) => void;
  onNavigateToLesson: (lessonId: string) => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  assignments,
  onUpdateAssignment,
  onNavigateToExercise,
  onNavigateToLesson
}) => {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment>(assignments[0]);
  const [submissionText, setSubmissionText] = useState(selectedAssignment.submissionText || '');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleRunEvaluation = async () => {
    if (!submissionText.trim() || isEvaluating) return;
    setIsEvaluating(true);

    try {
      const data = await assignmentsApi.evaluateSubmission({
        courseTitle: selectedAssignment.courseTitle,
        assignmentTitle: selectedAssignment.title,
        submissionText: submissionText
      });

      const evaluation: SubmissionEvaluation = {
        id: `eval-${Date.now()}`,
        submissionId: selectedAssignment.id,
        courseId: selectedAssignment.courseId,
        assignmentTitle: selectedAssignment.title,
        submittedAt: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        overallScorePercent: data.overallScorePercent || 88,
        gradeLetter: data.gradeLetter || 'A-',
        executiveSummary: data.executiveSummary || 'Good work! Correct algorithm implementation with minor optimizations remaining.',
        strongTopics: data.strongTopics || ['Algorithm Structure', 'Tree Invariants'],
        weakTopics: data.weakTopics || ['Queue Memory Complexity'],
        detailedQuestions: data.detailedQuestions || [],
        recommendedNextSteps: data.recommendedNextSteps || [
          {
            action: 'Practice exercise set on BFS Queue Optimizations',
            targetTopic: 'Breadth-First Search (BFS)',
            exerciseTopic: 'BFS Queue Optimizations'
          }
        ]
      };

      const updatedAssignment: Assignment = {
        ...selectedAssignment,
        status: 'evaluated',
        submissionText: submissionText,
        evaluation: evaluation
      };

      onUpdateAssignment(updatedAssignment);
      setSelectedAssignment(updatedAssignment);
    } catch (err) {
      console.error('Failed to run evaluation:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E1E4E1] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-[#4F6D58]" />
            <h1 className="text-xl font-bold text-[#1A1C1A]">Assignments & Evaluation Agent</h1>
          </div>
          <p className="text-xs text-[#5C615C] mt-1">
            Submit coursework and receive immediate AI evaluation, feedback, and personalized review paths
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Assignments List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C615C]">
            Course Assignments
          </h3>

          <div className="space-y-2">
            {assignments.map((asg) => {
              const isSelected = selectedAssignment.id === asg.id;
              return (
                <button
                  key={asg.id}
                  onClick={() => {
                    setSelectedAssignment(asg);
                    setSubmissionText(asg.submissionText || '');
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8EAE8] border-[#4F6D58] text-[#1A1C1A] shadow-2xs font-semibold'
                      : 'bg-white hover:bg-[#F0F2F0] border-[#E1E4E1] text-[#5C615C]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded border ${
                      asg.status === 'evaluated'
                        ? 'bg-[#E8EAE8] text-[#4F6D58] border-[#D1D4D1]'
                        : 'bg-[#F0F2F0] text-[#1A1C1A] border-[#E1E4E1]'
                    }`}>
                      {asg.status === 'evaluated' ? 'Evaluated' : 'Pending'}
                    </span>
                    <span className="text-[10px] text-[#5C615C]">Due {asg.dueDate}</span>
                  </div>
                  <p className="font-bold text-[#1A1C1A] line-clamp-2">{asg.title}</p>
                  <p className="text-[11px] text-[#5C615C] mt-1">{asg.courseTitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Submission & Evaluation Detail */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Selected Assignment Context Box */}
          <div className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1E4E1] pb-4">
              <div>
                <span className="text-xs font-bold text-[#4F6D58] bg-[#E8EAE8] px-2 py-0.5 rounded border border-[#D1D4D1]">
                  {selectedAssignment.courseTitle}
                </span>
                <h2 className="text-lg font-bold text-[#1A1C1A] mt-1">
                  {selectedAssignment.title}
                </h2>
              </div>
              <span className="text-xs text-[#5C615C]">
                Due Date: <span className="font-bold text-[#1A1C1A]">{selectedAssignment.dueDate}</span>
              </span>
            </div>

            <p className="text-xs text-[#5C615C] leading-relaxed">
              {selectedAssignment.description}
            </p>

            {/* Submission Input Box if pending or edit */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-[#1A1C1A] flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#4F6D58]" />
                Student Code / Essay Submission Workspace:
              </label>
              <textarea
                rows={6}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Paste Python implementation, SQL queries, or essay answers..."
                className="w-full text-xs font-mono p-4 bg-[#1A1C1A] text-white border border-[#2D3E32] rounded-xl focus:ring-2 focus:ring-[#4F6D58] focus:outline-none"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-[#5C615C]">
                  The Evaluation Agent will analyze correctness, O(N) efficiency, and line-by-line quality.
                </p>
                <button
                  disabled={!submissionText.trim() || isEvaluating}
                  onClick={handleRunEvaluation}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#4F6D58] hover:bg-[#3E5746] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {isEvaluating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-white" />
                      <span>Evaluating Submission...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>{selectedAssignment.evaluation ? 'Re-Evaluate Submission' : 'Submit & Run Evaluation'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* EVALUATION REPORT BOX (If Evaluated) */}
          {selectedAssignment.evaluation && (
            <div className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-6">
              
              {/* Header Score Banner */}
              <div className="p-5 rounded-xl bg-[#4F6D58] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#3E5746]">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-white" />
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
                      AI Evaluation Agent Report
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Evaluation Complete
                  </h3>
                  <p className="text-xs text-white/80">
                    Evaluated on {selectedAssignment.evaluation.submittedAt}
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[#3E5746] p-3 rounded-xl border border-white/20">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-white">
                      {selectedAssignment.evaluation.overallScorePercent}%
                    </span>
                  </div>
                  <div className="text-left border-l border-white/20 pl-3">
                    <span className="text-xs text-white/80 block">Grade</span>
                    <span className="text-lg font-bold text-white">
                      {selectedAssignment.evaluation.gradeLetter}
                    </span>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C615C]">
                  Executive Feedback
                </h4>
                <div className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] text-xs text-[#1A1C1A] leading-relaxed">
                  "{selectedAssignment.evaluation.executiveSummary}"
                </div>
              </div>

              {/* Strengths & Weaknesses Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#E8EAE8] border border-[#D1D4D1] space-y-2">
                  <span className="text-xs font-bold text-[#4F6D58] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#4F6D58]" />
                    Strong Topics Demonstrated:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAssignment.evaluation.strongTopics.map((t, idx) => (
                      <span key={idx} className="text-[11px] px-2.5 py-1 rounded bg-white text-[#4F6D58] font-bold border border-[#D1D4D1]">
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#F0F2F0] border border-[#E1E4E1] space-y-2">
                  <span className="text-xs font-bold text-[#1A1C1A] flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-[#4F6D58]" />
                    Topics Needing Practice:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAssignment.evaluation.weakTopics.map((t, idx) => (
                      <span key={idx} className="text-[11px] px-2.5 py-1 rounded bg-white text-[#1A1C1A] font-bold border border-[#E1E4E1]">
                        ⚠ {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Itemized Questions Breakdown */}
              {selectedAssignment.evaluation.detailedQuestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C615C]">
                    Question Breakdown & Rubric Feedback
                  </h4>

                  <div className="space-y-3">
                    {selectedAssignment.evaluation.detailedQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1A1C1A]">{q.questionText}</span>
                          <span className={`font-bold ${q.isCorrect ? 'text-[#4F6D58]' : 'text-[#3E5746]'}`}>
                            {q.pointsEarned} / {q.maxPoints} pts
                          </span>
                        </div>
                        <p className="text-[#5C615C] italic">"Submittted logic: {q.userAnswer}"</p>
                        <p className="text-[#1A1C1A] bg-white p-2.5 rounded-lg border border-[#E1E4E1]">
                          {q.feedback}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTIONABLE PERSONALIZED REVIEW PATH */}
              <div className="p-5 rounded-2xl bg-[#F0F2F0] border border-[#E1E4E1] space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#4F6D58]" />
                  <h4 className="text-sm font-bold text-[#1A1C1A]">
                    Recommended Next Review Path (Evaluation → Improvement Loop)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {selectedAssignment.evaluation.recommendedNextSteps.map((step, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs flex flex-col justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-[#4F6D58] bg-[#E8EAE8] px-2 py-0.5 rounded border border-[#D1D4D1]">
                          Target: {step.targetTopic}
                        </span>
                        <p className="text-xs font-semibold text-[#1A1C1A] mt-1.5">
                          {step.action}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (step.exerciseTopic) {
                            onNavigateToExercise(step.exerciseTopic);
                          } else if (step.lessonId) {
                            onNavigateToLesson(step.lessonId);
                          } else {
                            onNavigateToExercise(step.targetTopic);
                          }
                        }}
                        className="w-full text-center py-2 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Start Personalized Review</span>
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
