# Database Management Guide

## Issue Identified: Accidental Table/Column Deletion

We've identified an issue where database tables and columns were being accidentally deleted. This was caused by the following configuration in `src/infrastructure/database/sequelize.ts`:

```typescript
// Incorrect configuration (FIXED)
if (config.nodeEnv === 'production') {
  await sequelize.sync({ alter: true });
}
```

The issue was that:
1. The condition was checking for 'production' mode instead of 'development'
2. Using `alter: true` in production is dangerous as it automatically modifies tables to match model definitions

## Fixed Configuration

The configuration has been updated to:

```typescript
// Correct configuration
if (config.nodeEnv === 'development') {
  console.log('Running in development mode - syncing database models');
  await sequelize.sync();
  console.log('Database models synchronized successfully.');
} else {
  console.log(`Running in ${config.nodeEnv} mode - skipping automatic database sync`);
}
```

## Migration Fixes Applied (April 2024)

When rebuilding the database after schema deletion, we encountered and fixed several issues:

1. **Migration File Naming**
   - Many migration files had underscore prefixes (e.g., `_20240101000000-init-base-tables.js`)
   - These were renamed to remove the underscore prefixes using the `fix-migration-names.js` script
   - This ensures Sequelize can properly track which migrations have been applied

2. **Future-Dated Migrations**
   - Several migration files had dates in 2025, which is in the future
   - These were renamed to use current dates (April 2024) to ensure proper ordering
   - Example: `20250214000004-create-cabinet-member-permissions.js` → `20240401000006-create-cabinet-member-permissions.js`

3. **Enum Type Handling**
   - Fixed migrations that modify enum types to properly check if the enum exists before trying to drop it
   - Added proper error handling and default value management for enum columns
   - Example fix in `20240320000001-update-cabinet-members-role-enum.js`

4. **Migration Order**
   - Adjusted the order of some migrations to ensure dependencies are created before they're referenced
   - This prevents errors like "type X does not exist" or "relation Y does not exist"

## Seeder Fixes Applied (April 2024)

After rebuilding the database schema, we also fixed and applied the seeders:

1. **Seeder File Naming**
   - Fixed a seeder file with a future date (`20250128084610-test-super-user.js`)
   - Renamed it to use a current date (`20240401000001-test-super-user.js`)

2. **Empty Seeder File**
   - The test-super-user seeder file was empty
   - Created a proper seeder that creates a test user with super_user role
   - Added proper up/down methods for clean application and rollback

3. **Applied Seeders**
   - Successfully applied all seeders to populate the database with:
     - Default admin user (admin@worsie.com / Admin123!)
     - Default roles (super_admin, super_user, owner, etc.)
     - Test super user (test@worsie.com / Test123!)

## Best Practices for Database Management

1. **Never use `sequelize.sync()` in production**
   - In production, always use migrations to make database changes
   - `sequelize.sync()` should only be used in development for quick prototyping

2. **Use migrations for all database schema changes**
   - Create migrations using: `npm run db:migrate:create -- --name your-migration-name`
   - Run migrations: `npm run db:migrate`
   - Undo last migration: `npm run db:migrate:undo`

3. **Test migrations in development before applying to production**
   - Always test migrations in a development or staging environment first
   - Back up production data before applying migrations

4. **Be careful with migration file naming**
   - Ensure migration files follow the naming convention: `YYYYMMDDHHMMSS-description.js`
   - Do not use underscores at the beginning of migration filenames
   - Do not use future dates in migration filenames

5. **Check NODE_ENV setting**
   - Make sure NODE_ENV is set to 'production' in production environments
   - In development, set NODE_ENV to 'development'

## Migration Commands

```bash
# Create a new migration
npx sequelize-cli migration:generate --name your-migration-name

# Run pending migrations
npm run db:migrate

# Undo the most recent migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all

# Run seeders
npm run db:seed:all

# Undo seeders
npm run db:seed:undo:all
```

## Troubleshooting

If you encounter issues with migrations:

1. Check the Sequelize migration table (`SequelizeMeta`) to see which migrations have been applied
2. Ensure migration files are properly named (without leading underscores)
3. Check for syntax errors in migration files
4. Verify that the database user has sufficient privileges

## Database Backup and Restore

It's recommended to regularly back up your database, especially before applying migrations:

```bash
# Backup PostgreSQL database
pg_dump -h hostname -U username -d database_name -F c -f backup_file.dump

# Restore PostgreSQL database
pg_restore -h hostname -U username -d database_name -c backup_file.dump
```

For any database-related questions or issues, please contact the database administrator. 