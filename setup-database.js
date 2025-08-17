
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY_SUPABASE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSqlFile(filePath) {
  try {
    console.log(`Executing SQL from ${filePath}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    // Split by semicolon, but handle cases where semicolon is inside a string literal
    const statements = sql.split(/;\s*$/m).filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error) {
          console.error('Statement failed:', statement.substring(0, 100) + '...');
          throw error;
        } else {
          console.log(`✓ Executed: ${statement.substring(0, 50).replace(/\r?\n|\r/g, " ")}...`);
        }
      }
    }
    console.log(`Successfully executed all statements from ${filePath}.`);
  } catch (error) {
    console.error(`Error executing ${filePath}:`, error.message);
    throw error; // Re-throw to stop the process
  }
}


async function setupDatabase() {
  try {
    await executeSqlFile(path.join(__dirname, 'setup-rls.sql'));
    await executeSqlFile(path.join(__dirname, 'seed-data.sql'));
    console.log('✅ Database setup and seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed. Please check the logs above.');
    process.exit(1);
  }
}

setupDatabase();
