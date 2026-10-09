import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { X } from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationApi.js';

const NotificationContext = createContext(null);
const TOKEN_KEY = 'unipath_token';

function socketOrigin() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  return apiUrl.startsWith('/') ? window.location.origin : new URL(apiUrl).origin;
}

export function NotificationProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [connected, setConnected] = useState(false);
  const toastTimer = useRef(null);

  const refreshNotifications = useCallback(async () => {
    const result = await listNotifications();
    setNotifications((current) => {
      const byId = new Map(current.map((item) => [item._id, item]));
      for (const item of result.data) {
        const existing = byId.get(item._id);
        byId.set(item._id, existing ? { ...item, read: existing.read || item.read } : item);
      }
      return [...byId.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
    });
    return result.data;
  }, []);

  useEffect(() => {
    if (authLoading) return undefined;
    if (!user) {
      setNotifications([]);
      setToast(null);
      setConnected(false);
      return undefined;
    }

    let active = true;
    const token = sessionStorage.getItem(TOKEN_KEY);
    refreshNotifications().catch(() => {});
    if (!token) return undefined;

    const socket = io(socketOrigin(), { auth: { token }, reconnection: true, timeout: 5000 });
    socket.on('connect', () => {
      if (!active) return;
      setConnected(true);
      refreshNotifications().catch(() => {});
    });
    socket.on('disconnect', () => { if (active) setConnected(false); });
    socket.on('connect_error', () => { if (active) setConnected(false); });
    socket.on('notification:new', (notification) => {
      if (!active) return;
      setNotifications((current) => {
        if (current.some((item) => item._id === notification._id)) return current;
        return [notification, ...current].slice(0, 50);
      });
      setToast(notification);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 6000);
    });

    return () => {
      active = false;
      socket.disconnect();
      setConnected(false);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [user, authLoading, refreshNotifications]);

  useEffect(() => {
    if (!user || connected) return undefined;
    const interval = setInterval(() => refreshNotifications().catch(() => {}), 20000);
    return () => clearInterval(interval);
  }, [user, connected, refreshNotifications]);

  const markRead = useCallback(async (id) => {
    await markNotificationRead(id);
    setNotifications((current) => current.map((notification) => notification._id === id ? { ...notification, read: true } : notification));
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const value = useMemo(() => ({ notifications, unreadCount, connected, refreshNotifications, markRead, markAllRead }), [notifications, unreadCount, connected, refreshNotifications, markRead, markAllRead]);

  return <NotificationContext.Provider value={value}>{children}{toast && <div className="realtime-toast" role="status" aria-live="polite"><div className={`realtime-toast-dot toast-${toast.type.toLowerCase()}`}/><div className="realtime-toast-copy"><strong>{toast.title}</strong><span>{toast.message}</span></div><button type="button" onClick={dismissToast} aria-label="Dismiss notification"><X size={15}/></button></div>}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  return context;
}
