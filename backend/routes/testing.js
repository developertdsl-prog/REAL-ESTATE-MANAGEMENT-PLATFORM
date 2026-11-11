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
// HEALTH CHECK
// ==========================================

// @route   GET /api/health detailed
// @desc    Detailed health check
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString,
    database: 'connected',
    version: '1.0.0'
  });
});

// @route   GET /api/status
// @desc    Application status
// @access  Public
router.get('/status', (req, res) => {
  res.json({
    application: 'Real Estate Management Platform',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: true,
      propertyManagement: true,
      search: true,
      rentals: true,
      favorites: true
    }
  });
});

// ==========================================
// REPORT ENDPOINTS
// ==========================================

// @route   GET /api/reports/dashboard
// @desc    Get dashboard data for reporting
// @access  Private (Admin)
router.get('/reports/dashboard', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    // Get statistics
    const [users] = await pool.query('SELECT COUNT(*) as total FROM users');
    const [properties] = await pool.query('SELECT COUNT(*) as total FROM properties');
    const [activeProperties] = await pool.query(
      'SELECT COUNT(*) as total FROM properties WHERE availability_status = ?',
      ['available']
    );
    const [enquiries] = await pool.query('SELECT COUNT(*) as total FROM enquiries');
    const [bookings] = await pool.query('SELECT COUNT(*) as total FROM bookings');
    const [rentalAgreements] = await pool.query('SELECT COUNT(*) as total FROM rental_agreements');
    const [transactions] = await pool.query('SELECT COUNT(*) as total FROM transactions');

    // Get recent activities
    const [recentProperties] = await pool.query(
      'SELECT id, title, price, created_at FROM properties ORDER BY created_at DESC LIMIT 5'
    );
    const [recentUsers] = await pool.query(
      'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );
    const [recentEnquiries] = await pool.query(
      'SELECT id, property_id, name, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 5'
    );

    res.json({
      statistics: {
        totalUsers: users[0].total,
        totalProperties: properties[0].total,
        activeProperties: activeProperties[0].total,
        totalEnquiries: enquiries[0].total,
        totalBookings: bookings[0].total,
        totalRentalAgreements: rentalAgreements[0].total,
        totalTransactions: transactions[0].total
      },
      recentActivities: {
        recentProperties,
        recentUsers,
        recentEnquiries
      }
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ message: 'Server error generating dashboard report' });
  }
});

// @route   GET /api/reports/properties
// @desc    Get property report data
// @access  Private (Admin)
router.get('/reports/properties', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { type, status } = req.query;
    const conditions = [];
    const params = [];

    if (type) {
      conditions.push 'property_type = ?';
      params.push(type);
    }
    if (status) {
      conditions.push 'availability_status = ?';
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [properties] = await pool.query(`
      SELECT property_type, COUNT(*) as count, AVG(price) as avg_price
      FROM properties ${whereClause}
      GROUP BY property_type
    `, params);

    res.json({ propertyReport: properties });
  } catch (error) {
    console.error('Property report error:', error);
    res.status(500).json({ message: 'Server error generating property report' });
  }
});

// @route   GET /api/reports/financial
// @desc    Get financial report data
// @access  Private (Admin)
router.get('/reports/financial', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    let dateCondition = '';
    if (period === 'monthly') {
      dateCondition = 'YEAR(transaction_date) = YEAR(NOW()) AND MONTH(transaction_date) = MONTH(NOW())';
    } else if (period === 'yearly') {
      dateCondition = 'YEAR(transaction_date) = YEAR(NOW())';
    }

    const [revenue] = await pool.query(`
      SELECT 
        SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as total_pending,
        COUNT(*) as total_transactions,
        SUM(amount) as gross_amount
      FROM transactions ${dateCondition ? `WHERE ${dateCondition}` : ''}
    `);

    const [rentalIncome] = await pool.query(`
      SELECT 
        SUM(amount) as total_rental_income,
        COUNT(*) as rental_count
      FROM payments WHERE payment_status = 'completed'
    `);

    res.json({
      revenue: revenue[0],
      rentalIncome: rentalIncome[0],
      period
    });
  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({ message: 'Server error generating financial report' });
  }
});

// @route   GET /api/reports/export/:type
// @desc    Export report (PDF/Excel)
// @access  Private (Admin)
router.get('/reports/export/:type', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const reportType = req.params.type;

  // In a real implementation, this would generate PDF/Excel files
  // For now, we'll return a success response with download info
  res.json({
    message: ` ${reportType.toUpperCase()} report export initiated`,
    downloadUrl: `/api/reports/export/${reportType}?generated=${new Date().toISOString()}`,
    format: reportType,
    generatedAt: new Date().toISOString()
  });
});

// ==========================================
// TESTING ENDPOINTS
// ==========================================

// @route   POST /api/test/database
// @desc    Test database connection
// @access  Private (Admin)
router.post('/test/database', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 as test');
    res.json({ message: 'Database connection successful', testResult: result });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// @route   POST /api/test/auth
// @desc    Test authentication
// @access  Private
router.post('/test/auth', authenticateToken, (req, res) => {
  res.json({ message: 'Authentication successful', userRole: req.user.role, userId: req.user.userId });
});

// @route   GET /api/test/endpoints
// @desc    List all available endpoints
// @access  Public
router.get('/test/endpoints', (req, res) => {
  res.json({
    message: 'Available API Endpoints',
    categories: {
      authentication: '/api/auth/*',
      properties: '/api/properties/*',
      search: '/api/search/*',
      users: '/api/users/*',
      enquiries: '/api/enquiries/*',
      bookings: '/api/bookings-transactions/*',
      rental: '/api/rental/*',
      reports: '/api/reports/*',
      health: '/api/health',
      status: '/api/status'
    },
    totalCategories: 9
  });
});

// @route   POST /api/test/cleanup
// @desc    Database cleanup (delete test data)
// @access  Private (Admin)
router.post('/test/cleanup', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    // Clean up test data while keeping structure
    await pool.query('DELETE FROM payments WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)');
    await pool.query('DELETE FROM enquiries WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)');
    await pool.query('DELETE FROM bookings WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)');
    await pool.query('DELETE FROM rental_agreements WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)');

    res.json({ message: 'Test data cleanup completed successfully' });
  } catch (error) {
    console.error('Test cleanup error:', error);
    res.status(500).json({ message: 'Test cleanup failed' });
  }
});

// Basic error handler
router.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = router;