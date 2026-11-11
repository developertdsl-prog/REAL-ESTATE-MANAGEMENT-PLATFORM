require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcatejs');
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/users');
const enquiryRoutes = require('./routes/enquiries');

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

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.getConnection();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'property_owner', 'agent', 'buyer', 'tenant') DEFAULT 'buyer',
        name VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create properties table
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(12, 2) NOT NULL,
        type ENUM('sale', 'rent') NOT NULL,
        property_type VARCHAR(100),
        bedrooms INT,
        bathrooms INT,
        area DECIMAL(10, 2),
        location VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        address VARCHAR(255),
        availability_status ENUM('available', 'pending', 'sold', 'rented') DEFAULT 'available',
        furnishing_status ENUM('furnished', 'unfurnished', 'semi-furnished') DEFAULT 'unfurnished',
        amenities TEXT DEFAULT '',
        featured BOOLEAN DEFAULT FALSE,
        owner_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);

    // Create property categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default property categories
    const [existingCategories] = await pool.query('SELECT COUNT(*) as count FROM property_categories');
    if (existingCategories[0].count === 0) {
      const categories = [
        'Residential', 'Commercial', 'Apartment', 'Villa',
        'Independent House', 'Plot/Land', 'Office Space',
        'Shop', 'Warehouse'
      ];
      
      for (const cat of categories) {
        await pool.query(
          'INSERT INTO property_categories (name, description) VALUES (?, ?)',
          [cat, ` ${cat} property`]
        );
      }
      console.log('✅ Default property categories inserted');
    }

    // Create agents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE,
        license_number VARCHAR(50),
        commission_rate DECIMAL(5, 2) DEFAULT 3.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create property owners table
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_owners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE,
        company_name VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create enquiries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS enquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT,
        user_id INT,
        name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        message TEXT,
        status ENUM('new', 'contacted', 'interested', 'follow-up', 'converted', 'closed') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create leads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        property_id INT,
        agent_id INT,
        status ENUM('new', 'contacted', 'interested', 'follow-up', 'converted', 'closed') DEFAULT 'new',
        follow_up_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENces properties(id),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);

    // Create property visits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_visits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT,
        user_id INT,
        agent_id INT,
        visit_date DATETIME,
        status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'rejected') DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);

    // Create favorites table
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        property_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENCES properties(id),
        UNIQUE (user_id, property_id)
      )
    `);

    // Create bookings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT,
        user_id INT,
        booking_type ENUM('purchase', 'rental') NOT NULL,
        status ENUM('pending', 'confirmed', 'rejected', 'completed') DEFAULT 'pending',
        deposit_amount DECIMAL(12, 2),
        total_amount DECIMAL(12, 2),
        transaction_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (user_id) REFERENces users(id)
      )
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT,
        user_id INT,
        booking_type ENUM('purchase', 'rental') NOT NULL,
        transaction_type ENUM('sale', 'rental') NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        payment_method VARCHAR(50),
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        receipt_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(100),
        user_id INT,
        property_id INT,
        amount DECIMAL(12, 2) NOT NULL,
        payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        payment_date TIMESTAMP,
        transaction_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (user_id) REFERENces users(id),
        FOREIGN KEY (property_id) REFERENces properties(id)
      )
    `);

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        type ENUM('property_approval', 'new_enquiry', 'visit_confirmation', 'booking_update', 'payment_reminder') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENces users(id)
      )
    `);

    // Create reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id INT,
        user_id INT,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        review TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENces properties(id),
        FOREIGN KEY (user_id) REFERENces users(id)
      )
    `);

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENces users(id)
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/enquiries', enquiryRoutes);

// Property categories endpoint
app.get('/api/properties/categories', (req, res) => {
  const defaultCategories = [
    'Residential', 'Commercial', 'Apartment', 'Villa',
    'Independent House', 'Plot/Land', 'Office Space',
    'Shop', 'Warehouse'
  ];
  res.json(defaultCategories);
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server after database initialization
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Property API: http://localhost:${PORT}/api/properties`);
      console.log(`🔍 Search API: http://localhost:${PORT}/api/search/properties`);
      console.log(`👥 User API: http://localhost:${PORT}/api/users/profile`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
      console.log(`📬 Enquiry API: http://localhost:${PORT}/api/enquiries`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database, server starting anyway:', err.message);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (database may not be initialized)`);
    });
  });

module.exports = app;
module.exports.pool = pool;