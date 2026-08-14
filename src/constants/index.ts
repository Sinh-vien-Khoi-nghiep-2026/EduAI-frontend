export * from '../data/mockCourses';

export const STUDENT_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'explore-courses', label: 'Courses' },
  { id: 'ai-tutor', label: 'Teaching Agent', badge: 'AI' },
  { id: 'exercise-center', label: 'Practice Engine', badge: 'AI' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'progress', label: 'Mastery Analytics' },
  { id: 'lti-preview', label: 'LTI LMS Embed' },
] as const;

export const TEACHER_NAV_ITEMS = [
  { id: 'teacher-dashboard', label: 'Instructor Portal' },
  { id: 'teacher-knowledge', label: 'Course Knowledge Base' },
  { id: 'teacher-exercises', label: 'Exercise Review Queue', badge: '3' },
] as const;
