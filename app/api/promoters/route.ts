import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Retrieve all promoters for a specific form and calculate their conversion metrics
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const formId = searchParams.get('formId');

        if (!formId) {
            return NextResponse.json({ error: 'Form ID query parameter is required' }, { status: 400 });
        }

        // 1. Fetch all promoters for this form
        const { data: promoters, error: promotersError } = await supabaseAdmin
            .from('promoters')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });

        if (promotersError) {
            console.error('Supabase fetch promoters error:', promotersError);
            return NextResponse.json({ error: 'Failed to retrieve promoters' }, { status: 500 });
        }

        // 2. Fetch all submissions for this form to count referrals
        const { data: submissions, error: submissionsError } = await supabaseAdmin
            .from('submissions')
            .select('staff_ref')
            .eq('form_id', formId);

        if (submissionsError) {
            console.error('Supabase fetch submissions for promoter count error:', submissionsError);
            return NextResponse.json({ error: 'Failed to compute conversion stats' }, { status: 500 });
        }

        // 3. Count occurrences of each staff_ref
        const refCounts: Record<string, number> = {};
        submissions?.forEach((sub: any) => {
            if (sub.staff_ref) {
                const code = sub.staff_ref.trim().toLowerCase();
                refCounts[code] = (refCounts[code] || 0) + 1;
            }
        });

        // 4. Map count back to promoter records
        const result = (promoters || []).map((p: any) => {
            const cleanCode = p.code.trim().toLowerCase();
            return {
                ...p,
                referral_count: refCounts[cleanCode] || 0,
            };
        });

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error('API Promoters GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Register a new promoter candidate
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, code, formId } = body;

        // 1. Validation
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: 'Promoter name is required' }, { status: 400 });
        }

        if (!code || typeof code !== 'string' || code.trim() === '') {
            return NextResponse.json({ error: 'Tracking code is required' }, { status: 400 });
        }

        const cleanCode = code.trim().toLowerCase();
        // Tracking code should only contain alphanumeric characters, dashes, or underscores
        const codeRegex = /^[a-z0-9-_]+$/;
        if (!codeRegex.test(cleanCode)) {
            return NextResponse.json(
                { error: 'Tracking code must only contain lowercase letters, numbers, dashes, and underscores' },
                { status: 400 }
            );
        }

        if (!formId) {
            return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
        }

        // 2. Check if code already exists globally
        const { data: existingPromoter, error: checkError } = await supabaseAdmin
            .from('promoters')
            .select('id')
            .eq('code', cleanCode)
            .maybeSingle();

        if (checkError) {
            console.error('Supabase checking promoter code error:', checkError);
            return NextResponse.json({ error: 'Failed to verify tracking code uniqueness' }, { status: 500 });
        }

        if (existingPromoter) {
            return NextResponse.json({ error: 'This tracking code is already registered. Please choose a different code.' }, { status: 409 });
        }

        // 3. Prepare payload for insertion
        const payload = {
            name: name.trim(),
            code: cleanCode,
            form_id: formId,
            created_at: new Date().toISOString(),
        };

        // 4. Save to database
        const { data, error } = await supabaseAdmin
            .from('promoters')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Promoter Error:', error);
            return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, promoter: data }, { status: 201 });

    } catch (error) {
        console.error('API Promoters POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
