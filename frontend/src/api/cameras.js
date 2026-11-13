import apiClient from './client';

export const getCameras = async (status) => {
  const params = {};
  if (status && status !== 'ALL') {
    params.status = status;
  }
  const response = await apiClient.get('/cameras', { params });
  return response.data;
};

export const getCameraById = async (cameraId) => {
  const response = await apiClient.get(`/cameras/${encodeURIComponent(cameraId)}`);
  return response.data;
};

export const registerCamera = async (cameraData) => {
  const response = await apiClient.post('/cameras', cameraData);
  return response.data;
};
