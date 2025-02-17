import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('groups', 'permissions', {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      readRecords: false,
      manageCabinet: false,
      downloadFiles: false,
      exportTables: false,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('groups', 'permissions');
} 