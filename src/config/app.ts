export const APP_CONFIG = {
  name: 'Etutor',
  title: 'Etutor - Intelligent LMS Middleware',
  version: '2.4.0',
  term: 'Spring 2026',
  defaultRole: 'student' as const,
  apiUrl: '/api',
  storageKeys: {
    role: 'etutor_user_role',
    activeCourse: 'etutor_active_course_id',
    theme: 'etutor_theme'
  }
};
