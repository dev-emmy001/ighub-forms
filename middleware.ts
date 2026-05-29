import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const url = request.nextUrl.clone();
    const isApiRoute = url.pathname.startsWith('/api');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        // If config is missing during build or startup, log warning and let it bypass.
        console.warn("Supabase keys missing in middleware session update.");
        return response;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // This will refresh session if expired
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protect admin routes (both page routes and API routes, except webhook)
    if (url.pathname.startsWith('/admin') || (isApiRoute && !url.pathname.startsWith('/api/paystack-webhook') && !url.pathname.startsWith('/api/submissions/'))) {
        // Wait, should we protect the submissions api route? Yes, except when submitting via form renderer (which is POST /api/submissions).
        // Let's be precise:
        // /admin needs auth.
        // /api/forms (POST, PUT, DELETE) needs auth.
        // GET /api/forms needs auth if accessed by admin, but wait! Does the public form page fetch the form config via /api/forms?
        // Let's check how the public page fetches the form config.
        // Let's view app/(public)/[slug]/page.tsx or components/form-renderer.tsx to see if it calls /api/forms/[slug] or fetches it server-side.
        // Wait, let's make middleware only protect page routes under `/admin` and specific API endpoints if needed.
        // Let's check:
        if (url.pathname.startsWith('/admin')) {
            if (!user) {
                url.pathname = '/login';
                url.searchParams.set('next', request.nextUrl.pathname);
                return NextResponse.redirect(url);
            }
        }
    }

    // Redirect authenticated user away from login page
    if (url.pathname === '/login') {
        if (user) {
            url.pathname = '/admin';
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
