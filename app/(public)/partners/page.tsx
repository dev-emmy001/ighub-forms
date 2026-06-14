"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
    Search,
    Copy,
    Check,
    MousePointerClick,
    Award,
    Banknote,
    TrendingUp,
    ExternalLink,
    Building2,
    Loader2,
    ArrowLeft,
    CheckCircle2
} from "lucide-react";

interface PromoterStats {
    success: boolean;
    promoter: {
        id: string;
        name: string;
        code: string;
        email: string;
        clicks: number;
        createdAt: string;
    };
    campaign: {
        title: string;
        slug: string;
        ticketPrice: number;
    } | null;
    stats: {
        totalReferrals: number;
        successfulSales: number;
        commissionEarned: number;
    };
}

export default function PartnersStatsPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<PromoterStats | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCheckStats = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsLoading(true);
        setError(null);
        setStats(null);

        try {
            const res = await fetch(`/api/promoters/stats?email=${encodeURIComponent(email.trim())}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch stats. Please verify your email.");
            }

            setStats(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = (slug: string, code: string) => {
        if (typeof window === "undefined") return;
        const origin = window.location.origin;
        const url = `${origin}/${slug}?ref=${code}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setStats(null);
        setEmail("");
        setError(null);
    };

    return (
        <main className="min-h-screen bg-ighub-light text-ighub-black flex flex-col justify-between">
            <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl w-full mx-auto">
                {/* Header Logo */}
                <div className="mb-8 text-center shrink-0">
                    <Image src="/igcolouredlogo.png" alt="IGHub Logo" width={90} height={90} className="mx-auto" />
                </div>

                {!stats ? (
                    /* 1. ENTER EMAIL STATE */
                    <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xs border border-gray-100/60 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        <div>
                            <h1 className="text-2xl text-ighub-black tracking-tighter">
                                Partner Tracking Hub
                            </h1>
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
                                Enter your registered affiliate email below to check your clicks and referral link.
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-950 text-xs rounded-2xl text-left flex items-start gap-2">
                                <AlertCircleIcon className="w-4 h-4 text-ighub-orange shrink-0 mt-0.5" />
                                <span className="font-semibold">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleCheckStats} className="space-y-4">
                            <div className="relative flex rounded-2xl border border-gray-200 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green overflow-hidden">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                                    <Search className="w-4 h-4" />
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your partner email..."
                                    className="w-full pl-11 pr-4 py-3.5 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                fullWidth
                                disabled={isLoading}
                                className="font-bold py-3.5 rounded-2xl cursor-pointer select-none flex justify-center items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Fetching stats...
                                    </>
                                ) : (
                                    "Access Stats Dashboard"
                                )}
                            </Button>
                        </form>
                    </div>
                ) : (
                    /* 2. STATS DISPLAY STATE */
                    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-300">
                        {/* Top banner / Info bar */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                {/* <span className="text-[10px] font-bold uppercase tracking-tigher text-ighub-purple bg-ighub-light px-3 py-1 rounded-full border border-gray-200">
                                    Active Partner Profile
                                </span> */}
                                <h2 className="text-xl text-ighub-black mt-2">
                                    Welcome, {stats.promoter.name}!
                                </h2>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">
                                    Referral ID: {stats.promoter.code}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                className="text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-3xs"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Switch Account
                            </Button>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Clicks */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-all">
                                <div className="p-4 bg-purple-50 rounded-2xl text-ighub-purple">
                                    <MousePointerClick className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400">Total Link Clicks</span>
                                    <h3 className="text-3xl text-ighub-black mt-0.5">{stats.promoter.clicks}</h3>
                                </div>
                            </div>

                            {/* Total Referrals */}
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-all">
                                <div className="p-4 bg-emerald-50 rounded-2xl text-ighub-green">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400">Total Referrals</span>
                                    <h3 className="text-3xl font text-ighub-black mt-0.5">
                                        {stats.stats.totalReferrals}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Referral Link Box */}
                        {stats.campaign && (
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-3xs flex flex-col space-y-4">
                                <div>
                                    <h3 className="text-sm text-ighub-black flex items-center gap-1.5">
                                        {/* <TrendingUp className="w-4 h-4 text-ighub-green" /> */}
                                        Active Campaign Link
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Share this link with your audience to refer registrants for <strong>{stats.campaign.title}</strong>.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 bg-ighub-light p-3 rounded-2xl border border-gray-200">
                                    <span className="text-[11px] text-ighub-purple font-mono select-all truncate flex-1 leading-normal font-bold">
                                        {typeof window !== "undefined"
                                            ? `${window.location.origin}/${stats.campaign.slug}?ref=${stats.promoter.code}`
                                            : `/${stats.campaign.slug}?ref=${stats.promoter.code}`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyLink(stats.campaign!.slug, stats.promoter.code)}
                                        className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-650 transition-all cursor-pointer shadow-3xs shrink-0"
                                        title="Copy link"
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-ighub-green" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                <div className="pt-2">
                                    <a
                                        href={typeof window !== "undefined"
                                            ? `${window.location.origin}/${stats.campaign.slug}?ref=${stats.promoter.code}`
                                            : `/${stats.campaign.slug}?ref=${stats.promoter.code}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-bold text-gray-550 hover:text-ighub-green flex items-center gap-1 transition-colors justify-end"
                                    >
                                        Test Link Live
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            {/* <footer className="py-6 text-center text-xs font-semibold text-gray-405 shrink-0 border-t border-gray-200 bg-white">
                &copy; {new Date().getFullYear()} Innovation Growth Hub Form Engine. All Rights Reserved.
            </footer> */}
        </main>
    );
}

// Simple internal icon component helper
function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
