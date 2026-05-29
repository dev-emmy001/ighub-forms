import { notFound } from "next/navigation";
import FormRenderer from "@/components/form-renderer";
import CountdownTimer from "@/components/countdown-timer";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// Next.js passes the URL parameters (like the slug) into the page props automatically
export default async function DynamicFormPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    // 1. Fetch the specific form configuration from the database
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
        <main className="min-h-screen bg-ighub-light py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="text-center mb-4">
                    <h1 className="text-4xl font-extrabold text-ighub-black tracking-tight mb-4">
                        {formConfig.title}
                    </h1>
                    {formConfig.description && (
                        <p className="text-lg text-gray-600">
                            {formConfig.description}
                        </p>
                    )}
                </div>

                {/* Countdown Timer */}
                {formConfig.closes_at && (
                    <div className="w-full">
                        <CountdownTimer targetDate={formConfig.closes_at} />
                    </div>
                )}

                {/* The Form Engine Component */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
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