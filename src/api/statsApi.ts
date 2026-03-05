import axiosClient from './axiosClient';

export const statsApi = {
  getMyStats: (params?: { startDate?: string; endDate?: string }) =>
    axiosClient.get('/stats/me', { params }),
};
