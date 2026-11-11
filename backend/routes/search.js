require('dotenv').config();

const express = require('express');
const router = express.Router();
const pool = require('../backend').pool;

// @route   GET /api/search/properties
// @desc    Search properties with filters and pagination
// @access  Public (or authenticated users)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 12, search, location, price_min, price_max,
      property_type, bedrooms, bathrooms, area_min, area_max,
      type, availability_status, furnishing_status, sort_by, sort_order
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    // Search filter (title, description, location)
    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ? OR city LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Location filter
    if (location) {
      conditions.push('location LIKE ?');
      params.push(`%${location}%`);
    }

    // Price range filter
    if (price_min) {
      conditions.push('price >= ?');
      params.push(Number(price_min));
    }
    if (price_max) {
      conditions.push('price <= ?');
      params.push(Number(price_max));
    }

    // Property type filter
    if (property_type) {
      conditions.push('property_type = ?');
      params.push(property_type);
    }

    // Bedrooms filter
    if (bedrooms) {
      conditions.push('bedrooms = ?');
      params.push(Number(bedrooms));
    }

    // Bathrooms filter
    if (bathrooms) {
      conditions.push('bathrooms = ?');
      params.push(Number(bathrooms));
    }

    // Area range filter
    if (area_min) {
      conditions.push('area >= ?');
      params.push(Number(area_min));
    }
    if (area_max) {
      conditions.push('area <= ?');
      params.push(Number(area_max));
    }

    // Sale/Rent filter
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }

    // Availability status filter
    if (availability_status) {
      conditions.push('availability_status = ?');
      params.push(availability_status);
    }

    // Furnishing status filter
    if (furnishing_status) {
      conditions.push('furnishing_status = ?');
      params.push(furnishing_status);
    }

    // Sorting
    const validSortFields = ['price', 'created_at', 'area'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count for pagination
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM properties p ${whereClause}
    `, params);

    // Get properties with owner info
    const [properties] = await pool.query(`
      SELECT p.*, u.name as owner_name, u.email as owner_email
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    res.json({
      properties,
      total: countResult[0].total,
      page: Number(page),
      totalPages: Math.ceil(countResult[0].total / Number(limit)),
      filters: {
        search, location, price_min, price_max, property_type,
        bedrooms, bathrooms, area_min, area_max, type,
        availability_status, furnishing_status
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error searching properties' });
  }
});

// @route   GET /api/search/suggestions
// @desc    Get search suggestions/filters options
// @access  Public
router.get('/suggestions', async (req, res) => {
  try {
    // Get unique property types from database
    const [propertyTypes] = await pool.query(
      'SELECT DISTINCT property_type, availability_status, furnishing_status FROM properties'
    );

    // Get price range
    const [priceRange] = await pool.query(`
      SELECT MIN(price) as min_price, MAX(price) as max_price
      FROM properties
    `);

    // Get area range
    const [areaRange] = await pool.query(`
      SELECT MIN(area) as min_area, MAX(area) as max_area
      FROM properties
    `);

    // Get distinct cities
    const [cities] = await pool.query('SELECT DISTINCT city FROM properties WHERE city IS NOT NULL');

    res.json({
      propertyTypes: propertyTypes.map(t => t.property_type),
      availabilityStatus: propertyTypes.map(t => t.availability_status),
      furnishingStatus: propertyTypes.map(t => t.furnishing_status),
      priceRange,
      areaRange,
      cities: cities.map(c => c.city)
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ message: 'Server error fetching search suggestions' });
  }
});

module.exports = router;