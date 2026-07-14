import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Phone, Building2, GraduationCap, CalendarDays,
  Pencil, Save, X, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react';

interface ProfileData {
  username: string;
  email: string;
  avatar_url: string;
  organization: string;
  education: string;
  date_of_birth: string;
  contact_number: string;
  bio: string;
}

type ToastType = 'success' | 'error' | null;

export const ProfilePage: React.FC = () => {
  const { user, apiFetch, updateUser } = useAuth();

  const [form, setForm] = useState<ProfileData>({
    username: '',
    email: '',
    avatar_url: '',
    organization: '',
    education: '',
    date_of_birth: '',
    contact_number: '',
    bio: '',
  });
  const [original, setOriginal] = useState<ProfileData>(form);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({ type: null, message: '' });
  const [avatarSeedInput, setAvatarSeedInput] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarMode, setAvatarMode] = useState<'dicebear' | 'custom'>('dicebear');

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: null, message: '' }), 3500);
  };

  // Load profile from server
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/auth/profile');
        if (res.ok) {
          const data = await res.json();
          const filled: ProfileData = {
            username: data.username || '',
            email: data.email || '',
            avatar_url: data.avatar_url || '',
            organization: data.organization || '',
            education: data.education || '',
            date_of_birth: data.date_of_birth || '',
            contact_number: data.contact_number || '',
            bio: data.bio || '',
          };
          setForm(filled);
          setOriginal(filled);
          setAvatarSeedInput(data.username || '');
        }
      } catch {
        showToast('error', 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof ProfileData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const previewDicebear = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(avatarSeedInput || form.username)}`;

  const applyDicebear = () => {
    setForm((prev) => ({ ...prev, avatar_url: previewDicebear }));
  };

  const applyCustomUrl = () => {
    if (customAvatarUrl.trim()) {
      setForm((prev) => ({ ...prev, avatar_url: customAvatarUrl.trim() }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          username: form.username,
          avatar_url: form.avatar_url,
          organization: form.organization,
          education: form.education,
          date_of_birth: form.date_of_birth,
          contact_number: form.contact_number,
          bio: form.bio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      updateUser(data.user, data.token);
      const saved: ProfileData = {
        username: data.user.username || '',
        email: data.user.email || '',
        avatar_url: data.user.avatar_url || '',
        organization: data.user.organization || '',
        education: data.user.education || '',
        date_of_birth: data.user.date_of_birth || '',
        contact_number: data.user.contact_number || '',
        bio: data.user.bio || '',
      };
      setForm(saved);
      setOriginal(saved);
      setEditing(false);
      showToast('success', 'Profile saved successfully!');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(original);
    setEditing(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Loading profile…
      </div>
    );
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(original);

  return (
    <div style={{
      minHeight: '100%',
      padding: '32px 24px',
      maxWidth: '780px',
      margin: '0 auto',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Page Title */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>My Profile</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
          Manage your personal information and appearance
        </p>
      </div>

      {/* Toast */}
      {toast.type && (
        <div className="animate-slide" style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          fontSize: '0.875rem',
          fontWeight: 500,
          zIndex: 9999,
          boxShadow: 'var(--shadow-lg)',
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Avatar Section */}
      <div className="glass" style={{
        borderRadius: 'var(--radius-lg)',
        padding: '28px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '28px',
        flexWrap: 'wrap',
      }}>
        {/* Current Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', minWidth: '110px' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={form.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.username)}`}
              alt={form.username}
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                border: '3px solid var(--color-primary)',
                boxShadow: '0 0 0 4px var(--color-primary-glow)',
                objectFit: 'cover',
                background: 'var(--bg-surface)',
              }}
            />
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current photo</span>
        </div>

        {/* Avatar Controls */}
        {editing && (
          <div style={{ flex: 1, minWidth: '260px' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Change avatar
            </p>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {(['dicebear', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAvatarMode(mode)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: avatarMode === mode ? 'var(--color-primary)' : 'transparent',
                    borderColor: avatarMode === mode ? 'var(--color-primary)' : 'var(--border-color)',
                    color: avatarMode === mode ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {mode === 'dicebear' ? '🎨 Generate' : '🔗 URL'}
                </button>
              ))}
            </div>

            {avatarMode === 'dicebear' ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <img
                  src={previewDicebear}
                  alt="preview"
                  style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                />
                <input
                  type="text"
                  placeholder="Seed text (e.g. your name)"
                  value={avatarSeedInput}
                  onChange={(e) => setAvatarSeedInput(e.target.value)}
                  style={{ flex: 1, minWidth: '140px' }}
                />
                <button
                  onClick={applyDicebear}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', background: 'var(--color-primary)',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    color: '#fff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  <RefreshCw size={13} /> Apply
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Paste image URL…"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  style={{ flex: 1, minWidth: '200px' }}
                />
                <button
                  onClick={applyCustomUrl}
                  style={{
                    padding: '8px 14px', background: 'var(--color-primary)',
                    border: 'none', borderRadius: 'var(--radius-sm)',
                    color: '#fff', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )}

        {/* User info summary (not editing) */}
        {!editing && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {form.username}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 8px' }}>{form.email}</p>
            {form.bio && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, maxWidth: '420px' }}>
                {form.bio}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Profile Fields Card */}
      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Personal Information
          </h3>
          {!editing ? (
            <button
              id="edit-profile-btn"
              onClick={() => setEditing(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 16px',
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-primary)',
                fontSize: '0.85rem', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
            >
              <Pencil size={14} /> Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCancel}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem', fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <X size={14} /> Cancel
              </button>
              <button
                id="save-profile-btn"
                onClick={handleSave}
                disabled={saving || !isDirty}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 18px',
                  background: isDirty && !saving ? 'var(--color-primary)' : 'rgba(99,102,241,0.3)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  fontSize: '0.85rem', fontWeight: 500,
                  cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Username */}
          <FieldRow
            icon={<User size={15} />}
            label="Display Name"
            id="profile-username"
            value={form.username}
            editing={editing}
            onChange={(v) => handleChange('username', v)}
            placeholder="Your display name"
          />

          {/* Email — read only */}
          <FieldRow
            icon={<Mail size={15} />}
            label="Email Address"
            id="profile-email"
            value={form.email}
            editing={false}
            onChange={() => { }}
            placeholder=""
            hint="Email cannot be changed"
          />

          {/* Contact */}
          <FieldRow
            icon={<Phone size={15} />}
            label="Contact Number"
            id="profile-contact"
            value={form.contact_number}
            editing={editing}
            onChange={(v) => handleChange('contact_number', v)}
            placeholder="+1 (555) 000-0000"
            type="tel"
          />

          {/* Date of Birth */}
          <FieldRow
            icon={<CalendarDays size={15} />}
            label="Date of Birth"
            id="profile-dob"
            value={form.date_of_birth}
            editing={editing}
            onChange={(v) => handleChange('date_of_birth', v)}
            placeholder="YYYY-MM-DD"
            type="date"
          />

          {/* Organization */}
          <FieldRow
            icon={<Building2 size={15} />}
            label="Organization"
            id="profile-organization"
            value={form.organization}
            editing={editing}
            onChange={(v) => handleChange('organization', v)}
            placeholder="Your company or team"
          />

          {/* Education */}
          <FieldRow
            icon={<GraduationCap size={15} />}
            label="Education"
            id="profile-education"
            value={form.education}
            editing={editing}
            onChange={(v) => handleChange('education', v)}
            placeholder="e.g. B.Sc. Computer Science"
          />
        </div>

        {/* Bio — full width */}
        <div style={{ marginTop: '20px' }}>
          <label
            htmlFor="profile-bio"
            style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '7px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            <User size={13} /> Bio
          </label>
          {editing ? (
            <textarea
              id="profile-bio"
              value={form.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Write a short bio about yourself…"
              rows={3}
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          ) : (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              color: form.bio ? 'var(--text-secondary)' : 'var(--text-muted)',
              lineHeight: 1.5,
              minHeight: '56px',
            }}>
              {form.bio || <span style={{ fontStyle: 'italic' }}>No bio set</span>}
            </div>
          )}
        </div>
      </div>

      {/* Stats / meta card */}
      <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: '20px 28px' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>
          Account
        </h3>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <MetaStat label="User ID" value={`#${user?.id}`} />
          <MetaStat label="Username" value={form.username} />
          <MetaStat label="Email" value={form.email} />
        </div>
      </div>
    </div>
  );
};

// ── Reusable sub-components ──────────────────────────────────────

interface FieldRowProps {
  icon: React.ReactNode;
  label: string;
  id: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  hint?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({ icon, label, id, value, editing, onChange, placeholder, type = 'text', hint }) => (
  <div>
    <label
      htmlFor={id}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '7px',
        fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}
    >
      {icon} {label}
    </label>
    {editing ? (
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    ) : (
      <div style={{
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.9rem',
        color: value ? 'var(--text-secondary)' : 'var(--text-muted)',
      }}>
        {value || <span style={{ fontStyle: 'italic' }}>Not set</span>}
      </div>
    )}
    {hint && <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '5px' }}>{hint}</p>}
  </div>
);

const MetaStat: React.FC<{ label: string; value: string | undefined }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value || '—'}</div>
  </div>
);