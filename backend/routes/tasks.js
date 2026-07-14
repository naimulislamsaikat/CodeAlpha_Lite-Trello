import express from 'express';
import { dbRun, dbGet, dbAll } from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to check access via list_id
const checkAccessByListId = async (listId, userId) => {
  const list = await dbGet('SELECT * FROM lists WHERE id = ?', [listId]);
  if (!list) return { hasAccess: false, errorStatus: 404, errorMessage: 'Column/List not found' };

  const project = await dbGet('SELECT * FROM projects WHERE id = ?', [list.project_id]);
  if (!project) return { hasAccess: false, errorStatus: 404, errorMessage: 'Project not found' };

  const member = await dbGet(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [project.id, userId]
  );

  if (project.owner_id === userId || member) {
    return { hasAccess: true, projectId: project.id, project, list };
  }
  return { hasAccess: false, errorStatus: 403, errorMessage: 'Access denied' };
};

// Helper to check access via task_id
const checkAccessByTaskId = async (taskId, userId) => {
  const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) return { hasAccess: false, errorStatus: 404, errorMessage: 'Task not found' };
  return checkAccessByListId(task.list_id, userId);
};

// GET TASK BY ID
router.get('/:id', authMiddleware, async (req, res) => {
  const taskId = req.params.id;
  try {
    const task = await dbGet(`
      SELECT t.*, u.username as assignee_name, u.avatar_url as assignee_avatar,
             (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comment_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [taskId]);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { hasAccess } = await checkAccessByListId(task.list_id, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this task' });
    }

    return res.json(task);
  } catch (err) {
    console.error('Fetch task detail error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// CREATE TASK
router.post('/', authMiddleware, async (req, res) => {
  const { listId, title, description, assigneeId, priority, dueDate } = req.body;

  if (!listId || !title) {
    return res.status(400).json({ error: 'Column ID and title are required' });
  }

  try {
    const { hasAccess, projectId, project } = await checkAccessByListId(listId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to create tasks in this project' });
    }

    // Get max position in this list
    const maxPosRow = await dbGet('SELECT MAX(position) as maxPos FROM tasks WHERE list_id = ?', [listId]);
    const position = (maxPosRow && maxPosRow.maxPos !== null) ? maxPosRow.maxPos + 1 : 0;

    const result = await dbRun(
      `INSERT INTO tasks (list_id, title, description, assignee_id, priority, due_date, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        listId,
        title,
        description || '',
        assigneeId || null,
        priority || 'medium',
        dueDate || null,
        position
      ]
    );

    const taskId = result.id;

    const newTask = await dbGet(`
      SELECT t.*, u.username as assignee_name, u.avatar_url as assignee_avatar, 0 as comment_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [taskId]);

    // Trigger notification if assigned to someone else
    if (assigneeId && assigneeId !== req.user.id) {
      const notifResult = await dbRun(
        'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)',
        [
          assigneeId,
          `Assigned to task: "${title}"`,
          `${req.user.username} assigned you to the task "${title}" in project "${project.name}"`
        ]
      );

      req.io.to(`user_${assigneeId}`).emit('new-notification', {
        id: notifResult.id,
        user_id: assigneeId,
        title: `Assigned to task: "${title}"`,
        content: `${req.user.username} assigned you to the task "${title}" in project "${project.name}"`,
        is_read: 0,
        created_at: new Date().toISOString()
      });
    }

    // Broadcast board change to project room
    req.io.to(`project_${projectId}`).emit('board-updated', {
      type: 'TASK_CREATED',
      projectId,
      senderId: req.user.id,
      task: newTask
    });

    return res.status(201).json(newTask);
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ error: 'Server error creating task' });
  }
});

// UPDATE TASK (details or movement)
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, description, assigneeId, priority, dueDate, listId, position } = req.body;
  const taskId = req.params.id;

  try {
    const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check access to original list
    const originalAccess = await checkAccessByListId(task.list_id, req.user.id);
    if (!originalAccess.hasAccess) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // If moving to another list, check access to that list too
    if (listId && listId !== task.list_id) {
      const targetAccess = await checkAccessByListId(listId, req.user.id);
      if (!targetAccess.hasAccess) {
        return res.status(403).json({ error: 'Not authorized to move to this column' });
      }
    }

    // Prepare fields to update
    const currentListId = listId !== undefined ? listId : task.list_id;
    const currentPosition = position !== undefined ? position : task.position;
    const currentTitle = title !== undefined ? title : task.title;
    const currentDesc = description !== undefined ? description : task.description;
    const currentAssignee = assigneeId !== undefined ? assigneeId : task.assignee_id;
    const currentPriority = priority !== undefined ? priority : task.priority;
    const currentDueDate = dueDate !== undefined ? dueDate : task.due_date;

    // Check if assignee has changed
    const assigneeChanged = currentAssignee !== task.assignee_id && currentAssignee !== null;

    await dbRun(
      `UPDATE tasks 
       SET title = ?, description = ?, assignee_id = ?, priority = ?, due_date = ?, list_id = ?, position = ?
       WHERE id = ?`,
      [
        currentTitle,
        currentDesc,
        currentAssignee,
        currentPriority,
        currentDueDate,
        currentListId,
        currentPosition,
        taskId
      ]
    );

    // If assignee changed, alert them
    if (assigneeChanged && currentAssignee !== req.user.id) {
      const notifResult = await dbRun(
        'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)',
        [
          currentAssignee,
          `Assigned to task: "${currentTitle}"`,
          `${req.user.username} assigned you to the task "${currentTitle}" in project "${originalAccess.project.name}"`
        ]
      );

      req.io.to(`user_${currentAssignee}`).emit('new-notification', {
        id: notifResult.id,
        user_id: currentAssignee,
        title: `Assigned to task: "${currentTitle}"`,
        content: `${req.user.username} assigned you to the task "${currentTitle}" in project "${originalAccess.project.name}"`,
        is_read: 0,
        created_at: new Date().toISOString()
      });
    }

    const updatedTask = await dbGet(`
      SELECT t.*, u.username as assignee_name, u.avatar_url as assignee_avatar,
             (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comment_count
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `, [taskId]);

    // Broadcast board change to project room
    req.io.to(`project_${originalAccess.projectId}`).emit('board-updated', {
      type: 'TASK_UPDATED',
      projectId: originalAccess.projectId,
      senderId: req.user.id,
      task: updatedTask
    });

    return res.json(updatedTask);
  } catch (err) {
    console.error('Update task error:', err);
    return res.status(500).json({ error: 'Server error updating task' });
  }
});

// DELETE TASK
router.delete('/:id', authMiddleware, async (req, res) => {
  const taskId = req.params.id;
  try {
    const { hasAccess, projectId } = await checkAccessByTaskId(taskId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Not authorized to delete this task' });
    }

    await dbRun('DELETE FROM tasks WHERE id = ?', [taskId]);

    // Broadcast board change to project room
    req.io.to(`project_${projectId}`).emit('board-updated', {
      type: 'TASK_DELETED',
      projectId,
      senderId: req.user.id,
      taskId: parseInt(taskId)
    });

    return res.json({ message: 'Task deleted successfully', taskId: parseInt(taskId) });
  } catch (err) {
    console.error('Delete task error:', err);
    return res.status(500).json({ error: 'Server error deleting task' });
  }
});

export default router;