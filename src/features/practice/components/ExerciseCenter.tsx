import React, { useState } from 'react';
import { Course, ExerciseSet, ExerciseQuestion, TopicMastery } from '../../../types';
import { practiceApi } from '../api/practiceApi';
import { 
  BrainCircuit, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw, 
  Plus, 
  Award
} from 'lucide-react';

export interface ExerciseCenterProps {
  courses: Course[];
  exerciseSets: ExerciseSet[];
  topicMastery: TopicMastery[];
  onAddExerciseSet: (newSet: ExerciseSet) => void;
  onNavigateToLesson: (lessonId: string) => void;
  initialTopic?: string;
}

export const ExerciseCenter: React.FC<ExerciseCenterProps> = ({
  courses,
  exerciseSets,
  topicMastery,
  onAddExerciseSet,
  onNavigateToLesson,
  initialTopic
}) => {
  const [selectedSet, setSelectedSet] = useState<ExerciseSet>(exerciseSets[0]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generator Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [genCourse, setGenCourse] = useState(courses[0].id);
  const [genTopic, setGenTopic] = useState(initialTopic || 'Depth-First Search (DFS)');
  const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [genCount, setGenCount] = useState(3);

  const activeCourse = courses.find(c => c.id === genCourse) || courses[0];

  const handleOptionSelect = (qId: string, option: string) => {
    setUserAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleTextAnswer = (qId: string, text: string) => {
    setUserAnswers(prev => ({ ...prev, [qId]: text }));
  };

  const calculateScore = () => {
    let correct = 0;
    selectedSet.questions.forEach(q => {
      if (q.type === 'mcq' && q.correctAnswer && userAnswers[q.id] === q.correctAnswer) {
        correct++;
      } else if (q.type === 'short_answer' && userAnswers[q.id] && userAnswers[q.id].length > 10) {
        correct++;
      }
    });
    return Math.round((correct / selectedSet.questions.length) * 100);
  };

  const handleGenerateExercises = async () => {
    setIsGenerating(true);
    try {
      const data = await practiceApi.generatePracticeSet({
        courseCode: activeCourse.code,
        topic: genTopic,
        difficulty: genDifficulty,
        count: genCount,
        knowledgeBase: activeCourse.knowledgeBase
      });

      const newQuestions: ExerciseQuestion[] = (data.questions || []).map((q: any, i: number) => ({
        id: `gen-q-${Date.now()}-${i}`,
        type: q.type || 'mcq',
        topic: q.topic || genTopic,
        difficulty: q.difficulty || genDifficulty,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }));

      const newSet: ExerciseSet = {
        id: `ex-set-${Date.now()}`,
        title: `AI Practice: ${genTopic}`,
        courseId: activeCourse.id,
        courseName: `${activeCourse.code} ${activeCourse.title}`,
        topic: genTopic,
        createdAt: new Date().toISOString().split('T')[0],
        questions: newQuestions
      };

      onAddExerciseSet(newSet);
      setSelectedSet(newSet);
      setUserAnswers({});
      setShowResults(false);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to generate exercises:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E1E4E1] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-[#4F6D58]" />
            <h1 className="text-xl font-bold text-[#1A1C1A]">Practice Engine & Exercise Center</h1>
          </div>
          <p className="text-xs text-[#5C615C] mt-1">
            Adaptive AI practice sets tailored to your performance history and weak topics
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>Generate Custom Practice</span>
        </button>
      </div>

      {/* TOPIC MASTERY PREVIEW STRIP */}
      <div className="p-4 rounded-xl bg-[#1A1C1A] text-white flex flex-wrap items-center justify-between gap-4 border border-[#2D3E32]">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white">Recommended Focus Topics:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {topicMastery.filter(t => t.status === 'needs_review').map((t, idx) => (
            <button
              key={idx}
              onClick={() => {
                setGenTopic(t.topic);
                setIsModalOpen(true);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#4F6D58] text-white border border-white/20 font-semibold hover:bg-[#3E5746] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{t.topic} ({t.masteryPercent}%)</span>
              <Plus className="w-3 h-3 text-white" />
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Set Selector List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C615C]">
            Available Practice Sets
          </h3>

          <div className="space-y-2">
            {exerciseSets.map((set) => {
              const isSelected = selectedSet.id === set.id;
              return (
                <button
                  key={set.id}
                  onClick={() => {
                    setSelectedSet(set);
                    setUserAnswers({});
                    setShowResults(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8EAE8] border-[#4F6D58] text-[#1A1C1A] shadow-2xs font-semibold'
                      : 'bg-white hover:bg-[#F0F2F0] border-[#E1E4E1] text-[#5C615C]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#4F6D58] bg-[#F0F2F0] px-1.5 py-0.2 rounded border border-[#D1D4D1]">
                      {set.questions.length} Questions
                    </span>
                    <span className="text-[10px] text-[#5C615C]">{set.createdAt}</span>
                  </div>
                  <p className="font-bold text-[#1A1C1A] line-clamp-1">{set.title}</p>
                  <p className="text-[11px] text-[#5C615C] mt-1 line-clamp-1">{set.courseName}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Question Taking & Review Box */}
        <div className="lg:col-span-3 bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-6">
          
          {/* Header of Set */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1E4E1] pb-4">
            <div>
              <span className="text-xs font-bold text-[#4F6D58] bg-[#E8EAE8] px-2 py-0.5 rounded border border-[#D1D4D1]">
                {selectedSet.courseName}
              </span>
              <h2 className="text-base font-bold text-[#1A1C1A] mt-1">
                {selectedSet.title}
              </h2>
            </div>

            {showResults && (
              <div className="flex items-center gap-3 bg-[#E8EAE8] border border-[#D1D4D1] px-4 py-2 rounded-xl text-xs">
                <Award className="w-5 h-5 text-[#4F6D58]" />
                <div>
                  <span className="text-[#5C615C] font-semibold">Practice Score:</span>
                  <span className="text-sm font-bold text-[#4F6D58] ml-1.5">{calculateScore()}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {selectedSet.questions.map((q, idx) => {
              const uAns = userAnswers[q.id];
              const isMCQ = q.type === 'mcq';
              const isCorrect = isMCQ && uAns === q.correctAnswer;

              return (
                <div key={q.id} className="p-5 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5C615C]">
                      Question {idx + 1} of {selectedSet.questions.length} • {q.topic}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${
                      q.difficulty === 'easy' ? 'bg-[#E8EAE8] text-[#4F6D58] border-[#D1D4D1]' :
                      q.difficulty === 'medium' ? 'bg-[#F0F2F0] text-[#1A1C1A] border-[#E1E4E1]' :
                      'bg-[#E8EAE8] text-[#3E5746] border-[#D1D4D1]'
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#1A1C1A] leading-relaxed whitespace-pre-line">
                    {q.question}
                  </p>

                  {/* MCQ Options */}
                  {isMCQ && q.options && (
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = uAns === opt;
                        let optionStyle = 'bg-white hover:bg-[#F0F2F0] border-[#E1E4E1] text-[#1A1C1A]';
                        if (showResults) {
                          if (opt === q.correctAnswer) {
                            optionStyle = 'bg-[#E8EAE8] border-[#4F6D58] text-[#4F6D58] font-bold';
                          } else if (isSelected && !isCorrect) {
                            optionStyle = 'bg-rose-50 border-rose-300 text-rose-950 font-medium';
                          }
                        } else if (isSelected) {
                          optionStyle = 'bg-[#4F6D58] text-white font-bold border-[#4F6D58]';
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={showResults}
                            onClick={() => handleOptionSelect(q.id, opt)}
                            className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                          >
                            <span>{opt}</span>
                            {showResults && opt === q.correctAnswer && (
                              <CheckCircle2 className="w-4 h-4 text-[#4F6D58] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer Textbox */}
                  {!isMCQ && (
                    <div className="pt-1">
                      <textarea
                        rows={3}
                        disabled={showResults}
                        value={uAns || ''}
                        onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                        placeholder="Type your explanation or response..."
                        className="w-full text-xs p-3 bg-white border border-[#E1E4E1] rounded-xl text-[#1A1C1A] focus:ring-2 focus:ring-[#4F6D58] focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Explanation Box on Show Results */}
                  {showResults && (
                    <div className="p-3.5 rounded-xl bg-[#F0F2F0] border border-[#E1E4E1] text-xs text-[#1A1C1A] space-y-1">
                      <span className="font-bold flex items-center gap-1 text-[#4F6D58]">
                        <Sparkles className="w-3.5 h-3.5 text-[#4F6D58]" />
                        AI Explanation & Course Reference:
                      </span>
                      <p className="text-[#5C615C] leading-normal">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-between border-t border-[#E1E4E1] pt-4">
            <button
              onClick={() => {
                setShowResults(false);
                setUserAnswers({});
              }}
              className="px-4 py-2 rounded-xl border border-[#E1E4E1] hover:bg-[#F0F2F0] text-[#1A1C1A] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Answers</span>
            </button>

            {!showResults ? (
              <button
                onClick={() => setShowResults(true)}
                className="px-5 py-2.5 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Submit Practice & Check AI Explanations
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Generate Next Practice Set</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* GENERATOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1C1A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E1E4E1] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E1E4E1] pb-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-[#4F6D58]" />
                <h3 className="text-base font-bold text-[#1A1C1A]">
                  AI Exercise Generator
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#5C615C] hover:text-[#1A1C1A] text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-[#1A1C1A]">Course</label>
                <select
                  value={genCourse}
                  onChange={(e) => setGenCourse(e.target.value)}
                  className="w-full bg-[#F8F9F8] border border-[#E1E4E1] rounded-xl p-2.5 font-medium text-[#1A1C1A] cursor-pointer"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#1A1C1A]">Topic Focus</label>
                <input
                  type="text"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Depth-First Search, Binary Search Trees..."
                  className="w-full bg-[#F8F9F8] border border-[#E1E4E1] rounded-xl p-2.5 font-medium text-[#1A1C1A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#1A1C1A]">Difficulty</label>
                  <select
                    value={genDifficulty}
                    onChange={(e: any) => setGenDifficulty(e.target.value)}
                    className="w-full bg-[#F8F9F8] border border-[#E1E4E1] rounded-xl p-2.5 font-medium text-[#1A1C1A] cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1A1C1A]">Question Count</label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full bg-[#F8F9F8] border border-[#E1E4E1] rounded-xl p-2.5 font-medium text-[#1A1C1A] cursor-pointer"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E1E4E1] text-[#1A1C1A] text-xs font-bold hover:bg-[#F0F2F0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isGenerating}
                onClick={handleGenerateExercises}
                className="px-5 py-2 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    <span>Generating Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Generate Practice Set</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
