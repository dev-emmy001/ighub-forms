import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            title,
            slug,
            description,
            requires_payment,
            base_price,
            discount_price,
            form_schema,
            closes_at,
            discount_closes_at,
        } = body;

        // 1. Simple validation
        if (!title || typeof title !== 'string' || title.trim() === '') {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (!slug || typeof slug !== 'string' || slug.trim() === '') {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        // Validate slug format (alphanumeric and dashes/underscores)
        const slugRegex = /^[a-z0-9-_]+$/;
        if (!slugRegex.test(slug)) {
            return NextResponse.json(
                { error: 'Slug must only contain lowercase letters, numbers, dashes, and underscores' },
                { status: 400 }
            );
        }

        if (!Array.isArray(form_schema) || form_schema.length === 0) {
            return NextResponse.json({ error: 'At least one form field is required' }, { status: 400 });
        }

        // Validate individual fields in the schema
        for (const field of form_schema) {
            if (!field.id || !field.type || !field.label) {
                return NextResponse.json({ error: 'Invalid form schema structure' }, { status: 400 });
            }
            if (field.type === 'select' && (!Array.isArray(field.options) || field.options.length === 0)) {
                return NextResponse.json(
                    { error: `Dropdown field "${field.label}" must have at least one option` },
                    { status: 400 }
                );
            }
        }

        // 2. Check if slug already exists to prevent duplicate slugs
        const { data: existingForm, error: checkError } = await supabaseAdmin
            .from('forms')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (checkError) {
            console.error('Supabase checking error:', checkError);
            return NextResponse.json({ error: 'Failed to verify slug uniqueness' }, { status: 500 });
        }

        if (existingForm) {
            return NextResponse.json({ error: 'This slug/handle is already in use. Please choose another one.' }, { status: 409 });
        }

        // 3. Prepare payload for insertion
        const payload = {
            title: title.trim(),
            slug: slug.trim(),
            description: description ? description.trim() : '',
            form_schema: form_schema,
            closes_at: closes_at ? new Date(closes_at).toISOString() : null,
            is_active: true,
            created_at: new Date().toISOString(),
            send_email_response: !!body.send_email_response,
            email_response_message: body.email_response_message ? body.email_response_message.trim() : '',
        };

        // 4. Save to Supabase
        const { data, error } = await supabaseAdmin
            .from('forms')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Form Error:', error);
            return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, form: data }, { status: 201 });

    } catch (error) {
        console.error('API Forms POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET: Retrieve all forms with registration counts
export async function GET(req: Request) {
    try {
        // 1. Fetch all forms
        const { data: forms, error: formsError } = await supabaseAdmin
            .from('forms')
            .select('*')
            .order('created_at', { ascending: false });

        if (formsError) {
            console.error('Supabase fetch forms error:', formsError);
            return NextResponse.json({ error: 'Failed to retrieve forms' }, { status: 500 });
        }

        // 2. Fetch all submissions to map registration counts
        const { data: submissions, error: submissionsError } = await supabaseAdmin
            .from('submissions')
            .select('form_id');

        if (submissionsError) {
            console.error('Supabase fetch submissions error:', submissionsError);
            return NextResponse.json({ error: 'Failed to count submissions' }, { status: 500 });
        }

        // 3. Map counts
        const counts: Record<string, number> = {};
        submissions?.forEach((sub: any) => {
            counts[sub.form_id] = (counts[sub.form_id] || 0) + 1;
        });

        // 4. Combine
        const result = (forms || []).map((f: any) => ({
            ...f,
            submissions_count: counts[f.id] || 0,
        }));

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        console.error('API Forms GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
