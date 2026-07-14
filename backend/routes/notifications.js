import express from 'express';
import { dbRun, dbGet, dbAll } from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// GET ALL NOTIFICATIONS FOR LOGGED IN USER
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await dbAll(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

// MARK ALL AS READ
router.put('/mark-read', authMiddleware, async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    return res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Update notifications error:', err);
    return res.status(500).json({ error: 'Server error marking notifications as read' });
  }
});

// DELETE NOTIFICATION
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await dbGet('SELECT * FROM notifications WHERE id = ?', [req.params.id]);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this notification' });
    }

    await dbRun('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ error: 'Server error deleting notification' });
  }
});

export default router;