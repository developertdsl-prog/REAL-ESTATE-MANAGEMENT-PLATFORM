require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'real_estate',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

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

// Check if user is admin
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// ==========================================
// AUTH ROUTES (Public)
// ==========================================
app.use('/api/auth', require('./routes/auth'));

// ==========================================
// ADMIN DASHBOARD ROLES (Private - Admin only)
// ==========================================

// @route   GET /api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
app.get('/api/admin/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT COUNT(*) as total FROM users');
    const [propertyOwners] = await pool.query('SELECT COUNT(*) as total FROM property_owners');
    const [agents] = await pool.query('SELECT COUNT(*) as total FROM agents');
    const [properties] = await pool.query('SELECT COUNT(*) as total FROM properties');
    const [activeListings] = await pool.query(
      'SELECT COUNT(*) as total FROM properties WHERE availability_status = ?',
      ['available']
    );
    const [pendingApprovals] = await pool.query(
      'SELECT COUNT(*) as total FROM properties WHERE availability_status = ?',
      ['pending']
    );
    const [enquiries] = await pool.query('SELECT COUNT(*) as total FROM enquiries');
    const [bookings] = await pool.query('SELECT COUNT(*) as total FROM bookings');

    res.json({
      totalUsers: users[0].total,
      totalPropertyOwners: propertyOwners[0].total,
      totalAgents: agents[0].total,
      totalProperties: properties[0].total,
      activeListings: activeListings[0].total,
      pendingApprovals: pendingApprovals[0].total,
      totalEnquiries: enquiries[0].total,
      totalBookings: bookings[0].total
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error fetching admin stats' });
  }
});

// @route   GET /api/admin/analytics/sales
// @desc    Get sales analytics
// @access  Private (Admin only)
app.get('/api/admin/analytics/sales', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let dateCondition = '';
    let dateGroup = '';

    if (period === 'monthly') {
      dateCondition = 'YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())';
      dateGroup = 'MONTH(created_at)';
    } else if (period === 'yearly') {
      dateCondition = 'YEAR(created_at) = YEAR(NOW())';
      dateGroup = 'YEAR(created_at)';
    } else {
      dateCondition = '1';
      dateGroup = 'created_at';
    }

    const [sales] = await pool.query(`
      SELECT 
        YEAR(created_at) as year,
        MONTH(created_at) as month,
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue,
        SUM(CASE WHEN transaction_type = 'sale' THEN amount ELSE 0 END) as sales_revenue
      FROM transactions
      WHERE ${dateCondition}
      GROUP BY ${dateGroup}
      ORDER BY ${dateGroup} DESC
    `);

    res.json({ period, sales });
  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ message: 'Server error fetching sales analytics' });
  }
});

// @route   GET /api/admin/analytics/rental
// @desc    Get rental analytics
// @access  Private (Admin only)
app.get('/api/admin/analytics/rental', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    let dateCondition = '';
    let dateGroup = '';

    if (period === 'monthly') {
      dateCondition = 'YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())';
      dateGroup = 'MONTH(created_at)';
    } else if (period === 'yearly') {
      dateCondition = 'YEAR(created_at) = YEAR(NOW())';
      dateGroup = 'YEAR(created_at)';
    }

    const [rentals] = await pool.query(`
      SELECT 
        YEAR(created_at) as year,
        MONTH(created_at) as month,
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue
      FROM transactions
      WHERE transaction_type = 'rental' AND ${dateCondition}
      GROUP BY ${dateGroup}
      ORDER BY ${dateGroup} DESC
    `);

    res.json({ period, rentals });
  } catch (error) {
    console.error('Rental analytics error:', error);
    res.status(500).json({ message: 'Server error fetching rental analytics' });
  }
});

// @route   GET /api/admin/analytics/properties
// @desc    Get property category statistics
// @access  Private (Admin only)
app.get('/api/admin/analytics/properties', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT 
        pc.name,
        COUNT(p.id) as total_properties
      FROM property_categories pc
      LEFT JOIN properties p ON pc.name = p.property_type
      GROUP BY pc.id, pc.name
      ORDER BY total_properties DESC
    `);

    res.json({ categories });
  } catch (error) {
    console.error('Property analytics error:', error);
    res.status(500).json({ message: 'Server error fetching property statistics' });
  }
});

// @route   GET /api/admin/activities
// @desc    Get recent platform activities
// @access  Private (Admin only)
app.get('/api/admin/activities', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const [recentProperties] = await pool.query(`
      SELECT id, title, price, property_type, availability_status, created_at
      FROM properties
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [recentUsers] = await pool.query(`
      SELECT id, email, role, name, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [recentEnquiries] = await pool.query(`
      SELECT id, property_id, user_id, name, email, status, created_at
      FROM enquiries
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [recentBookings] = await pool.query(`
      SELECT id, property_id, user_id, booking_type, status, created_at
      FROM bookings
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json({
      recentProperties,
      recentUsers,
      recentEnquiries,
      recentBookings
    });
  } catch (error) {
    console.error('Recent activities error:', error);
    res.status(500).json({ message: 'Server error fetching recent activities' });
  }
});

// ==========================================
// ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Admin Dashboard API: http://localhost:${PORT}/api/admin/stats`);
      console.log(`🔒 Protected routes require JWT token with Admin role`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  });

module.exports = app;
module.exports.pool = pool;