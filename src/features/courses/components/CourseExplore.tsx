import React from 'react';
import { Course } from '../../../types';
import { BookOpen, Compass, ArrowRight } from 'lucide-react';

export interface CourseExploreProps {
  courses: Course[];
  onSelectCourse: (c: Course) => void;
  onNavigateToDetail: () => void;
}

export const CourseExplore: React.FC<CourseExploreProps> = ({
  courses,
  onSelectCourse,
  onNavigateToDetail
}) => {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E1E4E1] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#4F6D58]" />
            <h1 className="text-xl font-bold text-[#1A1C1A]">Explore & Enrolled Courses</h1>
          </div>
          <p className="text-xs text-[#5C615C] mt-1">
            Browse course knowledge bases powered by Etutor Multi-Agent AI
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white border border-[#E1E4E1] rounded-2xl overflow-hidden shadow-2xs hover:border-[#4F6D58] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="h-36 relative overflow-hidden bg-[#1A1C1A]">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1C1A]/90 via-[#1A1C1A]/30 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#4F6D58] shadow-2xs">
                    {course.code}
                  </span>
                  <span className="text-[11px] text-white/90 font-medium">
                    {course.enrolledStudentsCount} Enrolled
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-[#1A1C1A] line-clamp-1">{course.title}</h3>
                <p className="text-xs text-[#5C615C]">{course.instructor} • {course.department}</p>
                <p className="text-xs text-[#5C615C] line-clamp-2 leading-relaxed">{course.description}</p>

                <div className="pt-2 border-t border-[#E1E4E1] flex items-center justify-between text-[11px] text-[#5C615C]">
                  <span className="flex items-center gap-1 font-semibold text-[#1A1C1A]">
                    <BookOpen className="w-3.5 h-3.5 text-[#4F6D58]" />
                    {course.knowledgeBase.length} RAG Knowledge Items
                  </span>
                  <span className="text-[#4F6D58] font-bold">{course.progressPercent}% Complete</span>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0">
              <button
                onClick={() => {
                  onSelectCourse(course);
                  onNavigateToDetail();
                }}
                className="w-full py-2.5 bg-[#4F6D58] hover:bg-[#3E5746] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Enter Course Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
