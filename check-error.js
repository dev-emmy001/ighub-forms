const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkError() {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, submitter_email, email_status, email_error, created_at')
    .eq('email_status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error("Error querying DB:", error);
  } else {
    console.log("Recent Failed Emails:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkError();
