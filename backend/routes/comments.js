import express from 'express';
import { dbRun, dbGet, dbAll } from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to check access via task_id
const checkAccessByTaskId = async (taskId, userId) => {
  const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) return { hasAccess: false, errorStatus: 404, errorMessage: 'Task not found' };

  const list = await dbGet('SELECT * FROM lists WHERE id = ?', [task.list_id]);
  const project = await dbGet('SELECT * FROM projects WHERE id = ?', [list.project_id]);
  const member = await dbGet(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [project.id, userId]
  );

  if (project.owner_id === userId || member) {
    return { hasAccess: true, project, task, list };
  }
  return { hasAccess: false, errorStatus: 403, errorMessage: 'Access denied' };
};

// GET COMMENTS FOR TASK
router.get('/', authMiddleware, async (req, res) => {
  const { taskId } = req.query;
  if (!taskId) {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
    const { hasAccess } = await checkAccessByTaskId(taskId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to view comments on this task' });
    }

    const comments = await dbAll(
      `SELECT c.*, u.username, u.avatar_url 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [taskId]
    );

    return res.json(comments);
  } catch (err) {
    console.error('Fetch comments error:', err);
    return res.status(500).json({ error: 'Server error fetching comments' });
  }
});

// CREATE COMMENT
router.post('/', authMiddleware, async (req, res) => {
  const { taskId, content } = req.body;
  if (!taskId || !content) {
    return res.status(400).json({ error: 'Task ID and comment content are required' });
  }

  try {
    const { hasAccess, project, task } = await checkAccessByTaskId(taskId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to comment on this task' });
    }

    // Insert comment
    const result = await dbRun(
      'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)',
      [taskId, req.user.id, content]
    );
    const commentId = result.id;

    const newComment = await dbGet(
      `SELECT c.*, u.username, u.avatar_url 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    // Create notifications for other users
    // Notify the assignee (if there is one, and it is not the commenter)
    if (task.assignee_id && task.assignee_id !== req.user.id) {
      const notifResult = await dbRun(
        'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)',
        [
          task.assignee_id,
          `New comment on your task: "${task.title}"`,
          `${req.user.username} commented on "${task.title}": "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`
        ]
      );

      req.io.to(`user_${task.assignee_id}`).emit('new-notification', {
        id: notifResult.id,
        user_id: task.assignee_id,
        title: `New comment on your task: "${task.title}"`,
        content: `${req.user.username} commented on "${task.title}": "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`,
        is_read: 0,
        created_at: new Date().toISOString()
      });
    }

    // Notify the project owner (if the owner is not the commenter, and not already notified as assignee)
    if (project.owner_id !== req.user.id && project.owner_id !== task.assignee_id) {
      const notifResult = await dbRun(
        'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)',
        [
          project.owner_id,
          `New comment in project ${project.name}`,
          `${req.user.username} commented on task "${task.title}": "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`
        ]
      );

      req.io.to(`user_${project.owner_id}`).emit('new-notification', {
        id: notifResult.id,
        user_id: project.owner_id,
        title: `New comment in project ${project.name}`,
        content: `${req.user.username} commented on task "${task.title}": "${content.slice(0, 40)}${content.length > 40 ? '...' : ''}"`,
        is_read: 0,
        created_at: new Date().toISOString()
      });
    }

    // Broadcast board change (comment added) to project room
    req.io.to(`project_${project.id}`).emit('board-updated', {
      type: 'COMMENT_ADDED',
      projectId: project.id,
      senderId: req.user.id,
      comment: newComment
    });

    return res.status(201).json(newComment);
  } catch (err) {
    console.error('Create comment error:', err);
    return res.status(500).json({ error: 'Server error adding comment' });
  }
});

export default router;