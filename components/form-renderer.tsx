"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// Defining the shape of our schema based on the database structure
interface FormField {
    id: string;
    type: "text" | "number" | "select";
    label: string;
    required: boolean;
    options?: string[]; // Only used if type is 'select'
}

interface FormRendererProps {
    schema: FormField[];
    requiresPayment: boolean;
    formId: string; // Passed by public page
    onSubmit?: (data: Record<string, any>) => void;
}

export default function FormRenderer({ schema, requiresPayment, formId, onSubmit }: FormRendererProps) {
    // This state object captures all answers using the field ID as the key
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [paymentMethod, setPaymentMethod] = useState<"paystack" | "cash">("paystack");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ success?: boolean; message?: string }>({});

    const handleChange = (id: string, value: string) => {
        setAnswers((prev) => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus({});

        if (onSubmit) {
            onSubmit(answers);
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                formId,
                answers,
                requiresPayment,
                paymentMethod: requiresPayment ? paymentMethod : undefined,
                staffRef: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") : null
            };

            const res = await fetch("/api/submissions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Failed to submit registration");
            }

            setStatus({
                success: true,
                message: requiresPayment && paymentMethod === "paystack"
                    ? "Registration submitted! Redirecting to paystack online payment..."
                    : "Registration successfully completed. Thank you!"
            });

        } catch (err: any) {
            console.error(err);
            setStatus({
                success: false,
                message: err.message || "An unexpected error occurred. Please try again."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Shared ultra-clean input styling
    const inputStyles = "w-full p-4 mt-2 bg-ighub-light border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-ighub-green transition-all text-ighub-black";

    if (status.success) {
        return (
            <div className="text-center py-12 px-6 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <CheckCircle2 className="w-16 h-16 text-ighub-green mb-4" />
                <h3 className="text-2xl font-bold text-ighub-black mb-2">Registration Submitted</h3>
                <p className="text-gray-600 max-w-sm">{status.message}</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-xl mx-auto w-full">
            {status.success === false && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 flex gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 text-ighub-orange shrink-0" />
                    <span>{status.message}</span>
                </div>
            )}

            {schema.map((field) => (
                <div key={field.id} className="flex flex-col">
                    <label className="text-sm font-semibold tracking-wide text-ighub-black flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-ighub-orange">*</span>}
                    </label>

                    {/* Conditional Rendering based on Field Type */}
                    {field.type === "text" && (
                        <input
                            type="text"
                            required={field.required}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className={inputStyles}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            disabled={isSubmitting}
                        />
                    )}

                    {field.type === "number" && (
                        <input
                            type="number"
                            required={field.required}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className={inputStyles}
                            placeholder="0"
                            disabled={isSubmitting}
                        />
                    )}

                    {field.type === "select" && field.options && (
                        <select
                            required={field.required}
                            onChange={(e) => handleChange(field.id, e.target.value)}
                            className={`${inputStyles} appearance-none cursor-pointer`}
                            defaultValue=""
                            disabled={isSubmitting}
                        >
                            <option value="" disabled>Select an option</option>
                            {field.options.map((opt, index) => (
                                <option key={index} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            ))}

            {/* Payment Method Selector if Required */}
            {requiresPayment && (
                <div className="p-6 bg-ighub-light rounded-xl border border-gray-200 space-y-4">
                    <label className="text-sm font-bold text-ighub-black block">
                        Select Ticket Payment Method
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "paystack"
                                ? "bg-white border-ighub-green text-ighub-black font-semibold"
                                : "bg-white/50 border-gray-200 text-gray-500"
                            }`}>
                            <input
                                type="radio"
                                name="payment_method"
                                value="paystack"
                                checked={paymentMethod === "paystack"}
                                onChange={() => setPaymentMethod("paystack")}
                                className="sr-only"
                                disabled={isSubmitting}
                            />
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === "paystack" ? "border-ighub-green" : "border-gray-300"
                                }`}>
                                {paymentMethod === "paystack" && <div className="w-2.5 h-2.5 rounded-full bg-ighub-green"></div>}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs">Pay Online</span>
                                <span className="text-[10px] text-gray-400 font-normal">Card / Transfer / USSD</span>
                            </div>
                        </label>

                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "cash"
                                ? "bg-white border-ighub-green text-ighub-black font-semibold"
                                : "bg-white/50 border-gray-200 text-gray-500"
                            }`}>
                            <input
                                type="radio"
                                name="payment_method"
                                value="cash"
                                checked={paymentMethod === "cash"}
                                onChange={() => setPaymentMethod("cash")}
                                className="sr-only"
                                disabled={isSubmitting}
                            />
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === "cash" ? "border-ighub-green" : "border-gray-300"
                                }`}>
                                {paymentMethod === "cash" && <div className="w-2.5 h-2.5 rounded-full bg-ighub-green"></div>}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs">Pay with Cash</span>
                                <span className="text-[10px] text-gray-400 font-normal">Pay offline at the venue</span>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            <div className="pt-6">
                <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Submitting...</span>
                        </div>
                    ) : requiresPayment ? (
                        "Proceed to Payment"
                    ) : (
                        "Submit Registration"
                    )}
                </Button>
            </div>
        </form>
    );
}
