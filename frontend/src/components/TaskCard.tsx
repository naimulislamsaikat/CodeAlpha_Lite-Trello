import React from 'react';
import { Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import type { Task } from './Board';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onClick }) => {

  // Format due date to a friendly string
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Determine if task is overdue
  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const priorityColors = {
    high: {
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.25)',
      text: '#EF4444'
    },
    medium: {
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.25)',
      text: '#F59E0B'
    },
    low: {
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.25)',
      text: '#10B981'
    }
  };

  const currentColors = priorityColors[task.priority] || priorityColors.medium;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="glass glass-interactive"
      style={{
        padding: '14px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(30, 27, 47, 0.55)',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        userSelect: 'none'
      }}
    >
      {/* Priority Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: '0.05em',
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          background: currentColors.bg,
          border: `1px solid ${currentColors.border}`,
          color: currentColors.text
        }}>
          {task.priority}
        </span>

        {task.priority === 'high' && (
          <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
        )}
      </div>

      {/* Title */}
      <h4 style={{
        fontSize: '0.88rem',
        fontWeight: 500,
        color: 'var(--text-primary)',
        lineHeight: 1.3
      }}>
        {task.title}
      </h4>

      {/* Footer Info (assignee, comments count, due date) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '6px',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        paddingTop: '8px',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)'
      }}>
        {/* Left indicators: Due date & comments */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {task.due_date && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isOverdue(task.due_date) ? 'var(--color-danger)' : 'var(--text-secondary)'
            }}>
              <Calendar size={12} />
              <span>{formatDueDate(task.due_date)}</span>
            </div>
          )}

          {task.comment_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageSquare size={12} />
              <span>{task.comment_count}</span>
            </div>
          )}
        </div>

        {/* Right indicator: Assignee Avatar */}
        {task.assignee_id && (
          <img
            src={task.assignee_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=user`}
            alt={task.assignee_name || 'assignee'}
            title={`Assigned to ${task.assignee_name}`}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#444'
            }}
          />
        )}
      </div>
    </div>
  );
};