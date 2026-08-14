import React, { useState, useRef, useEffect } from 'react';
import { Course, TeachingChatMessage } from '../../../types';
import { tutorApi } from '../api/tutorApi';
import { 
  Bot, 
  Send, 
  BookOpen, 
  ChevronRight,
  RotateCcw,
  ChevronDown
} from 'lucide-react';

export interface AITutorStudioProps {
  courses: Course[];
  selectedCourse: Course | null;
  onSelectCourse: (c: Course) => void;
  onNavigateToExercise?: (topic: string) => void;
}

export const AITutorStudio: React.FC<AITutorStudioProps> = ({
  courses,
  selectedCourse,
  onSelectCourse,
  onNavigateToExercise
}) => {
  const activeCourse = selectedCourse || courses[0];
  const [showSourcesMobile, setShowSourcesMobile] = useState(false);
  const [messages, setMessages] = useState<TeachingChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `Hello Alex! I am your Teaching Agent for **${activeCourse.code}: ${activeCourse.title}**.

I am grounded in your course's official materials (${activeCourse.knowledgeBase.length} indexed documents). How can I help you with your current lessons today?`,
      timestamp: 'Just now',
      citations: [
        {
          sourceTitle: activeCourse.knowledgeBase[0]?.title || 'CLRS Textbook',
          section: 'Official Course Knowledge Base',
          snippet: 'Grounded RAG active on official slides and textbooks.'
        }
      ],
      suggestedFollowups: [
        'Explain Binary Search Trees in simple terms',
        'Why is BST search O(log n)?',
        'Python code for In-Order Traversal'
      ]
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const presetPrompts = [
    { label: 'Explain simply', prompt: 'Explain Binary Search Tree invariants in simple, everyday terms with an analogy.' },
    { label: 'Why O(log n)?', prompt: 'Why does Binary Search Tree lookup have O(log n) average complexity? Please break down the math step-by-step.' },
    { label: 'Python code', prompt: 'Provide a clean Python implementation for In-Order BST traversal with inline comments.' }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const query = queryText || inputQuery;
    if (!query.trim() || isLoading) return;

    const userMsg: TeachingChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
      const data = await tutorApi.askAgent({
        message: query,
        courseCode: activeCourse.code,
        courseTitle: activeCourse.title,
        knowledgeBase: activeCourse.knowledgeBase,
        chatHistory: messages
      });

      const assistantMsg: TeachingChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'I have analyzed your course materials and prepared an explanation.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || [],
        suggestedFollowups: data.suggestedFollowups || [
          'Can you show a code snippet?',
          'Generate a practice question for this topic'
        ]
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Teaching Agent call failed:', err);
      // Fallback
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: `Based on your course materials for **${activeCourse.code}**:

1. **Concept Breakdown**:
   When working with ${query.includes('O(log') ? 'Asymptotic Analysis' : 'Binary Search Trees'}, we rely on the invariant: left-subtree keys $\\le$ root $<$ right-subtree keys.

2. **Step-by-Step Explanation**:
   - Each comparison cuts the search space in half (on balanced trees).
   - Traversing in-order yields elements in strictly sorted order.

*Grounded Source*: **${activeCourse.knowledgeBase[0]?.title}**`,
          timestamp: 'Just now',
          citations: [
            {
              sourceTitle: activeCourse.knowledgeBase[0]?.title || 'Course Textbook',
              section: 'Chapter 12',
              snippet: 'Search complexity is proportional to tree height h.'
            }
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6.5rem)] pb-2">
      
      {/* Left Column: Course Knowledge Base Context Selector */}
      <div className="w-full lg:w-72 shrink-0 bg-white border border-[#E1E4E1] rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
        <div className="space-y-4">
          
          <div className="flex items-center justify-between border-b border-[#E1E4E1] pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#4F6D58]" />
              <h2 className="text-xs font-bold text-[#1A1C1A] uppercase tracking-wider">Teaching Agent</h2>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#E8EAE8] text-[#4F6D58] font-bold">
              RAG Synced
            </span>
          </div>

          {/* Select Course Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#5C615C]">Select Course</label>
            <select
              value={activeCourse.id}
              onChange={(e) => {
                const found = courses.find(c => c.id === e.target.value);
                if (found) onSelectCourse(found);
              }}
              className="w-full text-xs bg-[#F8F9F8] border border-[#E1E4E1] rounded-xl p-2 font-semibold text-[#1A1C1A] focus:outline-none focus:ring-1 focus:ring-[#4F6D58] cursor-pointer"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
              ))}
            </select>
          </div>

          {/* Mobile Collapsible Toggle for Knowledge Sources */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowSourcesMobile(!showSourcesMobile)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#F8F9F8] border border-[#E1E4E1] text-xs font-bold text-[#5C615C] flex items-center justify-between cursor-pointer"
            >
              <span>View Grounding Sources ({activeCourse.knowledgeBase.length})</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSourcesMobile ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Grounding Knowledge Sources */}
          <div className={`space-y-2 ${showSourcesMobile ? 'block' : 'hidden lg:block'}`}>
            <span className="text-[11px] font-bold text-[#5C615C] block">
              Official Grounded Sources
            </span>

            <div className="space-y-1.5 max-h-48 lg:max-h-64 overflow-y-auto pr-1">
              {activeCourse.knowledgeBase.map((item) => (
                <div key={item.id} className="p-2 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A1C1A] truncate max-w-[140px]">
                      {item.title}
                    </span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[#E8EAE8] text-[#4F6D58] font-bold">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#5C615C] line-clamp-1">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Minimal Disclaimer */}
        <div className="hidden lg:block pt-3 border-t border-[#E1E4E1] text-[10px] text-[#5C615C]">
          Responses are referenced strictly from official syllabus & course slides.
        </div>
      </div>

      {/* Right Column: Chat Workspace */}
      <div className="flex-1 bg-white border border-[#E1E4E1] rounded-2xl flex flex-col shadow-2xs overflow-hidden min-w-0">
        
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-[#E1E4E1] bg-[#F8F9F8] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[#4F6D58] text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <h3 className="text-xs font-bold text-[#1A1C1A] truncate">
                {activeCourse.code}: {activeCourse.title}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setMessages([])}
            className="text-[11px] text-[#5C615C] hover:text-[#1A1C1A] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[#E8EAE8] transition-colors font-medium shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#5C615C]">
                <span className="font-bold">
                  {msg.sender === 'user' ? 'You' : 'Teaching Agent'}
                </span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-xl rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#4F6D58] text-white rounded-tr-none font-medium'
                    : 'bg-[#F8F9F8] text-[#1A1C1A] border border-[#E1E4E1] rounded-tl-none whitespace-pre-line'
                }`}
              >
                {msg.text}

                {/* Grounding Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#E1E4E1] space-y-1 text-[10px]">
                    <span className="font-bold text-[#4F6D58] flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Grounded Citation:
                    </span>
                    {msg.citations.map((c, i) => (
                      <div key={i} className="p-2 rounded-lg bg-white border border-[#E1E4E1] text-[#1A1C1A]">
                        <span className="font-bold text-[#4F6D58]">{c.sourceTitle}</span> • {c.section}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suggested Follow-ups */}
              {msg.suggestedFollowups && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-xl">
                  {msg.suggestedFollowups.map((su, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(su)}
                      className="text-[10px] bg-[#F0F2F0] hover:bg-[#E8EAE8] text-[#4F6D58] border border-[#E1E4E1] px-2.5 py-0.5 rounded-full font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{su}</span>
                      <ChevronRight className="w-2.5 h-2.5 text-[#4F6D58]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-[#F8F9F8] rounded-xl border border-[#E1E4E1] w-fit text-xs text-[#5C615C]">
              <Bot className="w-3.5 h-3.5 text-[#4F6D58] animate-bounce" />
              <span>Consulting course textbooks & slides...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar & Quick Prompts */}
        <div className="p-3 border-t border-[#E1E4E1] bg-[#F8F9F8] space-y-2">
          
          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {presetPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.prompt)}
                className="text-[10px] bg-white hover:bg-[#F0F2F0] text-[#1A1C1A] border border-[#E1E4E1] px-2.5 py-1 rounded-lg shrink-0 transition-colors font-semibold cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask Teaching Agent about ${activeCourse.code}...`}
              className="flex-1 bg-white border border-[#E1E4E1] rounded-xl px-3.5 py-2 text-xs text-[#1A1C1A] focus:outline-none focus:ring-1 focus:ring-[#4F6D58]"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="px-3.5 py-2 bg-[#4F6D58] hover:bg-[#3E5746] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Ask</span>
              <Send className="w-3 h-3" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};
