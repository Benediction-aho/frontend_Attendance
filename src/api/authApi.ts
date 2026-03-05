import axiosClient from './axiosClient';

export interface LoginPayload { email: string; password: string; }
export interface RegisterPayload {
  firstName: string; lastName: string; email: string;
  password: string; employeeType?: string; position?: string;
}

export const authApi = {
  login: (data: LoginPayload) => axiosClient.post('/auth/login', data),
  register: (data: RegisterPayload) => axiosClient.post('/auth/register', data),
  getMe: () => axiosClient.get('/auth/me'),
};
