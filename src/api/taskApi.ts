import axiosClient from './axiosClient';

export interface TaskPayload {
  description: string;
  difficulties?: string;
  status?: 'completed' | 'pending';
}

export const taskApi = {
  create: (data: TaskPayload) => axiosClient.post('/tasks', data),
  getMy: (params?: { date?: string }) => axiosClient.get('/tasks', { params }),
  update: (id: string, data: Partial<TaskPayload>) => axiosClient.put(`/tasks/${id}`, data),
  delete: (id: string) => axiosClient.delete(`/tasks/${id}`),
  getAll: (params?: { userId?: string; date?: string }) => axiosClient.get('/tasks/all', { params }),
};
