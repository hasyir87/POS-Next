
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// IMPORTANT: Use the SERVICE_ROLE_KEY for setup operations
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY_SUPABASE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SERVICE_ROLE_KEY_SUPABASE are set.');
  process.exit(1);
}

// Initialize Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// A more robust function to execute a whole SQL file at once
async function executeSqlFile(filePath) {
  try {
    console.log(`Executing SQL from ${filePath}...`);
    // Read the entire file content
    const sql = fs.readFileSync(filePath, 'utf8');

    // Use the 'exec_sql' RPC function we created to run the entire script
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('An error occurred during SQL execution:');
      throw error;
    }
    
    console.log(`✓ Successfully executed all statements from ${filePath}.`);
  } catch (error) {
    console.error(`Error executing ${filePath}:`, error.message);
    throw error; // Re-throw to stop the main process
  }
}

async function setupDatabase() {
  try {
    // First, run the RLS and functions setup
    await executeSqlFile(path.join(__dirname, 'setup-rls.sql'));
    
    // Then, seed the data
    await executeSqlFile(path.join(__dirname, 'seed-data.sql'));
    
    console.log('✅ Database setup and seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed. Please check the logs above.');
    process.exit(1); // Exit with an error code
  }
}

// Run the setup
setupDatabase();
