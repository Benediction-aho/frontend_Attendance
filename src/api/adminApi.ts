import axiosClient from './axiosClient';

export interface CreateUserPayload {
  firstName: string; lastName: string; email: string;
  password: string; employeeType?: string; position?: string; role?: string;
}

export const adminApi = {
  createUser: (data: CreateUserPayload) => axiosClient.post('/admin/users', data),
  getUsers: () => axiosClient.get('/admin/users'),
  toggleBlock: (id: string) => axiosClient.patch(`/admin/users/${id}/block`),
  deleteUser: (id: string) => axiosClient.delete(`/admin/users/${id}`),
  getAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    axiosClient.get('/admin/analytics', { params }),
  getUserStats: (id: string) => axiosClient.get(`/admin/users/${id}/stats`),
};
