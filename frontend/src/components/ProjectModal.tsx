import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

interface ProjectModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ onClose, onSuccess }) => {
  const { apiFetch } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="glass modal-content animate-slide" style={{ maxWidth: '500px' }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Create New Project Board</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Project Name</label>
            <input
              type="text"
              placeholder="e.g. Q3 Launch Campaign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Description (Optional)</label>
            <textarea
              placeholder="Provide a brief summary of the goals or resources for this project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '20px',
            marginTop: '10px'
          }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
