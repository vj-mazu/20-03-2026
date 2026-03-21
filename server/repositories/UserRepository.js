const bcrypt = require('bcrypt');
const User = require('../models/User');

class UserRepository {
  /**
   * Create a new user with hashed password
   * @param {Object} userData - User data
   * @param {string} userData.username - Username
   * @param {string} userData.password - Plain text password
   * @param {string} userData.role - User role
   * @returns {Promise<Object>} Created user (without password)
   */
  async create(userData) {
    const { username, password, role } = userData;
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const user = await User.create({
      username,
      passwordHash,
      role
    });
    
    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(id) {
    const user = await User.findByPk(id);
    if (!user) return null;
    
    const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Find user by username (includes password hash for authentication)
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object with password hash or null
   */
  async findByUsername(username) {
    const user = await User.findOne({ where: { username } });
    return user ? user.toJSON() : null;
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated user or null
   */
  async update(id, updates) {
    const user = await User.findByPk(id);
    if (!user) return null;
    
    // If password is being updated, hash it
    if (updates.password) {
      const saltRounds = 10;
      updates.passwordHash = await bcrypt.hash(updates.password, saltRounds);
      delete updates.password;
    }
    
    await user.update(updates);
    
    const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  /**
   * Find all users with optional role filter
   * @param {Object} options - Query options
   * @param {string} options.role - Filter by role
   * @returns {Promise<Array>} Array of users
   */
  async findAll(options = {}) {
    const where = {};
    if (options.role) {
      where.role = options.role;
    }
    
    const users = await User.findAll({ where });
    return users.map(user => {
      const { passwordHash: _, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    });
  }

  /**
   * Verify user password
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} User object (without password) if valid, null otherwise
   */
  async verifyPassword(username, password) {
    const user = await this.findByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;
    
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

module.exports = new UserRepository();
