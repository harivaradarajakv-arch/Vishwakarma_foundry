const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;

// Check if credentials are valid URLs/Keys or placeholder values
const isConfigured = supabaseUrl && 
                     supabaseKey && 
                     supabaseUrl.startsWith('http') && 
                     !supabaseUrl.includes('your-supabase-project') && 
                     !supabaseKey.includes('your-supabase-service-role');

if (!isConfigured) {
  console.warn('\n======================================================================');
  console.warn('WARNING: Supabase credentials are NOT configured in .env!');
  console.warn('Please update SUPABASE_URL and SUPABASE_KEY with your project details.');
  console.warn('Using fallback dummy database client to prevent startup crash.');
  console.warn('======================================================================\n');
  
  // Dummy fallback client to prevent crashes during startup/testing
  supabase = {
    from: (table) => {
      const mockQuery = {
        select: () => mockQuery,
        insert: () => mockQuery,
        upsert: () => mockQuery,
        delete: () => mockQuery,
        eq: () => mockQuery,
        or: () => mockQuery,
        in: () => mockQuery,
        gt: () => mockQuery,
        lt: () => mockQuery,
        gte: () => mockQuery,
        lte: () => mockQuery,
        neq: () => mockQuery,
        ilike: () => mockQuery,
        order: () => mockQuery,
        limit: () => mockQuery,
        range: () => mockQuery,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: {}, error: null }),
        then: (onfulfilled) => Promise.resolve({ data: [], error: null }).then(onfulfilled),
        catch: (onrejected) => Promise.resolve({ data: [], error: null }).catch(onrejected)
      };
      return mockQuery;
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = supabase;
