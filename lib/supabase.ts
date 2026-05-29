import { createClient } from '@supabase/supabase-js';

let memoizedClient: any = null;

const getClient = () => {
    if (memoizedClient) return memoizedClient;
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
        throw new Error("Supabase credentials missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your environment.");
    }
    
    memoizedClient = createClient(url, key);
    return memoizedClient;
};

// Use a Proxy to lazily initialize the client.
// This prevents next build evaluation from crashing while ensuring runtime functionality.
export const supabaseAdmin = new Proxy({} as any, {
    get(target, prop) {
        const client = getClient();
        const value = Reflect.get(client, prop);
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});