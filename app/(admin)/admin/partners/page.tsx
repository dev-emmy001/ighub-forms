import React from "react";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import PartnersDashboardClient from "./partners-client";

export const dynamic = "force-dynamic";

export default async function PartnersAdminPage() {
    // 1. Fetch the target affiliate registration form configuration
    const { data: registrationForm, error: formError } = await supabase
        .from("forms")
        .select("id, form_schema")
        .eq("slug", "affiliate-registration")
        .single();

    if (formError || !registrationForm) {
        return (
            <main className="min-h-screen bg-ighub-light flex items-center justify-center p-6 ">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-100 shadow-xs text-center space-y-6">
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto text-xl font-bold">!</div>
                    <div>
                        <h2 className="text-lg font-bold text-ighub-black">Affiliate Registration Form Missing</h2>
                        <p className="text-sm text-gray-500 mt-2">
                            Could not find a form with the slug <code className="bg-gray-150 px-2 py-0.5 rounded font-mono text-xs text-ighub-purple">affiliate-registration</code>.
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            Please create and publish the affiliate registration form in the administration console first.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // 2. Fetch all submissions for this form
    const { data: submissions, error: subError } = await supabase
        .from("submissions")
        .select("*")
        .eq("form_id", registrationForm.id)
        .order("created_at", { ascending: false });

    if (subError) {
        return (
            <main className="min-h-screen bg-ighub-light flex items-center justify-center p-6 ">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-gray-150 shadow-xs text-center space-y-6">
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto text-xl font-bold">X</div>
                    <div>
                        <h2 className="text-lg font-bold text-ighub-black">Database Fetch Failed</h2>
                        <p className="text-sm text-gray-500 mt-2">
                            An error occurred while retrieving partner submissions:
                        </p>
                        <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-100 mt-2 font-mono break-all text-left">
                            {subError.message}
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // 3. Fetch all active campaign forms (excluding the registration form itself)
    const { data: campaigns } = await supabase
        .from("forms")
        .select("id, title, slug")
        .eq("is_active", true)
        .neq("slug", "affiliate-registration")
        .order("created_at", { ascending: false });

    // 4. Fetch all existing promoters to map active link assignments in the UI
    const { data: promoters } = await supabase
        .from("promoters")
        .select("email, form_id, code");

    return (
        <main className="min-h-screen bg-ighub-light text-ighub-black flex flex-col ">
            {/* Header Area */}
            <header className="bg-white px-6 py-4 sticky top-0 z-30 border-b border-gray-100 shadow-3xs">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tigher text-gray-400 mb-1">
                            <span className="text-ighub-purple">Admin Portal</span>
                            <span>/</span>
                            <span>Affiliates</span>
                        </div>
                        <h1 className="text-2xl text-ighub-black">
                            Partner Applications Console
                        </h1>
                    </div>
                </div>
            </header>

            {/* Main Interactive Dashboard Area */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-6">
                <PartnersDashboardClient
                    initialSubmissions={submissions || []}
                    formSchema={registrationForm.form_schema || []}
                    formId={registrationForm.id}
                    campaignOptions={campaigns || []}
                    initialPromoters={promoters || []}
                />
            </div>
        </main>
    );
}
