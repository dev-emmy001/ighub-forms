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
            requires_payment: !!requires_payment,
            base_price: requires_payment ? parseFloat(base_price) || 0 : 0,
            discount_price: requires_payment ? parseFloat(discount_price) || 0 : 0,
            form_schema: form_schema,
            is_active: true,
            created_at: new Date().toISOString(),
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
