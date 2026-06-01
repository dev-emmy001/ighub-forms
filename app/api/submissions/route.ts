import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { formId, answers, staffRef } = body;

        // 1. Fetch form config to get schema and email response settings
        const { data: form, error: formError } = await supabaseAdmin
            .from('forms')
            .select('title, form_schema, send_email_response, email_response_message')
            .eq('id', formId)
            .single();

        if (formError || !form) {
            console.error('Failed to fetch form configuration for submission:', formError);
            return NextResponse.json({ error: 'Invalid form configuration' }, { status: 400 });
        }

        // 2. Identify the submitter's email and name from answers dynamic JSON
        let submitterEmail = answers.email || answers['default-email'] || '';
        let submitterName = answers.name || answers['default-name'] || '';

        // If email or name wasn't found directly, search using the schema labels
        const schema = form.form_schema || [];
        schema.forEach((field: any) => {
            const labelLower = (field.label || '').toLowerCase();
            const val = answers[field.id];
            if (val) {
                if (labelLower === 'email' || labelLower === 'email address' || labelLower.includes('email')) {
                    if (!submitterEmail) submitterEmail = val;
                }
                if (labelLower === 'name' || labelLower === 'full name' || labelLower.includes('name')) {
                    if (!submitterName) submitterName = val;
                }
            }
        });

        if (!submitterEmail || submitterEmail === '') {
            submitterEmail = 'no-email-provided';
        }

        // Prepare the payload for Supabase
        const payload = {
            form_id: formId,
            submitter_email: submitterEmail,
            answers: answers, // The entire JSON object of dynamic answers
            staff_ref: staffRef || null,
            payment_status: 'not_required', // Reverted all payment calculations
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

        // 3. Send automatic email response if enabled
        if (form.send_email_response && submitterEmail && submitterEmail !== 'no-email-provided') {
            try {
                let messageBody = form.email_response_message || '';

                // Replace general placeholders
                messageBody = messageBody.replace(/{form_title}/g, form.title || '');
                messageBody = messageBody.replace(/{name}/g, submitterName || 'Registrant');
                messageBody = messageBody.replace(/{email}/g, submitterEmail);

                // Replace specific form field placeholders (e.g. {School Name})
                schema.forEach((field: any) => {
                    const fieldVal = answers[field.id] || '';
                    const placeholderKey = `{${field.label}}`;
                    messageBody = messageBody.split(placeholderKey).join(fieldVal);
                });

                // Format paragraph breaks
                const formattedHtml = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0c0e10; line-height: 1.6;">
                        <div style="margin-bottom: 25px; text-align: center;">
                            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/igcolouredlogo.png" alt="Logo" style="height: 50px;" />
                        </div>
                        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                            ${messageBody.split('\n').map((para: string) => `<p style="margin: 0 0 16px 0;">${para}</p>`).join('')}
                        </div>
                        <div style="margin-top: 25px; text-align: center; font-size: 11px; color: #a0aec0;">
                            Sent automatically by Innovation Growth Hub Forms.
                        </div>
                    </div>
                `;

                // Dispatch email asynchronously
                sendEmail({
                    to: submitterEmail.trim(),
                    subject: `Response: ${form.title}`,
                    html: formattedHtml
                }).catch((emailErr) => {
                    console.error('Async email delivery failed:', emailErr);
                });

            } catch (emailErr) {
                console.error('Error formatting email response:', emailErr);
            }
        }

        // Return the inserted row ID so the frontend can use it
        return NextResponse.json({ success: true, submissionId: data.id }, { status: 200 });

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}