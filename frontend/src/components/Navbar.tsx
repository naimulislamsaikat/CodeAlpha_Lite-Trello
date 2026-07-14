import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Link, useNavigate } from 'react-router';
import { Bell, LogOut, KanbanSquare, CheckCheck, Trash2, Search, X, UserCircle } from 'lucide-react';

interface SearchUser {
  id: number;
  username: string;
  email: string;
  avatar_url: string;
}

export const Navbar: React.FC = () => {
  const { user, logout, apiFetch } = useAuth();
  const { notifications, unreadCount, markNotificationsAsRead, deleteNotification } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Debounced user search
  const fetchUsers = useCallback(async (query: string) => {
    setSearchLoading(true);
    try {
      const res = await apiFetch(`/auth/users?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch {
      // silently ignore
    } finally {
      setSearchLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchUsers(searchQuery.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, fetchUsers]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass" style={{
      height: '64px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-color)',
      position: 'relative',
      zIndex: 900
    }}>
      {/* Brand logo */}
      <Link to="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        color: 'var(--text-primary)',
        fontWeight: 700,
        fontSize: '1.25rem'
      }}>
        <div style={{
          background: 'var(--color-primary)',
          padding: '6px',
          borderRadius: 'var(--radius-sm)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <KanbanSquare size={20} />
        </div>
        <span>AlphaTrello</span>
      </Link>

      {/* Search Bar — center */}
      {user && (
        <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: '380px', margin: '0 24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${showSearchResults ? 'var(--border-active)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-full)',
            padding: '0 14px',
            height: '38px',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: showSearchResults ? '0 0 0 3px var(--color-primary-glow)' : 'none',
          }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              id="navbar-user-search"
              type="text"
              placeholder="Search users…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
              onKeyDown={(e) => e.key === 'Escape' && clearSearch()}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                width: '100%',
                padding: 0,
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                boxShadow: 'none',
              }}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="glass animate-slide" style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(20, 18, 30, 0.97)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              zIndex: 1000,
            }}>
              {searchLoading ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Searching…
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No users found
                </div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      cursor: 'default',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <img
                      src={u.avatar_url}
                      alt={u.username}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: '1.5px solid var(--border-color)',
                      }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.username}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.email}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Nav Controls */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Notifications Trigger */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: 'none',
                border: 'none',
                color: showNotifications ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  background: 'var(--color-danger)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  boxShadow: '0 0 0 2px var(--bg-main)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="glass animate-slide" style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                width: '320px',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                background: 'rgba(20, 18, 30, 0.95)',
                padding: '12px 0',
                maxHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0 16px 12px 16px',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markNotificationsAsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCheck size={14} /> Clear Alert
                    </button>
                  )}
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      padding: '24px 16px',
                      fontSize: '0.85rem'
                    }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          position: 'relative',
                          background: notif.is_read === 0 ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          paddingRight: '20px'
                        }}>
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: notif.is_read === 0 ? 600 : 500,
                            color: notif.is_read === 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
                          }}>
                            {notif.title}
                          </span>
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                              position: 'absolute',
                              right: '12px',
                              top: '10px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.3
                        }}>
                          {notif.content}
                        </p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px'
              }}
            >
              <img
                src={user.avatar_url}
                alt={user.username}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-glow)',
                  border: '1.5px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              />
            </button>

            {showProfileMenu && (
              <div className="glass animate-slide" style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                width: '200px',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                background: 'rgba(20, 18, 30, 0.95)',
                padding: '8px 0',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </span>
                </div>

                {/* View Profile */}
                <button
                  onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <UserCircle size={16} /> View Profile
                </button>

                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-danger)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-danger-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};