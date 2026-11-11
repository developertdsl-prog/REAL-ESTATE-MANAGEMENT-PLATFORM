require('dotenv').config();

const express = require('express');
const router = express.Router();
const pool = require('../backend').pool;
const jwt = require('jsonwebtoken');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token.' });
    }
    req.user = user;
    next();
  });
};

// Check role middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, email, role, name, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    const [result] = await pool.query(
      'UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?',
      [name, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [updatedUsers] = await pool.query(
      'SELECT id, email, role, name, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    res.json({ user: updatedUsers[0], message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @route   GET /api/users/agents
// @desc    Get all agents (with optional filters)
// @access  Private (Admin or Agent)
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const { name_search, status } = req.query;
    const conditions = [];
    const params = [];

    if (name_search) {
      conditions.push('(name LIKE ?)');
      params.push(`%${name_search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [agents] = await pool.query(`
      SELECT a.id, u.name, u.email, u.role, a.license_number, a.commission_rate, u.created_at
      FROM agents a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
    `, params);

    res.json({ agents });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ message: 'Server error fetching agents' });
  }
});

// @route   POST /api/users/agents
// @desc    Create/Register an agent
// @access  Private (Admin only)
router.post('/agents', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { license_number, commission_rate, userId } = req.body;

    // If userId provided, link to existing user; otherwise create will be handled separately
    const [result] = await pool.query(
      'INSERT INTO agents (user_id, license_number, commission_rate) VALUES (?, ?, ?)',
      [userId || null, license_number, commission_rate || 3.0]
    );

    res.status(201).json({ agentId: result.insertId, message: 'Agent created successfully' });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ message: 'Server error creating agent' });
  }
});

// @route   PUT /api/users/agents/:id
// @desc    Update agent profile
// @access  Private (Admin or Agent)
router.put('/agents/:id', authenticateToken, authorizeRoles('admin', 'agent'), async (req, res) => {
  try {
    const { commission_rate } = req.body;

    const [result] = await pool.query(
      'UPDATE agents SET commission_rate = ? WHERE id = ?',
      [commission_rate, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({ message: 'Agent updated successfully' });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ message: 'Server error updating agent' });
  }
});

// @route   GET /api/users/owners
// @desc    Get all property owners (with optional filters)
// @access  Private (Admin or Owner)
router.get('/owners', authenticateToken, async (req, res) => {
  try {
    const { name_search, company_name } = req.query;
    const conditions = [];
    const params = [];

    if (name_search) {
      conditions.push('u.name LIKE ?');
      params.push(`%${name_search}%`);
    }
    if (company_name) {
      conditions.push('po.company_name LIKE ?');
      params.push(`%${company_name}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [owners] = await pool.query(`
      SELECT po.id, u.name, u.email, u.role, po.company_name, po.phone, u.created_at
      FROM property_owners po
      JOIN users u ON po.user_id = u.id
      ${whereClause}
    `, params);

    res.json({ owners });
  } catch (error) {
    console.error('Get owners error:', error);
    res.status(500).json({ message: 'Server error fetching owners' });
  }
});

// @route   POST /api/users/owners
// @desc    Create/Register a property owner
// @access  Private (Admin only)
router.post('/owners', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {    const { company_name, phone, userId } = req.body;

    const [result] = await pool.query(
      'INSERT INTO property_owners (user_id, company_name, phone) VALUES (?, ?, ?)',
      [userId || null, company_name || '', phone || '']
    );

    res.status(201).json({ ownerId: result.insertId, message: 'Owner created successfully' });
  } catch (error) {
    console.error('Create owner error:', error);
    res.status(500).json({ message: 'Server error creating owner' });
  }
});

// @route   PUT /api/users/owners/:id
// @desc    Update property owner profile
// @access  Private (Admin or Owner)
router.put('/owners/:id', authenticateToken, authorizeRoles('admin', 'owner'), async (req, res) => {
  try {
    const { company_name, phone } = req.body;

    const [result] = await pool.query(
      'UPDATE property_owners SET company_name = ?, phone = ? WHERE id = ?',
      [company_name, phone, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    res.json({ message: 'Owner updated successfully' });
  } catch (error) {
    console.error('Update owner error:', error);
    res.status(500).json({ message: 'Server error updating owner' });
  }
});

// @route   GET /api/users/buyers
// @desc    Get all buyers (with optional filters)
// @access  Private (Admin or Buyer)
router.get('/buyers', authenticateToken, async (req, res) => {
  try {
    const { name_search } = req.query;
    const conditions = [];
    const params = [];

    if (name_search) {
      conditions.push('u.name LIKE ?');
      params.push(`%${name_search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [buyers] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at
      FROM users u
      ${whereClause}
      WHERE u.role = 'buyer'
    `, params);

    res.json({ buyers });
  } catch (error) {
    console.error('Get buyers error:', error);
    res.status(500).json({ message: 'Server error fetching buyers' });
  }
});

// @route   GET /api/users/tenants
// @desc    Get all tenants (with optional filters)
// @access  Private (Admin or Tenant)
router.get('/tenants', authenticateToken, async (req, res) => {
  try {
    const { name_search } = req.query;
    const conditions = [];
    const params = [];

    if (name_search) {
      conditions.push('u.name LIKE ?');
      params.push(`%${name_search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [tenants] = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at
      FROM users u
      ${whereClause}
      WHERE u.role = 'tenant'
    `, params);

    res.json({ tenants });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ message: 'Server error fetching tenants' });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user account status (activate/deactivate)
// @access  Private (Admin only)
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { is_active } = req.body;

    const [result] = await pool.query(
      'UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [is_active, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: is_active ? 'Account activated' : 'Account deactivated' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error updating user status' });
  }
});

module.exports = router;