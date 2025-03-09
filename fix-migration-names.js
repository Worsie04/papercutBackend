const fs = require('fs');
const path = require('path');

// Function to check if the old migration file exists and rename it to prevent it from running
function fixMigrationFile() {
  const migrationsDir = path.join(__dirname, 'src', 'database', 'migrations');
  const oldMigrationPath = path.join(migrationsDir, '20231101000003-create-pdf-files.js');
  
  // Check if the file exists
  if (fs.existsSync(oldMigrationPath)) {
    console.log('Found old migration file, renaming it to prevent execution...');
    
    // Rename with a .bak extension
    const backupPath = `${oldMigrationPath}.bak`;
    fs.renameSync(oldMigrationPath, backupPath);
    
    console.log(`Renamed old migration file to ${backupPath}`);
    console.log('You can now run migrations without conflicts.');
  } else {
    console.log('Old migration file not found, no action needed.');
  }
}

// Run the fix
fixMigrationFile();