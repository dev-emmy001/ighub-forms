import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-ighub-light text-center p-6">
            {/* Massive subtle background text */}
            <h1 className="text-9xl font-black text-ighub-purple/10 mb-4 tracking-tighter">
                404
            </h1>
            <h2 className="text-2xl font-bold text-ighub-black mb-2">
                Portal Not Found
            </h2>
            <p className="text-gray-500 mb-8 max-w-sm">
                The registration link you followed might be broken, or the event has been completely archived by administration.
            </p>
            <Link href="/">
                <Button variant="primary">Return to Directory</Button>
            </Link>
        </div>
    );
}