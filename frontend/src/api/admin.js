import apiClient from './client';

export const fetchAdminNGOsApi = async (statusFilter = '') => {
  const url = statusFilter ? `/admin/ngos/?status=${statusFilter}` : '/admin/ngos/';
  const response = await apiClient.get(url);
  return response.data;
};

export const fetchAdminNGODetailApi = async (id) => {
  const response = await apiClient.get(`/admin/ngos/${id}/`);
  return response.data;
};

export const verifyNGOApi = async (id) => {
  const response = await apiClient.post(`/admin/ngos/${id}/verify/`);
  return response.data;
};

export const rejectNGOApi = async (id) => {
  const response = await apiClient.post(`/admin/ngos/${id}/reject/`);
  return response.data;
};

export const suspendNGOApi = async (id) => {
  const response = await apiClient.post(`/admin/ngos/${id}/suspend/`);
  return response.data;
};
