import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.bunny-crush.com';

const api = axios.create({ baseURL: API_URL });

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (email, password, username) =>
  api.post('/register', { email, password, username });

export const login = (email, password) =>
  api.post('/login', { email, password });

export const getMe = () => api.get('/auth/me');

// Characters
export const createCharacter = (data) => api.post('/characters', data);
export const listCharacters = () => api.get('/characters');
export const getCharacter = (id) => api.get(`/characters/${id}`);
export const deleteCharacter = (id) => api.delete(`/characters/${id}`);

// Chat
export const sendMessage = (character_id, message) =>
  api.post('/chat', { character_id, message });

export const getChatHistory = (char_id, limit = 50) =>
  api.get(`/chat/history/${char_id}`, { params: { limit } });

// Images
export const generateImage = (character_id, scenario, nsfw = false) =>
  api.post('/images/generate', { character_id, scenario, nsfw });

export const getGallery = (limit = 40) =>
  api.get('/images/gallery', { params: { limit } });

export const toggleLike = (image_id) =>
  api.patch(`/images/${image_id}/like`);

// Credits
export const getPackages = () => api.get('/credits/packages');
export const createCheckout = (package_id, success_url, cancel_url) =>
  api.post('/credits/checkout', { package_id, success_url, cancel_url });
export const getTransactions = (limit = 20) =>
  api.get('/credits/transactions', { params: { limit } });

export default api;
