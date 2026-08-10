import api from './axios';

export const getAdminDashboard = () => api.get('/admin/dashboard').then(r => r.data);

export const getAdminDrivers = (params?: any) =>
  api.get('/admin/drivers', { params }).then(r => r.data);

export const approveDriver = (id: string) =>
  api.patch(`/admin/drivers/${id}/approve`).then(r => r.data);

export const rejectDriver = (id: string) =>
  api.patch(`/admin/drivers/${id}/reject`).then(r => r.data);

export const getAdminUsers = (params?: any) =>
  api.get('/admin/users', { params }).then(r => r.data);

export const blockUser = (id: string) =>
  api.patch(`/admin/users/${id}/block`).then(r => r.data);

export const unblockUser = (id: string) =>
  api.patch(`/admin/users/${id}/unblock`).then(r => r.data);

export const deleteUser = (id: string) =>
  api.delete(`/admin/users/${id}`).then(r => r.data);

export const getAdminRides = (params?: any) =>
  api.get('/admin/rides', { params }).then(r => r.data);

// Block/unblock a driver via their user account
export const blockDriver = (userId: string) =>
  api.patch(`/admin/users/${userId}/block`).then(r => r.data);

export const unblockDriver = (userId: string) =>
  api.patch(`/admin/users/${userId}/unblock`).then(r => r.data);
