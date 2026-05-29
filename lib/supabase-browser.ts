import { createBrowserClient } from '@supabase/ssr';

let memoizedBrowserClient: any = null;

export const createBrowserClientInstance = () => {
    if (memoizedBrowserClient) return memoizedBrowserClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        throw new Error("Supabase credentials missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be defined in your environment.");
    }

    memoizedBrowserClient = createBrowserClient(url, key);
    return memoizedBrowserClient;
};
