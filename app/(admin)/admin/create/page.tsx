"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import CountdownTimer from "@/components/countdown-timer";
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
    Layers
} from "lucide-react";

// Interface as requested
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

export default function CreateFormPage() {
    const router = useRouter();

    // 1. Initial State Definition
    const [metadata, setMetadata] = useState<EventMetadata>({
        title: "",
        slug: "",
        description: "",
        requires_payment: false,
        base_price: "0",
        discount_price: "0",
        closes_at: "",
    });

    const [fields, setFields] = useState<FormField[]>([
        {
            id: "default-name",
            type: "text",
            label: "Full Name",
            required: true,
            options: [],
        },
        {
            id: "default-email",
            type: "text",
            label: "Email Address",
            required: true,
            options: [],
        }
    ]);

    // UI state
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{
        success?: boolean;
        message?: string;
        createdSlug?: string;
    }>({});
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Generate unique ID safely
    const generateId = () => {
        if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `field_${Math.random().toString(36).substring(2, 9)}`;
    };

    // 2. Slug Auto-generation
    useEffect(() => {
        if (!isSlugManuallyEdited && metadata.title) {
            const generatedSlug = metadata.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric
                .replace(/\s+/g, "-") // replace spaces with dashes
                .replace(/-+/g, "-") // collapse multiple dashes
                .trim();
            setMetadata((prev) => ({ ...prev, slug: generatedSlug }));
        }
    }, [metadata.title, isSlugManuallyEdited]);

    // 3. Metadata Handlers
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

    // 4. Form Fields Schema Handlers
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
                    // If type is changing to select and options are empty, initialize with a default option
                    if (updates.type === "select" && (!f.options || f.options.length === 0)) {
                        updated.options = ["Option 1"];
                    }
                    return updated;
                }
                return f;
            })
        );
    };

    // 5. Select Field Options Handlers
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

    // 6. Vertical Reordering (Strictly state-driven)
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

    // 7. Validation & Saving
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
            errors.push("You must add at least one question field to the form.");
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

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus({});

        if (!validateForm()) {
            // Scroll to the error alert
            const alertEl = document.getElementById("validation-errors-alert");
            if (alertEl) {
                alertEl.scrollIntoView({ behavior: "smooth" });
            }
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/forms", {
                method: "POST",
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
                throw new Error(result.error || "Failed to create the form.");
            }

            setSubmitStatus({
                success: true,
                message: "Registration form has been successfully created and published!",
                createdSlug: metadata.slug,
            });

            // Refresh local state if success
            setMetadata({
                title: "",
                slug: "",
                description: "",
                requires_payment: false,
                base_price: "0",
                discount_price: "0",
                closes_at: "",
            });
            setFields([
                {
                    id: "default-name",
                    type: "text",
                    label: "Full Name",
                    required: true,
                    options: [],
                },
                {
                    id: "default-email",
                    type: "text",
                    label: "Email Address",
                    required: true,
                    options: [],
                }
            ]);
            setIsSlugManuallyEdited(false);
            setValidationErrors([]);

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

    return (
        <main className="min-h-screen bg-ighub-light text-ighub-black flex flex-col">
            {/* Header Area */}
            <header className="bg-white sticky top-0 z-30 px-6 py-3">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-ighub-black flex items-center gap-2">
                            Create Registration Form
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => router.push("/admin")}
                            className="text-sm px-4 py-2 flex items-center gap-2 rounded-full cursor-pointer hover:bg-opacity-95"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Console
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Area: Left Editor, Right Preview */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-5 gap-8">

                {/* LEFT COLUMN: EDITOR PANEL (3/5 width) */}
                <div className="lg:col-span-3 space-y-8">

                    {/* Status Alerts */}
                    {submitStatus.success && (
                        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 flex flex-col gap-3 shadow-xs animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 text-white rounded-full">
                                    <Check className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-lg">Form Created Successfully!</h3>
                            </div>
                            <p className="text-sm text-emerald-800">
                                {submitStatus.message}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <a
                                    href={`/${submitStatus.createdSlug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-ighub-green text-white hover:bg-ighub-orange transition-all duration-300 text-sm font-semibold rounded-full flex items-center gap-1 shadow-sm"
                                >
                                    <Eye className="w-4 h-4" />
                                    View Live Form
                                </a>
                                <button
                                    onClick={() => setSubmitStatus({})}
                                    className="px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 text-sm font-semibold rounded-full cursor-pointer"
                                >
                                    Build Another Form
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

                    {/* Section 1: Event Details & Metadata */}
                    <form onSubmit={handleSaveForm} className="space-y-8">
                        <div className="bg-white p-8 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full"></div>

                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-gray-50 rounded-lg text-ighub-purple">
                                    <Settings className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight text-ighub-black">
                                    Form Details
                                </h2>
                            </div>

                            <div className="space-y-6">
                                {/* Title */}
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
                                        className="w-full px-4 py-3 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green focus:border-transparent transition-all text-ighub-black text-sm"
                                        placeholder="e.g. NextGen Tech Incubation Hackathon"
                                        required
                                    />
                                </div>

                                {/* Slug */}
                                <div>
                                    <label htmlFor="slug" className="block text-sm font-semibold tracking-wide text-ighub-black mb-2">
                                        URL Slug Path <span className="text-ighub-orange">*</span>
                                    </label>
                                    <div className="relative flex rounded-xl overflow-hidden border border-gray-200 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green">
                                        <span className="inline-flex items-center px-4 border-r border-gray-200 text-gray-400 text-xs font-semibold">
                                            forms.ighub.ng/
                                        </span>
                                        <input
                                            type="text"
                                            id="slug"
                                            name="slug"
                                            value={metadata.slug}
                                            onChange={handleMetadataChange}
                                            className="flex-1 px-4 py-3 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
                                            placeholder="hackathon-2026"
                                            required
                                        />
                                    </div>
                                    <p className="mt-1.5 text-xs text-gray-500">
                                        URL path submitters will visit to register. Only lowercase, numbers, and dashes.
                                    </p>
                                </div>

                                {/* Description */}
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
                                        className="w-full px-4 py-3 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green focus:border-transparent transition-all text-ighub-black text-sm resize-y"
                                        placeholder="Describe the registration details, eligibility, event duration, dates, etc."
                                    />
                                </div>

                                {/* Registration Closing Date */}
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
                                        className="w-full px-4 py-3 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green focus:border-transparent transition-all text-ighub-black text-sm"
                                    />
                                    <p className="mt-1.5 text-xs text-gray-500">
                                        Sets the countdown clock on the form page. Leave blank if the form should stay open indefinitely.
                                    </p>
                                </div>

                                {/* Payment Requirements Toggle */}
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold tracking-wide text-ighub-black">
                                                Requires Ticket Payment
                                            </span>
                                            <span className="text-xs text-gray-500 mt-0.5">
                                                Toggle if users must complete online payment (via Paystack/Cash) to complete registration
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

                                    {/* Payment Fields (Visible if requires_payment is active) */}
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
                                                        placeholder="5000"
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
                                                        placeholder="3000"
                                                    />
                                                </div>
                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    Set to matching base price if no discount.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Registration Fields & Question Customization */}
                        <div className="bg-white p-8 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full"></div>

                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-gray-50 rounded-lg text-ighub-orange">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-bold tracking-tight text-ighub-black">
                                        2. Registration Form Schema
                                    </h2>
                                </div>
                                <span className="bg-ighub-light text-ighub-black text-xs px-3 py-1.5 rounded-full shadow-2xs">
                                    {fields.length} Fields
                                </span>
                            </div>

                            {/* List of Dynamic Schema Fields */}
                            <div className="space-y-6">
                                {fields.length === 0 ? (
                                    <div className="text-center py-12 px-4 border-gray-200 rounded-2xl">
                                        <p className="text-gray-500 text-sm">
                                            No fields configured yet.
                                        </p>
                                    </div>
                                ) : (
                                    fields.map((field, idx) => (
                                        <div
                                            key={field.id}
                                            className="bg-ighub-light p-6 rounded-2xl border border-gray-200 relative group transition-all duration-300 hover:border-gray-300 hover:shadow-2xs"
                                        >
                                            {/* Reorder & Action Controls on Left and Right */}
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                                                <div className="flex items-center gap-2">
                                                    {/* Move Up/Down Controls */}
                                                    <button
                                                        type="button"
                                                        onClick={() => moveFieldUp(idx)}
                                                        disabled={idx === 0}
                                                        className="p-1.5 bg-white text-gray-600 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                                        title="Move Up"
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveFieldDown(idx)}
                                                        disabled={idx === fields.length - 1}
                                                        className="p-1.5 bg-white border border-gray-200 text-gray-600 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                                        title="Move Down"
                                                    >
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide ml-2">
                                                        Question {idx + 1}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-4 self-end sm:self-auto">
                                                    {/* Required Toggle */}
                                                    <label className="inline-flex items-center cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.required}
                                                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ighub-green" />
                                                        <span className="ms-2 text-xs font-semibold text-gray-600">
                                                            Required
                                                        </span>
                                                    </label>

                                                    {/* Delete Question Field */}
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteField(field.id)}
                                                        className="p-1.5 text-rose-500 bg-white rounded-md cursor-pointer hover:bg-rose-50 transition-all ml-1 shadow-2xs"
                                                        title="Delete Question Field"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Field Configuration Inputs */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Label Input */}
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                                        Question Label / Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={field.label}
                                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ighub-green text-sm"
                                                        placeholder="e.g. Phone Number, Gender, or T-Shirt Size"
                                                    />
                                                </div>

                                                {/* Field Type Select */}
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                                        Input Field Type
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

                                            {/* Dropdown Options List Manager */}
                                            {field.type === "select" && (
                                                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                            Dropdown Selections
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => addOptionToField(field.id)}
                                                            className="text-xs font-bold text-ighub-green hover:text-ighub-orange transition-colors flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            Add Selection
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
                                                                    placeholder={`Selection Option ${oIdx + 1}`}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteOptionFromField(field.id, oIdx)}
                                                                    className="p-1.5 text-gray-400 hover:text-rose-500 cursor-pointer"
                                                                    title="Remove option"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Add Field Button */}
                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-center">
                                <button
                                    type="button"
                                    onClick={addField}
                                    className="px-6 py-3 border-2 border-dashed border-gray-300 text-gray-600 hover:text-ighub-green hover:border-ighub-green font-semibold text-sm rounded-full transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-3xs"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Question Field
                                </button>
                            </div>
                        </div>

                        {/* Save Actions Button */}
                        <div className="pt-4">
                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={isSubmitting}
                                className="font-bold py-4 text-base tracking-wide rounded-2xl cursor-pointer flex justify-center items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-transform"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        Publish Form
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* RIGHT COLUMN: STICKY LIVE INTERACTIVE PREVIEW PANEL (2/5 width) */}
                <div className="lg:col-span-2">
                    <div className="sticky top-28 space-y-6">

                        {/* Device & Controls Bar */}
                        <div className="bg-white p-3 px-8 rounded-2xl flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-ighub-green animate-ping"></div>
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                                    Live Form Preview
                                </span>
                            </div>

                            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice("desktop")}
                                    className={`p-1.5 rounded-md cursor-pointer transition-all ${previewDevice === "desktop"
                                        ? "bg-white text-ighub-purple shadow-3xs"
                                        : "text-gray-400 hover:text-gray-600"
                                        }`}
                                    title="Desktop View"
                                >
                                    <Laptop className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice("mobile")}
                                    className={`p-1.5 rounded-md cursor-pointer transition-all ${previewDevice === "mobile"
                                        ? "bg-white text-ighub-purple shadow-3xs"
                                        : "text-gray-400 hover:text-gray-600"
                                        }`}
                                    title="Mobile View"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Render Wrapper */}
                        <div className="flex justify-center transition-all duration-500">
                            <div
                                className={`bg-white rounded-3xl overflow-hidden transition-all duration-500 flex flex-col ${previewDevice === "mobile" ? "w-full max-w-[375px] min-h-[640px]" : "w-full min-h-[500px]"
                                    }`}
                            >
                                {/* Mobile Phone Top Notch Simulation */}
                                {previewDevice === "mobile" && (
                                    <div className="h-6 bg-gray-900 flex justify-between items-center px-6 text-[10px] font-semibold text-white/95 tracking-tight shrink-0 select-none">
                                        <span>09:41</span>
                                        <div className="w-20 h-4 bg-black rounded-b-xl absolute left-1/2 -translate-x-1/2 top-0"></div>
                                        <div className="flex items-center gap-1">
                                            <span>5G</span>
                                            <div className="w-4 h-2 border border-white/60 rounded-xs flex items-center p-[1px]"><div className="w-full h-full bg-white rounded-2xs"></div></div>
                                        </div>
                                    </div>
                                )}

                                {/* Form Header Preview */}
                                <div className="p-8 bg-ighub-light/40 border-b border-gray-100 text-center shrink-0">
                                    {/* <span className="inline-block bg-white text-ighub-green border border-ighub-green text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-3 shadow-3xs">
                                        Registration Live
                                    </span> */}
                                    <h2 className="text-xl font-black text-ighub-black leading-snug balance max-w-sm mx-auto">
                                        {metadata.title || "Form Registration Title"}
                                    </h2>
                                    {metadata.slug && (
                                        <p className="text-[10px] text-gray-400 mt-1 font-mono tracking-tighter truncate max-w-[250px] mx-auto">
                                            / {metadata.slug}
                                        </p>
                                    )}
                                    {metadata.description && (
                                        <p className="text-xs text-gray-500 mt-3 balance leading-relaxed max-w-md mx-auto line-clamp-3">
                                            {metadata.description}
                                        </p>
                                    )}
                                </div>

                                {/* Live Countdown Timer Preview */}
                                {metadata.closes_at && (
                                    <div className="px-6 pt-6 shrink-0">
                                        <CountdownTimer targetDate={metadata.closes_at} />
                                    </div>
                                )}

                                {/* Form Fields Preview */}
                                <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                                    {fields.map((field) => (
                                        <div key={field.id} className="flex flex-col">
                                            <label className="text-xs font-bold tracking-wide text-gray-700 flex items-center gap-1">
                                                {field.label || "Unnamed Question"}
                                                {field.required && <span className="text-ighub-orange">*</span>}
                                            </label>

                                            {field.type === "text" && (
                                                <input
                                                    type="text"
                                                    disabled
                                                    className="w-full p-3.5 mt-2 bg-ighub-light border border-gray-200 rounded-xl text-xs placeholder-gray-400 cursor-not-allowed"
                                                    placeholder={`Enter response`}
                                                />
                                            )}

                                            {field.type === "number" && (
                                                <input
                                                    type="number"
                                                    disabled
                                                    className="w-full p-3.5 mt-2 bg-ighub-light border border-gray-200 rounded-xl text-xs placeholder-gray-400 cursor-not-allowed"
                                                    placeholder="0"
                                                />
                                            )}

                                            {field.type === "select" && (
                                                <div className="relative">
                                                    <select
                                                        disabled
                                                        className="w-full p-3.5 mt-2 bg-ighub-light border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed appearance-none"
                                                    >
                                                        {field.options && field.options.length > 0 ? (
                                                            <>
                                                                <option value="">Select option</option>
                                                                {field.options.map((opt, idx) => (
                                                                    <option key={idx} value={opt}>
                                                                        {opt}
                                                                    </option>
                                                                ))}
                                                            </>
                                                        ) : (
                                                            <option>No options configured</option>
                                                        )}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Mock Ticket Price Box if payment active */}
                                    {metadata.requires_payment && (
                                        <div className="bg-ighub-purple text-white p-5 rounded-2xl relative overflow-hidden shrink-0">
                                            <div className="relative z-10 flex justify-between items-center">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        {/* <CreditCard className="w-4 h-4 text-ighub-green" /> */}
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                                            Ticket Payment Required
                                                        </span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2 mt-1.5">
                                                        <span className="text-xl font-bold text-white">
                                                            ₦{(parseFloat(metadata.discount_price) || 0).toLocaleString()}
                                                        </span>
                                                        {parseFloat(metadata.base_price) > parseFloat(metadata.discount_price) && (
                                                            <span className="text-xs text-gray-400 line-through">
                                                                ₦{(parseFloat(metadata.base_price) || 0).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="bg-white/15 backdrop-blur-md text-[9px] font-bold px-2 py-1 rounded-md text-ighub-green border border-white/10 uppercase">
                                                    Secured Paystack
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons Mock */}
                                    <div className="pt-4">
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full bg-ighub-green text-white font-bold py-3.5 tracking-wide text-xs rounded-full cursor-not-allowed opacity-90 text-center"
                                        >
                                            {metadata.requires_payment ? "Proceed to Payment" : "Submit Registration"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </main>
    );
}
