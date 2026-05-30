import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email || typeof email !== 'string' || email.trim() === '') {
            return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
        }

        const cleanEmail = email.trim().toLowerCase();

        // 1. Fetch promoter by email
        const { data: promoter, error: promoterError } = await supabaseAdmin
            .from('promoters')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (promoterError) {
            console.error('Supabase fetch promoter by email error:', promoterError);
            return NextResponse.json({ error: 'Failed to retrieve promoter stats' }, { status: 500 });
        }

        if (!promoter) {
            return NextResponse.json({ error: 'No partner profile found with this email' }, { status: 404 });
        }

        // 2. Fetch the assigned campaign/form details
        const { data: form, error: formError } = await supabaseAdmin
            .from('forms')
            .select('id, title, slug, requires_payment, base_price, discount_price')
            .eq('id', promoter.form_id)
            .single();

        if (formError) {
            console.error('Supabase fetch promoter form campaign error:', formError);
        }

        // 3. Fetch all submissions referred by this promoter
        // We match by code in staff_ref case-insensitively
        const cleanCode = promoter.code.trim().toLowerCase();
        
        const { data: submissions, error: subError } = await supabaseAdmin
            .from('submissions')
            .select('id, payment_status, created_at')
            .eq('staff_ref', cleanCode);

        if (subError) {
            console.error('Supabase fetch submissions error:', subError);
        }

        // 4. Calculate stats:
        // - Clicks: obtained from promoter.clicks
        // - Total Referrals: all submissions
        // - Successful Sales: submissions where payment_status is paid, approved, or approved_partner (or not_required)
        const totalReferrals = submissions || [];
        const successfulSales = totalReferrals.filter((sub: any) => {
            const status = (sub.payment_status || '').toLowerCase();
            return status === 'paid' || status === 'approved' || status === 'approved_partner' || status === 'not_required';
        });

        // 5. Calculate payout (e.g., 10% commission on the ticket price for each successful paid registration)
        // If the form has a discount price, we use it, otherwise base price, defaulting to 50,000 NGN if not specified
        const ticketPrice = form ? (form.discount_price || form.base_price || 0) : 50000;
        const commissionRate = 0.10; // 10% commission rate
        
        // Payout is calculated dynamically based on successful sales
        const totalPayoutEarned = successfulSales.length * (ticketPrice * commissionRate);

        return NextResponse.json({
            success: true,
            promoter: {
                id: promoter.id,
                name: promoter.name,
                code: cleanCode,
                email: promoter.email,
                bankDetails: promoter.bank_details || 'No bank details provided',
                clicks: promoter.clicks || 0,
                createdAt: promoter.created_at
            },
            campaign: form ? {
                title: form.title,
                slug: form.slug,
                ticketPrice: ticketPrice
            } : null,
            stats: {
                totalReferrals: totalReferrals.length,
                successfulSales: successfulSales.length,
                commissionEarned: totalPayoutEarned
            }
        }, { status: 200 });

    } catch (error) {
        console.error('API Promoter Stats GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
