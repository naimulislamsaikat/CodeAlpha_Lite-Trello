import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbRun, dbGet, dbAll } from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-trello-key-2026';

// SIGNUP
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    // Check if email already exists
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Auto-generate a beautiful avatar using dicebear initials
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}`;

    // Insert user
    const result = await dbRun(
      'INSERT INTO users (username, email, password_hash, avatar_url) VALUES (?, ?, ?, ?)',
      [username, email.toLowerCase(), passwordHash, avatarUrl]
    );

    const userId = result.id;

    // Sign JWT token
    const token = jwt.sign({ id: userId, email: email.toLowerCase(), username }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      token,
      user: {
        id: userId,
        username,
        email: email.toLowerCase(),
        avatar_url: avatarUrl,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error during signup' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Sign JWT
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// GET CURRENT USER PROFILE
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, username, email, avatar_url FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (err) {
    console.error('Fetch user error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// SEARCH USERS (for project invites)
router.get('/users', authMiddleware, async (req, res) => {
  const { search } = req.query;
  try {
    let users;
    if (search) {
      users = await dbAll(
        'SELECT id, username, email, avatar_url FROM users WHERE (username LIKE ? OR email LIKE ?) AND id != ? LIMIT 10',
        [`%${search}%`, `%${search}%`, req.user.id]
      );
    } else {
      users = await dbAll('SELECT id, username, email, avatar_url FROM users WHERE id != ? LIMIT 10', [req.user.id]);
    }
    return res.json(users);
  } catch (err) {
    console.error('Search users error:', err);
    return res.status(500).json({ error: 'Server error searching users' });
  }
});

// GET FULL PROFILE
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, username, email, avatar_url, organization, education, date_of_birth, contact_number, bio FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE PROFILE
router.put('/profile', authMiddleware, async (req, res) => {
  const { username, avatar_url, organization, education, date_of_birth, contact_number, bio } = req.body;
  try {
    await dbRun(
      `UPDATE users SET
        username = COALESCE(?, username),
        avatar_url = COALESCE(?, avatar_url),
        organization = ?,
        education = ?,
        date_of_birth = ?,
        contact_number = ?,
        bio = ?
      WHERE id = ?`,
      [username || null, avatar_url || null, organization, education, date_of_birth, contact_number, bio, req.user.id]
    );

    const updated = await dbGet(
      'SELECT id, username, email, avatar_url, organization, education, date_of_birth, contact_number, bio FROM users WHERE id = ?',
      [req.user.id]
    );

    // Re-issue token with updated username
    const token = jwt.sign(
      { id: updated.id, email: updated.email, username: updated.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ user: updated, token });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
});

export default router;