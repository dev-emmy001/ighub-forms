"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowRight, Search } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim()) {
      router.push(`/${slug.trim().toLowerCase()}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-ighub-light">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xs border border-gray-100/60">
        <Image className="my-6 mx-auto" width={100} height={100} src="/igcolouredlogo.png" alt="Logo" />
        {/* <h1 className="text-xl font-extrabold tracking-tight text-ighub-black mb-2">
          IGHub Portal Engine
        </h1> */}
        <p className="text-xs text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
          Enter a specific event handle to access customized portal registrations, or manage configurations inside the console.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="relative flex rounded-xl border border-gray-200 bg-ighub-light focus-within:ring-2 focus-within:ring-ighub-green overflow-hidden">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. hackathon-2026"
              className="w-full pl-10 pr-4 py-3 bg-transparent border-0 focus:outline-none text-ighub-black text-sm"
              required
            />
          </div>
          <Button type="submit" variant="primary" fullWidth className="cursor-pointer font-bold flex justify-center items-center gap-2">
            Go to Registration
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="border-t border-gray-100 pt-6">
          <Link href="/admin" className="block w-full">
            <Button variant="secondary" className="cursor-pointer text-xs py-2">
              Access Admin Console
            </Button>
          </Link>
        </div>
      </div>

      <footer className="mt-12 text-xs font-semibold text-gray-400/80">
        &copy; {new Date().getFullYear()} Innovation Growth Hub.
      </footer>
    </main>
  );
}