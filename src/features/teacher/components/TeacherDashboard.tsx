import React, { useState } from 'react';
import { Course, KnowledgeItem } from '../../../types';
import { 
  GraduationCap, 
  FolderGit2, 
  ListChecks, 
  Users, 
  AlertCircle, 
  Plus, 
  Check, 
  X 
} from 'lucide-react';

export interface TeacherDashboardProps {
  courses: Course[];
  onUpdateCourse: (c: Course) => void;
  defaultTab?: 'analytics' | 'knowledge' | 'exercise_queue';
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  courses, 
  onUpdateCourse,
  defaultTab = 'analytics'
}) => {
  const [selectedCourse, setSelectedCourse] = useState<Course>(courses[0]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'knowledge' | 'exercise_queue'>(defaultTab);

  // Knowledge base upload form state
  const [kbTitle, setKbTitle] = useState('');
  const [kbType, setKbType] = useState<'textbook' | 'slides' | 'notes' | 'question_bank'>('slides');
  const [kbSummary, setKbSummary] = useState('');
  const [isAddingKb, setIsAddingKb] = useState(false);

  // Exercise Queue state
  const [exerciseQueue, setExerciseQueue] = useState([
    {
      id: 'eq-1',
      topic: 'AVL Rotations & Balance Factor',
      question: 'Calculate the balance factor for root node 20 after inserting node 15 into a left-skewed AVL tree.',
      difficulty: 'medium',
      status: 'pending_review'
    },
    {
      id: 'eq-2',
      topic: 'BFS Queue Frontier',
      question: 'Why does BFS guarantee shortest paths in unweighted graphs? Explain using queue FIFO invariant.',
      difficulty: 'medium',
      status: 'pending_review'
    }
  ]);

  const handleAddKnowledgeItem = () => {
    if (!kbTitle.trim()) return;
    const newItem: KnowledgeItem = {
      id: `kb-new-${Date.now()}`,
      title: kbTitle,
      type: kbType,
      pagesOrSize: '35 slides / pages',
      sourceName: 'Uploaded by Instructor',
      uploadedAt: new Date().toISOString().split('T')[0],
      summary: kbSummary || 'Official course reference document uploaded for RAG grounding.'
    };

    const updatedCourse = {
      ...selectedCourse,
      knowledgeBase: [newItem, ...selectedCourse.knowledgeBase]
    };

    onUpdateCourse(updatedCourse);
    setSelectedCourse(updatedCourse);
    setKbTitle('');
    setKbSummary('');
    setIsAddingKb(false);
  };

  const handleApproveExercise = (id: string) => {
    setExerciseQueue(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E1E4E1] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#4F6D58]" />
            <h1 className="text-xl font-bold text-[#1A1C1A]">Instructor Management Portal</h1>
          </div>
          <p className="text-xs text-[#5C615C] mt-1">
            Manage course knowledge bases, review AI-generated exercises, and monitor class-wide weak spots
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCourse.id}
            onChange={(e) => {
              const found = courses.find(c => c.id === e.target.value);
              if (found) setSelectedCourse(found);
            }}
            className="text-xs bg-white border border-[#E1E4E1] rounded-xl p-2 font-bold text-[#1A1C1A] cursor-pointer"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code}: {c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* THREE STATS METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs space-y-1">
          <span className="text-xs font-bold text-[#5C615C]">Enrolled Students</span>
          <p className="text-2xl font-bold text-[#1A1C1A]">{selectedCourse.enrolledStudentsCount}</p>
          <span className="text-[10px] text-[#4F6D58] font-bold">92% Active Learning Rate</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs space-y-1">
          <span className="text-xs font-bold text-[#5C615C]">RAG Knowledge Base Items</span>
          <p className="text-2xl font-bold text-[#4F6D58]">{selectedCourse.knowledgeBase.length}</p>
          <span className="text-[10px] text-[#5C615C]">Official Textbooks & Slides</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs space-y-1">
          <span className="text-xs font-bold text-[#5C615C]">Pending AI Exercise Approvals</span>
          <p className="text-2xl font-bold text-[#1A1C1A]">{exerciseQueue.length}</p>
          <span className="text-[10px] text-[#5C615C] font-bold">Requires Teacher Sign-off</span>
        </div>
      </div>

      {/* NAV TABS */}
      <div className="flex items-center gap-2 border-b border-[#E1E4E1] pb-1">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'analytics' ? 'bg-[#1A1C1A] text-white' : 'text-[#5C615C] hover:bg-[#F0F2F0]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Class Learning Analytics & Risk Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'knowledge' ? 'bg-[#1A1C1A] text-white' : 'text-[#5C615C] hover:bg-[#F0F2F0]'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>Course Knowledge Base Manager ({selectedCourse.knowledgeBase.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('exercise_queue')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'exercise_queue' ? 'bg-[#1A1C1A] text-white' : 'text-[#5C615C] hover:bg-[#F0F2F0]'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>AI Exercise Review Queue ({exerciseQueue.length})</span>
        </button>
      </div>

      {/* 1. CLASS LEARNING ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Class Weak Spot Alert */}
          <div className="p-5 rounded-2xl bg-[#E8EAE8] border border-[#D1D4D1] space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#4F6D58]" />
              <h3 className="text-sm font-bold text-[#1A1C1A]">
                Class-Wide Struggling Topics Alert
              </h3>
            </div>
            <p className="text-xs text-[#1A1C1A] leading-relaxed">
              <strong>42% of students</strong> in {selectedCourse.code} are currently flagging difficulty with <strong>Depth-First Search (DFS) Call Stack Recursion</strong> and <strong>AVL Rotations</strong>.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setActiveTab('exercise_queue')}
                className="px-3.5 py-1.5 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Approve Target Practice Questions
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#1A1C1A]">
              Topic Understanding Breakdown across {selectedCourse.enrolledStudentsCount} Students
            </h3>

            <div className="space-y-3">
              {[
                { topic: 'Binary Search Trees', percent: 88, status: 'Strong' },
                { topic: 'Big-O Analysis', percent: 85, status: 'Strong' },
                { topic: 'In-order Traversal', percent: 82, status: 'Strong' },
                { topic: 'Breadth-First Search (BFS)', percent: 62, status: 'Developing' },
                { topic: 'Depth-First Search (DFS)', percent: 54, status: 'Needs Class Review' },
                { topic: 'AVL Tree Rotations', percent: 42, status: 'Needs Class Review' }
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#1A1C1A]">{item.topic}</span>
                    <span className={item.percent >= 80 ? 'text-[#4F6D58]' : item.percent >= 60 ? 'text-[#3E5746]' : 'text-[#1A1C1A]'}>
                      {item.percent}% Class Mastery
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E1E4E1] overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${item.percent >= 80 ? 'bg-[#4F6D58]' : item.percent >= 60 ? 'bg-[#3E5746]' : 'bg-[#1A1C1A]'}`}
                      style={{ width: `${item.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 2. KNOWLEDGE BASE MANAGER */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1A1C1A]">
                  Course RAG Knowledge Sources
                </h3>
                <p className="text-xs text-[#5C615C]">
                  Upload official materials to ground Teaching, Exercise, and Evaluation Agents.
                </p>
              </div>

              <button
                onClick={() => setIsAddingKb(!isAddingKb)}
                className="px-3.5 py-2 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Add Knowledge Source</span>
              </button>
            </div>

            {/* Add Form */}
            {isAddingKb && (
              <div className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-3 text-xs">
                <h4 className="font-bold text-[#1A1C1A]">Upload / Link Official Material</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Document Title (e.g. Week 5 Graph Theory Slides.pdf)"
                    value={kbTitle}
                    onChange={(e) => setKbTitle(e.target.value)}
                    className="p-2.5 bg-white border border-[#E1E4E1] rounded-xl text-xs font-medium text-[#1A1C1A]"
                  />
                  <select
                    value={kbType}
                    onChange={(e: any) => setKbType(e.target.value)}
                    className="p-2.5 bg-white border border-[#E1E4E1] rounded-xl text-xs font-medium text-[#1A1C1A] cursor-pointer"
                  >
                    <option value="slides">Lecture Slides</option>
                    <option value="textbook">Textbook Chapter</option>
                    <option value="notes">Reference Sheet</option>
                    <option value="question_bank">Question Bank</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  placeholder="Summary or key topic description..."
                  value={kbSummary}
                  onChange={(e) => setKbSummary(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#E1E4E1] rounded-xl text-xs font-medium text-[#1A1C1A]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingKb(false)}
                    className="px-3 py-1.5 border border-[#E1E4E1] rounded-xl text-[#1A1C1A] font-bold hover:bg-[#F0F2F0] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddKnowledgeItem}
                    className="px-4 py-1.5 bg-[#4F6D58] hover:bg-[#3E5746] text-white rounded-xl font-bold cursor-pointer"
                  >
                    Confirm & Index Source
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCourse.knowledgeBase.map((kb) => (
                <div key={kb.id} className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#E8EAE8] text-[#4F6D58] border border-[#D1D4D1]">
                      {kb.type}
                    </span>
                    <span className="text-[10px] text-[#5C615C]">{kb.uploadedAt}</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#1A1C1A]">{kb.title}</h4>
                  <p className="text-[11px] text-[#5C615C]">{kb.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. AI EXERCISE APPROVALS QUEUE */}
      {activeTab === 'exercise_queue' && (
        <div className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#1A1C1A]">
              AI-Generated Exercise Review Queue
            </h3>
            <p className="text-xs text-[#5C615C]">
              The teacher remains in control. Review and approve questions before they are assigned to students.
            </p>
          </div>

          <div className="space-y-3">
            {exerciseQueue.length === 0 ? (
              <p className="text-xs text-[#5C615C] italic p-4 text-center">
                All AI exercises approved and published to students!
              </p>
            ) : (
              exerciseQueue.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#4F6D58] bg-[#E8EAE8] px-2 py-0.5 rounded border border-[#D1D4D1]">
                      Topic: {item.topic}
                    </span>
                    <p className="text-xs font-semibold text-[#1A1C1A] mt-1">{item.question}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApproveExercise(item.id)}
                      className="px-3.5 py-1.5 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Assign</span>
                    </button>
                    <button
                      onClick={() => handleApproveExercise(item.id)}
                      className="px-2.5 py-1.5 border border-[#E1E4E1] text-[#5C615C] hover:bg-[#F0F2F0] text-xs rounded-xl cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
