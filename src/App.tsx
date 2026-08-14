import React, { useState } from 'react';
import { Role, Course, Assignment, TopicMastery, ExerciseSet, ActivityLog } from './types';
import { 
  INITIAL_COURSES, 
  INITIAL_ASSIGNMENTS, 
  INITIAL_TOPIC_MASTERY, 
  INITIAL_EXERCISE_SETS, 
  INITIAL_ACTIVITIES 
} from './data/mockCourses';

import { MainLayout } from './layouts/MainLayout';
import { DashboardView } from './features/dashboard';
import { CourseExplore, CourseDetail, LessonView } from './features/courses';
import { AITutorStudio } from './features/tutor';
import { ExerciseCenter } from './features/practice';
import { AssignmentsView } from './features/assignments';
import { ProgressAnalytics } from './features/analytics';
import { LtiWidgetPreview } from './features/lti';
import { TeacherDashboard } from './features/teacher';

export default function App() {
  const [role, setRole] = useState<Role>('student');
  const [isLtiWidgetMode, setIsLtiWidgetMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data State
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [selectedCourse, setSelectedCourse] = useState<Course>(INITIAL_COURSES[0]);
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL_ASSIGNMENTS);
  const [topicMastery] = useState<TopicMastery[]>(INITIAL_TOPIC_MASTERY);
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>(INITIAL_EXERCISE_SETS);
  const [activities, setActivities] = useState<ActivityLog[]>(INITIAL_ACTIVITIES);

  // Deep Navigation State
  const [currentLessonId, setCurrentLessonId] = useState<string>('les-202');
  const [practiceTopicFocus, setPracticeTopicFocus] = useState<string | undefined>(undefined);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (newRole === 'teacher') {
      setActiveTab('teacher-dashboard');
    } else {
      setActiveTab('dashboard');
    }
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (tab: string, extra?: any) => {
    if (extra?.lessonId) {
      setCurrentLessonId(extra.lessonId);
    }
    if (extra?.topic) {
      setPracticeTopicFocus(extra.topic);
    }
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    if (selectedCourse.id === updatedCourse.id) {
      setSelectedCourse(updatedCourse);
    }
  };

  const handleUpdateAssignment = (updatedAsg: Assignment) => {
    setAssignments(prev => prev.map(a => a.id === updatedAsg.id ? updatedAsg : a));
    
    // Log activity
    const newAct: ActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: 'Just now',
      type: 'assignment_submitted',
      title: `${updatedAsg.title} Evaluated`,
      description: `Evaluation score: ${updatedAsg.evaluation?.overallScorePercent}% (${updatedAsg.evaluation?.gradeLetter})`,
      courseCode: updatedAsg.courseTitle.split(' ')[0],
      score: updatedAsg.evaluation?.overallScorePercent
    };
    setActivities(prev => [newAct, ...prev]);
  };

  const handleAddExerciseSet = (newSet: ExerciseSet) => {
    setExerciseSets(prev => [newSet, ...prev]);
  };

  return (
    <MainLayout
      currentCourse={selectedCourse}
      role={role}
      onRoleChange={handleRoleChange}
      isLtiWidgetMode={isLtiWidgetMode}
      onToggleLtiMode={() => setIsLtiWidgetMode(!isLtiWidgetMode)}
      activeTab={activeTab}
      onNavigate={handleNavigate}
      isMobileMenuOpen={isMobileMenuOpen}
      onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
    >
      {/* LTI WIDGET OVERRIDE VIEW */}
      {isLtiWidgetMode ? (
        <LtiWidgetPreview course={selectedCourse} />
      ) : (
        <>
          {/* STUDENT VIEWS */}
          {role === 'student' && (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  courses={courses}
                  assignments={assignments}
                  topicMastery={topicMastery}
                  activities={activities}
                  onNavigate={handleNavigate}
                  onSelectCourse={setSelectedCourse}
                />
              )}

              {(activeTab === 'explore-courses' || activeTab === 'my-courses') && (
                <CourseExplore
                  courses={courses}
                  onSelectCourse={setSelectedCourse}
                  onNavigateToDetail={() => handleNavigate('course-detail')}
                />
              )}

              {activeTab === 'course-detail' && (
                <CourseDetail
                  course={selectedCourse}
                  onNavigateToLesson={(lesId) => handleNavigate('lesson-view', { lessonId: lesId })}
                  onNavigateToTutor={() => handleNavigate('ai-tutor')}
                />
              )}

              {activeTab === 'lesson-view' && (
                <LessonView
                  course={selectedCourse}
                  lessonId={currentLessonId}
                  onBack={() => handleNavigate('course-detail')}
                  onNavigateToExercise={(topic) => handleNavigate('exercise-center', { topic })}
                />
              )}

              {activeTab === 'ai-tutor' && (
                <AITutorStudio
                  courses={courses}
                  selectedCourse={selectedCourse}
                  onSelectCourse={setSelectedCourse}
                  onNavigateToExercise={(topic) => handleNavigate('exercise-center', { topic })}
                />
              )}

              {activeTab === 'exercise-center' && (
                <ExerciseCenter
                  courses={courses}
                  exerciseSets={exerciseSets}
                  topicMastery={topicMastery}
                  onAddExerciseSet={handleAddExerciseSet}
                  onNavigateToLesson={(lesId) => handleNavigate('lesson-view', { lessonId: lesId })}
                  initialTopic={practiceTopicFocus}
                />
              )}

              {activeTab === 'assignments' && (
                <AssignmentsView
                  assignments={assignments}
                  onUpdateAssignment={handleUpdateAssignment}
                  onNavigateToExercise={(topic) => handleNavigate('exercise-center', { topic })}
                  onNavigateToLesson={(lesId) => handleNavigate('lesson-view', { lessonId: lesId })}
                />
              )}

              {activeTab === 'progress' && (
                <ProgressAnalytics
                  topicMastery={topicMastery}
                  courses={courses}
                  activities={activities}
                  onNavigateToExercise={(topic) => handleNavigate('exercise-center', { topic })}
                />
              )}

              {activeTab === 'lti-preview' && (
                <LtiWidgetPreview course={selectedCourse} />
              )}
            </>
          )}

          {/* TEACHER VIEWS */}
          {role === 'teacher' && (
            <TeacherDashboard
              courses={courses}
              onUpdateCourse={handleUpdateCourse}
            />
          )}
        </>
      )}
    </MainLayout>
  );
}
