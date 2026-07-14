import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router';
import { Plus, KanbanSquare, Folder, Users, Calendar } from 'lucide-react';
import { ProjectModal } from '../components/ProjectModal';

export interface Project {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  owner_name: string;
  owner_avatar: string;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await apiFetch('/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectCreated = () => {
    fetchProjects();
    setIsModalOpen(false);
  };

  return (
    <div className="page-wrapper animate-fade">
      {/* Welcome Banner */}
      <div className="glass" style={{
        padding: '32px',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '32px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(22, 20, 34, 0.4) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>
            Hello, {user?.username || 'Collaborator'}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Manage your columns, sync task cards in real-time, comment, and collaborate with your teammates on group projects.
          </p>
        </div>
        <div style={{
          position: 'absolute',
          right: '30px',
          bottom: '-10px',
          color: 'rgba(99, 102, 241, 0.05)',
          zIndex: 1,
          transform: 'rotate(-10deg)'
        }}>
          <KanbanSquare size={180} />
        </div>
      </div>

      {/* Stats Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <Folder size={24} />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Active Projects</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{projects.length}</p>
          </div>
        </div>

        <div className="glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <Users size={24} />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Collaborators</h4>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>Connected</p>
          </div>
        </div>
      </div>

      {/* Projects Grid Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Your Workspace Boards</h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> New Board
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          Loading your boards...
        </div>
      ) : projects.length === 0 ? (
        <div className="glass" style={{
          textAlign: 'center',
          padding: '60px 20px',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)'
        }}>
          <KanbanSquare size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No projects yet</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '20px', maxWidth: '380px', marginInline: 'auto' }}>
            Get started by creating your first collaborative group project board.
          </p>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            Create Project Board
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="glass glass-interactive"
              style={{
                padding: '24px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '160px'
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                {project.name}
              </h3>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                lineHeight: 1.4,
                marginBottom: '20px',
                flex: 1,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {project.description || 'No description provided.'}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '12px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img
                    src={project.owner_avatar}
                    alt={project.owner_name}
                    style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#444' }}
                  />
                  <span>{project.owner_id === user?.id ? 'You' : project.owner_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <ProjectModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleProjectCreated}
        />
      )}
    </div>
  );
};