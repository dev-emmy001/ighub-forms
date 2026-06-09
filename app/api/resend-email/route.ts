import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { submissionId, newEmail } = body;

        if (!submissionId) {
            return NextResponse.json({ error: 'Missing submission ID' }, { status: 400 });
        }

        // Fetch the submission
        const { data: submission, error: subError } = await supabaseAdmin
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .single();

        if (subError || !submission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        // Fetch the form configuration
        const { data: form, error: formError } = await supabaseAdmin
            .from('forms')
            .select('title, form_schema, send_email_response, email_response_message')
            .eq('id', submission.form_id)
            .single();

        if (formError || !form) {
            return NextResponse.json({ error: 'Form configuration not found' }, { status: 404 });
        }

        if (!form.send_email_response) {
            return NextResponse.json({ error: 'This form does not have email responses enabled' }, { status: 400 });
        }

        const targetEmail = newEmail || submission.submitter_email;
        if (!targetEmail || targetEmail === 'no-email-provided') {
            return NextResponse.json({ error: 'No valid email address available to send to' }, { status: 400 });
        }

        // Re-calculate submitter name
        const answers = submission.answers || {};
        let submitterName = answers.name || answers['default-name'] || '';
        const schema = form.form_schema || [];
        
        schema.forEach((field: any) => {
            const labelLower = (field.label || '').toLowerCase();
            const val = answers[field.id];
            if (val) {
                if (labelLower === 'name' || labelLower === 'full name' || labelLower.includes('name')) {
                    if (!submitterName) submitterName = val;
                }
            }
        });

        // Reconstruct the email template
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

        let messageBody = form.email_response_message || '';
        messageBody = messageBody.replace(/{form_title}/g, form.title || '');
        messageBody = messageBody.replace(/{name}/g, submitterName || 'Registrant');
        messageBody = messageBody.replace(/{email}/g, targetEmail);

        schema.forEach((field: any) => {
            const fieldVal = answers[field.id] || '';
            const placeholderKey = `{${field.label}}`;
            messageBody = messageBody.split(placeholderKey).join(fieldVal);
        });

        const formattedHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0c0e10; line-height: 1.6;">
                <div style="margin-bottom: 25px; text-align: center;">
                    <img src="${baseUrl}/igcolouredlogo.png" alt="Logo" style="height: 50px;" />
                </div>
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    ${messageBody.split('\\n').map((para: string) => `<p style="margin: 0 0 16px 0;">${para}</p>`).join('')}
                </div>
                <div style="margin-top: 25px; text-align: center; font-size: 11px; color: #a0aec0;">
                    Sent automatically by Innovation Growth Hub Forms.
                </div>
            </div>
        `;

        // Send the email
        const emailResult = await sendEmail({
            to: targetEmail.trim(),
            subject: `Response: ${form.title}`,
            html: formattedHtml
        });

        if (!emailResult.success) {
            // Update db with failure
            await supabaseAdmin
                .from('submissions')
                .update({
                    email_status: 'failed',
                    email_error: String(emailResult.error || 'Unknown error'),
                    submitter_email: targetEmail // update email if it was changed
                })
                .eq('id', submissionId);
                
            return NextResponse.json({ error: 'Failed to send email', details: emailResult.error }, { status: 500 });
        }

        // Success
        await supabaseAdmin
            .from('submissions')
            .update({
                email_status: 'sent',
                email_error: null,
                submitter_email: targetEmail // update email if it was changed
            })
            .eq('id', submissionId);

        return NextResponse.json({ success: true, message: 'Email resent successfully' }, { status: 200 });

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
