import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Standardize filename to avoid path traversal or special character issues
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filename = `${Date.now()}-${cleanName}`;

        // 1. Try uploading to Supabase Storage first (bucket 'media')
        try {
            const { data, error } = await supabaseAdmin.storage
                .from('media')
                .upload(filename, buffer, {
                    contentType: file.type,
                    cacheControl: '3600',
                    upsert: false
                });

            if (!error && data) {
                // Get the public URL
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('media')
                    .getPublicUrl(filename);
                
                return NextResponse.json({ success: true, url: publicUrl });
            } else {
                console.warn('Supabase storage upload failed, falling back to local storage:', error);
            }
        } catch (storageErr) {
            console.error('Supabase storage exception:', storageErr);
        }

        // 2. Fallback to local storage (e.g. for development or if bucket is missing)
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });
        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);

        const localUrl = `/uploads/${filename}`;
        return NextResponse.json({ success: true, url: localUrl });

    } catch (error: any) {
        console.error('API Upload error:', error);
        return NextResponse.json({ error: error.message || 'File upload failed' }, { status: 500 });
    }
}
