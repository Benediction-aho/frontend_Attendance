import axiosClient from './axiosClient';

export const attendanceApi = {
  checkIn: (latitude: number, longitude: number) =>
    axiosClient.post('/attendance/checkin', { latitude, longitude }),

  checkOut: () => axiosClient.post('/attendance/checkout'),

  // Force fresh response every time — prevents stale 304 showing ABSENT after check-in
  getToday: () =>
    axiosClient.get('/attendance/today', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    }),

  getMy: (params?: { startDate?: string; endDate?: string }) =>
    axiosClient.get('/attendance/my', { params }),

  getAll: (params?: { userId?: string; startDate?: string; endDate?: string }) =>
    axiosClient.get('/attendance/all', { params }),

  getAttempts: (params?: { userId?: string; startDate?: string; endDate?: string }) =>
    axiosClient.get('/attendance/attempts', { params }),
};