import express from 'express';
import { dbRun, dbGet, dbAll } from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to check if user is a member of the project
const checkProjectMembership = async (projectId, userId) => {
  const member = await dbGet(
    'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);

  if (!project) return { isMember: false, errorStatus: 404, errorMessage: 'Project not found' };

  const isOwner = project.owner_id === userId;
  if (isOwner || member) {
    return { isMember: true, isOwner, project };
  }

  return { isMember: false, errorStatus: 403, errorMessage: 'Access denied: Not a member of this project' };
};

// GET ALL PROJECTS FOR CURRENT USER (Owner or Member)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await dbAll(`
      SELECT DISTINCT p.*, u.username as owner_name, u.avatar_url as owner_avatar 
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.owner_id = ? OR pm.user_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id, req.user.id]);

    return res.json(projects);
  } catch (err) {
    console.error('Fetch projects error:', err);
    return res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// GET PROJECT BY ID (with lists, tasks, members)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { isMember, errorStatus, errorMessage, project } = await checkProjectMembership(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(errorStatus).json({ error: errorMessage });
    }

    // Fetch lists
    const lists = await dbAll(
      'SELECT * FROM lists WHERE project_id = ? ORDER BY position ASC',
      [project.id]
    );

    // Fetch tasks grouped by lists, with assignee information and comments count
    const tasks = await dbAll(`
      SELECT t.*, u.username as assignee_name, u.avatar_url as assignee_avatar,
             (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) as comment_count
      FROM tasks t
      JOIN lists l ON t.list_id = l.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE l.project_id = ?
      ORDER BY t.position ASC
    `, [project.id]);

    // Fetch project members
    const members = await dbAll(`
      SELECT u.id, u.username, u.email, u.avatar_url, 
             CASE WHEN p.owner_id = u.id THEN 'owner' ELSE pm.role END as role
      FROM users u
      LEFT JOIN project_members pm ON u.id = pm.user_id
      LEFT JOIN projects p ON pm.project_id = p.id
      WHERE pm.project_id = ? OR p.id = ?
      GROUP BY u.id
    `, [project.id, project.id]);

    // Construct the structured response
    const boardLists = lists.map(list => ({
      ...list,
      tasks: tasks.filter(task => task.list_id === list.id)
    }));

    return res.json({
      ...project,
      lists: boardLists,
      members
    });
  } catch (err) {
    console.error('Fetch project details error:', err);
    return res.status(500).json({ error: 'Server error fetching project details' });
  }
});

// CREATE NEW PROJECT
router.post('/', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    // 1. Create project
    const projectResult = await dbRun(
      'INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
      [name, description || '', req.user.id]
    );
    const projectId = projectResult.id;

    // 2. Add creator to project_members
    await dbRun(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [projectId, req.user.id, 'owner']
    );

    // 3. Seed default lists (To Do, In Progress, Done)
    await dbRun('INSERT INTO lists (project_id, name, position) VALUES (?, ?, ?)', [projectId, 'To Do', 0]);
    await dbRun('INSERT INTO lists (project_id, name, position) VALUES (?, ?, ?)', [projectId, 'In Progress', 1]);
    await dbRun('INSERT INTO lists (project_id, name, position) VALUES (?, ?, ?)', [projectId, 'Done', 2]);

    const project = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);
    return res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    return res.status(500).json({ error: 'Server error creating project' });
  }
});

// UPDATE PROJECT
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const { isMember, isOwner, errorStatus, errorMessage } = await checkProjectMembership(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(errorStatus).json({ error: errorMessage });
    }
    if (!isOwner) {
      return res.status(403).json({ error: 'Only the project owner can update project details' });
    }

    await dbRun(
      'UPDATE projects SET name = ?, description = ? WHERE id = ?',
      [name, description || '', req.params.id]
    );

    const updated = await dbGet('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    return res.json(updated);
  } catch (err) {
    console.error('Update project error:', err);
    return res.status(500).json({ error: 'Server error updating project' });
  }
});

// DELETE PROJECT
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { isMember, isOwner, errorStatus, errorMessage } = await checkProjectMembership(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(errorStatus).json({ error: errorMessage });
    }
    if (!isOwner) {
      return res.status(403).json({ error: 'Only the project owner can delete projects' });
    }

    await dbRun('DELETE FROM projects WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Project successfully deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    return res.status(500).json({ error: 'Server error deleting project' });
  }
});

