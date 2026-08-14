import React, { useState } from 'react';
import { Course } from '../../../types';
import { 
  Layers, 
  Bot, 
  BrainCircuit, 
  FileCheck2, 
  Sparkles,
  ShieldCheck,
  Zap,
  BookOpen,
  Send,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';

export interface LtiWidgetPreviewProps {
  course: Course;
}

export const LtiWidgetPreview: React.FC<LtiWidgetPreviewProps> = ({ course }) => {
  const [lmsBrand, setLmsBrand] = useState<'canvas' | 'blackboard' | 'moodle'>('canvas');
  const [activeWidgetTab, setActiveWidgetTab] = useState<'tutor' | 'practice' | 'evaluation'>('tutor');

  // Interactive mini simulation state inside LTI preview
  const [simQuery, setSimQuery] = useState('');
  const [simAnswers, setSimAnswers] = useState<string[]>([]);
  const [simSelectedOption, setSimSelectedOption] = useState<number | null>(null);
  const [simGraded, setSimGraded] = useState(false);

  const lmsInfo = {
    canvas: {
      name: 'Canvas LMS',
      themeColor: '#E63946',
      badgeBg: 'bg-[#E8EAE8] text-[#1A1C1A]',
      placement: 'Course Navigation & Assignment SpeedGrader'
    },
    blackboard: {
      name: 'Blackboard Learn',
      themeColor: '#2D3E32',
      badgeBg: 'bg-[#E8EAE8] text-[#1A1C1A]',
      placement: 'Ultra Course View & Content Market'
    },
    moodle: {
      name: 'Moodle LMS',
      themeColor: '#F77F00',
      badgeBg: 'bg-[#E8EAE8] text-[#1A1C1A]',
      placement: 'External Tool Activity & Course Drawer'
    }
  };

  const handleSendSimQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simQuery.trim()) return;
    const q = simQuery;
    setSimQuery('');
    setSimAnswers(prev => [
      ...prev,
      `User: "${q}"`,
      `Teaching Agent (LTI Grounded): "Based strictly on ${course.code} lecture slides and official textbook: ${
        q.toLowerCase().includes('inorder') || q.toLowerCase().includes('in-order')
          ? 'In-order traversal visits Left Subtree → Root → Right Subtree in O(N) time, yielding sorted order in a BST.'
          : 'This concept is mapped directly from your instructor\'s Week 4 Syllabus notes with citation to Chapter 4.'
      }"`
    ]);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. TOP EXPLANATION BANNER */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#1A1C1A] text-white flex flex-col md:flex-row md:items-center justify-between gap-5 border border-[#2D3E32] shadow-xs">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#4F6D58] text-white shadow-2xs">
              <Layers className="w-3.5 h-3.5" />
              LTI 1.3 / Advantage Protocol
            </span>
            <span className="text-xs text-white/70 font-mono">
              IMS Global Standard Compliant
            </span>
          </div>

          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Etutor as an Intelligent LMS Middleware
          </h1>

          <p className="text-xs text-white/80 leading-relaxed">
            Institutions do not need to replace their existing Learning Management System (LMS). Etutor embeds directly into <strong>Canvas</strong>, <strong>Blackboard</strong>, or <strong>Moodle</strong> as an intelligent layer via 1EdTech LTI 1.3 Advantage standard.
          </p>
        </div>

        {/* LMS Brand Selector */}
        <div className="space-y-1.5 shrink-0">
          <span className="text-[11px] font-bold text-white/70 block uppercase tracking-wider">
            Simulate LMS Platform:
          </span>
          <div className="grid grid-cols-3 sm:flex sm:items-center bg-[#2D3E32] p-1 rounded-xl border border-white/20 gap-1 w-full sm:w-auto">
            <button
              onClick={() => setLmsBrand('canvas')}
              className={`text-xs px-3 py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                lmsBrand === 'canvas' ? 'bg-[#4F6D58] text-white shadow-xs' : 'text-white/70 hover:text-white'
              }`}
            >
              Canvas
            </button>
            <button
              onClick={() => setLmsBrand('blackboard')}
              className={`text-xs px-3 py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                lmsBrand === 'blackboard' ? 'bg-[#4F6D58] text-white shadow-xs' : 'text-white/70 hover:text-white'
              }`}
            >
              Blackboard
            </button>
            <button
              onClick={() => setLmsBrand('moodle')}
              className={`text-xs px-3 py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                lmsBrand === 'moodle' ? 'bg-[#4F6D58] text-white shadow-xs' : 'text-white/70 hover:text-white'
              }`}
            >
              Moodle
            </button>
          </div>
        </div>
      </div>

      {/* 2. SIMULATED LMS FRAME CONTAINER */}
      <div className="bg-[#F8F9F8] border border-[#E1E4E1] rounded-2xl overflow-hidden shadow-md">
        
        {/* Simulated Browser/LMS Top Title Bar */}
        <div className="px-4 py-3 bg-[#1A1C1A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-b-2 border-[#4F6D58]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold tracking-tight text-xs sm:text-sm text-white">
              {lmsInfo[lmsBrand].name}
            </span>
            <span className="text-white/40 hidden sm:inline">/</span>
            <span className="text-white/90 text-[11px] sm:text-xs">
              {course.code}: {course.title}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-white/80 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#4F6D58] animate-pulse"></span>
            <span>LTI 1.3 JWT Handshake Verified</span>
          </div>
        </div>

        {/* Simulated LMS Main Area: Sidebar + Etutor Embedded Widget */}
        <div className="flex flex-col md:flex-row min-h-[580px]">
          
          {/* Traditional LMS Sidebar (Collapsible / Responsive) */}
          <div className="w-full md:w-64 bg-[#E8EAE8] border-b md:border-b-0 md:border-r border-[#E1E4E1] p-4 sm:p-5 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#5C615C] uppercase text-[10px] tracking-wider block">
                Course Navigation
              </span>
              <span className="text-[10px] text-[#5C615C] font-mono">
                {lmsBrand.toUpperCase()}
              </span>
            </div>

            <div className="space-y-1 font-semibold text-xs text-[#1A1C1A]">
              <div className="p-2 rounded-lg hover:bg-[#F0F2F0] text-[#5C615C] cursor-pointer">Home</div>
              <div className="p-2 rounded-lg hover:bg-[#F0F2F0] text-[#5C615C] cursor-pointer">Syllabus</div>
              <div className="p-2 rounded-lg hover:bg-[#F0F2F0] text-[#5C615C] cursor-pointer">Modules & Readings</div>
              <div className="p-2 rounded-lg hover:bg-[#F0F2F0] text-[#5C615C] cursor-pointer">Assignments & Quizzes</div>
              <div className="p-2 rounded-lg hover:bg-[#F0F2F0] text-[#5C615C] cursor-pointer">Gradebook</div>
              
              {/* Highlighted Etutor LTI App */}
              <div className="p-2.5 rounded-xl bg-[#4F6D58] text-white font-bold flex items-center justify-between shadow-2xs">
                <span className="flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  Etutor AI [LTI]
                </span>
                <span className="text-[9px] bg-[#3E5746] px-1.5 py-0.5 rounded font-mono font-bold">
                  EMBEDDED
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E1E4E1] text-[11px] text-[#5C615C] space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[#1A1C1A] font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4F6D58]" />
                <span>Zero Context Switching</span>
              </div>
              <p className="text-[10px] text-[#5C615C] leading-normal">
                Students access Etutor agents directly inside their daily LMS without creating new passwords or leaving class tabs.
              </p>
            </div>
          </div>

          {/* Embedded Etutor LTI Widget Screen */}
          <div className="flex-1 bg-white p-4 sm:p-6 space-y-5 flex flex-col justify-between">
            
            {/* Widget Top Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E1E4E1] pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8EAE8] text-[#4F6D58] border border-[#D1D4D1] uppercase">
                    Etutor Embedded Widget
                  </span>
                  <span className="text-[11px] text-[#5C615C] font-semibold">
                    {course.code}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#1A1C1A]">
                  Course-Centric AI Copilot
                </h3>
              </div>

              {/* Widget Switcher Tabs (Responsive flex wrap with equal buttons) */}
              <div className="flex flex-wrap sm:flex-nowrap items-center bg-[#F8F9F8] p-1 rounded-xl border border-[#E1E4E1] gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setActiveWidgetTab('tutor')}
                  className={`flex-1 sm:flex-initial text-xs px-3 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeWidgetTab === 'tutor' 
                      ? 'bg-[#4F6D58] text-white shadow-2xs' 
                      : 'text-[#5C615C] hover:text-[#1A1C1A]'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Teaching Agent</span>
                </button>
                <button
                  onClick={() => setActiveWidgetTab('practice')}
                  className={`flex-1 sm:flex-initial text-xs px-3 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeWidgetTab === 'practice' 
                      ? 'bg-[#4F6D58] text-white shadow-2xs' 
                      : 'text-[#5C615C] hover:text-[#1A1C1A]'
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>In-LMS Practice</span>
                </button>
                <button
                  onClick={() => setActiveWidgetTab('evaluation')}
                  className={`flex-1 sm:flex-initial text-xs px-3 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activeWidgetTab === 'evaluation' 
                      ? 'bg-[#4F6D58] text-white shadow-2xs' 
                      : 'text-[#5C615C] hover:text-[#1A1C1A]'
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>SpeedGrader Sync</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: TEACHING AGENT IN WIDGET */}
            {activeWidgetTab === 'tutor' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1E4E1] pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#4F6D58]" />
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1C1A]">
                        Live Teaching Agent inside {lmsInfo[lmsBrand].name}
                      </h4>
                      <p className="text-[10px] text-[#5C615C]">
                        Grounded strictly on {course.knowledgeBase.length} uploaded files (Textbooks & Slides)
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#E8EAE8] text-[#4F6D58] font-bold border border-[#D1D4D1] self-start sm:self-auto">
                    OAuth Authenticated
                  </span>
                </div>

                {/* Chat transcript */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  <div className="p-3.5 rounded-xl bg-white border border-[#E1E4E1] text-xs text-[#1A1C1A] space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-[#4F6D58] uppercase">
                      Teaching Agent • {course.code}
                    </span>
                    <p className="text-[#1A1C1A] leading-relaxed">
                      "Hello! I am your course AI Tutor embedded directly inside {lmsInfo[lmsBrand].name}. I have read your Week 4 lecture on Tree Traversals. What questions do you have before your assignment submission?"
                    </p>
                    <div className="pt-1 text-[10px] text-[#5C615C] font-mono border-t border-[#E1E4E1]">
                      Source Grounding: Cormen CLRS Algorithm Chapter 12 & Week 4 Lecture.pdf
                    </div>
                  </div>

                  {simAnswers.map((msg, i) => (
                    <div key={i} className={`p-3 rounded-xl text-xs ${
                      msg.startsWith('User:')
                        ? 'bg-[#4F6D58] text-white ml-6 font-medium'
                        : 'bg-white text-[#1A1C1A] border border-[#E1E4E1] mr-4 shadow-2xs'
                    }`}>
                      {msg}
                    </div>
                  ))}
                </div>

                {/* Prompt Test Bar */}
                <form onSubmit={handleSendSimQuery} className="flex flex-col sm:flex-row gap-2 pt-2">
                  <input
                    type="text"
                    value={simQuery}
                    onChange={(e) => setSimQuery(e.target.value)}
                    placeholder="Try typing: 'Explain In-Order traversal'..."
                    className="flex-1 bg-white border border-[#E1E4E1] rounded-xl px-3.5 py-2 text-xs text-[#1A1C1A] placeholder:text-[#5C615C]/60 focus:outline-none focus:ring-1 focus:ring-[#4F6D58]"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>Send Query</span>
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT 2: IN-LMS ADAPTIVE PRACTICE */}
            {activeWidgetTab === 'practice' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1E4E1] pb-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-[#4F6D58]" />
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1C1A]">
                        Integrated Exercise Generator
                      </h4>
                      <p className="text-[10px] text-[#5C615C]">
                        Dynamically creates questions mapped to student weak spots detected from quiz logs
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200 self-start sm:self-auto">
                    Practice Mode
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] space-y-3 shadow-2xs">
                  <p className="text-xs font-bold text-[#1A1C1A]">
                    Question: Which tree traversal order guarantees output in non-decreasing sorted order for a Binary Search Tree (BST)?
                  </p>

                  <div className="space-y-2">
                    {[
                      'Pre-Order Traversal (Root → Left → Right)',
                      'In-Order Traversal (Left → Root → Right)',
                      'Post-Order Traversal (Left → Right → Root)',
                      'Level-Order Traversal (BFS Queue)'
                    ].map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSimSelectedOption(idx);
                          setSimGraded(true);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          simSelectedOption === idx
                            ? (idx === 1 ? 'bg-[#E8EAE8] border-[#4F6D58] text-[#4F6D58] font-bold' : 'bg-red-50 border-red-300 text-red-700')
                            : 'bg-[#F8F9F8] hover:bg-[#F0F2F0] border-[#E1E4E1] text-[#1A1C1A]'
                        }`}
                      >
                        <span className="font-mono mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {opt}
                      </button>
                    ))}
                  </div>

                  {simGraded && (
                    <div className="p-3 rounded-xl bg-[#E8EAE8] border border-[#D1D4D1] text-xs space-y-1">
                      <span className="font-bold text-[#4F6D58] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#4F6D58]" />
                        {simSelectedOption === 1 ? 'Correct Answer!' : 'Review Concept:'}
                      </span>
                      <p className="text-[11px] text-[#5C615C]">
                        In a BST, all keys in the left subtree are smaller than the root, and right subtree keys are larger. An in-order traversal strictly yields sorted ascending order.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: EVALUATION & SPEEDGRADER SYNC */}
            {activeWidgetTab === 'evaluation' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E1E4E1] pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-[#4F6D58]" />
                    <div>
                      <h4 className="text-xs font-bold text-[#1A1C1A]">
                        LTI Assignment & Grade Service (AGS)
                      </h4>
                      <p className="text-[10px] text-[#5C615C]">
                        Posts detailed rubrics, line-by-line feedback, and scores directly into LMS Gradebook
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#E8EAE8] text-[#4F6D58] font-bold border border-[#D1D4D1] self-start sm:self-auto">
                    Gradebook Synced
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-[#E1E4E1] space-y-2 shadow-2xs">
                    <span className="text-[10px] font-bold text-[#5C615C] uppercase">
                      Student Submission Evaluated
                    </span>
                    <p className="text-xs font-bold text-[#1A1C1A]">Assignment 2: Tree Traversals</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-lg font-bold text-[#4F6D58]">88% (Grade A-)</span>
                      <span className="text-[11px] text-[#5C615C]">Passed 8/8 Tests</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#E1E4E1] space-y-2 shadow-2xs">
                    <span className="text-[10px] font-bold text-[#5C615C] uppercase">
                      LMS Gradebook Integration
                    </span>
                    <p className="text-xs font-bold text-[#1A1C1A]">Status: Synced to {lmsInfo[lmsBrand].name}</p>
                    <p className="text-[11px] text-[#5C615C]">
                      Rubric scores & line annotations forwarded automatically to instructor's SpeedGrader view.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Status bar */}
            <div className="pt-3 border-t border-[#E1E4E1] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#5C615C]">
              <span className="flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-[#4F6D58]" />
                Etutor operates as a standard iframe with secure postMessage & OAuth 2.0
              </span>
              <span className="text-[#4F6D58] font-bold">
                LTI Advantage v1.3 Verified
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* 3. INFORMATIVE EXPLANATION CARDS: "Mục này là gì?" */}
      <div className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 border-b border-[#E1E4E1] pb-3">
          <Info className="w-5 h-5 text-[#4F6D58]" />
          <h2 className="text-sm sm:text-base font-bold text-[#1A1C1A]">
            Giải Thích: Mục LTI LMS Embed Mode Là Gì & Hoạt Động Như Thế Nào?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#4F6D58]" />
              <h3 className="text-xs font-bold text-[#1A1C1A]">
                1. Không Cần Thay Thế LMS Cũ
              </h3>
            </div>
            <p className="text-xs text-[#5C615C] leading-relaxed">
              Các trường đại học đã đầu tư hàng tỷ đồng vào hệ thống <strong>Canvas, Blackboard, Moodle</strong>. Etutor không bắt nhà trường phải đổi phần mềm, mà hoạt động như một lớp <strong>Middleware thông minh</strong> nhúng trực tiếp vào môn học hiện có.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4F6D58]" />
              <h3 className="text-xs font-bold text-[#1A1C1A]">
                2. Chuẩn LTI 1.3 Advantage
              </h3>
            </div>
            <p className="text-xs text-[#5C615C] leading-relaxed">
              Sử dụng tiêu chuẩn mở quốc tế <strong>LTI 1.3 (Learning Tools Interoperability)</strong> với OAuth 2.0 / JWT. Sinh viên không cần tạo tài khoản hay đăng nhập lại; danh tính sinh viên và đề cương môn học được đồng bộ an toàn tức thì.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-2">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-[#4F6D58]" />
              <h3 className="text-xs font-bold text-[#1A1C1A]">
                3. Đồng Bộ 2 Chiều Điểm Số & Rubric
              </h3>
            </div>
            <p className="text-xs text-[#5C615C] leading-relaxed">
              Khi sinh viên nộp bài hoặc luyện tập trên Widget Etutor, <strong>Evaluation Agent</strong> tự động chấm điểm theo barem của giảng viên và ghi trực tiếp điểm số + nhận xét chi tiết vào <strong>Canvas SpeedGrader</strong> của thầy cô.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};
