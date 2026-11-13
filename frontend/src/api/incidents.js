import apiClient from './client';

export const getIncidents = async ({ cameraId, status, minConfidence, limit = 50, offset = 0 } = {}) => {
  const params = { limit, offset };
  if (cameraId && cameraId !== 'ALL') params.camera_id = cameraId;
  if (status && status !== 'ALL') params.status = status;
  if (minConfidence !== undefined && minConfidence !== null && minConfidence !== '') {
    params.min_confidence = parseFloat(minConfidence);
  }
  const response = await apiClient.get('/incidents', { params });
  return response.data;
};

export const getIncidentById = async (incidentId) => {
  const response = await apiClient.get(`/incidents/${incidentId}`);
  return response.data;
};

export const updateIncidentStatus = async (incidentId, status, notes = '') => {
  const response = await apiClient.patch(`/incidents/${incidentId}/status`, {
    status,
    notes,
  });
  return response.data;
};

export const getEvidenceSnapshotUrl = (filename) => {
  if (!filename) return null;
  // If full relative path was stored e.g. data/snapshots/CAM-01_...
  const nameOnly = filename.split('/').pop().split('\\').pop();
  return `/api/evidence/${encodeURIComponent(nameOnly)}`;
};
