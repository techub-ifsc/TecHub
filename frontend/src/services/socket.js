import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const authToken = token || localStorage.getItem('token') || localStorage.getItem('techub_token');
  if (!authToken) return null;

  socket = io(SOCKET_URL, {
    auth: { token: authToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
