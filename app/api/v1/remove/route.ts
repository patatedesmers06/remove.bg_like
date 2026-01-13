import { NextRequest, NextResponse } from 'next/server';
import { removeBackground } from '@/lib/image-processing';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export const maxDuration = 60; // Set max duration for Vercel Function (standard pro is 60s, hobby 10s might timeout on cold start)

export async function POST(req: NextRequest) {
    try {
        // 1. API Key Validation
        const apiKey = req.headers.get('x-api-key');
        let userId = null; // Track user for stats if needed

        if (apiKey) {
            // Hash the key to compare with stored hash
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

        // 1.5 CREDIT CHECK (NEW)
        if (userId) {
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('credits')
                .eq('id', userId)
                .single();
            
            if (profileError || !profile) {
                // Return 500 if profile missing (should be created by trigger)
                // Or 400? Let's assume 500 effectively.
                console.error('Profile fetch error:', profileError);
                // Fail safe: Allow if error? No, safer to block.
                return NextResponse.json({ error: 'User profile not found. Please re-login.' }, { status: 403 });
            }

            if (profile.credits < 1) {
                return NextResponse.json({ error: 'Insufficient credits. Please upgrade.' }, { status: 402 });
            }
        }

        // 2. File Upload Handling
        const formData = await req.formData();
        const file = formData.get('image') as File | null;
        const bgColor = formData.get('bg_color') as string | null; // Get optional background color

        if (!file) {
            return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
        }

        // Check file size (e.g. 10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
        }

        // Check mime type check
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 415 });
        }

        // 3. Process Image
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Process with AI
        const processedImageBuffer = await removeBackground(buffer, bgColor || undefined);

        // 4. DEDUCT CREDIT (NEW)
        if (userId) {
            const { error: deductionError } = await supabaseAdmin.rpc('decrement_credits', { user_id: userId });
            
            // Fallback if RPC doesn't exist (though RPC is safer for concurrency)
            if (deductionError) {
                // Try manual update (less concurrency safe but works for MVP)
                // We need to fetch again to be sure? Or just decrement.
                const { error: updateError } = await supabaseAdmin
                    .from('profiles')
                    .update({ credits: ((await supabaseAdmin.from('profiles').select('credits').eq('id', userId).single()).data?.credits || 1) - 1 })
                    .eq('id', userId);
                    
                if (updateError) console.error('Failed to deduct credit', updateError);
            }
        }

        // Usage count updated above if API key is used.
        // If Bearer token used, we don't track usage against an API key (or we could track against user profile if needed).

        // 5. Return Result
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
