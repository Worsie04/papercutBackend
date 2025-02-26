const fs = require('fs');
const path = require('path');

// Path to migrations directory
const migrationsDir = path.join(__dirname, 'src', 'database', 'migrations');

// Get all files in the migrations directory
const files = fs.readdirSync(migrationsDir);

// Filter for migration files with underscore prefix
const underscorePrefixedFiles = files.filter(file => 
  file.startsWith('_') && 
  file.endsWith('.js') && 
  /^\d{8}/.test(file.substring(1)) // Check if it has a date format after the underscore
);

console.log(`Found ${underscorePrefixedFiles.length} migration files with underscore prefix`);

// Rename each file
underscorePrefixedFiles.forEach(file => {
  const oldPath = path.join(migrationsDir, file);
  const newPath = path.join(migrationsDir, file.substring(1)); // Remove the underscore
  
  try {
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed: ${file} -> ${file.substring(1)}`);
  } catch (error) {
    console.error(`Error renaming ${file}: ${error.message}`);
  }
});

console.log('Migration file renaming complete');

// Now check the SequelizeMeta table
console.log('\nIMPORTANT: You need to check the SequelizeMeta table in your database');
console.log('Run the following SQL query to see which migrations have been applied:');
console.log('\nSELECT * FROM "SequelizeMeta" ORDER BY name;\n');
console.log('If you see entries with underscore prefixes, you need to update them:');
console.log('UPDATE "SequelizeMeta" SET name = SUBSTRING(name, 2) WHERE name LIKE \'\\_%\';');
console.log('\nMake sure to back up your database before running this update!'); 