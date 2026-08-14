import { api } from '../../../services/api';
import { SubmissionEvaluation } from '../../../types';

export interface EvaluateAssignmentParams {
  courseTitle: string;
  assignmentTitle: string;
  submissionText: string;
}

export const assignmentsApi = {
  evaluateSubmission: async (params: EvaluateAssignmentParams): Promise<Partial<SubmissionEvaluation>> => {
    return api.post<Partial<SubmissionEvaluation>>('/evaluation-agent', params);
  }
};
