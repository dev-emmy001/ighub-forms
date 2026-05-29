import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FormDetailPage({ params }: { params: { formId: string } }) {
    return (
        <main className="min-h-screen bg-ighub-light text-ighub-black flex flex-col font-sans p-8">
            <div className="max-w-4xl mx-auto w-full space-y-6 mt-12 bg-white p-8 rounded-2xl border border-gray-100 shadow-xs">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-ighub-black">
                        Form Detail View ({params.formId})
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Viewing submissions and configurations for Form #{params.formId}.
                    </p>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <Link href="/admin">
                        <Button variant="secondary" className="cursor-pointer">
                            <span className="flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Return to Dashboard
                            </span>
                        </Button>
                    </Link>
                </div>
            </div>
        </main>
    );
}
