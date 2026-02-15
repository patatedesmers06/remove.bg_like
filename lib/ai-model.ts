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

// Try multiple RMBG-2.0 variants in order of preference
const MODEL_VARIANTS = [
    'Xenova/isnet-general-use',  // High detail (hairs/cables)
    'briaai/RMBG-1.4',           // Standard, reliable fallback
];

let MODEL_ID = MODEL_VARIANTS[0]; // Start with RMBG-2.0

// Global declarations to prevent reloading in development/hot-reload
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __model: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __processor: any;
}

class AIModel {
  static instance: AIModel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private model: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            console.log(`Using cached model: ${MODEL_ID}`);
            return;
        }

        // Try loading models in order until one succeeds
        let lastError: Error | null = null;
        
        for (const modelId of MODEL_VARIANTS) {
            try {
                console.log(`Attempting to load model: ${modelId}...`);
                
                this.model = await AutoModel.from_pretrained(modelId, {
                    // quantize: true, // Optional: for smaller binary size
                });
                
                this.processor = await AutoProcessor.from_pretrained(modelId);
                
                // Success! Save the model ID that worked
                MODEL_ID = modelId;
                
                // Save to global scope
                global.__model = this.model;
                global.__processor = this.processor;
                
                console.log(`✅ Successfully loaded model: ${modelId}`);
                return;
                
            } catch (error: unknown) {
                const errMsg = error instanceof Error ? error.message : String(error);
                console.warn(`❌ Failed to load ${modelId}:`, errMsg);
                lastError = error instanceof Error ? error : new Error(errMsg);
                // Continue to next variant
            }
        }
        
        // If we get here, all models failed
        console.error('All model variants failed to load!');
        throw new Error(`Failed to load any model variant. Last error: ${lastError?.message}`);
    }

  public getModel() {
    return this.model;
  }

  public getProcessor() {
    return this.processor;
  }

  public getModelId() {
    return MODEL_ID;
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

// DEBUG: Temporary function to check which model is loaded
export async function getModelInfo() {
    const instance = await AIModel.getInstance();
    return instance.getModelId();
}
