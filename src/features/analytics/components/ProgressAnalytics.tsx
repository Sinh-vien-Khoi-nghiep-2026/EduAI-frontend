import React from 'react';
import { TopicMastery, Course, ActivityLog } from '../../../types';
import { 
  TrendingUp, 
  AlertCircle, 
  BrainCircuit
} from 'lucide-react';

export interface ProgressAnalyticsProps {
  topicMastery: TopicMastery[];
  courses: Course[];
  activities: ActivityLog[];
  onNavigateToExercise: (topic: string) => void;
}

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({
  topicMastery,
  onNavigateToExercise
}) => {
  const masteredTopics = topicMastery.filter(t => t.masteryPercent >= 80);
  const reviewNeededTopics = topicMastery.filter(t => t.masteryPercent < 60);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E1E4E1] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#4F6D58]" />
            <h1 className="text-xl font-bold text-[#1A1C1A]">Academic Progress & Topic Mastery</h1>
          </div>
          <p className="text-xs text-[#5C615C] mt-1">
            Understanding student development through concept mastery, not just aggregate test averages
          </p>
        </div>
      </div>

      {/* TOP SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs space-y-1">
          <span className="text-xs font-bold text-[#5C615C]">Overall Mastery Index</span>
          <p className="text-2xl font-bold text-[#4F6D58]">72%</p>
          <span className="text-[10px] text-[#4F6D58] font-bold">↑ +8% over last 2 weeks</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs space-y-1">
          <span className="text-xs font-bold text-[#5C615C]">Mastered Concepts</span>
          <p className="text-2xl font-bold text-[#4F6D58]">{masteredTopics.length} Topics</p>
          <span className="text-[10px] text-[#5C615C]">Score &ge; 80%</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs space-y-1">
          <span className="text-xs font-bold text-[#5C615C]">Topics Needing Review</span>
          <p className="text-2xl font-bold text-[#1A1C1A]">{reviewNeededTopics.length} Topics</p>
          <span className="text-[10px] text-[#5C615C] font-bold">Flagged by Evaluation Agent</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs space-y-1">
          <span className="text-xs font-bold text-[#5C615C]">Completed Practice Problems</span>
          <p className="text-2xl font-bold text-[#1A1C1A]">67 Questions</p>
          <span className="text-[10px] text-[#5C615C]">Across CS201 & CS305</span>
        </div>

      </div>

      {/* WEAK TOPICS REVIEW RECOMMENDATIONS BOX */}
      {reviewNeededTopics.length > 0 && (
        <div className="p-5 rounded-2xl bg-[#E8EAE8] border border-[#D1D4D1] space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#4F6D58]" />
            <h3 className="text-sm font-bold text-[#1A1C1A]">
              AI Action Recommendations: Targeted Review Needed
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {reviewNeededTopics.map((topic, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-white border border-[#E1E4E1] shadow-2xs flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1A1C1A]">{topic.topic}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#E8EAE8] text-[#4F6D58] font-bold border border-[#D1D4D1]">
                      {topic.masteryPercent}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5C615C] mt-1">
                    Last practiced: {topic.lastPracticed} • {topic.attemptsCount} attempts
                  </p>
                </div>

                <button
                  onClick={() => onNavigateToExercise(topic.topic)}
                  className="w-full py-2 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-white" />
                  <span>Generate Practice Set</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL TOPICS MASTERY BREAKDOWN */}
      <div className="bg-white border border-[#E1E4E1] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E1E4E1] pb-3">
          <h3 className="text-sm font-bold text-[#1A1C1A]">
            Comprehensive Topic Mastery Matrix
          </h3>
          <span className="text-xs text-[#5C615C]">CS201 Data Structures & Algorithms</span>
        </div>

        <div className="space-y-4">
          {topicMastery.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#F8F9F8] border border-[#E1E4E1] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    item.masteryPercent >= 80 ? 'bg-[#4F6D58]' :
                    item.masteryPercent >= 60 ? 'bg-[#3E5746]' : 'bg-[#1A1C1A]'
                  }`}></span>
                  <span className="text-xs font-bold text-[#1A1C1A]">{item.topic}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#5C615C]">{item.attemptsCount} practice attempts</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                    item.masteryPercent >= 80 ? 'bg-[#E8EAE8] text-[#4F6D58] border-[#D1D4D1]' :
                    item.masteryPercent >= 60 ? 'bg-[#F0F2F0] text-[#1A1C1A] border-[#E1E4E1]' :
                    'bg-[#E8EAE8] text-[#3E5746] border-[#D1D4D1]'
                  }`}>
                    {item.masteryPercent}% Mastery
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-[#E1E4E1] overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.masteryPercent >= 80 ? 'bg-[#4F6D58]' :
                    item.masteryPercent >= 60 ? 'bg-[#3E5746]' : 'bg-[#1A1C1A]'
                  }`}
                  style={{ width: `${item.masteryPercent}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
