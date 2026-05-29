import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { formId, answers, staffRef, requiresPayment, paymentMethod } = body;

        // Determine the initial payment status based on the form configuration
        let initialPaymentStatus = 'not_required';

        if (requiresPayment) {
            if (paymentMethod === 'cash') {
                initialPaymentStatus = 'pending_cash';
            } else if (paymentMethod === 'paystack') {
                initialPaymentStatus = 'pending_online';
            }
        }

        // Prepare the payload for Supabase
        const payload = {
            form_id: formId,
            submitter_email: answers.email || 'no-email-provided', // Assuming 'email' is a standard field
            answers: answers, // The entire JSON object of dynamic answers
            staff_ref: staffRef || null,
            payment_status: initialPaymentStatus,
        };

        // Insert into the database
        const { data, error } = await supabaseAdmin
            .from('submissions')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Supabase Insert Error:', error);
            return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
        }

        // Return the inserted row ID so the frontend can use it (e.g., for Paystack reference)
        return NextResponse.json({ success: true, submissionId: data.id }, { status: 200 });

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}