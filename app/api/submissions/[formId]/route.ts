import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ formId: string }> }) {
    try {
        const { formId } = await params;

        if (!formId) {
            return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
        }

        const { data: submissions, error } = await supabaseAdmin
            .from('submissions')
            .select('*')
            .eq('form_id', formId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase fetch submissions error:', error);
            return NextResponse.json({ error: 'Failed to retrieve submissions' }, { status: 500 });
        }

        return NextResponse.json(submissions || [], { status: 200 });

    } catch (error) {
        console.error('API Submissions GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
