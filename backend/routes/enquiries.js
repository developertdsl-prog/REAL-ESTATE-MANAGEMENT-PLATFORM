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

// @route   POST /api/enquiries
// @desc    Submit property enquiry (Buyer/Tenant)
// @access  Private (Buyer or Tenant)
router.post('/', authenticateToken, authorizeRoles('buyer', 'tenant'), async (req, res) => {
  try {
    const { propertyId, name, email, phone, message } = req.body;

    if (!propertyId || !name || !email || !phone) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO enquiries (property_id, user_id, name, email, phone, message, status)
       VALUES (?, ?, ?, ?, ?, ?, 'new')`,
      [propertyId, req.user.userId, name, email, phone, message]
    );

    // Create a lead from the enquiry
    await pool.query(
      `INSERT INTO leads (user_id, property_id, agent_id, status) VALUES (?, ?, NULL, 'new')`,
      [req.user.userId, propertyId]
    );

    res.status(201).json({
      message: 'Enquiry submitted successfully',
      enquiryId: result.insertId,
      leadCreated: true
    });
  } catch (error) {
    console.error('Submit enquiry error:', error);
    res.status(500).json({ message: 'Server error submitting enquiry' });
  }
});

// @route   GET /api/enquiries
// @desc    Get all enquiries (paginated and filterable)
// @access  Private (Admin)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const {
      page = 1, limit = 20, propertyId, status, userId, search
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (propertyId) {
      conditions.push('property_id = ?');
      params.push(Number(propertyId));
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (userId) {
      conditions.push('user_id = ?');
      params.push(Number(userId));
    }
    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [enquiries] = await pool.query(`
      SELECT e.id, p.title, e.name, e.email, e.phone, e.status, e.created_at
      FROM enquiries e
      JOIN properties p ON e.property_id = p.id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    const [total] = await pool.query(`
      SELECT COUNT(*) as count FROM enquiries e ${whereClause}
    `, params);

    res.json({
      enquiries,
      total: total[0].count,
      page: Number(page),
      totalPages: Math.ceil(total[0].count / Number(limit))
    });
  } catch (error) {
    console.error('Get enquiries error:', error);
    res.status(500).json({ message: 'Server error fetching enquiries' });
  }
});

// @route   PUT /api/enquiries/:id/status
// @desc    Update enquiry status
// @access  Private (Admin)
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'contacted', 'interested', 'follow-up', 'converted', 'closed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const [result] = await pool.query(
      'UPDATE enquiries SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    res.json({ message: `Enquiry status updated to ${status}` });
  } catch (error) {
    console.error('Update enquiry status error:', error);
    res.status(500).json({ message: 'Server error updating enquiry status' });
  }
});

// Helper function for role authorization
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }
    next();
  }
}

module.exports = router;