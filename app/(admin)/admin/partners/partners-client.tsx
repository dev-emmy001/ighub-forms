"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Search,
    UserCheck,
    Users,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    Calendar,
    Briefcase,
    Building2,
    XCircle
} from "lucide-react";

interface FormField {
    id: string;
    type: "text" | "number" | "select";
    label: string;
    required: boolean;
    options?: string[];
}

interface Submission {
    id: string;
    form_id: string;
    submitter_email: string;
    answers: Record<string, any>;
    staff_ref: string | null;
    payment_status: string; // 'approved_partner' means approved
    created_at: string;
}

interface CampaignOption {
    id: string;
    title: string;
    slug: string;
}

interface PromoterItem {
    email: string;
    form_id: string;
    code: string;
}

interface PartnersDashboardClientProps {
    initialSubmissions: Submission[];
    formSchema: FormField[];
    formId: string;
    campaignOptions: CampaignOption[];
    initialPromoters: PromoterItem[];
}

// Utility to parse applicant details using schema labels and fallback keys
function parseApplicantDetails(answers: Record<string, any>, schema: FormField[], submitterEmail: string) {
    let name = "";
    let email = "";
    let bankDetails = "";

    // 1. Try matching with form schema field labels
    schema.forEach(field => {
        const label = (field.label || "").toLowerCase();
        const value = answers[field.id];
        if (value) {
            if (label.includes("name") || label.includes("full name") || label.includes("applicant")) {
                if (!name) name = String(value);
            } else if (label.includes("email") || label.includes("mail")) {
                if (!email) email = String(value);
            } else if (label.includes("bank") || label.includes("account") || label.includes("payment")) {
                if (!bankDetails) bankDetails = String(value);
            }
        }
    });

    // 2. Fallbacks: Check keys directly in case fields were submitted outside of schema ids
    if (!name) {
        const nameKey = Object.keys(answers).find(k => k.toLowerCase().includes("name") && !k.toLowerCase().includes("bank"));
        if (nameKey) name = String(answers[nameKey]);
    }
    if (!email) {
        const emailKey = Object.keys(answers).find(k => k.toLowerCase().includes("email") || k.toLowerCase().includes("mail"));
        if (emailKey) email = String(answers[emailKey]);
    }
    if (!bankDetails) {
        // Look for bank name, account number, or generic bank details
        const bankKeys = Object.keys(answers).filter(k => k.toLowerCase().includes("bank") || k.toLowerCase().includes("account"));
        if (bankKeys.length > 0) {
            bankDetails = bankKeys.map(k => `${k.replace(/[-_]/g, ' ')}: ${answers[k]}`).join(" | ");
        }
    }

    return {
        name: name || "Anonymous Submitter",
        email: email || submitterEmail || "No Email Provided",
        bankDetails: bankDetails || "No Bank Details Provided"
    };
}

