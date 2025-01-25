'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [cabinets] = await queryInterface.sequelize.query(
      'SELECT id, custom_fields FROM cabinets WHERE deleted_at IS NULL'
    );

    for (const cabinet of cabinets) {
      const customFields = cabinet.custom_fields.map(field => ({
        ...field,
        selectedIcon: field.selectedIcon || null
      }));

      await queryInterface.sequelize.query(
        'UPDATE cabinets SET custom_fields = :customFields WHERE id = :id',
        {
          replacements: {
            id: cabinet.id,
            customFields: JSON.stringify(customFields)
          }
        }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    const [cabinets] = await queryInterface.sequelize.query(
      'SELECT id, custom_fields FROM cabinets WHERE deleted_at IS NULL'
    );

    for (const cabinet of cabinets) {
      const customFields = cabinet.custom_fields.map(field => {
        const { selectedIcon, ...rest } = field;
        return rest;
      });

      await queryInterface.sequelize.query(
        'UPDATE cabinets SET custom_fields = :customFields WHERE id = :id',
        {
          replacements: {
            id: cabinet.id,
            customFields: JSON.stringify(customFields)
          }
        }
      );
    }
  }
}; 