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

// @route   POST /api/properties
// @desc    Create new property (Owner/Agent)
// @access  Private (Owner or Agent)
router.post('/', authenticateToken, authorizeRoles('admin', 'property_owner', 'agent'), async (req, res) => {
  try {
    const {
      title, description, price, type, property_type,
      bedrooms, bathrooms, area, location, city, state, postal_code,
      furnishing_status, availability_status, amenities, featured
    } = req.body;

    const ownerId = req.user.userId;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO properties 
      (title, description, price, type, property_type, bedrooms, bathrooms, 
       area, location, city, state, postal_code, furnishing_status, 
       availability_status, amenities, owner_id, featured, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title, description, price, type, property_type,
        bedrooms, bathrooms, area, location, city, state, postal_code,
        furnishing_status || 'unfurnished', availability_status || 'available',
        amenities || '', ownerId, featured || false
      ]
    );

    const propertyId = result.insertId;

    // If agent assigned, create agent-property assignment
    if (req.body.agentId) {
      await pool.query(
        `INSERT INTO agent_property_assignments (agent_id, property_id, assigned_by) VALUES (?, ?, ?)`,
        [req.body.agentId, propertyId, req.user.userId]
      );
    }

    res.status(201).json({
      message: 'Property created successfully',
      propertyId,
      property: {
        id: propertyId,
        title, description, price, type, property_type,
        bedrooms, bathrooms, area, location, city, state, postal_code,
        furnishing_status, availability_status, amenities, featured
      }
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ message: 'Server error creating property' });
  }
});

// @route   GET /api/properties
// @desc    Get all properties (with optional filters)
// @access  Private (All authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, limit = 10, search, location, price_min, price_max,
      property_type, bedrooms, bathrooms, area_min, area_max,
      type, availability_status, furnishing_status
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (location) {
      conditions.push('location LIKE ?');
      params.push(`%${location}%`);
    }
    if (price_min) {
      conditions.push('price >= ?');
      params.push(Number(price_min));
    }
    if (price_max) {
      conditions.push('price <= ?');
      params.push(Number(price_max));
    }
    if (property_type) {
      conditions.push('property_type = ?');
      params.push(property_type);
    }
    if (bedrooms) {
      conditions.push('bedrooms = ?');
      params.push(Number(bedrooms));
    }
    if (bathrooms) {
      conditions.push('bathrooms = ?');
      params.push(Number(bathrooms));
    }
    if (area_min) {
      conditions.push('area >= ?');
      params.push(Number(area_min));
    }
    if (area_max) {
      conditions.push('area <= ?');
      params.push(Number(area_max));
    }
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (availability_status) {
      conditions.push('availability_status = ?');
      params.push(availability_status);
    }
    if (furnishing_status) {
      conditions.push('furnishing_status = ?');
      params.push(furnishing_status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const [properties] = await pool.query(`
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [Number(limit), offset]);

    const [total] = await pool.query(`
      SELECT COUNT(*) as count FROM properties p ${whereClause}
    `, params);

    res.json({
      properties,
      total: total[0].count,
      page: Number(page),
      totalPages: Math.ceil(total[0].count / Number(limit))
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Server error fetching properties' });
  }
});

// @route   GET /api/properties/:id
// @desc    Get property by ID
// @access  Private (All authenticated users)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [properties] = await pool.query(`
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (properties.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(properties[0]);
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ message: 'Server error fetching property' });
  }
});

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private (Owner or Agent or Admin)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'property_owner', 'agent'), async (req, res) => {
  try {
    const {
      title, description, price, type, property_type,
      bedrooms, bathrooms, area, location, city, state, postal_code,
      furnishing_status, availability_status, amenities
    } = req.body;

    const [result] = await pool.query(
      `UPDATE properties 
      SET title = ?, description = ?, price = ?, type = ?, property_type = ?,
      bedrooms = ?, bathrooms = ?, area = ?, location = ?, city = ?, state = ?, 
      postal_code = ?, furnishing_status = ?, availability_status = ?, amenities = ?,
      updated_at = NOW()
      WHERE id = ?`,
      [
        title, description, price, type, property_type,
        bedrooms, bathrooms, area, location, city, state, postal_code,
        furnishing_status, availability_status, amenities, req.params.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ message: 'Server error updating property' });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete/Archive property
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM properties WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Server error deleting property' });
  }
});

// @route   GET /api/properties/categories
// @desc    Get all property categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM property_categories');
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// @route   POST /api/properties/:id/approve
// @desc    Approve property (Admin)
// @access  Private (Admin only)
router.post('/:id/approve', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE properties SET availability_status = ? WHERE id = ?',
      ['available', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json({ message: 'Property approved successfully' });
  } catch (error) {
    console.error('Approve property error:', error);
    res.status(500).json({ message: 'Server error approving property' });
  }
});

// @route   POST /api/properties/:id/assign-agent
// @desc    Assign agent to property
// @access  Private (Admin only)
router.post('/:id/assign-agent', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { agentId } = req.body;

    const [result] = await pool.query(
      'INSERT INTO agent_property_assignments (agent_id, property_id, assigned_by) VALUES (?, ?, ?)',
      [agentId, req.params.id, req.user.userId]
    );

    res.json({ message: 'Agent assigned successfully' });
  } catch (error) {
    console.error('Assign agent error:', error);
    res.status(500).json({ message: 'Server error assigning agent' });
  }
});

module.exports = router;