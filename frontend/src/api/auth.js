import apiClient from './client';

export const loginApi = async (email, password) => {
  const response = await apiClient.post('/auth/login/', { email, password });
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await apiClient.post('/auth/register/', userData);
  return response.data;
};

export const fetchMeApi = async () => {
  const response = await apiClient.get('/auth/me/');
  return response.data;
};
