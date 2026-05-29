"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import CountdownTimer from "@/components/countdown-timer";
import { createBrowserClientInstance } from "@/lib/supabase-browser";
import {
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    Eye,
    Laptop,
    Smartphone,
    CreditCard,
    Sparkles,
    AlertCircle,
    Check,
    Loader2,
    ArrowLeft,
    Settings,
    Layers,
    Save,
    Users,
    Share2,
    Download,
    Search,
    Copy,
    Calendar,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    LogOut
} from "lucide-react";

interface FormField {
    id: string; // crypto.randomUUID()
    type: 'text' | 'number' | 'select';
    label: string;
    required: boolean;
    options: string[]; // only used if type is 'select'
}

interface EventMetadata {
    title: string;
    slug: string;
    description: string;
    requires_payment: boolean;
    base_price: string;
    discount_price: string;
    closes_at: string;
}

interface Submission {
    id: string;
    submitter_email: string;
    answers: Record<string, any>;
    staff_ref: string | null;
    payment_status: string;
    created_at: string;
}

interface Promoter {
    id: string;
    name: string;
    code: string;
    form_id: string;
    referral_count: number;
    created_at: string;
}

export default function EditFormPage({ params: paramsPromise }: { params: Promise<{ formId: string }> }) {
    const params = use(paramsPromise);
    const { formId } = params;
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const supabase = createBrowserClientInstance();
            await supabase.auth.signOut();
            router.push("/login");
            router.refresh();
        } catch (err) {
            console.error("Logout failed:", err);
            router.push("/login");
        }
    };

    // 1. Tabs state
    const [activeTab, setActiveTab] = useState<"editor" | "submissions" | "referrals">("editor");

    // 2. Editor state
    const [metadata, setMetadata] = useState<EventMetadata>({
        title: "",
        slug: "",
        description: "",
        requires_payment: false,
        base_price: "0",
        discount_price: "0",
        closes_at: "",
    });
    const [fields, setFields] = useState<FormField[]>([]);

    // 3. Submissions state
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [submissionsSearch, setSubmissionsSearch] = useState("");
    const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
    const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(false);

    // 4. Referrals state
    const [promoters, setPromoters] = useState<Promoter[]>([]);
    const [newPromoterName, setNewPromoterName] = useState("");
    const [newPromoterCode, setNewPromoterCode] = useState("");
    const [isPromotersLoading, setIsPromotersLoading] = useState(false);
    const [promoterSubmitError, setPromoterSubmitError] = useState<string | null>(null);
    const [copiedPromoterId, setCopiedPromoterId] = useState<string | null>(null);

    // 5. Global loading & status
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{
        success?: boolean;
        message?: string;
        createdSlug?: string;
    }>({});
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Format datetime-local input YYYY-MM-DDTHH:MM from ISO string
    const formatDatetimeLocal = (isoString?: string | null) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return "";
        const pad = (n: number) => String(n).padStart(2, "0");
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // 6. Fetch Form Configuration on Mount
    useEffect(() => {
        const fetchFormData = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`/api/forms/${formId}`);
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed to load form configuration");
                }
                const data = await res.json();

                setMetadata({
                    title: data.title || "",
                    slug: data.slug || "",
                    description: data.description || "",
                    requires_payment: !!data.requires_payment,
                    base_price: String(data.base_price ?? 0),
                    discount_price: String(data.discount_price ?? 0),
                    closes_at: formatDatetimeLocal(data.closes_at),
                });
                setFields(data.form_schema || []);
            } catch (err: any) {
                console.error(err);
                setFetchError(err.message || "An unexpected error occurred while loading form data.");
            } finally {
                setIsLoading(false);
            }
        };

        if (formId) {
            fetchFormData();
        }
    }, [formId]);

    // 7. Load Tab Data dynamically
    useEffect(() => {
        if (activeTab === "submissions") {
            loadSubmissions();
        } else if (activeTab === "referrals") {
            loadPromoters();
        }
    }, [activeTab]);

    const loadSubmissions = async () => {
        setIsSubmissionsLoading(true);
        try {
            const res = await fetch(`/api/submissions/${formId}`);
            if (!res.ok) {
                throw new Error("Failed to load submissions list.");
            }
            const data = await res.json();
            setSubmissions(data || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsSubmissionsLoading(false);
        }
    };

    const loadPromoters = async () => {
        setIsPromotersLoading(true);
        try {
            const res = await fetch(`/api/promoters?formId=${formId}`);
            if (!res.ok) {
                throw new Error("Failed to load promoters list.");
            }
            const data = await res.json();
            setPromoters(data || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsPromotersLoading(false);
        }
    };

    // 8. Add Promoter Code Handler
    const handleRegisterPromoter = async (e: React.FormEvent) => {
        e.preventDefault();
        setPromoterSubmitError(null);

        if (!newPromoterName.trim() || !newPromoterCode.trim()) {
            setPromoterSubmitError("Name and tracking code are required.");
            return;
        }

        try {
            const res = await fetch("/api/promoters", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: newPromoterName,
                    code: newPromoterCode,
                    formId,
                }),
            });

            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || "Failed to register promoter.");
            }

            setNewPromoterName("");
            setNewPromoterCode("");
            loadPromoters(); // Reload promoters grid
        } catch (err: any) {
            console.error(err);
            setPromoterSubmitError(err.message || "An error occurred.");
        }
    };

    // 9. Copy Promoter tracked link
    const handleCopyPromoterLink = (code: string, id: string) => {
        if (typeof window === "undefined") return;
        const origin = window.location.origin;
        const url = `${origin}/${metadata.slug}?ref=${code.trim().toLowerCase()}`;
        navigator.clipboard.writeText(url);
        setCopiedPromoterId(id);
        setTimeout(() => setCopiedPromoterId(null), 2000);
    };

    // 10. CSV Submissions Exporter
    const handleExportCSV = () => {
        if (submissions.length === 0) return;

        // Headers: Email, Date, Status, Ref, and Form Question Labels
        const dynamicHeaders = fields.map((f) => f.label);
        const headers = ["Submitter Email", "Date Registered", "Payment Status", "Referral Code", ...dynamicHeaders];

        const rows = submissions.map((sub) => {
            const dateStr = new Date(sub.created_at).toLocaleDateString();
            const answersObj = sub.answers || {};
            const dynamicValues = fields.map((f) => {
                const val = answersObj[f.id] || "";
                return typeof val === "object" ? JSON.stringify(val) : String(val);
            });

            return [
                sub.submitter_email,
                dateStr,
                sub.payment_status,
                sub.staff_ref || "None",
                ...dynamicValues
            ].map((val) => `"${val.replace(/"/g, '""')}"`); // Escape quotes
        });

        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${metadata.slug}_submissions.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 11. Form Fields Schema Handlers
    const generateId = () => {
        if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `field_${Math.random().toString(36).substring(2, 9)}`;
    };

    const addField = () => {
        const newField: FormField = {
            id: generateId(),
            type: "text",
            label: `Question Field ${fields.length + 1}`,
            required: false,
            options: [],
        };
        setFields((prev) => [...prev, newField]);
    };

    const deleteField = (id: string) => {
        setFields((prev) => prev.filter((f) => f.id !== id));
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields((prev) =>
            prev.map((f) => {
                if (f.id === id) {
                    const updated = { ...f, ...updates };
                    if (updates.type === "select" && (!f.options || f.options.length === 0)) {
                        updated.options = ["Option 1"];
                    }
                    return updated;
                }
                return f;
            })
        );
    };

    // Select Field Option Operations
    const addOptionToField = (fieldId: string) => {
        setFields((prev) =>
            prev.map((f) => {
                if (f.id === fieldId) {
                    return {
                        ...f,
                        options: [...f.options, `Option ${f.options.length + 1}`],
                    };
                }
                return f;
            })
        );
    };

    const updateOptionInField = (fieldId: string, optionIndex: number, newValue: string) => {
        setFields((prev) =>
            prev.map((f) => {
                if (f.id === fieldId) {
                    const newOptions = [...f.options];
                    newOptions[optionIndex] = newValue;
                    return { ...f, options: newOptions };
                }
                return f;
            })
        );
    };

    const deleteOptionFromField = (fieldId: string, optionIndex: number) => {
        setFields((prev) =>
            prev.map((f) => {
                if (f.id === fieldId) {
                    const newOptions = f.options.filter((_, idx) => idx !== optionIndex);
                    return { ...f, options: newOptions };
                }
                return f;
            })
        );
    };

    // Vertical Reordering
    const moveFieldUp = (index: number) => {
        if (index === 0) return;
        setFields((prev) => {
            const updated = [...prev];
            const temp = updated[index];
            updated[index] = updated[index - 1];
            updated[index - 1] = temp;
            return updated;
        });
    };

    const moveFieldDown = (index: number) => {
        if (index === fields.length - 1) return;
        setFields((prev) => {
            const updated = [...prev];
            const temp = updated[index];
            updated[index] = updated[index + 1];
            updated[index + 1] = temp;
            return updated;
        });
    };

    // 12. Slug Auto-generation
    useEffect(() => {
        if (!isSlugManuallyEdited && metadata.title && !metadata.slug) {
            const generatedSlug = metadata.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .trim();
            setMetadata((prev) => ({ ...prev, slug: generatedSlug }));
        }
    }, [metadata.title, isSlugManuallyEdited]);

    // Metadata Handlers
    const handleMetadataChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setMetadata((prev) => ({ ...prev, [name]: value }));

        if (name === "slug") {
            setIsSlugManuallyEdited(true);
        }
    };

    const handlePaymentToggle = () => {
        setMetadata((prev) => ({
            ...prev,
            requires_payment: !prev.requires_payment,
        }));
    };

    const validateForm = (): boolean => {
        const errors: string[] = [];

        if (!metadata.title.trim()) {
            errors.push("Event Title is required.");
        }

        if (!metadata.slug.trim()) {
            errors.push("URL handle (slug) is required.");
        } else {
            const slugRegex = /^[a-z0-9-_]+$/;
            if (!slugRegex.test(metadata.slug)) {
                errors.push("Slug must contain only lowercase letters, numbers, dashes (-), and underscores (_).");
            }
        }

        if (metadata.requires_payment) {
            const base = parseFloat(metadata.base_price);
            const discount = parseFloat(metadata.discount_price);

            if (isNaN(base) || base < 0) {
                errors.push("Base Price must be a valid number greater than or equal to 0.");
            }
            if (isNaN(discount) || discount < 0) {
                errors.push("Discount Price must be a valid number greater than or equal to 0.");
            }
            if (!isNaN(base) && !isNaN(discount) && discount > base) {
                errors.push("Discount Price cannot exceed the Base Price.");
            }
        }

        if (fields.length === 0) {
            errors.push("You must have at least one question field on the form.");
        }

        fields.forEach((field, index) => {
            if (!field.label.trim()) {
                errors.push(`Field #${index + 1} is missing a Question Label.`);
            }
            if (field.type === "select") {
                if (field.options.length === 0) {
                    errors.push(`Dropdown field "${field.label || `Field #${index + 1}`}" requires at least one option.`);
                } else {
                    field.options.forEach((opt, oIdx) => {
                        if (!opt.trim()) {
                            errors.push(`Dropdown field "${field.label || `Field #${index + 1}`}" has an empty option at position ${oIdx + 1}.`);
                        }
                    });
                }
            }
        });

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleUpdateForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus({});

        if (!validateForm()) {
            const alertEl = document.getElementById("validation-errors-alert");
            if (alertEl) {
                alertEl.scrollIntoView({ behavior: "smooth" });
            }
            return;
        }

        // Prompt the confirmation modal
        setShowConfirmModal(true);
    };

    const proceedWithUpdate = async () => {
        setShowConfirmModal(false);
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/forms/${formId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: metadata.title,
                    slug: metadata.slug,
                    description: metadata.description,
                    requires_payment: metadata.requires_payment,
                    base_price: metadata.base_price,
                    discount_price: metadata.discount_price,
                    form_schema: fields,
                    closes_at: metadata.closes_at || null,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to update the form.");
            }

            setSubmitStatus({
                success: true,
                message: "Registration form has been successfully updated!",
                createdSlug: metadata.slug,
            });

            setValidationErrors([]);
            setIsSlugManuallyEdited(false);

        } catch (err: any) {
            console.error(err);
            setSubmitStatus({
                success: false,
                message: err.message || "An unexpected error occurred while saving the form.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submissions Search filter
    const filteredSubmissions = submissions.filter((sub) => {
        const query = submissionsSearch.toLowerCase();
        return (
            sub.submitter_email.toLowerCase().includes(query) ||
            (sub.staff_ref && sub.staff_ref.toLowerCase().includes(query)) ||
            sub.payment_status.toLowerCase().includes(query)
        );
    });

    const getLabelForFieldId = (id: string) => {
        return fields.find((f) => f.id === id)?.label || id;
    };

    // Global loading and error check
    if (isLoading) {
        return (
            <main className="min-h-screen bg-ighub-light flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-ighub-green mx-auto" />
                    <p className="text-sm font-semibold text-gray-500 font-sans">Loading form settings...</p>
                </div>
            </main>
        );
    }

    if (fetchError) {
        return (
            <main className="min-h-screen bg-ighub-light flex items-center justify-center p-6 font-sans">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-gray-100 shadow-xs text-center space-y-6">
                    <AlertCircle className="w-12 h-12 text-ighub-orange mx-auto" />
                    <div>
                        <h2 className="text-lg font-bold text-ighub-black">Failed to load Form</h2>
                        <p className="text-sm text-gray-500 mt-2">{fetchError}</p>
                    </div>
                    <Button variant="secondary" onClick={() => router.push("/admin")} fullWidth>
                        Return to Console
                    </Button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-ighub-light text-ighub-black flex flex-col">
            {/* Header Area */}
            <header className="bg-white px-6 py-4 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                            <span className="text-ighub-purple">Admin Portal</span>
                            <span>/</span>
                            <span>{metadata.title || "Form Detail Hub"}</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-ighub-black flex items-center gap-2">
                            {metadata.title}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
                        {/* Tab buttons */}
                        <div className="flex bg-gray-150 p-1 rounded-xl text-sm font-semibold">
                            <button
                                onClick={() => setActiveTab("editor")}
                                className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === "editor"
                                    ? "bg-white text-ighub-purple shadow-3xs"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Editor
                            </button>
                            <button
                                onClick={() => setActiveTab("submissions")}
                                className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === "submissions"
                                    ? "bg-white text-ighub-purple shadow-3xs"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Submissions
                            </button>
                            <button
                                onClick={() => setActiveTab("referrals")}
                                className={`px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === "referrals"
                                    ? "bg-white text-ighub-purple shadow-3xs"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                Referrals
                            </button>
                        </div>

                        <Button
                            variant="secondary"
                            onClick={() => router.push("/admin")}
                            className="text-xs px-4 py-2 flex items-center gap-1.5 rounded-full cursor-pointer hover:bg-opacity-95 hidden md:flex shrink-0"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Console
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleLogout}
                            className="text-xs px-4 py-2 flex items-center gap-1.5 rounded-full cursor-pointer hover:bg-rose-50 text-rose-600 hover:text-rose-700 shrink-0"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* TAB INTERFACES */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-6">

                {/* 1. EDITOR TAB */}
                {activeTab === "editor" && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Left Editor */}
                        <div className="lg:col-span-3 space-y-8">

                            {submitStatus.success && (
                                <div className="p-6 bg-emerald-50 rounded-2xl text-emerald-950 flex flex-col gap-3 animate-in fade-in duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500 text-white rounded-full">
                                            <Check className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-lg">Form Updated Successfully!</h3>
                                    </div>
                                    <p className="text-sm text-emerald-800">
                                        {submitStatus.message}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <a
                                            href={`/${submitStatus.createdSlug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 bg-ighub-green text-white hover:bg-ighub-orange transition-all duration-300 text-sm font-semibold rounded-full flex items-center gap-1"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View Live Form
                                        </a>
                                        <button
                                            onClick={() => setSubmitStatus({})}
                                            className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 text-sm font-semibold rounded-full cursor-pointer"
                                        >
                                            Keep Editing
                                        </button>
                                    </div>
                                </div>
                            )}

                            {submitStatus.success === false && (
                                <div className="p-5 bg-rose-50 rounded-xl text-rose-950 flex gap-3 animate-in fade-in duration-300">
                                    <AlertCircle className="w-6 h-6 text-ighub-orange shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-base">Error Saving Form</h3>
                                        <p className="text-sm text-rose-800 mt-1">{submitStatus.message}</p>
                                    </div>
                                </div>
                            )}

                            {validationErrors.length > 0 && (
                                <div
                                    id="validation-errors-alert"
                                    className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex gap-3 shadow-xs scroll-mt-24 animate-in fade-in duration-300"
                                >
                                    <AlertCircle className="w-6 h-6 text-ighub-orange shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-base">Please fix the following issues:</h3>
                                        <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-rose-800">
                                            {validationErrors.map((err, idx) => (
                                                <li key={idx}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleUpdateForm} className="space-y-8">
                                {/* Metadata Section */}
                                <div className="bg-white p-8 rounded-2xl relative overflow-hidden">
                                    <div className="flex items-center gap-2 mb-6">
                                        <h2 className="text-xl font-bold tracking-tight text-ighub-black">
                                            Event & Page Metadata
                                        </h2>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="title" className="block text-sm font-semibold tracking-wide text-ighub-black mb-2">
                                                Event Registration Title <span className="text-ighub-orange">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="title"
                                                name="title"
                                                value={metadata.title}
                                                onChange={handleMetadataChange}
                                                className="w-full px-4 py-3 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green text-sm"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="slug" className="block text-sm font-semibold tracking-wide text-ighub-black mb-2">
                                                URL Slug Path <span className="text-ighub-orange">*</span>
                                            </label>
                                            <div className="relative flex rounded-xl border border-gray-200 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green overflow-hidden">
                                                <span className="inline-flex items-center px-4 border-r border-gray-200 text-gray-400 text-xs font-semibold select-none">
                                                    forms.ighub.ng/
                                                </span>
                                                <input
                                                    type="text"
                                                    id="slug"
                                                    name="slug"
                                                    value={metadata.slug}
                                                    onChange={handleMetadataChange}
                                                    className="flex-1 px-4 py-3 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="description" className="block text-sm font-semibold tracking-wide text-ighub-black mb-2">
                                                Event Description
                                            </label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                value={metadata.description}
                                                onChange={handleMetadataChange}
                                                rows={4}
                                                className="w-full px-4 py-3 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green text-sm resize-y"
                                                placeholder="Describe the registration details, eligibility, event duration, dates, etc."
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="closes_at" className="block text-sm font-semibold tracking-wide text-ighub-black mb-2">
                                                Registration Closing Deadline (Countdown Target)
                                            </label>
                                            <input
                                                type="datetime-local"
                                                id="closes_at"
                                                name="closes_at"
                                                value={metadata.closes_at}
                                                onChange={handleMetadataChange}
                                                className="w-full px-4 py-3 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green text-sm"
                                            />
                                            <p className="mt-1.5 text-xs text-gray-500">
                                                Sets the countdown clock on the form page. Leave blank if open indefinitely.
                                            </p>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold tracking-wide text-ighub-black">
                                                        Requires Ticket Payment
                                                    </span>
                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                        Toggle if users must complete payment to complete registration
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handlePaymentToggle}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${metadata.requires_payment ? "bg-ighub-green" : "bg-gray-200"
                                                        }`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${metadata.requires_payment ? "translate-x-5" : "translate-x-0"
                                                            }`}
                                                    />
                                                </button>
                                            </div>

                                            {metadata.requires_payment && (
                                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-ighub-light rounded-xl border border-gray-200 animate-in slide-in-from-top duration-300">
                                                    <div>
                                                        <label htmlFor="base_price" className="block text-sm font-semibold tracking-wide text-ighub-black mb-2">
                                                            Base Price (NGN)
                                                        </label>
                                                        <div className="relative rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-ighub-green">
                                                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold text-sm">
                                                                ₦
                                                            </span>
                                                            <input
                                                                type="number"
                                                                id="base_price"
                                                                name="base_price"
                                                                min="0"
                                                                value={metadata.base_price}
                                                                onChange={handleMetadataChange}
                                                                className="w-full pl-8 pr-4 py-3 border-0 focus:outline-none text-ighub-black text-sm"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="discount_price" className="block text-sm font-semibold tracking-wide text-ighub-black mb-2">
                                                            Discount/Early Bird Price (NGN)
                                                        </label>
                                                        <div className="relative rounded-xl border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-ighub-green">
                                                            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold text-sm">
                                                                ₦
                                                            </span>
                                                            <input
                                                                type="number"
                                                                id="discount_price"
                                                                name="discount_price"
                                                                min="0"
                                                                value={metadata.discount_price}
                                                                onChange={handleMetadataChange}
                                                                className="w-full pl-8 pr-4 py-3 border-0 focus:outline-none text-ighub-black text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Schema Section */}
                                <div className="bg-white p-8 rounded-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-2 h-full "></div>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-2">
                                            {/* <Plus className="w-5 h-5 text-ighub-orange" /> */}
                                            <h2 className="text-xl font-bold tracking-tight text-ighub-black">
                                                Registration Form Schema
                                            </h2>
                                        </div>
                                        <span className="bg-ighub-light text-ighub-black text-xs font-bold px-3 py-1.5 rounded-full border border-gray-200">
                                            {fields.length} Fields
                                        </span>
                                    </div>

                                    <div className="space-y-6">
                                        {fields.map((field, idx) => (
                                            <div key={field.id} className="bg-ighub-light p-6 rounded-2xl  relative hover:shadow-2xs transition-all">
                                                {/* Reorder and Settings header */}
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveFieldUp(idx)}
                                                            disabled={idx === 0}
                                                            className="p-1.5 bg-white border border-gray-200 text-gray-600 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-30 transition-all"
                                                        >
                                                            <ArrowUp className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveFieldDown(idx)}
                                                            disabled={idx === fields.length - 1}
                                                            className="p-1.5 bg-white border border-gray-200 text-gray-600 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-30 transition-all"
                                                        >
                                                            <ArrowDown className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-xs font-bold text-gray-405">
                                                            Question {idx + 1}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-4 self-end sm:self-auto">
                                                        <label className="inline-flex items-center cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={field.required}
                                                                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                                className="sr-only peer"
                                                            />
                                                            <div className="relative w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ighub-green" />
                                                            <span className="ms-2 text-xs font-semibold text-gray-600">
                                                                Required
                                                            </span>
                                                        </label>

                                                        <button
                                                            type="button"
                                                            onClick={() => deleteField(field.id)}
                                                            className="p-1.5 text-rose-500 bg-white border border-rose-100 rounded-md cursor-pointer hover:bg-rose-50 transition-all ml-1 shadow-2xs"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Inputs mapping */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                                            Question Label
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ighub-green text-sm"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                                            Field Type
                                                        </label>
                                                        <select
                                                            value={field.type}
                                                            onChange={(e) => updateField(field.id, { type: e.target.value as FormField["type"] })}
                                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ighub-green text-sm appearance-none cursor-pointer"
                                                        >
                                                            <option value="text">Text Response</option>
                                                            <option value="number">Numeric Answer</option>
                                                            <option value="select">Dropdown Menu (Select)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {field.type === "select" && (
                                                    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-xs font-bold text-gray-505 uppercase">
                                                                Dropdown Selections
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => addOptionToField(field.id)}
                                                                className="text-xs font-bold text-ighub-green hover:text-ighub-orange transition-colors flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                Add Option
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {field.options.map((opt, oIdx) => (
                                                                <div key={oIdx} className="flex gap-2 items-center">
                                                                    <span className="text-xs font-bold text-gray-400 w-4">
                                                                        {oIdx + 1}.
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        value={opt}
                                                                        onChange={(e) => updateOptionInField(field.id, oIdx, e.target.value)}
                                                                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ighub-green text-xs"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => deleteOptionFromField(field.id, oIdx)}
                                                                        className="p-1.5 text-gray-400 hover:text-rose-500 cursor-pointer"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={addField}
                                            className="px-6 py-3 border-2 border-dashed border-gray-300 text-gray-650 hover:text-ighub-green hover:border-ighub-green font-semibold text-sm rounded-full transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-3xs"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Question Field
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    disabled={isSubmitting}
                                    className="font-bold py-4 text-base rounded-2xl cursor-pointer flex justify-center items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-transform"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Save & Update Form Configurations
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>

                        {/* Right Preview */}
                        <div className="lg:col-span-2">
                            <div className="sticky top-28 space-y-6">
                                <div className="bg-white p-3 px-8 rounded-2xl flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Live Preview</span>
                                    <div className="flex items-center bg-gray-150 p-0.5 rounded-lg">
                                        <button
                                            onClick={() => setPreviewDevice("desktop")}
                                            className={`p-1.5 rounded-md cursor-pointer transition-all ${previewDevice === "desktop" ? "bg-white text-ighub-purple shadow-3xs" : "text-gray-400 hover:text-gray-600"
                                                }`}
                                        >
                                            <Laptop className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setPreviewDevice("mobile")}
                                            className={`p-1.5 rounded-md cursor-pointer transition-all ${previewDevice === "mobile" ? "bg-white text-ighub-purple shadow-3xs" : "text-gray-400 hover:text-gray-600"
                                                }`}
                                        >
                                            <Smartphone className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-center transition-all">
                                    <div className={`bg-white rounded-3xl overflow-hidden transition-all flex flex-col w-full ${previewDevice === "mobile" ? "max-w-[375px] min-h-[640px]" : "min-h-[500px]"}`}>
                                        {previewDevice === "mobile" && (
                                            <div className="h-6 bg-gray-900 flex justify-between items-center px-6 text-[10px] text-white/95 shrink-0 select-none">
                                                <span>09:41</span>
                                                <div className="flex items-center gap-1">
                                                    <span>5G</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-8 bg-ighub-light/40 border-b border-gray-100 text-center shrink-0">
                                            <h2 className="text-xl font-black text-ighub-black leading-snug balance max-w-sm mx-auto">
                                                {metadata.title || "Form Registration Title"}
                                            </h2>
                                            {metadata.slug && <p className="text-[10px] text-gray-400 mt-1 font-mono">/{metadata.slug}</p>}
                                            {metadata.description && <p className="text-xs text-gray-500 mt-3 line-clamp-3">{metadata.description}</p>}
                                        </div>

                                        {metadata.closes_at && (
                                            <div className="px-6 pt-6 shrink-0">
                                                <CountdownTimer targetDate={metadata.closes_at} />
                                            </div>
                                        )}

                                        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                                            {fields.map((field) => (
                                                <div key={field.id} className="flex flex-col">
                                                    <label className="text-xs font-bold tracking-wide text-gray-700 flex items-center gap-1">
                                                        {field.label}
                                                        {field.required && <span className="text-ighub-orange">*</span>}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        disabled
                                                        className="w-full p-3.5 mt-2 bg-ighub-light border border-gray-200 rounded-xl text-xs placeholder-gray-400 cursor-not-allowed"
                                                        placeholder="Response input field"
                                                    />
                                                </div>
                                            ))}

                                            {metadata.requires_payment && (
                                                <div className="bg-ighub-purple text-white p-5 rounded-2xl shrink-0">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Ticket Payment Required</span>
                                                    <div className="flex items-baseline gap-2 mt-1.5">
                                                        <span className="text-xl font-bold text-white">₦{(parseFloat(metadata.discount_price) || 0).toLocaleString()}</span>
                                                        {parseFloat(metadata.base_price) > parseFloat(metadata.discount_price) && (
                                                            <span className="text-xs text-gray-405 line-through">₦{(parseFloat(metadata.base_price) || 0).toLocaleString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. SUBMISSIONS TAB */}
                {activeTab === "submissions" && (
                    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-3xs space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-ighub-black flex items-center gap-2">
                                    {/* <Users className="w-5 h-5 text-ighub-green" /> */}
                                    Attendee Submissions Index
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Browse, filter, and export registrations for this event.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleExportCSV}
                                disabled={submissions.length === 0}
                                className="px-5 py-2.5 bg-ighub-purple text-white hover:bg-ighub-black transition-colors rounded-xl font-semibold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-3xs"
                            >
                                <Download className="w-4 h-4" />
                                Export to CSV (Excel)
                            </button>
                        </div>

                        {/* Submissions Search Bar */}
                        <div className="relative w-full max-w-md flex rounded-xl border border-gray-200 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green overflow-hidden">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                                <Search className="w-4 h-4" />
                            </span>
                            <input
                                type="text"
                                value={submissionsSearch}
                                onChange={(e) => setSubmissionsSearch(e.target.value)}
                                placeholder="Search by email, payment status, or ref code..."
                                className="w-full pl-10 pr-4 py-2.5 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
                            />
                        </div>

                        {/* Submissions List Table */}
                        {isSubmissionsLoading ? (
                            <div className="text-center py-12 space-y-2">
                                <Loader2 className="w-8 h-8 animate-spin text-ighub-green mx-auto" />
                                <p className="text-xs font-semibold text-gray-400">Loading registrations list...</p>
                            </div>
                        ) : filteredSubmissions.length === 0 ? (
                            <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl">
                                {/* <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /> */}
                                <p className="text-gray-500 text-sm font-medium">No registrations match your criteria.</p>
                            </div>
                        ) : (
                            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-3xs">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-ighub-light border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-4">Attendee Email</th>
                                            <th className="px-6 py-4">Date Registered</th>
                                            <th className="px-6 py-4">Payment Status</th>
                                            <th className="px-6 py-4">Referral Code</th>
                                            <th className="px-6 py-4 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 text-sm">
                                        {filteredSubmissions.map((sub) => {
                                            const isExpanded = expandedSubmissionId === sub.id;
                                            return (
                                                <React.Fragment key={sub.id}>
                                                    <tr className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4 font-semibold text-ighub-black">
                                                            {sub.submitter_email}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 text-xs flex items-center gap-1.5 mt-1 border-0">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(sub.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sub.payment_status === "paid"
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : sub.payment_status.startsWith("pending")
                                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                    : "bg-gray-100 text-gray-500 border border-gray-200"
                                                                }`}>
                                                                {sub.payment_status.replace("_", " ")}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-mono font-bold text-ighub-purple">
                                                            {sub.staff_ref || <span className="text-gray-400 font-normal italic">None</span>}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                                                                className="text-gray-400 hover:text-ighub-purple p-1 cursor-pointer"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronUp className="w-4 h-4" />
                                                                ) : (
                                                                    <ChevronDown className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Answers details block */}
                                                    {isExpanded && (
                                                        <tr className="bg-ighub-light/40">
                                                            <td colSpan={5} className="px-8 py-5 border-t border-gray-200">
                                                                <div className="bg-white p-5 rounded-xl border border-gray-150 space-y-3">
                                                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2">
                                                                        Registration Questionnaire Responses
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        {Object.entries(sub.answers || {}).map(([fieldId, val]) => (
                                                                            <div key={fieldId} className="flex flex-col text-xs p-2.5 bg-ighub-light rounded-lg border border-gray-150">
                                                                                <span className="font-bold text-gray-500 mb-1">
                                                                                    {getLabelForFieldId(fieldId)}
                                                                                </span>
                                                                                <span className="font-semibold text-ighub-black text-sm">
                                                                                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                                                                </span>
                                                                            </div>
                                                                        ))}
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
                        )}
                    </div>
                )}

                {/* 3. REFERRALS TAB */}
                {activeTab === "referrals" && (
                    <div className="space-y-8 animate-in fade-in duration-300">

                        {/* New Promoter form */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100/60 shadow-3xs relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full"></div>

                            <div className="flex items-center gap-2 mb-6">
                                {/* <Share2 className="w-5 h-5 text-ighub-purple" /> */}
                                <h2 className="text-xl font-bold tracking-tight text-ighub-black">
                                    Register Promoter / Referral Candidate
                                </h2>
                            </div>

                            {promoterSubmitError && (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex gap-2 text-xs mb-4">
                                    <AlertCircle className="w-4 h-4 text-ighub-orange shrink-0 mt-0.5" />
                                    <span>{promoterSubmitError}</span>
                                </div>
                            )}

                            <form onSubmit={handleRegisterPromoter} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label htmlFor="p_name" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Promoter Full Name
                                    </label>
                                    <input
                                        type="text"
                                        id="p_name"
                                        value={newPromoterName}
                                        onChange={(e) => setNewPromoterName(e.target.value)}
                                        placeholder="e.g. Victor Promotes"
                                        className="w-full px-3.5 py-2.5 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green text-sm"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="p_code" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Referral Code (Slug Value)
                                    </label>
                                    <input
                                        type="text"
                                        id="p_code"
                                        value={newPromoterCode}
                                        onChange={(e) => setNewPromoterCode(e.target.value)}
                                        placeholder="e.g. victor26"
                                        className="w-full px-3.5 py-2.5 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green text-sm"
                                        required
                                    />
                                </div>

                                <Button type="submit" variant="primary" className="font-semibold py-2.5 rounded-xl cursor-pointer w-full text-sm">
                                    Register Candidate
                                </Button>
                            </form>
                        </div>

                        {/* Promoters List */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-3xs space-y-6">
                            <h3 className="text-lg font-bold tracking-tight text-ighub-black flex items-center gap-2">
                                {/* <Users className="w-5 h-5 text-ighub-green" /> */}
                                Registered Promoters Directory
                            </h3>

                            {isPromotersLoading ? (
                                <div className="text-center py-12 space-y-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-ighub-green mx-auto" />
                                    <p className="text-xs font-semibold text-gray-400">Loading directory...</p>
                                </div>
                            ) : promoters.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
                                    <Share2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm font-medium">No promoters registered yet. Add one above to create tracking links.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {promoters.map((p) => {
                                        const cleanCode = p.code.trim().toLowerCase();
                                        const trackUrl = typeof window !== "undefined"
                                            ? `${window.location.origin}/${metadata.slug}?ref=${cleanCode}`
                                            : `/${metadata.slug}?ref=${cleanCode}`;

                                        return (
                                            <div key={p.id} className="bg-ighub-light p-5 rounded-2xl border border-gray-200 flex flex-col justify-between hover:shadow-2xs transition-all relative">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div>
                                                            <h4 className="font-extrabold text-sm text-ighub-black leading-snug">
                                                                {p.name}
                                                            </h4>
                                                            <span className="text-[10px] text-gray-450 font-semibold tracking-wider font-mono">
                                                                Code: {cleanCode}
                                                            </span>
                                                        </div>
                                                        <span className="bg-white border border-gray-200 text-ighub-purple text-xs font-extrabold px-3 py-1 rounded-full shadow-3xs flex items-center gap-1">
                                                            {p.referral_count} Regs
                                                        </span>
                                                    </div>

                                                    {/* Track Link copy block */}
                                                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-200">
                                                        <span className="text-[9px] text-gray-450 font-mono select-all truncate flex-1 leading-normal">
                                                            ?ref={cleanCode}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyPromoterLink(p.code, p.id)}
                                                            className="p-1.5 bg-ighub-light hover:bg-gray-150 rounded-lg text-gray-500 transition-all cursor-pointer border border-gray-200 shadow-3xs"
                                                            title="Copy promoter link"
                                                        >
                                                            {copiedPromoterId === p.id ? (
                                                                <Check className="w-3 h-3 text-ighub-green" />
                                                            ) : (
                                                                <Copy className="w-3 h-3" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200/60 mt-4 pt-3 flex justify-end">
                                                    <a
                                                        href={trackUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[10px] font-extrabold text-gray-500 hover:text-ighub-green transition-colors flex items-center gap-1"
                                                    >
                                                        Test Tracking Link
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* Confirmation Modal Overlay */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white max-w-md w-full rounded-[2rem] p-8 shadow-2xl border border-gray-150 flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-amber-50 text-amber-500 rounded-full">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-ighub-black">Confirm Form Update</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Are you sure you want to save and publish these changes to this registration form? Any edits to fields, deadlines, or pricing settings will take effect immediately.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 w-full pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-3 px-4 border border-gray-250 text-gray-700 font-semibold rounded-full text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={proceedWithUpdate}
                                className="flex-1 py-3 px-4 bg-ighub-purple text-white font-semibold rounded-full text-xs hover:bg-opacity-95 transition-colors cursor-pointer shadow-sm shadow-ighub-purple/10"
                            >
                                Confirm & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
