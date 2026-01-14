import { AutoModel, AutoProcessor, env } from '@xenova/transformers';

// Skip local model checks as we are running in a serverless environment
env.allowLocalModels = false;
env.useBrowserCache = false;
// Set cache directory to /tmp for Vercel
/* 
NOTE: On Vercel, we can't write to standard cache dirs easily usually, 
but Transformers.js tries to use node_modules or temp. 
We explicitly set it to /tmp to be safe in serverless.
*/
// env.cacheDir = '/tmp/.cache'; // Uncomment if needed, but default often works with a read-only FS if it downloads to memory or temp.

const MODEL_ID = 'onnx-community/BiRefNet-ONNX';  
// NOTE: If 'briaai/RMBG-1.4' is not found in ONNX format, consider using 'Xenova/bria-rmbg-1.4' or 'Xenova/modnet'.

// Global declarations to prevent reloading in development/hot-reload
declare global {
  var __model: any;
  var __processor: any;
}

class AIModel {
  static instance: AIModel;
  private model: any;
  private processor: any;

  private constructor() {}

  public static async getInstance() {
    if (!AIModel.instance) {
      AIModel.instance = new AIModel();
    }
    await AIModel.instance.init();
    return AIModel.instance;
  }

  /* 
     Singleton initialization pattern.
     In Vercel serverless, globalThis is preserved between warm invocations.
  */
  private async init() {
    if (global.__model && global.__processor) {
      this.model = global.__model;
      this.processor = global.__processor;
      return;
    }

    console.log('Loading AI Model...');
    // Load model and processor 
    // We use AutoModel.from_pretrained with the specific revision if needed.
    this.model = await AutoModel.from_pretrained(MODEL_ID, {
        // quantize: true, // Optional: for smaller binary size
        // BiRefNet-ONNX only has 'model.onnx' (fp32) or 'fp16'.
        // We must explicitly disable quantized loading to find the file.
        quantized: false, 
    });
    
    this.processor = await AutoProcessor.from_pretrained(MODEL_ID);

    // Save to global scope
    global.__model = this.model;
    global.__processor = this.processor;
    console.log('AI Model Loaded.');
  }

  public getModel() {
    return this.model;
  }

  public getProcessor() {
    return this.processor;
  }
}

// Helper function exported for ease of use
export async function getModel() {
    const instance = await AIModel.getInstance();
    return {
        model: instance.getModel(),
        processor: instance.getProcessor()
    };
}