export default function PartnersDashboardClient({
    initialSubmissions,
    formSchema,
    formId,
    campaignOptions,
    initialPromoters
}: PartnersDashboardClientProps) {
    const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
    const [promoters, setPromoters] = useState<PromoterItem[]>(initialPromoters);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");
    const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Selected campaigns per submission (submissionId -> campaignId)
    // Default to the first campaign option if available
    const defaultCampaignId = campaignOptions.length > 0 ? campaignOptions[0].id : "";
    const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, string>>({});

    // Toast/Alert message states
    const [alertState, setAlertState] = useState<{
        type: "success" | "error" | null;
        message: string | null;
    }>({ type: null, message: null });

    const triggerAlert = (type: "success" | "error", message: string) => {
        setAlertState({ type, message });
        setTimeout(() => {
            setAlertState({ type: null, message: null });
        }, 6000);
    };

    // Calculate Statistics
    const totalCount = submissions.length;
    const approvedCount = submissions.filter(s => s.payment_status === "approved_partner").length;
    const pendingCount = totalCount - approvedCount;

    // Handle Campaign Dropdown Selection
    const handleCampaignChange = (submissionId: string, campaignId: string) => {
        setSelectedCampaigns(prev => ({
            ...prev,
            [submissionId]: campaignId
        }));
    };

    // Handle Application Approval Client side
    const handleApprovePartner = async (submissionId: string, name: string, email: string, bankDetails: string) => {
        const campaignId = selectedCampaigns[submissionId] || defaultCampaignId;

        if (!campaignId) {
            triggerAlert("error", "No active campaigns found. Please create a campaign form first to map this agent.");
            return;
        }

        setProcessingId(submissionId);
        setAlertState({ type: null, message: null });

        try {
            const response = await fetch("/api/partners/approve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    submissionId,
                    name,
                    email,
                    bankDetails,
                    campaignId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to approve partner");
            }

            // Update local state to reflect the approval immediately
            setSubmissions(prev =>
                prev.map(sub =>
                    sub.id === submissionId
                        ? { ...sub, payment_status: "approved_partner" }
                        : sub
                )
            );

            // Add to the local promoters list
            setPromoters(prev => [
                ...prev,
                {
                    email: email.trim().toLowerCase(),
                    form_id: campaignId,
                    code: data.refCode
                }
            ]);

            // Fetch campaign details to show in confirmation toast
            const selectedCampaignTitle = campaignOptions.find(c => c.id === campaignId)?.title || "Campaign";
            triggerAlert(
                "success",
                `Successfully approved ${name} for "${selectedCampaignTitle}"! Code: ${data.refCode}`
            );

        } catch (err: any) {
            console.error(err);
            triggerAlert("error", err.message || "An unexpected error occurred during partner approval.");
        } finally {
            setProcessingId(null);
        }
    };

    // Helper to get questions map for expanded answers display
    const getFieldLabel = (fieldId: string) => {
        const field = formSchema.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
    };

    // Filter Logic
    const filteredSubmissions = submissions.filter(sub => {
        const parsed = parseApplicantDetails(sub.answers, formSchema, sub.submitter_email);

        // Search text filter
        const matchesSearch =
            parsed.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            parsed.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            parsed.bankDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.submitter_email.toLowerCase().includes(searchTerm.toLowerCase());

        // Tab status filter
        const isApproved = sub.payment_status === "approved_partner";
        if (statusFilter === "approved") return matchesSearch && isApproved;
        if (statusFilter === "pending") return matchesSearch && !isApproved;
        return matchesSearch;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Applications Card */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs flex items-center gap-5 transition-all hover:shadow-2xs">
                    <div className="p-4 bg-ighub-light rounded-2xl text-ighub-purple">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 ">Total Applications</span>
                        <h3 className="text-3xl text-ighub-black mt-1">{totalCount}</h3>
                    </div>
                </div>

                {/* Pending Review Card */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs flex items-center gap-5 transition-all hover:shadow-2xs">
                    <div className="p-4 bg-orange-50 rounded-2xl text-ighub-orange">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pending Review</span>
                        <h3 className="text-3xl text-ighub-black mt-1">{pendingCount}</h3>
                    </div>
                </div>

                {/* Approved Partners Card */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs flex items-center gap-5 transition-all hover:shadow-2xs">
                    <div className="p-4 bg-emerald-50 rounded-2xl text-ighub-green">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Approved Partners</span>
                        <h3 className="text-3xl text-ighub-black mt-1">{approvedCount}</h3>
                    </div>
                </div>
            </div>

            {/* Alert Notification Toast */}
            {alertState.message && (
                <div className={`p-4 rounded-2xl shadow-md border flex items-start gap-3 animate-in slide-in-from-top-4 duration-300 ${alertState.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : "bg-rose-50 border-rose-200 text-rose-950"
                    }`}>
                    {alertState.type === "success" ? (
                        <CheckCircle2 className="w-5 h-5 text-ighub-green shrink-0 mt-0.5" />
                    ) : (
                        <XCircle className="w-5 h-5 text-ighub-orange shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-sm font-semibold leading-snug">
                        {alertState.message}
                    </div>
                    <button
                        type="button"
                        onClick={() => setAlertState({ type: null, message: null })}
                        className="text-gray-400 hover:text-gray-650 cursor-pointer font-bold text-xs"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Table Filter Operations */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100/60 shadow-3xs flex flex-col md:flex-row justify-between gap-4 items-center">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-md flex rounded-2xl border border-gray-200 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green overflow-hidden">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                        <Search className="w-4 h-4" />
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search applicants by name, email, or banking details..."
                        className="w-full pl-11 pr-4 py-3 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
                    />
                </div>

                {/* Status Tabs */}
                <div className="flex bg-gray-150 p-1 rounded-2xl w-full md:w-auto">
                    {([
                        { id: "all", label: "All Applicants" },
                        { id: "pending", label: "Pending" },
                        { id: "approved", label: "Approved" }
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-tigher transition-all cursor-pointer ${statusFilter === tab.id
                                ? "bg-white text-ighub-purple shadow-3xs"
                                : "text-gray-400 hover:text-gray-700"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submissions Index Grid */}
            {filteredSubmissions.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl p-6 shadow-3xs">
                    <Briefcase className="w-16 h-16 text-gray-250 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-ighub-black">No candidates found</h3>
                    <p className="text-sm text-gray-400 max-w-xs mx-auto mt-1">
                        We couldn't find any affiliate submissions matching your current filters.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100/60 shadow-3xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-ighub-light border-b border-gray-200 text-xs text-gray-500">
                                    <th className="px-6 py-4">Applicant</th>
                                    {/* <th className="px-6 py-4">Bank Details</th> */}
                                    <th className="px-6 py-4">Promoting Campaign</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-center">Approve</th>
                                    <th className="px-6 py-4 text-right">More</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-150 text-sm">
                                {filteredSubmissions.map(sub => {
                                    const parsed = parseApplicantDetails(sub.answers, formSchema, sub.submitter_email);
                                    const isExpanded = expandedSubId === sub.id;
                                    const isApproved = sub.payment_status === "approved_partner";
                                    const activeCampaignId = selectedCampaigns[sub.id] || defaultCampaignId;
                                    const isRowProcessing = processingId === sub.id;

                                    const promoter = promoters.find(p => p.email?.toLowerCase() === parsed.email?.toLowerCase());
                                    const assignedCampaignId = promoter ? promoter.form_id : activeCampaignId;
                                    const assignedCampaignTitle = campaignOptions.find(c => c.id === assignedCampaignId)?.title || "Affiliate Link Assigned";

                                    return (
                                        <React.Fragment key={sub.id}>
                                            <tr className="hover:bg-gray-50/50 transition-colors">
                                                {/* Candidate name and email */}
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-ighub-black">{parsed.name}</div>
                                                    <div className="text-xs text-gray-450 font-medium mt-0.5">{parsed.email}</div>
                                                    {isApproved && promoter && (
                                                        <div className="text-[10px] font-bold text-ighub-purple mt-1 uppercase tracking-wide">
                                                            Code: {promoter.code}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Bank Account info
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-ighub-light px-3 py-1.5 rounded-xl border border-gray-200 max-w-[280px]">
                                                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                        <span className="truncate" title={parsed.bankDetails}>
                                                            {parsed.bankDetails}
                                                        </span>
                                                    </div>
                                                </td> */}

                                                {/* Campaign selection dropdown */}
                                                <td className="px-6 py-5">
                                                    {isApproved ? (
                                                        <span className="text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100" title={assignedCampaignTitle}>
                                                            {assignedCampaignTitle}
                                                        </span>
                                                    ) : (
                                                        <div className="relative max-w-[220px]">
                                                            <select
                                                                value={activeCampaignId}
                                                                onChange={(e) => handleCampaignChange(sub.id, e.target.value)}
                                                                disabled={isApproved || isRowProcessing}
                                                                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green text-xs font-semibold appearance-none cursor-pointer disabled:opacity-50"
                                                            >
                                                                {campaignOptions.length === 0 ? (
                                                                    <option value="">No Active Campaigns</option>
                                                                ) : (
                                                                    campaignOptions.map(camp => (
                                                                        <option key={camp.id} value={camp.id}>
                                                                            {camp.title}
                                                                        </option>
                                                                    ))
                                                                )}
                                                            </select>
                                                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Status Badge */}
                                                <td className="px-6 py-5">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tigher ${isApproved
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                        : "bg-amber-50 text-amber-700 border border-amber-100"
                                                        }`}>
                                                        {isApproved ? "Approved Partner" : "Pending Review"}
                                                    </span>
                                                </td>

                                                {/* Action approve button */}
                                                <td className="px-6 py-5 text-center">
                                                    {isApproved ? (
                                                        <div className="inline-flex items-center gap-1 text-ighub-green font-bold text-xs bg-emerald-50/50 p-2 px-3.5 rounded-full border border-emerald-100">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Approved
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => handleApprovePartner(sub.id, parsed.name, parsed.email, parsed.bankDetails)}
                                                            disabled={isRowProcessing || campaignOptions.length === 0}
                                                            className="text-xs py-2 px-4 rounded-full font-bold shadow-3xs cursor-pointer select-none"
                                                        >
                                                            {isRowProcessing ? (
                                                                <>
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                                    Processing...
                                                                </>
                                                            ) : (
                                                                "Approve Agent"
                                                            )}
                                                        </Button>
                                                    )}
                                                </td>

                                                {/* Expanded Details trigger */}
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                                                        className="text-gray-400 hover:text-ighub-purple p-2 hover:bg-ighub-light rounded-xl transition-all cursor-pointer"
                                                        title="View full submission answers"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded detail box row */}
                                            {isExpanded && (
                                                <tr className="bg-ighub-light/20">
                                                    <td colSpan={6} className="px-8 py-5 border-t border-gray-150">
                                                        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-4 max-w-4xl">
                                                            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 justify-between">
                                                                <h4 className="text-xs font-black uppercase tracking-tigher text-gray-400">
                                                                    Complete Registration Answers
                                                                </h4>
                                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
                                                                    <Calendar className="w-3.5 h-3.5" />
                                                                    Applied on: {new Date(sub.created_at).toLocaleDateString()} at {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {Object.entries(sub.answers).map(([key, value]) => {
                                                                    const label = getFieldLabel(key);
                                                                    return (
                                                                        <div key={key} className="bg-ighub-light/40 p-3 rounded-xl border border-gray-100">
                                                                            <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                                                                                {label}
                                                                            </span>
                                                                            <span className="text-xs font-semibold text-ighub-black leading-relaxed">
                                                                                {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
