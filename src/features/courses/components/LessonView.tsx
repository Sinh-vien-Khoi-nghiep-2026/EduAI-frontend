import React, { useState } from 'react';
import { Lesson, Course } from '../../../types';
import { tutorApi } from '../../tutor/api/tutorApi';
import { 
  Bot, 
  ArrowLeft, 
  Sparkles, 
  Send, 
  BrainCircuit,
  ChevronRight
} from 'lucide-react';

export interface LessonViewProps {
  course: Course;
  lessonId: string;
  onBack: () => void;
  onNavigateToExercise: (topic: string) => void;
}

export const LessonView: React.FC<LessonViewProps> = ({
  course,
  lessonId,
  onBack,
  onNavigateToExercise
}) => {
  // Find lesson
  let lesson: Lesson | null = null;
  for (const mod of course.modules) {
    const found = mod.lessons.find(l => l.id === lessonId);
    if (found) {
      lesson = found;
      break;
    }
  }

  const currentLesson = lesson || course.modules[1].lessons[1]; // fallback to 2.2

  // Teaching Agent Sidebar state inside Lesson View
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [tutorMessages, setTutorMessages] = useState<{ sender: 'user' | 'ai'; text: string; citation?: string }[]>([
    {
      sender: 'ai',
      text: `Hello Alex! I am your Teaching Agent for **${currentLesson.title}**.

Ask me anything about these key concepts:
- ${currentLesson.keyConcepts.join('\n- ')}

*Grounded on*: ${currentLesson.groundingSources.join(', ')}`,
      citation: currentLesson.groundingSources[0]
    }
  ]);
  const [isAsking, setIsAsking] = useState(false);

  const handleAskTutor = async () => {
    if (!query.trim() || isAsking) return;
    const userQ = query;
    setQuery('');
    setTutorMessages(prev => [...prev, { sender: 'user', text: userQ }]);
    setIsAsking(true);

    try {
      const data = await tutorApi.askAgent({
        message: userQ,
        courseCode: course.code,
        courseTitle: course.title,
        knowledgeBase: course.knowledgeBase,
        chatHistory: []
      });
      setTutorMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.reply || 'Explanation generated based on course materials.',
          citation: currentLesson.groundingSources[0]
        }
      ]);
    } catch (err) {
      setTutorMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Regarding "${userQ}": In **${currentLesson.title}**, we maintain tree ordering. Left subtree keys are strictly smaller than root, and right subtree keys are strictly larger. In-Order traversal visits left, root, right in ascending order.`,
          citation: currentLesson.groundingSources[0]
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E1E4E1] pb-4">
        <button
          onClick={onBack}
          className="text-xs text-[#5C615C] hover:text-[#1A1C1A] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E1E4E1] bg-white hover:bg-[#F0F2F0] transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Course Syllabus</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToExercise(currentLesson.keyConcepts[0])}
            className="px-3.5 py-1.5 bg-[#E8EAE8] text-[#4F6D58] hover:bg-[#D1D4D1] rounded-xl text-xs font-bold border border-[#D1D4D1] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Practice This Lesson</span>
          </button>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isDrawerOpen 
                ? 'bg-[#4F6D58] text-white border-[#4F6D58]' 
                : 'bg-white text-[#1A1C1A] border-[#E1E4E1] hover:bg-[#F0F2F0]'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-white" />
            <span>{isDrawerOpen ? 'Hide Teaching Drawer' : 'Ask Teaching Agent'}</span>
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT: Lesson Content + Side AI Assistant Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Lesson Reading Content Column */}
        <div className={`${isDrawerOpen ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white border border-[#E1E4E1] rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6`}>
          
          <div className="space-y-2 border-b border-[#E1E4E1] pb-4">
            <span className="text-xs font-bold text-[#4F6D58] bg-[#E8EAE8] px-2.5 py-0.5 rounded border border-[#D1D4D1]">
              {course.code} • {course.title}
            </span>
            <h1 className="text-xl font-bold text-[#1A1C1A]">{currentLesson.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C615C] pt-1">
              <span>Duration: {currentLesson.durationMinutes} mins</span>
              <span>•</span>
              <span>Grounded in: {currentLesson.groundingSources.join(', ')}</span>
            </div>
          </div>

          {/* Key Concepts Tags */}
          <div className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-2">
            <span className="text-xs font-bold text-[#1A1C1A]">Key Concepts in This Lesson:</span>
            <div className="flex flex-wrap gap-2">
              {currentLesson.keyConcepts.map((kc, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-white text-[#1A1C1A] border border-[#E1E4E1] font-semibold shadow-2xs">
                  • {kc}
                </span>
              ))}
            </div>
          </div>

          {/* Lesson Body Content */}
          <div className="text-xs text-[#1A1C1A] leading-relaxed space-y-4 whitespace-pre-line font-sans">
            {currentLesson.content}

            <div className="p-4 rounded-xl bg-[#F0F2F0] border border-[#E1E4E1] text-[#1A1C1A] space-y-2 my-4">
              <h4 className="font-bold text-xs text-[#4F6D58] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#4F6D58]" />
                Teaching Agent Pro Tip:
              </h4>
              <p className="text-[11px] text-[#5C615C] leading-normal">
                Stuck on In-Order vs Pre-Order? Remember that "In-Order" puts the Root node **IN** between the Left and Right children!
              </p>
            </div>
          </div>

          {/* Bottom Complete Lesson Button */}
          <div className="border-t border-[#E1E4E1] pt-6 flex items-center justify-between">
            <span className="text-xs text-[#5C615C]">Ready to test your knowledge?</span>
            <button
              onClick={() => onNavigateToExercise(currentLesson.keyConcepts[0])}
              className="px-5 py-2.5 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Take Lesson Practice</span>
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

        </div>

        {/* Teaching Agent Side Drawer */}
        {isDrawerOpen && (
          <div className="lg:col-span-5 bg-[#1A1C1A] text-white border border-[#2D3E32] rounded-2xl p-5 shadow-lg flex flex-col justify-between h-[650px]">
            
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#2D3E32] pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#4F6D58]" />
                  <div>
                    <h3 className="text-xs font-bold text-white">Teaching Agent</h3>
                    <p className="text-[10px] text-white/70">Context: {currentLesson.title}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#4F6D58] text-white font-bold border border-white/20">
                  Grounded
                </span>
              </div>

              {/* Chat Stream */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {tutorMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl ${
                      m.sender === 'user'
                        ? 'bg-[#4F6D58] text-white ml-6 font-medium'
                        : 'bg-[#2D3E32] text-white border border-[#3E5746] mr-2 whitespace-pre-line'
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                    {m.citation && m.sender === 'ai' && (
                      <span className="block mt-2 text-[10px] text-white/80 font-mono border-t border-[#3E5746] pt-1">
                        Ref: {m.citation}
                      </span>
                    )}
                  </div>
                ))}
                {isAsking && (
                  <div className="p-3 bg-[#2D3E32] text-white/80 text-xs rounded-xl border border-[#3E5746] flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-white animate-spin" />
                    <span>Analyzing lesson context...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskTutor();
              }}
              className="pt-3 border-t border-[#2D3E32] flex items-center gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about this lesson..."
                className="flex-1 bg-[#2D3E32] border border-[#3E5746] rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-[#4F6D58]"
              />
              <button
                type="submit"
                disabled={!query.trim() || isAsking}
                className="px-3.5 py-2 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </form>

          </div>
        )}

      </div>

    </div>
  );
};
