"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

// Defining the shape of our schema based on the database structure
interface FormField {
    id: string;
    type: "text" | "number" | "select" | "file";
    label: string;
    required: boolean;
    options?: string[]; // Only used if type is 'select'
}

interface FormRendererProps {
    schema: FormField[];
    formId: string; // Passed by public page
    title?: string;
    description?: string;
    onSubmit?: (data: Record<string, any>) => void;
}

// Subcomponent to handle file selection, compression, and API upload
interface FileUploadFieldProps {
    fieldId: string;
    label: string;
    required: boolean;
    onChange: (url: string) => void;
    disabled: boolean;
}

function FileUploadField({ fieldId, label, required, onChange, disabled }: FileUploadFieldProps) {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        setFileName(file.name);

        try {
            let fileToUpload: Blob | File = file;

            // Client-side image compression
            if (file.type.startsWith("image/")) {
                try {
                    fileToUpload = await compressImage(file);
                } catch (err) {
                    console.error("Image compression failed, using original file:", err);
                }
            }

            const formData = new FormData();
            formData.append("file", fileToUpload, file.name);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "File upload failed");
            }

            const data = await res.json();
            setFileUrl(data.url);
            onChange(data.url);
        } catch (err: any) {
            console.error("File upload error:", err);
            setError(err.message || "Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    // Client-side image compression using HTML5 Canvas
    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        reject(new Error("Canvas context is null"));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error("Canvas compression blob is null"));
                            }
                        },
                        "image/jpeg",
                        0.75
                    );
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const isImage = fileUrl && (
        fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || 
        fileUrl.includes("/uploads/") || 
        fileUrl.includes("supabase.co/storage")
    );

    return (
        <div className="flex flex-col mt-2 p-4 bg-ighub-light/45 border border-gray-200 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 font-mono truncate max-w-[240px]">
                    {fileName || "No file selected"}
                </span>
                {fileUrl && (
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        Uploaded
                    </span>
                )}
            </div>

            {fileUrl && (
                <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-gray-200 flex justify-center items-center bg-white p-2 animate-in fade-in duration-300">
                    {isImage ? (
                        <img src={fileUrl} alt="Uploaded thumbnail" className="max-h-44 object-contain rounded-md" />
                    ) : (
                        <div className="flex flex-col items-center p-6 space-y-2">
                            <span className="text-3xl select-none">📄</span>
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs text-ighub-purple hover:underline font-bold break-all text-center">
                                View Uploaded Document
                            </a>
                        </div>
                    )}
                </div>
            )}

            {uploading ? (
                <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-500 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-ighub-green" />
                    Optimizing & uploading...
                </div>
            ) : (
                <label className={`w-full flex justify-center items-center py-3 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-ighub-green hover:text-ighub-green transition-all bg-white text-xs font-bold text-gray-600 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <span>{fileUrl ? "Change Uploaded File" : "Select File or Photo"}</span>
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={disabled || uploading}
                        required={required && !fileUrl}
                    />
                </label>
            )}

            {error && <span className="text-xs text-rose-600 font-semibold">{error}</span>}
        </div>
    );
}

export default function FormRenderer({ schema, formId, title, description, onSubmit }: FormRendererProps) {
    const [answers, setAnswers] = useState<Record<string, string>>({});
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
                message: "Registration successfully completed. Thank you!"
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

    const inputStyles = "w-full p-4 mt-2 bg-ighub-light border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ighub-green transition-all text-ighub-black text-sm";

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
        <div className="max-w-xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
            {/* Header Section */}
            {(title || description) && (
                <div className="text-center pb-6 border-b border-gray-100">
                    {title && (
                        <h1 className="text-xl font-bold text-ighub-black tracking-tight mb-3">
                            {title}
                        </h1>
                    )}
                    {description && (
                        <p className="text-sm text-gray-500 leading-relaxed text-left whitespace-pre-wrap max-w-md mx-auto">
                            {description}
                        </p>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
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

                    {field.type === "file" && (
                        <FileUploadField
                            fieldId={field.id}
                            label={field.label}
                            required={field.required}
                            onChange={(url) => handleChange(field.id, url)}
                            disabled={isSubmitting}
                        />
                    )}
                </div>
            ))}

            <div className="pt-6">
                <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Submitting...</span>
                        </div>
                    ) : (
                        "Submit Registration"
                    )}
                </Button>
            </div>
            </form>
        </div>
    );
}
