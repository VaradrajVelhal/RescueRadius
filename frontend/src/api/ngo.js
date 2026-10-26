import apiClient from './client';

export const fetchDiscoverReportsApi = async () => {
  const response = await apiClient.get('/ngo/reports/');
  return response.data;
};

export const claimReportApi = async (reportId) => {
  const response = await apiClient.post(`/ngo/reports/${reportId}/claim/`);
  return response.data;
};

export const startRescueApi = async (reportId, comment = '') => {
  const response = await apiClient.post(`/ngo/reports/${reportId}/start/`, { comment });
  return response.data;
};

export const completeRescueApi = async (reportId, comment = '') => {
  const response = await apiClient.post(`/ngo/reports/${reportId}/complete/`, { comment });
  return response.data;
};

export const fetchAssignmentsApi = async (statusFilter = '') => {
  const url = statusFilter ? `/ngo/assignments/?status=${statusFilter}` : '/ngo/assignments/';
  const response = await apiClient.get(url);
  return response.data;
};

export const fetchAssignmentDetailApi = async (id) => {
  const response = await apiClient.get(`/ngo/assignments/${id}/`);
  return response.data;
};
