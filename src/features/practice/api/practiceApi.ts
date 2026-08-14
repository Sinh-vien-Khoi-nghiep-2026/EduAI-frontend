import { api } from '../../../services/api';
import { KnowledgeItem, ExerciseQuestion } from '../../../types';

export interface GeneratePracticeParams {
  topic: string;
  difficulty: string;
  count: number;
  courseCode: string;
  knowledgeBase: KnowledgeItem[];
}

export interface GeneratePracticeResponse {
  questions: ExerciseQuestion[];
}

export const practiceApi = {
  generatePracticeSet: async (params: GeneratePracticeParams): Promise<GeneratePracticeResponse> => {
    return api.post<GeneratePracticeResponse>('/generate-practice', params);
  }
};
