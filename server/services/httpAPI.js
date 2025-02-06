import axios from 'axios';

const API_BASE = 'http://localhost:3000';

export const getZones = async () => {
  const response = await axios.get(`${API_BASE}/zones`);
  return response.data;
};

export const sendAction = async (action, payload) => {
  const response = await axios.post(`${API_BASE}/actions/${action}`, payload);
  return response.data;
};
