import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { submissionId, name, email, bankDetails, campaignId } = body;

        // 1. Validate incoming data
        if (!submissionId) {
            return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 });
        }
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: 'Applicant name is required' }, { status: 400 });
        }
        if (!email || typeof email !== 'string' || email.trim() === '') {
            return NextResponse.json({ error: 'Applicant email is required' }, { status: 400 });
        }
        if (!bankDetails || typeof bankDetails !== 'string' || bankDetails.trim() === '') {
            return NextResponse.json({ error: 'Applicant bank details are required' }, { status: 400 });
        }
        if (!campaignId) {
            return NextResponse.json({ error: 'Campaign ID (Form ID) is required' }, { status: 400 });
        }

        // 2. Generate a unique referral code: [firstname]
        // If it exists, append incrementing numbers: [firstname]1, [firstname]2, etc.
        let refCode = '';
        let isUnique = false;
        let suffix = 0;

        // Extract first name (alphanumeric, lowercase)
        const firstNameClean = name
            .trim()
            .split(/\s+/)[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');

        const baseCode = firstNameClean || 'partner';

        while (!isUnique) {
            const checkCode = suffix === 0 ? baseCode : `${baseCode}${suffix}`;

            // Check if code is unique in promoters table
            const { data: existingPromoter, error: checkError } = await supabaseAdmin
                .from('promoters')
                .select('id')
                .eq('code', checkCode)
                .maybeSingle();

            if (checkError) {
                console.error('Supabase checking referral code error:', checkError);
                return NextResponse.json({ error: 'Failed to verify referral code uniqueness' }, { status: 500 });
            }

            if (!existingPromoter) {
                refCode = checkCode;
                isUnique = true;
            } else {
                suffix++;
            }
        }

        // 3. Insert promoter into the database (promoters table) bypassing RLS using supabaseAdmin
        const { data: promoterData, error: promoterInsertError } = await supabaseAdmin
            .from('promoters')
            .insert([
                {
                    form_id: campaignId,
                    name: name.trim(),
                    code: refCode,
                    email: email.trim().toLowerCase(),
                    bank_details: bankDetails.trim(),
                    clicks: 0,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (promoterInsertError) {
            console.error('Supabase insert promoter error:', promoterInsertError);
            return NextResponse.json({ error: `Database insert failed: ${promoterInsertError.message}` }, { status: 500 });
        }

        // 4. Update the original submission in the submissions table
        const { error: submissionUpdateError } = await supabaseAdmin
            .from('submissions')
            .update({ payment_status: 'approved_partner' })
            .eq('id', submissionId);

        if (submissionUpdateError) {
            console.error('Supabase update submission error:', submissionUpdateError);
            // Rollback promoter insertion to maintain data integrity
            await supabaseAdmin.from('promoters').delete().eq('id', promoterData.id);
            return NextResponse.json({ error: `Database update failed: ${submissionUpdateError.message}` }, { status: 500 });
        }

        /*
        ========================================================================
        TODO: Resend Email Integration
        ------------------------------------------------------------------------
        Trigger a welcome email to the newly approved partner using Resend.
        Email Details:
        - To: email
        - Subject: Welcome to the IGHub Partner Program!
        - Body: Tell them they are approved, share their tracking link:
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/[campaign-slug]?ref=${refCode}`
          and banking details confirmation.

        Example implementation code:
        
        import { Resend } from 'resend';
        
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            try {
                // Fetch the campaign slug to generate the correct referral link
                const { data: campaignForm } = await supabaseAdmin
                    .from('forms')
                    .select('slug, title')
                    .eq('id', campaignId)
                    .single();
                
                const campaignSlug = campaignForm?.slug || 'kids-code-camp-2026';
                const campaignTitle = campaignForm?.title || 'Kids Code Camp 2026';
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                const referralUrl = `${appUrl}/${campaignSlug}?ref=${refCode}`;

                await resend.emails.send({
                    from: 'IGHub Partners <partners@ighub.ng>',
                    to: [email],
                    subject: 'Your IGHub Partner Application has been Approved!',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0c0e10;">
                            <h2 style="color: #27286e;">Congratulations, ${name}!</h2>
                            <p>We are excited to inform you that your application to become an IGHub Affiliate Partner has been approved.</p>
                            
                            <div style="background-color: #f8f8f8; padding: 15px; border-radius: 10px; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Your Referral Code:</strong> <span style="font-family: monospace; font-size: 16px; color: #27286e; font-weight: bold;">${refCode}</span></p>
                                <p style="margin: 5px 0;"><strong>Campaign:</strong> ${campaignTitle}</p>
                                <p style="margin: 15px 0 5px 0;"><strong>Your Unique Referral Link:</strong></p>
                                <p style="margin: 5px 0;"><a href="${referralUrl}" style="color: #89be2b; font-weight: bold; word-break: break-all;">${referralUrl}</a></p>
                            </div>
                            
                            <p>Share your link to refer registrants and earn commission when they apply. Commissions will be paid directly to your registered bank account:</p>
                            <p style="font-style: italic; color: #555;">"${bankDetails}"</p>
                            
                            <p>To track your referrals, visits, and payouts, go to: <a href="${appUrl}/partners">${appUrl}/partners</a></p>
                            
                            <p>If you have any questions or need marketing resources, feel free to reply to this email.</p>
                            <p>Best regards,<br/><strong>The IGHub Team</strong></p>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error('Failed to send Resend welcome email:', emailErr);
            }
        }
        ========================================================================
        */

        return NextResponse.json({
            success: true,
            refCode: refCode,
            promoterId: promoterData.id
        }, { status: 200 });

    } catch (error) {
        console.error('API Partners Approve POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
