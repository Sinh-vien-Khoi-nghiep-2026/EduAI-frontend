import { NavTab } from '../types';

export interface RouteConfig {
  id: NavTab;
  label: string;
  isTeacher?: boolean;
}

export const ROUTES: RouteConfig[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'explore-courses', label: 'Courses' },
  { id: 'course-detail', label: 'Course Syllabus' },
  { id: 'lesson-view', label: 'Lesson View' },
  { id: 'ai-tutor', label: 'Teaching Agent' },
  { id: 'exercise-center', label: 'Practice Engine' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'progress', label: 'Mastery Analytics' },
  { id: 'lti-preview', label: 'LTI Embed Preview' },
  { id: 'teacher-dashboard', label: 'Instructor Portal', isTeacher: true },
  { id: 'teacher-knowledge', label: 'Knowledge Base', isTeacher: true },
  { id: 'teacher-exercises', label: 'Exercise Queue', isTeacher: true },
];
