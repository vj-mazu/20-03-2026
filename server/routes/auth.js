const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user - use explicit attributes to avoid missing column errors
    const normalizedUsername = String(username).trim().toLowerCase();
    let user;
    try {
      user = await User.findOne({
        where: {
          [Op.and]: [
            sqlWhere(fn('LOWER', col('username')), normalizedUsername),
            { isActive: true }
          ]
        },
        attributes: ['id', 'username', 'password', 'role', 'staffType']
      });
    } catch (findErr) {
      // Fallback: try without staffType if column doesn't exist
      user = await User.findOne({
        where: {
          [Op.and]: [
            sqlWhere(fn('LOWER', col('username')), normalizedUsername),
            { isActive: true }
          ]
        },
        attributes: ['id', 'username', 'password', 'role']
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        staffType: user.staffType || null
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        staffType: user.staffType
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'username', 'role', 'isActive', 'staffType']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Logout (client-side token removal)
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
