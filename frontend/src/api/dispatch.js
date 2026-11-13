import apiClient from './client';

export const createSimulatedDispatch = async ({
  incident_id,
  dispatch_type,
  recipient_agency,
  notes = '',
}) => {
  const payload = {
    incident_id: parseInt(incident_id, 10),
    dispatch_type,
    recipient_agency,
    notes,
  };
  const response = await apiClient.post('/dispatch', payload);
  return response.data;
};

export const getDispatchLogs = async ({ incidentId, limit = 50, offset = 0 } = {}) => {
  const params = { limit, offset };
  if (incidentId) {
    params.incident_id = incidentId;
  }
  const response = await apiClient.get('/dispatch-logs', { params });
  return response.data;
};
