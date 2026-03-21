const express = require('express');
const bcrypt = require('bcryptjs');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
router.get('/users', auth, authorize('admin', 'manager', 'staff'), async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'role', 'isActive', 'staffType', 'fullName', 'customUserId', 'qualityName', 'createdAt', 'updatedAt'],
            order: [['role', 'ASC'], ['username', 'ASC']]
        });

        res.json({
            success: true,
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                role: user.role,
                isActive: user.isActive,
                staffType: user.staffType || null,
                fullName: user.fullName || null,
                customUserId: user.customUserId || null,
                qualityName: user.qualityName || null,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }))
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/admin/physical-supervisors
 * Get all physical supervisors (manager and admin can access)
 */
router.get('/physical-supervisors', auth, authorize('admin', 'manager'), async (req, res) => {
    try {
        const supervisors = await User.findAll({
            where: {
                role: 'physical_supervisor',
                isActive: true
            },
            attributes: ['id', 'username'],
            order: [['username', 'ASC']]
        });

        res.json({
            success: true,
            users: supervisors.map(user => ({
                id: user.id,
                username: user.username,
                fullName: user.fullName || user.username
            }))
        });
    } catch (error) {
        console.error('Get physical supervisors error:', error);
        res.status(500).json({ error: 'Failed to fetch physical supervisors' });
    }
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post('/users', auth, authorize('admin'), async (req, res) => {
    try {
        const { username, password, role, staffType, fullName, customUserId, qualityName } = req.body;
        const normalizeName = (value = '') => String(value).trim().replace(/\s+/g, ' ').toLowerCase();

        // Validation
        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required' });
        }

        if (!fullName || !String(fullName).trim()) {
            return res.status(400).json({ error: 'Full Name is required' });
        }

        const validRoles = ['staff', 'manager', 'admin', 'inventory_staff', 'financial_account', 'paddy_supervisor'];
        if (!validRoles.includes(role)) {
            console.warn(`⚠️ Admin ${req.user.username} tried to create user with invalid role: ${role}`);
            return res.status(400).json({ error: 'Invalid role' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        const normalizedUsername = String(username || '').trim().toLowerCase();
        const storedUsername = String(username || '').trim();
        if (!storedUsername) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Check if username already exists
        const existingUser = await User.findOne({
            where: sqlWhere(
                fn('LOWER', col('username')),
                normalizedUsername
            )
        });

        // Check if full name already exists (case-insensitive)
        let existingFullName = null;
        if (fullName && fullName.trim() !== '') {
            const normalizedFullName = normalizeName(fullName);
            existingFullName = await User.findOne({
                where: sqlWhere(
                    fn('LOWER', fn('REGEXP_REPLACE', fn('COALESCE', col('full_name'), ''), '\\s+', ' ', 'g')),
                    normalizedFullName
                )
            });
        }

        const duplicateErrors = [];
        if (existingUser) duplicateErrors.push('User ID already exists');
        if (existingFullName) duplicateErrors.push('Full name already exists');
        if (duplicateErrors.length > 0) {
            return res.status(400).json({ error: duplicateErrors.join(' & ') });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({
            username: storedUsername,
            password: hashedPassword,
            role: role,
            fullName: fullName || null,
            customUserId: customUserId || null,
            isActive: true,
            staffType: role === 'staff' ? (staffType || 'mill') : null,
            qualityName: qualityName || null
        });

        console.log(`✅ Admin ${req.user.username} created new user: ${newUser.username} (${role})`);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                fullName: newUser.fullName,
                customUserId: newUser.customUserId,
                role: newUser.role,
                isActive: newUser.isActive,
                staffType: newUser.staffType,
                qualityName: newUser.qualityName
            }
        });
    } catch (error) {
        console.error('❌ Create user error:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            errors: error.errors?.map(e => e.message)
        });
        res.status(500).json({ error: error.message || 'Failed to create user' });
    }
});

/**
 * PUT /api/admin/users/:id/credentials
 * Update username and/or password for a user (admin only)
 * Does NOT require last password - admin privilege
 */
router.put('/users/:id/credentials', auth, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, fullName, customUserId, staffType, qualityName } = req.body;
        const normalizeName = (value = '') => String(value).trim().replace(/\s+/g, ' ').toLowerCase();

        // Find user
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prepare update object
        const updates = {};

        // Update username if provided
        if (username !== undefined && username !== null) {
            const normalizedUsername = String(username).trim().toLowerCase();
            const storedUsername = String(username).trim();
            if (!storedUsername) {
                return res.status(400).json({ error: 'Username is required' });
            }
            if (storedUsername !== String(user.username || '')) {
                // Check if username already exists (for different user)
                const existingUser = await User.findOne({
                    where: {
                        [Op.and]: [
                            sqlWhere(
                                fn('LOWER', col('username')),
                                normalizedUsername
                            ),
                            { id: { [Op.ne]: id } }
                        ]
                    }
                });

                if (existingUser) {
                    return res.status(400).json({ error: 'User ID already exists' });
                }

                updates.username = storedUsername;
            }
        }

        // Update password if provided
        if (password && password.trim() !== '') {
            if (password.length < 4) {
                return res.status(400).json({ error: 'Password must be at least 4 characters' });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.password = hashedPassword;
        }

        // Update other fields
        if (fullName !== undefined) {
            if (!String(fullName).trim()) {
                return res.status(400).json({ error: 'Full Name is required' });
            }
            if (fullName && fullName.trim() !== '' && fullName !== user.fullName) {
                const normalizedFullName = normalizeName(fullName);
                const existingFullName = await User.findOne({
                    where: {
                        [Op.and]: [
                            sqlWhere(
                                fn('LOWER', fn('REGEXP_REPLACE', fn('COALESCE', col('full_name'), ''), '\\s+', ' ', 'g')),
                                normalizedFullName
                            ),
                            { id: { [Op.ne]: id } }
                        ]
                    }
                });
                if (existingFullName) {
                    return res.status(400).json({ error: 'Full name already exists' });
                }
            }
            updates.fullName = fullName;
        }
        if (customUserId !== undefined) updates.customUserId = customUserId;
        if (staffType !== undefined) updates.staffType = staffType;
        if (qualityName !== undefined) updates.qualityName = qualityName;

        // Apply updates
        if (Object.keys(updates).length > 0) {
            await user.update(updates);
        }

        console.log(`✅ Admin ${req.user.username} updated user: ${user.username} (ID: ${id})`);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                customUserId: user.customUserId,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Update credentials error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * PUT /api/admin/users/:id/status
 * Activate or deactivate a user (admin only)
 */
router.put('/users/:id/status', auth, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        // Prevent admin from deactivating themselves
        if (parseInt(id) === req.user.userId && isActive === false) {
            return res.status(400).json({ error: 'You cannot deactivate your own account' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({ isActive: !!isActive });

        console.log(`✅ Admin ${req.user.username} ${isActive ? 'activated' : 'deactivated'} user: ${user.username} (ID: ${id})`);

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

/**
 * PUT /api/admin/users/:id/role
 * Change user role (admin only)
 */
router.put('/users/:id/role', auth, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, staffType } = req.body;

        // Prevent admin from changing their own role
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({ error: 'You cannot change your own role' });
        }

        const validRoles = ['staff', 'manager', 'admin', 'quality_supervisor', 'physical_supervisor', 'inventory_staff', 'financial_account'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be one of: staff, manager, admin, quality_supervisor, physical_supervisor, inventory_staff, financial_account' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updateData = { role };
        // Update staffType if provided (mill or location) — only for staff role
        if (role === 'staff' && staffType) {
            updateData.staffType = staffType;
        } else if (role !== 'staff') {
            // Clear staff-specific fields when changing away from staff
            updateData.staffType = null;
            updateData.qualityName = null;
        }
        await user.update(updateData);

        console.log(`✅ Admin ${req.user.username} changed role for user: ${user.username} to ${role}${staffType ? ` (staffType: ${staffType})` : ''}`);

        res.json({
            success: true,
            message: 'User role updated successfully',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                staffType: user.staffType,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user permanently (admin only)
 */
router.delete('/users/:id', auth, authorize('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({ error: 'You cannot delete your own account' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const deletedUsername = user.username;
        // Soft delete: deactivate user instead of destroying (preserves data records)
        user.isActive = false;
        await user.save();

        console.log(`✅ Admin ${req.user.username} deactivated user: ${deletedUsername} (ID: ${id})`);

        res.json({
            success: true,
            message: 'User deactivated successfully (data records preserved)'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
