import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  is_read: number;
  created_at: string;
}

export interface ToastMessage {
  id: number;
  title: string;
  content: string;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  toasts: ToastMessage[];
  joinProject: (projectId: number) => void;
  leaveProject: (projectId: number) => void;
  markNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  addToast: (title: string, content: string) => void;
  removeToast: (id: number) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, apiFetch } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((title: string, content: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, content }]);

    // Auto remove toast in 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch('/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      return;
    }

    // Connect to WebSockets
    const newSocket = io('http://localhost:5000');

    newSocket.on('connect', () => {
      console.log('Socket.io client connected successfully');
      newSocket.emit('join-user', user.id);
    });

    // Handle incoming notification
    newSocket.on('new-notification', (notif: Notification) => {
      console.log('New WebSocket notification received:', notif);
      setNotifications(prev => [notif, ...prev]);
      addToast(notif.title, notif.content);
    });

    setSocket(newSocket);
    fetchNotifications();

    return () => {
      newSocket.emit('leave-user', user.id);
      newSocket.disconnect();
    };
  }, [user, token, addToast, fetchNotifications]);

  const joinProject = useCallback((projectId: number) => {
    if (socket) {
      socket.emit('join-project', projectId);
    }
  }, [socket]);

  const leaveProject = useCallback((projectId: number) => {
    if (socket) {
      socket.emit('leave-project', projectId);
    }
  }, [socket]);

  const markNotificationsAsRead = async () => {
    try {
      const res = await apiFetch('/notifications/mark-read', { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      }
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      const res = await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      notifications,
      unreadCount,
      toasts,
      joinProject,
      leaveProject,
      markNotificationsAsRead,
      deleteNotification,
      addToast,
      removeToast
    }}>
      {children}
      {/* Global Toast HUD */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '380px',
        width: '100%'
      }}>
        {toasts.map((toast) => (
          <div key={toast.id} className="glass animate-slide" style={{
            background: 'rgba(20, 18, 32, 0.9)',
            borderLeft: '4px solid var(--color-primary)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative'
          }}>
            <h4 style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              marginBottom: '4px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              ⚡ {toast.title}
            </h4>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4
            }}>
              {toast.content}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};