// ADD PROJECT MEMBER / COLLABORATOR
router.post('/:id/members', authMiddleware, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required to add member' });
  }

  try {
    const { isMember, isOwner, errorStatus, errorMessage, project } = await checkProjectMembership(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(errorStatus).json({ error: errorMessage });
    }
    if (!isOwner) {
      return res.status(403).json({ error: 'Only project owners can invite members' });
    }

    // Check if user already a member
    const existing = await dbGet(
      'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
      [req.params.id, userId]
    );
    if (existing) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    // Add member
    await dbRun(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
      [req.params.id, userId, 'member']
    );

    // Create a notification for the invited user
    const notifResult = await dbRun(
      'INSERT INTO notifications (user_id, title, content) VALUES (?, ?, ?)',
      [
        userId,
        `Invited to ${project.name}`,
        `${req.user.username} added you as a collaborator to the project: "${project.name}"`
      ]
    );

    // Real-time notification trigger
    req.io.to(`user_${userId}`).emit('new-notification', {
      id: notifResult.id,
      user_id: userId,
      title: `Invited to ${project.name}`,
      content: `${req.user.username} added you as a collaborator to the project: "${project.name}"`,
      is_read: 0,
      created_at: new Date().toISOString()
    });

    const newMember = await dbGet('SELECT id, username, email, avatar_url FROM users WHERE id = ?', [userId]);

    return res.status(201).json({
      message: 'Member added successfully',
      member: {
        ...newMember,
        role: 'member'
      }
    });
  } catch (err) {
    console.error('Add project member error:', err);
    return res.status(500).json({ error: 'Server error adding member' });
  }
});

// CREATE BOARD COLUMN/LIST
router.post('/:id/lists', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Column name is required' });
  }

  try {
    const { isMember, errorStatus, errorMessage } = await checkProjectMembership(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(errorStatus).json({ error: errorMessage });
    }

    // Calculate next position
    const maxPosRow = await dbGet(
      'SELECT MAX(position) as maxPos FROM lists WHERE project_id = ?',
      [req.params.id]
    );
    const position = (maxPosRow && maxPosRow.maxPos !== null) ? maxPosRow.maxPos + 1 : 0;

    const result = await dbRun(
      'INSERT INTO lists (project_id, name, position) VALUES (?, ?, ?)',
      [req.params.id, name, position]
    );

    const newList = {
      id: result.id,
      project_id: parseInt(req.params.id),
      name,
      position,
      tasks: []
    };

    // Notify other users on the board
    req.io.to(`project_${req.params.id}`).emit('board-updated', {
      type: 'LIST_CREATED',
      projectId: parseInt(req.params.id),
      senderId: req.user.id,
      list: newList
    });

    return res.status(201).json(newList);
  } catch (err) {
    console.error('Create list error:', err);
    return res.status(500).json({ error: 'Server error creating column' });
  }
});

// UPDATE BOARD COLUMN/LIST
router.put('/:id/lists/:listId', authMiddleware, async (req, res) => {
  const { name, position } = req.body;

  try {
    const { isMember, errorStatus, errorMessage } = await checkProjectMembership(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(errorStatus).json({ error: errorMessage });
    }

    if (name !== undefined) {
      await dbRun('UPDATE lists SET name = ? WHERE id = ? AND project_id = ?', [name, req.params.listId, req.params.id]);
    }
    if (position !== undefined) {
      await dbRun('UPDATE lists SET position = ? WHERE id = ? AND project_id = ?', [position, req.params.listId, req.params.id]);
    }

    const updatedList = await dbGet('SELECT * FROM lists WHERE id = ?', [req.params.listId]);

    // Notify other users on the board
    req.io.to(`project_${req.params.id}`).emit('board-updated', {
      type: 'LIST_UPDATED',
      projectId: parseInt(req.params.id),
      senderId: req.user.id,
      list: updatedList
    });

    return res.json(updatedList);
  } catch (err) {
    console.error('Update list error:', err);
    return res.status(500).json({ error: 'Server error updating column' });
  }
});

// DELETE COLUMN/LIST
router.delete('/:id/lists/:listId', authMiddleware, async (req, res) => {
  try {
    const { isMember, errorStatus, errorMessage } = await checkProjectMembership(req.params.id, req.user.id);
    if (!isMember) {
      return res.status(errorStatus).json({ error: errorMessage });
    }

    await dbRun('DELETE FROM lists WHERE id = ? AND project_id = ?', [req.params.listId, req.params.id]);

    // Notify other users on the board
    req.io.to(`project_${req.params.id}`).emit('board-updated', {
      type: 'LIST_DELETED',
      projectId: parseInt(req.params.id),
      senderId: req.user.id,
      listId: parseInt(req.params.listId)
    });

    return res.json({ message: 'Column and its tasks deleted successfully' });
  } catch (err) {
    console.error('Delete list error:', err);
    return res.status(500).json({ error: 'Server error deleting column' });
  }
});

export default router;