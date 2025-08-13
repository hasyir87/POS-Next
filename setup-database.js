
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY_SUPABASE;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Setting up database policies...');
    
    // Read and execute the SQL file
    const sql = fs.readFileSync('setup-rls.sql', 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error) {
          console.log('Statement:', statement);
          console.error('Error:', error);
        } else {
          console.log('✓ Executed:', statement.substring(0, 50) + '...');
        }
      }
    }
    
    console.log('Database setup completed!');
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupDatabase();
