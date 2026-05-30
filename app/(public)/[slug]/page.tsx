import { notFound } from "next/navigation";
import FormRenderer from "@/components/form-renderer";
import CountdownTimer from "@/components/countdown-timer";
import TicketPriceCard from "@/components/ticket-price-card";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// Next.js passes the URL parameters (like the slug) and query params into the page props automatically
export default async function DynamicFormPage({
    params,
    searchParams
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ ref?: string }>;
}) {
    const { slug } = await params;
    const { ref } = await searchParams;

    // 1. If ref code is present, increment click count on the promoter's record
    if (ref) {
        const cleanRef = ref.trim().toLowerCase();
        
        // Fetch the promoter matching the code
        const { data: promoter } = await supabase
            .from("promoters")
            .select("id, clicks")
            .eq("code", cleanRef)
            .maybeSingle();

        if (promoter) {
            // Increment the clicks count
            await supabase
                .from("promoters")
                .update({ clicks: (promoter.clicks || 0) + 1 })
                .eq("id", promoter.id);
        }
    }

    // 2. Fetch the specific form configuration from the database
    const { data: formConfig, error } = await supabase
        .from("forms")
        .select("*")
        .eq("slug", slug)
        .single();

    // 2. If the slug doesn't exist in the database, trigger a 404 page natively
    if (error || !formConfig) {
        notFound();
    }

    const hasClosed = formConfig.closes_at && new Date(formConfig.closes_at).getTime() <= Date.now();

    // 3. If the form is drafted, closed, or deadline has passed, prevent registration
    if (!formConfig.is_active || hasClosed) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center p-4">
                <div>
                    <h1 className="text-2xl font-bold text-ighub-black mb-2">Registration Closed</h1>
                    <p className="text-gray-500">This form is no longer accepting submissions.</p>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen pb-24 relative flex flex-col">
            {/* Sticky Countdown Timer fixed to the top of the viewport */}
            {formConfig.closes_at && (
                <div className="sticky top-0 z-50 w-full  py-4 px-4 sm:px-6 lg:px-8 flex justify-center shrink-0">
                    <div className="w-full max-w-2xl">
                        <CountdownTimer targetDate={formConfig.closes_at} />
                    </div>
                </div>
            )}

            <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-8 flex-1">
                {/* Header Section */}
                <div className="text-center mb-4">
                    <h1 className="text-lg font-bold text-ighub-black tracking-tight mb-4">
                        {formConfig.title}
                    </h1>
                    {formConfig.description && (
                        <p className="text-sm text-gray-600">
                            {formConfig.description}
                        </p>
                    )}
                </div>

                {/* Ticket Price Display if Requires Payment */}
                {formConfig.requires_payment && (
                    <TicketPriceCard
                        basePrice={formConfig.base_price}
                        discountPrice={formConfig.discount_price}
                        discountClosesAt={formConfig.discount_closes_at}
                    />
                )}

                {/* The Form Engine Component */}
                <div className="bg-white p-8 rounded-xl border border-gray-100">
                    {/* We pass the JSON array directly into the schema prop */}
                    <FormRenderer
                        schema={formConfig.form_schema}
                        requiresPayment={formConfig.requires_payment}
                        formId={formConfig.id} // Passing ID so the renderer knows where to post the data
                    />
                </div>
            </div>
        </main>
    );
}