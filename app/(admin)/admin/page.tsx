import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
    return (
        <main className="min-h-screen bg-ighub-light text-ighub-black flex flex-col p-8">
            <div className="max-w-4xl mx-auto w-full space-y-8 mt-12 bg-white p-8 rounded-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-ighub-black flex items-center gap-2">
                            Admin Console
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Manage event registrations and dynamic forms.
                        </p>
                    </div>
                    <Link href="/admin/create">
                        <Button variant="primary" className="cursor-pointer">
                            <span className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Create New Form
                            </span>
                        </Button>
                    </Link>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs text-gray-400">
                        Select "Create New Form" above to build a new registration workflow.
                    </p>
                </div>
            </div>
        </main>
    );
}
