import { getModel } from './ai-model';
import { RawImage } from '@xenova/transformers';
import { Jimp } from 'jimp';
import { PNG } from 'pngjs';

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

    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;     // RGBA index
        const maskVal = maskData[i]; // Grayscale mask value (0=Background, 255=Foreground)
        
        // Copy RGB from source
        const srcR = sourceData[idx];
        const srcG = sourceData[idx + 1];
        const srcB = sourceData[idx + 2];
        
        // Apply Mask to Alpha
        if (maskVal < 128) { // Background
            if (hasBgColor) {
               // Fill with Background Color + Opaque
               outputBuffer[idx] = bgR;
               outputBuffer[idx + 1] = bgG;
               outputBuffer[idx + 2] = bgB;
               outputBuffer[idx + 3] = 255;
            } else {
               // Transparent
               outputBuffer[idx] = srcR; // Keep src color (invisible anyway) or 0
               outputBuffer[idx + 1] = srcG;
               outputBuffer[idx + 2] = srcB;
               outputBuffer[idx + 3] = 0; 
            }
        } else { // Foreground
            // Keep source pixel
            outputBuffer[idx] = srcR;
            outputBuffer[idx + 1] = srcG;
            outputBuffer[idx + 2] = srcB;
            outputBuffer[idx + 3] = 255; 
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
