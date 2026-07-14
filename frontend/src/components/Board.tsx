import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Plus, Share2, Trash2, ArrowLeft, X, Search 
} from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';

export interface Member {
  id: number;
  username: string;
  email: string;
  avatar_url: string;
  role: string;
}

export interface Task {
  id: number;
  list_id: number;
  title: string;
  description: string;
  assignee_id: number | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  position: number;
  comment_count: number;
}

export interface BoardList {
  id: number;
  project_id: number;
  name: string;
  position: number;
  tasks: Task[];
}

export interface BoardData {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  created_at: string;
  lists: BoardList[];
  members: Member[];
}

export const Board: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0');
  const navigate = useNavigate();
  const { apiFetch, user } = useAuth();
  const { joinProject, leaveProject, socket, addToast } = useSocket();

  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New List State
  const [newListVal, setNewListVal] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);

  // New Task States (indexed by listId)
  const [newTaskTitles, setNewTaskTitles] = useState<{ [key: number]: string }>({});
  const [addingTaskInList, setAddingTaskInList] = useState<{ [key: number]: boolean }>({});

  // Active Task Modal State
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  // Invitation Modal/Dropdown State
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Fetch Board details
  const fetchBoardDetails = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await apiFetch(`/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setBoard(data);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load board');
      }
    } catch (err) {
      console.error('Error fetching board details:', err);
      setError('Connection failure loading board');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [projectId, apiFetch]);

  useEffect(() => {
    fetchBoardDetails();
    
    // Register for websocket room updates
    joinProject(projectId);

    return () => {
      leaveProject(projectId);
    };
  }, [projectId, joinProject, leaveProject, fetchBoardDetails]);

  // Real-time synchronization callback
  useEffect(() => {
    if (!socket) return;

    const handleBoardUpdate = (data: any) => {
      console.log('Realtime sync event received:', data);
      if (data.projectId === projectId) {
        // Silently reload the updated board configuration
        fetchBoardDetails(true);
        
        // Show context toast if someone else changed it
        if (data.senderId !== user?.id) {
          if (data.type === 'TASK_CREATED') {
            addToast('Board Update', `A new task was created: "${data.task.title}"`);
          } else if (data.type === 'TASK_UPDATED') {
            addToast('Board Update', `Task updated: "${data.task.title}"`);
          } else if (data.type === 'TASK_DELETED') {
            addToast('Board Update', 'A task card was deleted');
          } else if (data.type === 'LIST_CREATED') {
            addToast('Board Update', `New column added: "${data.list.name}"`);
          } else if (data.type === 'LIST_DELETED') {
            addToast('Board Update', 'A column was deleted');
          }
        }
      }
    };

    socket.on('board-updated', handleBoardUpdate);

    return () => {
      socket.off('board-updated', handleBoardUpdate);
    };
  }, [socket, projectId, fetchBoardDetails, user, addToast]);

  // Handle Drag and Drop
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetListId: number) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;

    const taskId = parseInt(taskIdStr);
    
    // Find task and verify if it actually changed lists
    const currentList = board?.lists.find(l => l.tasks.some(t => t.id === taskId));
    if (!currentList || currentList.id === targetListId) return;

    // Optimistically update frontend UI state
    setBoard(prev => {
      if (!prev) return null;
      
      let draggedTask: Task | null = null;
      
      const updatedLists = prev.lists.map(list => {
        // Remove task from source list
        if (list.id === currentList.id) {
          draggedTask = list.tasks.find(t => t.id === taskId) || null;
          return {
            ...list,
            tasks: list.tasks.filter(t => t.id !== taskId)
          };
        }
        return list;
      });

      if (!draggedTask) return prev;

      // Add to target list
      return {
        ...prev,
        lists: updatedLists.map(list => {
          if (list.id === targetListId) {
            const updatedTask = { ...draggedTask!, list_id: targetListId };
            return {
              ...list,
              tasks: [...list.tasks, updatedTask]
            };
          }
          return list;
        })
      };
    });

    try {
      const res = await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ listId: targetListId })
      });
      
      if (!res.ok) {
        // Rollback
        fetchBoardDetails(true);
      }
    } catch (err) {
      console.error('Error shifting task list:', err);
      fetchBoardDetails(true);
    }
  };

  // Add Column List
  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListVal.trim()) return;

    try {
      const res = await apiFetch(`/projects/${projectId}/lists`, {
        method: 'POST',
        body: JSON.stringify({ name: newListVal })
      });
      if (res.ok) {
        const newListData = await res.json();
        setBoard(prev => prev ? { ...prev, lists: [...prev.lists, newListData] } : null);
        setNewListVal('');
        setIsAddingList(false);
      }
    } catch (err) {
      console.error('Error adding list column:', err);
    }
  };

  // Delete Column List
  const handleDeleteList = async (listId: number) => {
    if (!window.confirm('Are you sure you want to delete this list and all its tasks?')) return;
    try {
      const res = await apiFetch(`/projects/${projectId}/lists/${listId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBoard(prev => prev ? {
          ...prev,
          lists: prev.lists.filter(l => l.id !== listId)
        } : null);
      }
    } catch (err) {
      console.error('Error deleting list:', err);
    }
  };

  // Add Task card
  const handleAddTask = async (listId: number) => {
    const title = newTaskTitles[listId];
    if (!title || !title.trim()) return;

    try {
      const res = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({ listId, title: title.trim() })
      });
      
      if (res.ok) {
        const newTask = await res.json();
        setBoard(prev => {
          if (!prev) return null;
          return {
            ...prev,
            lists: prev.lists.map(list => {
              if (list.id === listId) {
                return { ...list, tasks: [...list.tasks, newTask] };
              }
              return list;
            })
          };
        });
        setNewTaskTitles(prev => ({ ...prev, [listId]: '' }));
        setAddingTaskInList(prev => ({ ...prev, [listId]: false }));
      }
    } catch (err) {
      console.error('Error adding task card:', err);
    }
  };

  // Search users to invite
  const handleSearchUsers = async (val: string) => {
    setSearchVal(val);
    setInviteError(null);
    setInviteSuccessMsg(null);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await apiFetch(`/auth/users?search=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out users who are already members
        const filtered = data.filter((u: any) => !board?.members.some(m => m.id === u.id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  // Invite user to project
  const handleInviteUser = async (userId: number, username: string) => {
    setInviteError(null);
    setInviteSuccessMsg(null);
    try {
      const res = await apiFetch(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const data = await res.json();
        setBoard(prev => prev ? {
          ...prev,
          members: [...prev.members, data.member]
        } : null);
        setInviteSuccessMsg(`Successfully invited ${username}!`);
        setSearchVal('');
        setSearchResults([]);
      } else {
        const data = await res.json();
        setInviteError(data.error || 'Failed to add member');
      }
    } catch (err) {
      console.error('Error inviting member:', err);
      setInviteError('Connection error sending invitation');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Loading project board...</div>;
  if (error || !board) return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--color-danger)' }}><h3>Error:</h3><p>{error || 'Project not found'}</p><button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => navigate('/')}><ArrowLeft size={16} /> Back to Dashboard</button></div>;

  const isOwner = board.owner_id === user?.id;

  return (
    <div className="page-wrapper animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 24px 0 24px' }}>
      
      {/* Board Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              {board.name}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {board.description || 'No description provided.'}
            </p>
          </div>
        </div>

        {/* Member Panel & Invite Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
          {/* Members List */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', marginRight: '8px' }}>
              {board.members.slice(0, 4).map((member, i) => (
                <img
                  key={member.id}
                  src={member.avatar_url}
                  alt={member.username}
                  title={`${member.username} (${member.role})`}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '2px solid var(--bg-main)',
                    marginLeft: i > 0 ? '-8px' : '0',
                    zIndex: 10 - i,
                    background: '#444'
                  }}
                />
              ))}
              {board.members.length > 4 && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface-hover)',
                  border: '2px solid var(--bg-main)',
                  marginLeft: '-8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  zIndex: 5
                }}>
                  +{board.members.length - 4}
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {board.members.length} {board.members.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          {/* Invite Trigger */}
          {isOwner && (
            <div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                onClick={() => setShowInviteMenu(!showInviteMenu)}
              >
                <Share2 size={14} /> Invite
              </button>

              {showInviteMenu && (
                <div className="glass animate-slide" style={{
                  position: 'absolute',
                  top: '40px',
                  right: '0',
                  width: '280px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(20, 18, 30, 0.98)',
                  padding: '16px',
                  zIndex: 950,
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Invite Collaborator</h4>
                    <button onClick={() => { setShowInviteMenu(false); setSearchVal(''); setSearchResults([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
                  </div>

                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search username or email..."
                      value={searchVal}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      style={{ paddingLeft: '32px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.85rem' }}
                    />
                  </div>

                  {inviteSuccessMsg && <div style={{ color: 'var(--color-success)', fontSize: '0.78rem', marginBottom: '8px' }}>{inviteSuccessMsg}</div>}
                  {inviteError && <div style={{ color: 'var(--color-danger)', fontSize: '0.78rem', marginBottom: '8px' }}>{inviteError}</div>}

                  <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {searchResults.length === 0 && searchVal.trim() !== '' && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No matches found</div>
                    )}
                    {searchResults.map((u) => (
                      <div 
                        key={u.id}
                        onClick={() => handleInviteUser(u.id, u.username)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img src={u.avatar_url} alt={u.username} style={{ width: '22px', height: '22px', borderRadius: '50%' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{u.username}</span>
                          </div>
                        </div>
                        <Plus size={14} style={{ color: 'var(--color-primary)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lists / Columns Row */}
      <div style={{
        display: 'flex',
        gap: '20px',
        overflowX: 'auto',
        flex: 1,
        paddingBottom: '20px',
        alignItems: 'flex-start'
      }}>
        {board.lists.map((list) => (
          <div 
            key={list.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, list.id)}
            className="glass"
            style={{
              width: '280px',
              minWidth: '280px',
              maxHeight: '100%',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              background: 'rgba(20, 18, 30, 0.45)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* List Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {list.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px', fontWeight: 400 }}>({list.tasks.length})</span>
              </h3>
              
              <button 
                onClick={() => handleDeleteList(list.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Tasks Stack */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              flex: 1,
              paddingRight: '2px',
              marginBottom: '12px'
            }}>
              {list.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onClick={() => setActiveTaskId(task.id)}
                />
              ))}
            </div>

            {/* List Footer / Task Creator */}
            {addingTaskInList[list.id] ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTaskTitles[list.id] || ''}
                  onChange={(e) => setNewTaskTitles(prev => ({ ...prev, [list.id]: e.target.value }))}
                  style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTask(list.id);
                    if (e.key === 'Escape') setAddingTaskInList(prev => ({ ...prev, [list.id]: false }));
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleAddTask(list.id)}>
                    Add
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setAddingTaskInList(prev => ({ ...prev, [list.id]: false }))}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setAddingTaskInList(prev => ({ ...prev, [list.id]: true }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Plus size={14} /> Add Card
              </button>
            )}
          </div>
        ))}

        {/* Column Creator */}
        {isAddingList ? (
          <form onSubmit={handleAddList} className="glass" style={{
            width: '280px',
            minWidth: '280px',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            background: 'rgba(20, 18, 30, 0.45)'
          }}>
            <input
              type="text"
              placeholder="Column name (e.g. In Review)..."
              value={newListVal}
              onChange={(e) => setNewListVal(e.target.value)}
              style={{ padding: '8px 10px', fontSize: '0.85rem', marginBottom: '8px' }}
              autoFocus
              required
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Add Column</button>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setIsAddingList(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setIsAddingList(true)}
            style={{
              width: '280px',
              minWidth: '280px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255,255,255,0.02)',
              border: '1.5px dashed var(--border-color)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 500,
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              height: '56px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Plus size={16} /> Add Column
          </button>
        )}
      </div>

      {/* Task detail overlay Modal */}
      {activeTaskId && (
        <TaskModal 
          taskId={activeTaskId} 
          projectMembers={board.members}
          onClose={() => setActiveTaskId(null)}
          onTaskDeleted={() => {
            // Remove task locally, or refetch
            fetchBoardDetails(true);
            setActiveTaskId(null);
          }}
          onTaskUpdated={() => {
            fetchBoardDetails(true);
          }}
        />
      )}
    </div>
  );
};
