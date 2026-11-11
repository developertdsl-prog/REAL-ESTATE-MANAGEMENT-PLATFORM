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

// @route   POST /api/rental-agreements
// @desc    Create rental agreement
// @access  Private (Admin or Property Owner)
router.post('/', authenticateToken, authorizeRoles('admin', 'property_owner'), async (req, res) => {
  try {
    const { propertyId, tenantId, leaseStartDate, leaseEndDate, monthlyRent, securityDeposit, terms } = req.body;

    if (!propertyId || !leaseStartDate || !leaseEndDate || !monthlyRent) {
      return res.status(400).json({ message: 'Required fields missing: propertyId, leaseStartDate, leaseEndDate, monthlyRent' });
    }

    const [result] = await pool.query(
      `INSERT INTO rental_agreements (property_id, tenant_id, landlord_id, lease_start_date, lease_end_date, monthly_rent, security_deposit, terms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [propertyId, tenantId || null, req.user.userId, leaseStartDate, leaseEndDate, monthlyRent, securityDeposit || 0, terms || '']
    );

    res.status(201).json({ rentalAgreementId: result.insertId, message: 'Rental agreement created successfully' });
  } catch (error) {
    console.error('Create rental agreement error:', error);
    res.status(500).json({ message: 'Server error creating rental agreement' });
  }
});

// @route   GET /api/rental-agreements
// @desc    Get all rental agreements (filtered)
// @access  Private (Admin or Owner)
router.get('/', authenticateToken, authorizeRoles('admin', 'property_owner'), async (req, res) => {
  try {
    const { propertyId, tenantId, status } = req.query;
    const conditions = [];
    const params = [];

    if (propertyId) {
      conditions.push('property_id = ?');
      params.push(Number(propertyId));
    }
    if (tenantId) {
      conditions.push 'tenant_id = ?';
      params.push(Number(tenantId));
    }
    if (status) {
      conditions.push 'status = ?';
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [agreements] = await pool.query(`
      SELECT ra.*, p.title as property_name, u.name as tenant_name, u2.name as landlord_name
      FROM rental_agreements ra
      JOIN properties p ON ra.property_id = p.id
      LEFT JOIN users u ON ra.tenant_id = u.id
      LEFT JOIN users u2 ON ra.landlord_id = u2.id
      ${whereClause}
      ORDER BY ra.created_at DESC
    `, params);

    res.json({ agreements });
  } catch (error) {
    console.error('Get rental agreements error:', error);
    res.status(500).json({ message: 'Server error fetching rental agreements' });
  }
});

// @route   PUT /api/rental-agreements/:id
// @desc    Update rental agreement
// @access  Admin or Property Owner
router.put('/:id', authenticateToken, authorizeRoles('admin', 'property_owner'), async (req, res) => {
  try {
    const { leaseEndDate, monthlyRent, securityDeposit, terms } = req.body;

    const [result] = await pool.query(
      `UPDATE rental_agreements SET lease_end_date = ?, monthly_rent = ?, security_deposit = ?, terms = ?, updated_at = NOW() WHERE id = ?`,
      [leaseEndDate, monthlyRent, securityDeposit, terms, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }

    res.json({ message: 'Rental agreement updated successfully' });
  } catch (error) {
    console.error('Update rental agreement error:', error);
    res.status(500).json({ message: 'Server error updating rental agreement' });
  }
});

// @route   GET /api/rental-agreements/:id
// @desc    Get rental agreement details
// @access  Private (Admin or Tenant)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [agreements] = await pool.query(`
      SELECT ra.*, p.title as property_name, u.name as tenant_name, u2.name as landlord_name
      FROM rental_agreements ra
      JOIN properties p ON ra.property_id = p.id
      LEFT JOIN users u ON ra.tenant_id = u.id
      LEFT JOIN users u2 ON ra.landlord_id = u2.id
      WHERE ra.id = ?
    `, [req.params.id]);

    if (agreements.length === 0) {
      return res.status(404).json({ message: 'Rental agreement not found' });
    }

    res.json(agreements[0]);
  } catch (error) {
    console.error('Get rental agreement error:', error);
    res.status(500).json({ message: 'Server error fetching rental agreement' });
  }
});

// @route   GET /api/rentals/:propertyId/status
// @desc    Get rental property payment status
// @access  Private (Admin or Owner)
router.get('/:propertyId/status', authenticateToken, authorizeRoles('admin', 'property_owner'), async (req, res) => {
  try {
    const [payments] = await pool.query(`
      SELECT ra.*, 
             SUM(CASE WHEN p.payment_status = 'completed' THEN 1 ELSE 0 END) as payments_completed,
             SUM(CASE WHEN p.payment_status != 'completed' AND p.due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_count
      FROM rental_agreements ra
      LEFT JOIN payments p ON ra.id = p.rental_agreement_id
      WHERE ra.property_id = ?
      GROUP BY ra.id
    `, [req.params.propertyId]);

    res.json(payments[0] || { overdue_count: 0 });
  } catch (error) {
    console.error('Get rental status error:', error);
    res.status(500).json({ message: 'Server error fetching rental status' });
  }
});

// @route   POST /api/payments
// @desc    Record rent payment
// @access  Private (Tenant or Admin)
router.post('/', authenticateToken, authorizeRoles('tenant', 'admin'), async (req, res) => {
  try {
    const { rentalAgreementId, amount, dueDate, paymentMethod } = req.body;

    if (!rentalAgreementId || !amount) {
      return res.status(400).json({ message: 'Rental agreement ID and amount are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO payments (rental_agreement_id, user_id, amount, due_date, payment_method, payment_status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [rentalAgreementId, req.user.userId, amount, dueDate || null, paymentMethod || '']
    );

    res.status(201).json({ paymentId: result.insertId, message: 'Payment recorded successfully', status: 'pending' });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error recording payment' });
  });
});

// @route   GET /api/payments
// @desc    Get payment history
// @access  Private (Admin or Tenant)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rentalAgreementId, userId } = req.query;
    const conditions = [];
    const params = [];

    if (rentalAgreementId) {
      conditions.push 'rental_agreement_id = ?';
      params.push(Number(rentalAgreementId));
    }
    if (userId) {
      conditions.push 'user_id = ?';
      params.push(Number(userId));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [payments] = await pool.query(`
      SELECT p.*, ra.monthly_rent, r.title as property_name
      FROM payments p
      JOIN rental_agreements ra ON p.rental_agreement_id = ra.id
      JOIN properties r ON ra.property_id = r.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `, params);

    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error fetching payments' });
  }
});

// @route   PUT /api/payments/:id/status
// @desc    Update payment status
// @access  Admin
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const validStatuses = ['pending', 'completed', 'failed'];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const [result] = await pool.query(
      'UPDATE payments SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [paymentStatus, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({ message: `Payment status updated to ${paymentStatus}` });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ message: 'Server error updating payment status' });
  }
});

// @route   GET /api/documents
// @desc    Get uploaded documents
// @access  Private (Admin or Owner)
router.get('/', authenticateToken, authorizeRoles('admin', 'property_owner'), async (req, res) => {
  try {
    const { propertyId, type } = req.query;
    const conditions = [];
    const params = [];

    if (propertyId) {
      conditions.push 'property_id = ?';
      params.push(Number(propertyId));
    }
    if (type) {
      conditions.push 'type = ?';
      params.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Return default document structure (frontend will handle actual file uploads)
    const defaultDocuments = [
      { id: 1, name: 'Lease Agreement', type: 'lease', propertyId: propertyId || null, uploadedBy: req.user.userId, createdAt: new Date() },
      { id: 2, name: 'Property Deed', type: 'deed', propertyId: propertyId || null, uploadedBy: req.user.userId, createdAt: new Date() },
      { id: 3, name: 'ID Proof', type: 'identity', propertyId: propertyId || null, uploadedBy: req.user.userId, createdAt: new Date() }
    ];

    res.json({ documents: defaultDocuments });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error fetching documents' });
  }
});

// @route   POST /api/documents
// @desc    Upload document
// @access  Private (Admin or Owner)
router.post('/', authenticateToken, authorizeRoles('admin', 'property_owner'), async (req, res) => {
  try {
    const { propertyId, type, documentName } = req.body;

    // In a real implementation, this would handle file upload to Cloudinary or similar
    // For now, we'll record the document metadata
    const [result] = await pool.query(
      `INSERT INTO documents (property_id, type, document_name, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [propertyId || null, type || documentName, documentName || 'Document', req.user.userId]
    );

    res.status(201).json({ documentId: result.insertId, message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Server error uploading document' });
  }
});

module.exports = router;