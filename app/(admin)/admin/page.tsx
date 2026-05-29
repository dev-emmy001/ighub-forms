"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Layers,
    Search,
    Copy,
    Check,
    Eye,
    Settings,
    Loader2,
    AlertCircle,
    Power,
    ArrowUpRight
} from "lucide-react";

interface FormConfig {
    id: string;
    title: string;
    slug: string;
    description?: string;
    is_active: boolean;
    submissions_count: number;
    requires_payment: boolean;
    base_price: number;
    discount_price: number;
    closes_at?: string;
    created_at: string;
}

export default function AdminDashboardPage() {
    const router = useRouter();
    const [forms, setForms] = useState<FormConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // 1. Fetch Forms List
    const fetchForms = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch("/api/forms");
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to load forms list.");
            }
            const data = await res.json();
            setForms(data || []);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred while fetching forms.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, []);

    // 2. Toggle Active State
    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            const res = await fetch(`/api/forms/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    toggle_active: !currentStatus,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to update form status.");
            }

            const updatedForm = await res.json();
            setForms((prev) =>
                prev.map((f) => (f.id === id ? { ...f, is_active: !currentStatus } : f))
            );
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Could not toggle form status.");
        } finally {
            setTogglingId(null);
        }
    };

    // 3. Copy Link Helper
    const handleCopyLink = (slug: string, id: string) => {
        if (typeof window === "undefined") return;
        const origin = window.location.origin;
        const url = `${origin}/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // 4. Filtering Logic
    const filteredForms = forms.filter((form) => {
        const matchesSearch =
            form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            form.slug.toLowerCase().includes(searchQuery.toLowerCase());

        if (statusFilter === "active") return matchesSearch && form.is_active;
        if (statusFilter === "inactive") return matchesSearch && !form.is_active;
        return matchesSearch;
    });

    return (
        <main className="min-h-screen bg-ighub-light text-ighub-black flex flex-col">
            {/* Header Area */}
            <header className="bg-white sticky top-0 z-30 px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-ighub-black flex items-center gap-2">
                            Forms Administration Console
                        </h1>
                    </div>
                    <Link href="/admin/create">
                        <Button variant="primary" className="cursor-pointer font-semibold rounded-full flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Create New Form
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Dashboard Controls & Listing */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

                {/* Search and Filters Bar */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-3xs flex flex-col md:flex-row justify-between gap-4 items-center">

                    {/* Search Field */}
                    <div className="relative w-full md:max-w-xs flex rounded-xl border border-gray-200 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green overflow-hidden">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                            <Search className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search forms by title or slug..."
                            className="w-full pl-10 pr-4 py-2.5 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
                        />
                    </div>

                    {/* Status Toggle Filters */}
                    <div className="flex items-center bg-gray-150 p-1 rounded-xl w-full md:w-auto">
                        {(["all", "active", "inactive"] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${statusFilter === filter
                                    ? "bg-white text-ighub-purple shadow-3xs"
                                    : "text-gray-300 hover:text-gray-700"
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 flex gap-3 animate-in fade-in duration-300">
                        <AlertCircle className="w-6 h-6 text-ighub-orange shrink-0" />
                        <div>
                            <h3 className="font-bold text-base">Error Loading Dashboard</h3>
                            <p className="text-sm text-rose-800 mt-1">{error}</p>
                            <button
                                onClick={fetchForms}
                                className="mt-3 text-xs font-bold text-ighub-purple hover:underline"
                            >
                                Tap to retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading ? (
                    <div className="text-center py-24 space-y-4">
                        <Loader2 className="w-10 h-10 animate-spin text-ighub-green mx-auto" />
                        <p className="text-sm font-semibold text-gray-500">Loading forms index...</p>
                    </div>
                ) : filteredForms.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl p-6">
                        <Layers className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-ighub-black">No forms found</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                            {searchQuery
                                ? "No forms match your search query. Try typing something else."
                                : "Get started by building and publishing your first dynamic registration form."}
                        </p>
                        {!searchQuery && (
                            <Link href="/admin/create" className="inline-block mt-6">
                                <Button variant="primary" className="rounded-full px-6">
                                    Create First Form
                                </Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    /* Forms Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredForms.map((form) => (
                            <div
                                key={form.id}
                                className="bg-white rounded-3xl border border-gray-100/60 p-6 flex flex-col justify-between shadow-3xs transition-all duration-300 hover:border-gray-200 hover:shadow-2xs relative group"
                            >
                                <div className="space-y-4">
                                    {/* Header: Title and Status Badge */}
                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className="font-bold text-lg text-ighub-black leading-snug tracking-tight group-hover:text-ighub-purple transition-colors line-clamp-2">
                                            {form.title}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(form.id, form.is_active)}
                                            disabled={togglingId === form.id}
                                            className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${form.is_active
                                                ? "bg-emerald-50 text-emerald-700"
                                                : "bg-gray-100 text-gray-500 border border-gray-200"
                                                }`}
                                            title="Click to toggle status"
                                        >
                                            <Power className="w-3 h-3" />
                                            {form.is_active ? "Active" : "Closed"}
                                        </button>
                                    </div>

                                    {/* Description */}
                                    {form.description && (
                                        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                                            {form.description}
                                        </p>
                                    )}

                                    {/* Quick Info Badges */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <span className="bg-ighub-light text-ighub-black text-[10px] font-semibold px-2.5 py-1 rounded-md">
                                            {form.requires_payment ? "Paid Ticket" : "Free Registration"}
                                        </span>
                                        {form.closes_at && (
                                            <span className="bg-rose-50 text-rose-700 text-[10px] font-semibold px-2.5 py-1 rounded-md">
                                                Timer Active
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 mt-6 pt-5 space-y-4">
                                    {/* Stats Block */}
                                    <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                                        <span>Total Registrations</span>
                                        <span className="text-base font-bold text-ighub-black">
                                            {form.submissions_count}
                                        </span>
                                    </div>

                                    {/* Form Link Copy Bar */}
                                    <div className="flex items-center gap-2 bg-ighub-light p-2 rounded-xl">
                                        <span className="text-[10px] text-gray-400 font-mono select-all truncate flex-1">
                                            /{form.slug}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyLink(form.slug, form.id)}
                                            className="p-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-600 transition-all cursor-pointer shadow-3xs"
                                            title="Copy registration link"
                                        >
                                            {copiedId === form.id ? (
                                                <Check className="w-3.5 h-3.5 text-ighub-green" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/admin/${form.id}`)}
                                            className="px-4 py-3 bg-ighub-purple text-white hover:bg-ighub-black transition-all text-xs font-bold rounded-xl cursor-pointer flex justify-center items-center gap-1.5"
                                        >
                                            <Settings className="w-3.5 h-3.5" />
                                            Manage Form
                                        </button>
                                        <a
                                            href={`/${form.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all text-xs font-bold rounded-xl flex justify-center items-center gap-1.5 shadow-3xs"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Page
                                            <ArrowUpRight className="w-3 h-3 text-gray-400" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
