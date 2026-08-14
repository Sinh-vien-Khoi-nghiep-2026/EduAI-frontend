export type Role = 'student' | 'teacher';

export interface KnowledgeItem {
  id: string;
  title: string;
  type: 'textbook' | 'slides' | 'syllabus' | 'notes' | 'question_bank';
  pagesOrSize: string;
  sourceName: string;
  uploadedAt: string;
  summary: string;
  snippet?: string;
}

export interface Lesson {
  id: string;
  title: string;
  durationMinutes: number;
  completed?: boolean;
  content: string;
  keyConcepts: string[];
  groundingSources: string[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  instructor: string;
  department: string;
  description: string;
  thumbnail: string;
  enrolledStudentsCount: number;
  progressPercent: number;
  knowledgeBase: KnowledgeItem[];
  modules: Module[];
  weakTopics?: string[];
  strongTopics?: string[];
}

export interface TeachingChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  citations?: {
    sourceTitle: string;
    section: string;
    snippet?: string;
  }[];
  groundedCitations?: {
    sourceTitle: string;
    section: string;
    snippet?: string;
  }[];
  suggestedFollowups?: string[];
  isThinking?: boolean;
}

export type ExerciseType = 'mcq' | 'short_answer' | 'code';

export interface ExerciseQuestion {
  id: string;
  type: ExerciseType;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  hint?: string;
  codeTemplate?: string;
}

export interface ExerciseSet {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  topic: string;
  createdAt: string;
  questions: ExerciseQuestion[];
  userAnswers?: Record<string, string>;
  isCompleted?: boolean;
  scorePercent?: number;
}

export interface EvaluationDetail {
  questionId: string;
  questionText: string;
  userAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  feedback: string;
  conceptCovered: string;
}

export interface SubmissionEvaluation {
  id: string;
  submissionId: string;
  courseId: string;
  assignmentTitle: string;
  submittedAt: string;
  overallScorePercent: number;
  gradeLetter: string;
  executiveSummary: string;
  strongTopics: string[];
  weakTopics: string[];
  detailedQuestions: EvaluationDetail[];
  recommendedNextSteps: {
    action: string;
    targetTopic: string;
    lessonId?: string;
    exerciseTopic?: string;
  }[];
}

export interface Assignment {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'evaluated';
  evaluation?: SubmissionEvaluation;
  submissionText?: string;
  submissionFileName?: string;
}

export interface TopicMastery {
  topic: string;
  courseId: string;
  masteryPercent: number;
  status: 'mastered' | 'developing' | 'needs_review';
  lastPracticed: string;
  attemptsCount: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'lesson_read' | 'asked_tutor' | 'exercise_done' | 'assignment_submitted';
  title: string;
  description: string;
  courseCode: string;
  score?: number;
}

export type NavTab = 
  | 'dashboard'
  | 'explore-courses'
  | 'my-courses'
  | 'course-detail'
  | 'lesson-view'
  | 'ai-tutor'
  | 'exercise-center'
  | 'assignments'
  | 'progress'
  | 'lti-preview'
  | 'teacher-dashboard'
  | 'teacher-knowledge'
  | 'teacher-exercises';
