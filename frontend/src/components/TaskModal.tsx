import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  X, User, Calendar, Tag, Trash2, Send, MessageSquare,
  Clock, AlignLeft
} from 'lucide-react';
import type { Task, Member } from './Board';

interface TaskModalProps {
  taskId: number;
  projectMembers: Member[];
  onClose: () => void;
  onTaskDeleted: () => void;
  onTaskUpdated: () => void;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  taskId, projectMembers, onClose, onTaskDeleted, onTaskUpdated
}) => {
  const { apiFetch } = useAuth();
  const { socket } = useSocket();

  // Task Details States
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [descVal, setDescVal] = useState('');
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  // Comments States
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentVal, setNewCommentVal] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // We need to fetch the single task data from the server.
  // Wait, let's see. In tasks routing, do we have a GET task endpoint? No, we didn't write GET /tasks/:id. 
  // Let's add GET /tasks/:id inside backend/routes/tasks.js! That will make TaskModal fetch task details cleanly on load.
  // Wait! We can retrieve the task metadata directly by calling standard SQL or checking board.
  // But wait, it's very easy to query backend tasks by ID. Let's create GET /tasks/:id in backend/routes/tasks.js.
  // Before doing that, let's check: Can we fetch the project and filter, or just query it? Yes, we can query it directly in backend!
  // Let's write the frontend first, expecting `GET /tasks/:id` to work, and then I will update backend/routes/tasks.js to support GET `/api/tasks/:id`. That is extremely clean!

  const fetchSingleTask = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/tasks/${taskId}`); // Wait, I will add this endpoint next!
      if (res.ok) {
        const taskData = await res.json();
        setTask(taskData);
        setTitleVal(taskData.title);
        setDescVal(taskData.description || '');
      }

      const commentRes = await apiFetch(`/comments?taskId=${taskId}`);
      if (commentRes.ok) {
        const commentData = await commentRes.json();
        setComments(commentData);
      }
    } catch (err) {
      console.error('Error fetching task details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSingleTask();
  }, [taskId]);

  // WebSocket sync for comments in real time
  useEffect(() => {
    if (!socket) return;

    const handleCommentBroadcast = (data: any) => {
      if (data.projectId && data.type === 'COMMENT_ADDED' && data.comment.task_id === taskId) {
        // Append comment if not already there (avoid duplicating for sender)
        setComments(prev => {
          if (prev.some(c => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
      }
      if (data.projectId && data.type === 'TASK_UPDATED' && data.task.id === taskId) {
        setTask(data.task);
      }
    };

    socket.on('board-updated', handleCommentBroadcast);
    return () => {
      socket.off('board-updated', handleCommentBroadcast);
    };
  }, [socket, taskId]);

  // Update Task details wrapper
  const updateTaskDetails = async (fields: Partial<Task>) => {
    const apiPayload: any = { ...fields };
    if ('assignee_id' in fields) {
      apiPayload.assigneeId = fields.assignee_id;
      delete apiPayload.assignee_id;
    }
    if ('due_date' in fields) {
      apiPayload.dueDate = fields.due_date;
      delete apiPayload.due_date;
    }

    try {
      const res = await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(apiPayload)
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        onTaskUpdated();
      }
    } catch (err) {
      console.error('Error updating task details:', err);
    }
  };

  // Save Title
  const saveTitle = () => {
    if (!titleVal.trim() || titleVal === task?.title) {
      setEditingTitle(false);
      return;
    }
    updateTaskDetails({ title: titleVal.trim() });
    setEditingTitle(false);
  };

  // Save Description
  const saveDescription = async () => {
    setIsSavingDesc(true);
    await updateTaskDetails({ description: descVal });
    setIsSavingDesc(false);
  };

  // Delete Task
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task card?')) return;
    try {
      const res = await apiFetch(`/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onTaskDeleted();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // Submit Comment
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentVal.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await apiFetch('/comments', {
        method: 'POST',
        body: JSON.stringify({ taskId, content: newCommentVal.trim() })
      });
      if (res.ok) {
        const commentData = await res.json();
        setComments(prev => [...prev, commentData]);
        setNewCommentVal('');
        onTaskUpdated(); // Update comment count on parent Board
      }
    } catch (err) {
      console.error('Error leaving comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) return <div className="modal-overlay"><div className="glass modal-content" style={{ padding: '40px', textAlign: 'center' }}>Loading details...</div></div>;
  if (!task) return <div className="modal-overlay"><div className="glass modal-content" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-danger)' }}>Task not found or deleted.</div></div>;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass modal-content animate-slide" style={{
        maxWidth: '720px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh',
        background: 'rgba(20, 18, 32, 0.98)'
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          {editingTitle ? (
            <input
              type="text"
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              autoFocus
              style={{ fontSize: '1.2rem', fontWeight: 600, padding: '4px 8px', width: '70%' }}
            />
          ) : (
            <h3
              onClick={() => setEditingTitle(true)}
              style={{ fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer', width: '70%' }}
              title="Click to edit title"
            >
              {task.title}
            </h3>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 220px',
          overflowY: 'auto',
          flex: 1
        }}>

          {/* Left Panel: Description & Comments */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px', borderRight: '1px solid var(--border-color)' }}>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                <AlignLeft size={16} />
                <span>Description</span>
              </div>
              <textarea
                placeholder="Add a more detailed description about this task card..."
                value={descVal}
                onChange={(e) => setDescVal(e.target.value)}
                rows={4}
                style={{ fontSize: '0.9rem', lineHeight: 1.4 }}
              />
              {descVal !== (task.description || '') && (
                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={saveDescription} disabled={isSavingDesc}>
                    {isSavingDesc ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setDescVal(task.description || '')}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Comments Board */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                <MessageSquare size={16} />
                <span>Comments ({comments.length})</span>
              </div>

              {/* Leave a Comment */}
              <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Ask a question or post an update..."
                  value={newCommentVal}
                  onChange={(e) => setNewCommentVal(e.target.value)}
                  style={{ fontSize: '0.88rem', padding: '10px' }}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '10px' }} disabled={submittingComment}>
                  <Send size={16} />
                </button>
              </form>

              {/* Comments list stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                {comments.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No communication logs here yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} style={{ display: 'flex', gap: '12px' }}>
                      <img
                        src={comment.avatar_url}
                        alt={comment.username}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#444' }}
                      />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{comment.username}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Clock size={10} />
                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          wordBreak: 'break-word'
                        }}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Assignee, Priority, Due Date Settings */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Assignee Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                <User size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Assignee
              </span>
              <select
                value={task.assignee_id || ''}
                onChange={(e) => updateTaskDetails({ assignee_id: e.target.value ? parseInt(e.target.value) : null })}
                style={{ fontSize: '0.85rem', padding: '6px' }}
              >
                <option value="">Unassigned</option>
                {projectMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.username}</option>
                ))}
              </select>
            </div>

            {/* Priority Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                <Tag size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Priority
              </span>
              <select
                value={task.priority}
                onChange={(e) => updateTaskDetails({ priority: e.target.value as any })}
                style={{ fontSize: '0.85rem', padding: '6px' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Due Date Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Due Date
              </span>
              <input
                type="date"
                value={task.due_date ? task.due_date.split('T')[0] : ''}
                onChange={(e) => updateTaskDetails({ due_date: e.target.value || null })}
                style={{ fontSize: '0.85rem', padding: '6px' }}
              />
            </div>

            {/* Actions: Delete */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                style={{ width: '100%', fontSize: '0.85rem', padding: '8px' }}
              >
                <Trash2 size={14} /> Delete Card
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};