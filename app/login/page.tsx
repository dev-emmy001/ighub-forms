"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClientInstance } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Mail, AlertCircle, Sparkles } from "lucide-react";
import Image from "next/image";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createBrowserClientInstance();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get the post-login redirect path
    const nextPath = searchParams.get("next") || "/admin";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });

            if (signInError) {
                throw new Error(signInError.message || "Invalid login credentials.");
            }

            // Success: Redirect to nextPath and refresh router
            router.push(nextPath);
            router.refresh();
        } catch (err: any) {
            console.error("Login error:", err);
            setError(err.message || "Something went wrong. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleLogin} className="space-y-6">
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-950 flex gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="w-4 h-4 text-ighub-orange shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Staff Email Address
                </label>
                <div className="relative flex rounded-xl border border-gray-250 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green overflow-hidden transition-all">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <Mail className="w-4 h-4" />
                    </span>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@ighub.ng"
                        className="w-full pl-10 pr-4 py-3 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Console Password
                </label>
                <div className="relative flex rounded-xl border border-gray-250 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green overflow-hidden transition-all">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                        <Lock className="w-4 h-4" />
                    </span>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={isLoading}
                className="cursor-pointer font-bold rounded-full py-3.5 flex justify-center items-center gap-2 hover:bg-opacity-95 "
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        Authenticating...
                    </>
                ) : (
                    "Access console"
                )}
            </Button>
        </form>
    );
}

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-ighub-light flex flex-col justify-center items-center px-4 relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-br from-ighub-green/10 to-ighub-purple/5 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-gradient-to-tr from-ighub-orange/10 to-ighub-purple/5 rounded-full filter blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

            <div className="w-full max-w-md z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">


                {/* Login Card */}
                <div className="bg-white p-8 sm:p-10 rounded-[2.5rem]">
                    {/* Logo & Header */}
                    <div className="text-center space-y-3">
                        <Image className="my-6 mx-auto" width={100} height={100} src="/igcolouredlogo.png" alt="Logo" />
                    </div>
                    <Suspense fallback={
                        <div className="text-center py-12 space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-ighub-green mx-auto" />
                            <p className="text-xs font-semibold text-gray-400">Loading form...</p>
                        </div>
                    }>
                        <LoginForm />
                    </Suspense>
                </div>

                {/* Back to site link */}
                <div className="text-center">
                    <a
                        href="/"
                        className="text-xs font-bold text-gray-400 hover:text-ighub-purple transition-colors uppercase tracking-wider"
                    >
                        Back
                    </a>
                </div>
            </div>
        </main>
    );
}
