import { api } from '../../../services/api';
import { KnowledgeItem, TeachingChatMessage } from '../../../types';

export interface AskTeachingAgentParams {
  message: string;
  courseCode: string;
  courseTitle: string;
  knowledgeBase: KnowledgeItem[];
  chatHistory: TeachingChatMessage[];
}

export interface TeachingAgentResponse {
  reply: string;
  citations?: {
    sourceTitle: string;
    section: string;
    snippet?: string;
  }[];
  suggestedFollowups?: string[];
}

export const tutorApi = {
  askAgent: async (params: AskTeachingAgentParams): Promise<TeachingAgentResponse> => {
    return api.post<TeachingAgentResponse>('/teaching-agent', params);
  }
};
