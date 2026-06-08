import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { submissionId } = body;

        if (!submissionId) {
            return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
        }

        // Update the submission in the submissions table
        const { error: submissionUpdateError } = await supabaseAdmin
            .from('submissions')
            .update({ payment_status: 'rejected' })
            .eq('id', submissionId);

        if (submissionUpdateError) {
            console.error('Supabase update submission error:', submissionUpdateError);
            return NextResponse.json({ error: `Database update failed: ${submissionUpdateError.message}` }, { status: 500 });
        }

        return NextResponse.json({
            success: true
        }, { status: 200 });

    } catch (error) {
        console.error('API Partners Reject POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
