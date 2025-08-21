// Session management API functions
import apiClient from './apiClient';
import type { SessionsResponse } from '../types/session';

/**
 * Get all active sessions for the current user
 */
export const getUserSessions = async (): Promise<SessionsResponse> => {
  const response = await apiClient.get('/sessions');
  return response.data;
};

/**
 * Terminate a specific session
 */
export const terminateSession = async (sessionId: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/sessions/${sessionId}`);
  return response.data;
};

/**
 * Terminate all other sessions (except current)
 */
export const terminateAllOtherSessions = async (): Promise<{ message: string }> => {
  const response = await apiClient.delete('/sessions/all/others');
  return response.data;
};
