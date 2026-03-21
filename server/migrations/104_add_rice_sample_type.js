module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Note: In Postgres, adding to an ENUM type using ALTER TYPE must be done outside a transaction block (or handled carefully)
        // and cannot be chained easily with queryInterface.changeColumn for an existing ENUM.
        // We will execute a raw query to add the value to the ENUM.

        try {
            await queryInterface.sequelize.query(`
        ALTER TYPE "enum_sample_entries_entry_type" ADD VALUE IF NOT EXISTS 'RICE_SAMPLE';
      `);
            console.log("Successfully added RICE_SAMPLE to entry_type enum.");
        } catch (error) {
            if (error.message.includes("already exists")) {
                console.log("RICE_SAMPLE already exists in enum_sample_entries_entry_type");
            } else {
                throw error;
            }
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Postgres doesn't easily support removing values from an ENUM type.
        // The typical workaround is to recreate the type, but for safety in dev/prod we leave it.
        console.log("Reverting ENUM additions requires manual type recreation. Skipping down for RICE_SAMPLE.");
    }
};
