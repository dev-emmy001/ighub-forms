import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Retrieve a specific form configuration by ID
export async function GET(req: Request, { params }: { params: Promise<{ formId: string }> }) {
    try {
        const { formId } = await params;

        if (!formId) {
            return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
        }

        // Determine if formId is a UUID or a slug
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(formId);

        let query = supabaseAdmin.from('forms').select('*');
        if (isUuid) {
            query = query.eq('id', formId);
        } else {
            query = query.eq('slug', formId);
        }

        const { data: form, error } = await query.maybeSingle();

        if (error) {
            console.error('Supabase fetch form error:', error);
            return NextResponse.json({ error: 'Failed to retrieve form details' }, { status: 500 });
        }

        if (!form) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        return NextResponse.json(form, { status: 200 });

    } catch (error) {
        console.error('API Form GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT: Update an existing form configuration by ID
export async function PUT(req: Request, { params }: { params: Promise<{ formId: string }> }) {
    try {
        const { formId } = await params;
        const body = await req.json();

        // Support quick active status toggle
        if (body.toggle_active !== undefined) {
            const { data, error } = await supabaseAdmin
                .from('forms')
                .update({ is_active: !!body.toggle_active })
                .eq('id', formId)
                .select()
                .single();

            if (error) {
                console.error('Supabase toggle error:', error);
                return NextResponse.json({ error: 'Failed to toggle form status' }, { status: 500 });
            }
            return NextResponse.json({ success: true, form: data }, { status: 200 });
        }
        
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

        // 1. Validation
        if (!formId) {
            return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
        }

        if (!title || typeof title !== 'string' || title.trim() === '') {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (!slug || typeof slug !== 'string' || slug.trim() === '') {
            return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
        }

        // Validate slug format
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

        // 2. Check if slug already exists on OTHER forms (prevent duplicates)
        const { data: existingForm, error: checkError } = await supabaseAdmin
            .from('forms')
            .select('id')
            .eq('slug', slug)
            .neq('id', formId)
            .maybeSingle();

        if (checkError) {
            console.error('Supabase check error:', checkError);
            return NextResponse.json({ error: 'Failed to verify slug uniqueness' }, { status: 500 });
        }

        if (existingForm) {
            return NextResponse.json({ error: 'This slug/handle is already in use by another form. Please choose a different one.' }, { status: 409 });
        }

        // 3. Prepare payload for update
        const payload = {
            title: title.trim(),
            slug: slug.trim(),
            description: description ? description.trim() : '',
            form_schema: form_schema,
            closes_at: closes_at ? new Date(closes_at).toISOString() : null,
            updated_at: new Date().toISOString(),
            send_email_response: !!body.send_email_response,
            email_response_message: body.email_response_message ? body.email_response_message.trim() : '',
        };

        // 4. Update in Supabase
        const { data, error } = await supabaseAdmin
            .from('forms')
            .update(payload)
            .eq('id', formId)
            .select()
            .single();

        if (error) {
            console.error('Supabase Update Form Error:', error);
            return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, form: data }, { status: 200 });

    } catch (error) {
        console.error('API Form PUT Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
