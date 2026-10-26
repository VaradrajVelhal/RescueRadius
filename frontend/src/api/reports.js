import apiClient from './client';

export const createReportApi = async (formData) => {
  const response = await apiClient.post('/reports/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchReportsApi = async () => {
  const response = await apiClient.get('/reports/');
  return response.data;
};

export const fetchReportDetailApi = async (id) => {
  const response = await apiClient.get(`/reports/${id}/`);
  return response.data;
};

export const closeReportApi = async (id, comment = '') => {
  const response = await apiClient.post(`/reports/${id}/close/`, { comment });
  return response.data;
};

export const verifyReportApi = async (id, comment = '') => {
  const response = await apiClient.post(`/reports/${id}/verify/`, { comment });
  return response.data;
};

