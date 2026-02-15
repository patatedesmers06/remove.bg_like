import { getModel } from './ai-model';
import { RawImage } from '@xenova/transformers';
import { Jimp } from 'jimp';
import { PNG } from 'pngjs';

/**
 * Generate a Gaussian kernel for blur operations
 */
function generateGaussianKernel(size: number, sigma: number): number[][] {
    const kernel: number[][] = [];
    const mean = Math.floor(size / 2);
    let sum = 0;
    
    for (let y = 0; y < size; y++) {
        kernel[y] = [];
        for (let x = 0; x < size; x++) {
            const exponent = -((x - mean) ** 2 + (y - mean) ** 2) / (2 * sigma ** 2);
            kernel[y][x] = Math.exp(exponent) / (2 * Math.PI * sigma ** 2);
            sum += kernel[y][x];
        }
    }
    
    // Normalize kernel
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            kernel[y][x] /= sum;
        }
    }
    
    return kernel;
}

/**
 * Process the image to remove the background.
 * @param imageBuffer - The input image buffer.
 * @returns - The processed image buffer (PNG).
 */
export async function removeBackground(imageBuffer: Buffer, bgColor?: string): Promise<Buffer> {
    const { model, processor } = await getModel();

    console.log('Start processing...');
    console.time('Jimp Load');
    // 1. Decode image using Jimp (Pure JS, safer than Sharp for this env)
    const jimpImage = await Jimp.read(imageBuffer);
    console.timeEnd('Jimp Load');

    const width = jimpImage.bitmap.width;
    const height = jimpImage.bitmap.height;

    console.log(`Processing image size: ${width}x${height}`);
    const { data: requestData } = jimpImage.bitmap;
    
    // Jimp stores data as RGBA flat buffer, which is what RawImage expects.
    const image = new RawImage(requestData, width, height, 4);

    // 2. Pre-process
    const { pixel_values } = await processor(image);

    // 3. Run Inference
    const { output } = await model({ input: pixel_values });

    // 4. Post-process (Get the mask)
    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(width, height);

    const maskData = mask.data; // Uint8Array
    
    // 4.5 ADVANCED MASK REFINEMENT (Gaussian Blur + Adaptive Erosion)
    console.time('Mask Refinement');
    
    // Step 1: Apply selective Gaussian blur to smooth edges (reduces aliasing)
    const blurredMask = new Uint8Array(maskData.length);
    const sigma = 1.0;
    const kernelSize = 5;
    const kernel = generateGaussianKernel(kernelSize, sigma);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const currentVal = maskData[idx];
            
            // Only apply blur to edge pixels (20-250 range), preserve solid areas
            if (currentVal > 20 && currentVal < 250) {
                let sum = 0;
                let weightSum = 0;
                
                const halfKernel = Math.floor(kernelSize / 2);
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const ny = y + ky;
                        const nx = x + kx;
                        
                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            const nIdx = ny * width + nx;
                            const weight = kernel[ky + halfKernel][kx + halfKernel];
                            sum += maskData[nIdx] * weight;
                            weightSum += weight;
                        }
                    }
                }
                
                blurredMask[idx] = Math.round(sum / weightSum);
            } else {
                blurredMask[idx] = currentVal;
            }
        }
    }
    
    // Step 2: Apply adaptive erosion (preserves fine details)
    const erodedMask = new Uint8Array(maskData.length);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            if (blurredMask[idx] > 0) {
                const val = blurredMask[idx];
                
                // Get 4-connected neighbors
                const up    = (y > 0) ? blurredMask[idx - width] : 0;
                const down  = (y < height - 1) ? blurredMask[idx + width] : 0;
                const left  = (x > 0) ? blurredMask[idx - 1] : 0;
                const right = (x < width - 1) ? blurredMask[idx + 1] : 0;
                
                // Adaptive erosion: Only erode if at least 2 neighbors are background
                const neighbors = [up, down, left, right];
                const backgroundCount = neighbors.filter(n => n < 50).length;
                
                if (backgroundCount >= 2) {
                    // Strong erosion on edge pixels
                    erodedMask[idx] = Math.min(val, up, down, left, right);
                } else {
                    // Preserve fine details (hair, fingers, etc.)
                    erodedMask[idx] = val;
                }
            } else {
                erodedMask[idx] = 0;
            }
        }
    }
    
    // Step 3: Morphological opening — dilate after erosion to restore edges
    const openedMask = new Uint8Array(maskData.length);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const val = erodedMask[idx];
            
            if (val > 0) {
                // Take max of 4-connected neighbors (dilation)
                const up    = (y > 0) ? erodedMask[idx - width] : 0;
                const down  = (y < height - 1) ? erodedMask[idx + width] : 0;
                const left  = (x > 0) ? erodedMask[idx - 1] : 0;
                const right = (x < width - 1) ? erodedMask[idx + 1] : 0;
                
                openedMask[idx] = Math.max(val, up, down, left, right);
            } else {
                openedMask[idx] = 0;
            }
        }
    }
    
    // Step 4: Connected-component filter — remove noise regions
    // Use proportional filtering: remove any region smaller than 0.1% of total pixels
    const totalPixels = width * height;
    const MIN_REGION_SIZE = Math.max(200, Math.floor(totalPixels * 0.001));
    const visited = new Uint8Array(maskData.length);
    const regionMap = new Int32Array(maskData.length).fill(-1);
    const regionSizes: number[] = [];
    let regionId = 0;
    
    // BFS to find connected regions
    for (let i = 0; i < width * height; i++) {
        if (openedMask[i] > 30 && !visited[i]) {
            // Start BFS for this region
            const queue: number[] = [i];
            const regionPixels: number[] = [];
            visited[i] = 1;
            
            while (queue.length > 0) {
                const px = queue.shift()!;
                regionPixels.push(px);
                regionMap[px] = regionId;
                
                const x = px % width;
                const y = Math.floor(px / width);
                
                // Check 8-connected neighbors
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = ny * width + nx;
                            if (openedMask[nIdx] > 30 && !visited[nIdx]) {
                                visited[nIdx] = 1;
                                queue.push(nIdx);
                            }
                        }
                    }
                }
            }
            
            regionSizes.push(regionPixels.length);
            regionId++;
        }
    }
    
    // Find the largest region size
    const maxRegionSize = regionSizes.length > 0 ? Math.max(...regionSizes) : 0;
    // Also remove regions that are less than 1% of the largest region
    const proportionalMin = Math.floor(maxRegionSize * 0.01);
    const effectiveMin = Math.max(MIN_REGION_SIZE, proportionalMin);
    
    // Zero out small regions
    const finalMask = new Uint8Array(openedMask);
    let removedCount = 0;
    for (let i = 0; i < width * height; i++) {
        const rid = regionMap[i];
        if (rid >= 0 && regionSizes[rid] < effectiveMin) {
            finalMask[i] = 0;
            removedCount++;
        }
    }
    
    console.timeEnd('Mask Refinement');
    console.log(`Region filter: ${regionId} regions, largest=${maxRegionSize}px, threshold=${effectiveMin}px, removed ${regionSizes.filter(s => s < effectiveMin).length} noise regions (${removedCount}px)`);

    
    // Parse background color if provided
    let bgR = 255, bgG = 255, bgB = 255;
    const hasBgColor = !!bgColor;
    
    if (hasBgColor && bgColor) {
        // Simple hex parser #RRGGBB or RRGGBB
        const hex = bgColor.replace('#', '');
        if (hex.length === 6) {
            bgR = parseInt(hex.substring(0, 2), 16);
            bgG = parseInt(hex.substring(2, 4), 16);
            bgB = parseInt(hex.substring(4, 6), 16);
        }
    }

    // 5. Final Application: Deep Copy with Mask
    const outputBuffer = Buffer.alloc(width * height * 4);
    const sourceData = jimpImage.bitmap.data;

    // Threshold to remove low-confidence noise (0-255)
    // Set to 128 for aggressive noise cleanup on industrial/dark objects
    // Pixels with mask < 128 are treated as background
    const THRESHOLD = 128; 

    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;     // RGBA index
        // Use ERODED mask instead of raw mask
        const maskVal = finalMask[i]; 
        
        // Copy RGB from source
        const srcR = sourceData[idx];
        const srcG = sourceData[idx + 1];
        const srcB = sourceData[idx + 2];
        
        // Calculate Soft Alpha with Threshold
        // If maskVal is below threshold, alpha is 0 (Clean cut for noise)
        // If above, we normalize it to fade in smoothly from 0
        let alpha = 0;
        if (maskVal > THRESHOLD) {
            alpha = (maskVal - THRESHOLD) / (255 - THRESHOLD);
        }
        
        // ALPHA MATTING REFINEMENT: Refine alpha in transition zones
        if (alpha > 0.1 && alpha < 0.9) {
            // We're in a transition zone - apply alpha matting refinement
            const x = i % width;
            const y = Math.floor(i / width);
            
            // Sample neighborhood to estimate foreground/background colors
            let fgSamples = 0, bgSamples = 0;
            let fgR = 0, fgG = 0, fgB = 0;
            let bgR_sum = hasBgColor ? bgR : 0, bgG_sum = hasBgColor ? bgG : 0, bgB_sum = hasBgColor ? bgB : 0;
            
            const sampleRadius = 3;
            for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
                for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nIdx = ny * width + nx;
                        const nMaskVal = finalMask[nIdx];
                        const nPixIdx = nIdx * 4;
                        
                        if (nMaskVal > 200) {
                            // Likely foreground
                            fgR += sourceData[nPixIdx];
                            fgG += sourceData[nPixIdx + 1];
                            fgB += sourceData[nPixIdx + 2];
                            fgSamples++;
                        } else if (nMaskVal < 30 && !hasBgColor) {
                            // Likely background (only if no custom bg color)
                            bgR_sum += sourceData[nPixIdx];
                            bgG_sum += sourceData[nPixIdx + 1];
                            bgB_sum += sourceData[nPixIdx + 2];
                            bgSamples++;
                        }
                    }
                }
            }
            
            if (fgSamples > 0) {
                fgR /= fgSamples;
                fgG /= fgSamples;
                fgB /= fgSamples;
            }
            
            if (!hasBgColor && bgSamples > 0) {
                bgR_sum /= bgSamples;
                bgG_sum /= bgSamples;
                bgB_sum /= bgSamples;
            }
            
            // Refine alpha using color information
            // If current pixel is closer to bg color, reduce alpha
            if (fgSamples > 0) {
                const distToFg = Math.sqrt((srcR - fgR) ** 2 + (srcG - fgG) ** 2 + (srcB - fgB) ** 2);
                const distToBg = Math.sqrt((srcR - bgR_sum) ** 2 + (srcG - bgG_sum) ** 2 + (srcB - bgB_sum) ** 2);
                
                if (distToFg + distToBg > 0) {
                    const colorAlpha = distToBg / (distToFg + distToBg);
                    // Blend with original alpha
                    alpha = alpha * 0.6 + colorAlpha * 0.4;
                }
            }
        }

        if (hasBgColor) {
            // IMPROVED BLENDING with Gamma Correction
            // Convert to linear space for proper blending
            const sR_linear = Math.pow(srcR / 255, 2.2);
            const sG_linear = Math.pow(srcG / 255, 2.2);
            const sB_linear = Math.pow(srcB / 255, 2.2);
            const bR_linear = Math.pow(bgR / 255, 2.2);
            const bG_linear = Math.pow(bgG / 255, 2.2);
            const bB_linear = Math.pow(bgB / 255, 2.2);
            
            // Blend in linear space
            const invAlpha = 1 - alpha;
            const finalR_linear = (sR_linear * alpha) + (bR_linear * invAlpha);
            const finalG_linear = (sG_linear * alpha) + (bG_linear * invAlpha);
            const finalB_linear = (sB_linear * alpha) + (bB_linear * invAlpha);
            
            // Convert back to sRGB space
            outputBuffer[idx]     = Math.pow(finalR_linear, 1/2.2) * 255;
            outputBuffer[idx + 1] = Math.pow(finalG_linear, 1/2.2) * 255;
            outputBuffer[idx + 2] = Math.pow(finalB_linear, 1/2.2) * 255;
            outputBuffer[idx + 3] = 255; // Fully Opaque result
        } else {
            // TRANSPARENT Background with Color Defringing
            let finalR = srcR;
            let finalG = srcG;
            let finalB = srcB;
            
            // Apply color defringing on semi-transparent pixels
            if (alpha > 0.3 && alpha < 0.95) {
                // Slightly desaturate edge pixels to remove color contamination
                const luminance = 0.299 * srcR + 0.587 * srcG + 0.114 * srcB;
                const defringeAmount = (1 - alpha) * 0.2; // Stronger defringing on more transparent pixels
                
                finalR = srcR * (1 - defringeAmount) + luminance * defringeAmount;
                finalG = srcG * (1 - defringeAmount) + luminance * defringeAmount;
                finalB = srcB * (1 - defringeAmount) + luminance * defringeAmount;
            }
            
            outputBuffer[idx]     = finalR;
            outputBuffer[idx + 1] = finalG;
            outputBuffer[idx + 2] = finalB;
            // Apply calculated alpha to the alpha channel
            outputBuffer[idx + 3] = alpha * 255; 
        }
    }

    // 6. Return Buffer
    console.log('Generating final output buffer...');
    
    const png = new PNG({
        width: width,
        height: height,
        inputColorType: 6, // RGBA
        inputHasAlpha: true
    });
    
    png.data = outputBuffer;
    
    const resultBuffer = PNG.sync.write(png);

    return resultBuffer;
}
