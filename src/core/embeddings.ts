import { pipeline, FeatureExtractionPipeline, env } from '@huggingface/transformers';
import { getEmbeddingRateLimiter } from './ratelimiter.js';

let embeddingPipeline: FeatureExtractionPipeline | null = null;
let isDisabled = false;

/**
 * Check if embeddings are disabled via environment variable.
 */
export function isEmbeddingsDisabled(): boolean {
  return process.env.MEMMEM_DISABLE_EMBEDDINGS === 'true';
}

export async function initEmbeddings(): Promise<void> {
  if (isEmbeddingsDisabled()) {
    isDisabled = true;
    console.log('Embeddings disabled via MEMMEM_DISABLE_EMBEDDINGS=true');
    return;
  }

  if (!embeddingPipeline) {
    console.log('Loading embedding model (first run may take time)...');

    // Set cache directory
    env.cacheDir = './.cache';

    // Load EmbeddingGemma with Q4 quantization
    embeddingPipeline = await pipeline(
      'feature-extraction',
      'onnx-community/embeddinggemma-300m-ONNX',
      { dtype: 'q4' } as any
    );

    console.log('Embedding model loaded');
  }
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Return null if embeddings are disabled
  if (isDisabled || isEmbeddingsDisabled()) {
    return null;
  }

  // Acquire rate limiter token before generating embedding
  await getEmbeddingRateLimiter().acquire();

  if (!embeddingPipeline) {
    await initEmbeddings();
  }

  // Check again after init (might have been disabled)
  if (isDisabled || !embeddingPipeline) {
    return null;
  }

  // CRITICAL: Task prefix is MANDATORY for EmbeddingGemma
  // For documents/text, use "title: none | text: ..."
  const prefixedText = `title: none | text: ${text}`;

  // Truncate to avoid token limits (EmbeddingGemma supports up to 2K tokens)
  const truncated = prefixedText.substring(0, 8000);

  // Generate embeddings with mean pooling and normalization
  const output = await embeddingPipeline!(truncated, {
    pooling: 'mean',
    normalize: true
  });

  return Array.from(output.data);
}

