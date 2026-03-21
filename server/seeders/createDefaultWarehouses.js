const { Warehouse } = require('../models/Location');

const createDefaultWarehouses = async () => {
  try {
    // Check if warehouses already exist
    const warehouseCount = await Warehouse.count();
    if (warehouseCount > 0) {
      console.log('🏭 Default warehouses already exist');
      return;
    }

    // Create default warehouse
    const defaultWarehouses = [
      {
        name: 'Main Warehouse',
        code: 'WH001',
        location: 'Primary Storage Facility',
        capacity: 10000.00,
        isActive: true
      }
    ];

    await Warehouse.bulkCreate(defaultWarehouses);
    console.log('✅ Default warehouses created successfully');
    console.log('🏭 Main Warehouse: code=WH001, capacity=10000.00');
  } catch (error) {
    console.error('❌ Error creating default warehouses:', error);
  }
};

module.exports = createDefaultWarehouses;
