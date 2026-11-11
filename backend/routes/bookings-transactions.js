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

// Helper function for role authorization
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Required roles: ${allowedRoles.join(', ')}` });
    }
    next();
  }
}

// ==========================================
// FAVORITES
// ==========================================

// @route   POST /api/favorites
// @desc    Add property to favorites
// @access  Private (All authenticated users)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    // Check if already in favorites
    const [existing] = await pool.query(
      'SELECT * FROM favorites WHERE user_id = ? AND property_id = ?',
      [req.user.userId, propertyId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Property already in favorites' });
    }

    const [result] = await pool.query(
      'INSERT INTO favorites (user_id, property_id) VALUES (?, ?)',
      [req.user.userId, propertyId]
    );

    res.status(201).json({ favoriteId: result.insertId, message: 'Property added to favorites' });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ message: 'Server error adding to favorites' });
  }
});

// @route   DELETE /api/favorites/:propertyId
// @desc    Remove property from favorites
// @access  Private (All authenticated users)
router.delete('/:propertyId', authenticateToken, async (req, res) => {
  try {
    const { propertyId } = req.params;

    const [result] = await pool.query(
      'DELETE FROM favorites WHERE user_id = ? AND property_id = ?',
      [req.user.userId, propertyId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not in favorites' });
    }

    res.json({ message: 'Property removed from favorites' });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ message: 'Server error removing from favorites' });
  }
});

// @route   GET /api/favorites
// @desc    Get user's favorite properties
// @access  Private (All authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [favorites] = await pool.query(`
      SELECT f.id, p.id, p.title, p.price, p.type, p.property_type, 
             p.bedrooms, p.bathrooms, p.location, p.image, p.availability_status
      FROM favorites f
      JOIN properties p ON f.property_id = p.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.user.userId]);

    res.json({ favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Server error fetching favorites' });
  }
});

// ==========================================
// BOOKINGS
// ==========================================

// @route   POST /api/bookings
// @desc    Create booking request (Purchase or Rental)
// @access  Private (Buyer or Tenant)
router.post('/', authenticateToken, authorizeRoles('buyer', 'tenant'), async (req, res) => {
  try {
    const { propertyId, bookingType, depositAmount, totalAmount } = req.body;

    if (!propertyId || !bookingType) {
      return res.status(400).json({ message: 'Property ID and booking type are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO bookings (property_id, user_id, booking_type, status, deposit_amount, total_amount)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [propertyId, req.user.userId, bookingType, depositAmount || 0, totalAmount || 0]
    );

    res.status(201).json({
      bookingId: result.insertId,
      message: 'Booking request submitted successfully',
      status: 'pending'
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error creating booking' });
  }
});

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private (All authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [bookings] = await pool.query(`
      SELECT b.id, p.title, b.booking_type, b.status, b.deposit_amount, b.total_amount, b.created_at
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.userId]);

    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
});

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private (Admin)
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'rejected', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const [result] = await pool.query(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: `Booking status updated to ${status}` });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error updating booking status' });
  }
});

// ==========================================
// TRANSACTIONS
// ==========================================

// @route   POST /api/transactions
// @desc    Create transaction (Sale or Rental)
// @access  Private (Admin)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { propertyId, userId, bookingType, transactionType, amount, paymentMethod } = req.body;

    if (!propertyId || !bookingType || !transactionType || !amount) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const [result] = await pool.query(
      `INSERT INTO transactions (property_id, user_id, booking_type, transaction_type, amount, payment_status, payment_method)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [propertyId, userId || req.user.userId, bookingType, transactionType, amount, paymentMethod || '']
    );

    res.status(201).json({
      transactionId: result.insertId,
      message: 'Transaction recorded successfully',
      status: 'pending'
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error creating transaction' });
  }
});

// @route   GET /api/transactions
// @desc    Get transactions (filtered by user or property)
// @access  Private (Admin or Owner)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, propertyId, type } = req.query;
    const conditions = [];
    const params = [];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(Number(userId));
    }
    if (propertyId) {
      conditions.push('property_id = ?');
      params.push(Number(propertyId));
    }
    if (type) {
      conditions.push('transaction_type = ?');
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [transactions] = await pool.query(`
      SELECT t.id, p.title, t.booking_type, t.transaction_type, t.amount, t.payment_status, t.transaction_date
      FROM transactions t
      JOIN properties p ON t.property_id = p.id
      ${whereClause}
      ORDER BY t.transaction_date DESC
    `, params);

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
});

// @route   PUT /api/transactions/:id/pay
// @desc    Mark transaction as paid
// @access  Private (Admin)
router.put('/:id/pay', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE transactions SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      ['completed', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Create a payment record
    await pool.query(
      `INSERT INTO payments (transaction_id, user_id, property_id, amount, payment_status, payment_date)
       VALUES (?, ?, ?, ?, 'completed', NOW())`,
      [req.params.id, req.user.userId || null, null, null]
    );

    res.json({ message: 'Transaction marked as paid and receipt generated' });
  } catch (error) {
    console.error('Pay transaction error:', error);
    res.status(500).json({ message: 'Server error processing payment' });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get transaction details
// @access  Private (Admin or Owner)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [transactions] = await pool.query(`
      SELECT t.id, p.title, t.booking_type, t.transaction_type, t.amount, t.payment_status, t.transaction_date, u.name as user_name
      FROM transactions t
      JOIN properties p ON t.property_id = p.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transactions[0]);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error fetching transaction' });
  }
});

module.exports = router;