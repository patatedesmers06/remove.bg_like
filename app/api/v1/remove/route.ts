import { NextRequest, NextResponse } from 'next/server';
import { removeBackground } from '@/lib/image-processing';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const maxDuration = 60; // Set max duration for Vercel Function (standard pro is 60s, hobby 10s might timeout on cold start)

export async function POST(req: NextRequest) {
    try {
        // 1. API Key Validation
        const apiKey = req.headers.get('x-api-key');
        let userId: string | null = null;

        if (apiKey) {
            // Hash the key to compare with stored hash
            const crypto = await import('crypto');
            const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

            // Check against Supabase
            const { data: keyRecord, error: dbError } = await supabaseAdmin
                .from('api_keys')
                .select('id, usage_count, user_id')
                .eq('key_hash', keyHash)
                .single();

            if (dbError || !keyRecord) {
                 return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
            }
            userId = keyRecord.user_id;
            
            // Update Usage Count
            await supabaseAdmin
                .from('api_keys')
                .update({ usage_count: (keyRecord.usage_count || 0) + 1 })
                .eq('id', keyRecord.id);

        } else {
            // Fallback: Check for Supabase Auth Token (Bearer)
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) {
                return NextResponse.json({ error: 'Missing API Key or Auth Token' }, { status: 401 });
            }
            
            const token = authHeader.replace('Bearer ', '');
             const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
             
             if (authError || !user) {
                 return NextResponse.json({ error: 'Invalid Auth Token' }, { status: 401 });
             }
             userId = user.id;
        }

        // 1.5 ATOMIC CREDIT CHECK + DEDUCTION
        // Uses a single RPC call to prevent race conditions
        if (userId) {
            const { data: creditUsed, error: creditError } = await supabaseAdmin
                .rpc('try_use_credit', { p_user_id: userId });

            if (creditError) {
                console.error('Credit RPC error:', creditError);
                return NextResponse.json({ error: 'Credit system error. Please try again.' }, { status: 500 });
            }

            if (!creditUsed) {
                return NextResponse.json({ error: 'Insufficient credits. Please upgrade.' }, { status: 402 });
            }
        }

        // 2. File Upload Handling
        const formData = await req.formData();
        const file = formData.get('image') as File | null;
        const bgColor = formData.get('bg_color') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
        }

        // Check file size (e.g. 10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
        }

        // Check mime type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 415 });
        }

        // 3. Process Image
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const processedImageBuffer = await removeBackground(buffer, bgColor || undefined);

        // 4. Return Result (credit already deducted atomically above)
        return new NextResponse(processedImageBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': 'inline; filename="removed-bg.png"',
            },
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
