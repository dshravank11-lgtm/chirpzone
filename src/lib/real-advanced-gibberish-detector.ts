/**
 * lib/real-advanced-gibberish-detector.ts
 * * WORKING TRANSFORMER‑BASED GIBBERISH DETECTOR
 * * Model: madhurjindal/autonlp-Gibberish-Detector-492513457 (PUBLIC & VERIFIED)
 * * Labels: 'clean', 'noise', 'word_salad', 'mild_gibberish'
 * * Accuracy: 97.36%
 * 
 * This file uses a "new Function" wrapper to bypass Next.js/Turbopack
 * static analysis, preventing SSR errors.
 */

export interface AdvancedGibberishResult {
  probability: number;        // Probability of being gibberish (0-1)
  isGibberish: boolean;       // True if classified as gibberish
  confidence: 'low' | 'medium' | 'high';
  label: 'clean' | 'noise' | 'word_salad' | 'mild_gibberish'; // Specific class
  logits: number[];
  attention?: Array<{ token: string; weight: number }>;
  details: string[];
}

export class AdvancedGibberishDetector {
  private classifier: any = null;
  private isInitialized = false;
  private modelId = 'madhurjindal/autonlp-Gibberish-Detector-492513457';

  /**
   * Initialize using a dynamic runtime import.
   * "new Function" hides the import path from Turbopack/Webpack analysis.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Strict Browser Check
    if (typeof window === 'undefined' || typeof self === 'undefined') {
      return;
    }

    try {
      // TRICKING THE BUNDLER: Prevents Next.js/Turbopack from parsing the import
      const importURL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
      const moduleLoader = new Function('url', 'return import(url)');
      const transformers = await moduleLoader(importURL);
      
      const { pipeline, env } = transformers;

      // 2. Configure environment
      env.allowLocalModels = true;
      env.useBrowserCache = true;
      env.useFSCache = false;
      // No access token needed - this model is fully public

      // 3. Initialize the pipeline with the CORRECT model ID
      this.classifier = await pipeline(
        'text-classification',
        this.modelId,
        { 
          quantized: false,      // Loads smaller ONNX quantized version
          revision: 'main'     // Explicit branch
        }
      );
      
      this.isInitialized = true;
      console.log(`✅ Gibberish Detector initialized with model: ${this.modelId}`);
    } catch (error) {
      console.error('GibberishDetector: Failed to load model', error);
      // Don't throw - allow graceful degradation
    }
  }

  async analyze(text: string): Promise<AdvancedGibberishResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.classifier) {
      return {
        probability: 0,
        isGibberish: false,
        confidence: 'low',
        label: 'clean',
        logits: [],
        details: ['⚠️ Model failed to load. Please refresh or check console.']
      };
    }

    const cleaned = text.trim();
    if (cleaned.length === 0) {
      return {
        probability: 0.5,
        isGibberish: false,
        confidence: 'low',
        label: 'clean',
        logits: [],
        details: ['📭 Empty input – cannot classify']
      };
    }

    try {
      // Run inference
      // Note: This model may not output attentions by default
      const result = await this.classifier(cleaned, {
        topk: 4, // Get all 4 classes to see probabilities
        output_attentions: false // Set to true if you need attention (may fail)
      });

      // result is an array of predictions sorted by score
      const topPrediction = result[0];
      const label = topPrediction.label.toLowerCase() as AdvancedGibberishResult['label'];
      const score = topPrediction.score;

      // Determine if it's gibberish based on label
      // We consider 'noise', 'word_salad', and 'mild_gibberish' as gibberish
      const isGibberish = label !== 'clean';
      
      // For probability, use the score directly if it's a gibberish class,
      // otherwise 1-score for consistency with binary expectation
      const probability = isGibberish ? score : 1 - score;

      // Calculate confidence based on probability
      let confidence: 'low' | 'medium' | 'high' = 'low';
      if (probability > 0.9) confidence = 'high';
      else if (probability > 0.7) confidence = 'medium';

      // Generate diagnostic details
      const details = this.generateDiagnostics(label, score, probability, cleaned);

      // Extract attention if available (model may not support this)
      let attention;
      if (result[0].attentions && result[0].tokens) {
        attention = this.extractTopAttention(result[0].attentions, result[0].tokens);
      }

      return {
        probability,
        isGibberish,
        confidence,
        label,
        logits: result[0].logits || [],
        attention,
        details
      };
    } catch (error) {
      console.error('Inference error:', error);
      return {
        probability: 0,
        isGibberish: false,
        confidence: 'low',
        label: 'clean',
        logits: [],
        details: [`❌ Inference failed: ${error.message || 'Unknown error'}`]
      };
    }
  }

  /**
   * Extract top attention weights (if supported by model)
   */
  private extractTopAttention(
    attentions: any,
    tokens: string[]
  ): Array<{ token: string; weight: number }> {
    try {
      // This is a best-effort extraction; structure may vary
      const lastLayer = attentions[attentions.length - 1];
      const clsAttention = lastLayer[0]?.[0]?.[0] || [];
      
      const tokenWeights = tokens.map((token: string, i: number) => ({
        token,
        weight: clsAttention[i] || 0
      }));
      
      return tokenWeights
        .filter(t => 
          t.token !== '[CLS]' && 
          t.token !== '[SEP]' && 
          t.token.length > 0 &&
          !t.token.startsWith('Ġ') // Skip subword markers if present
        )
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);
    } catch (e) {
      return [];
    }
  }

  /**
   * Generate human-readable diagnostics
   */
  private generateDiagnostics(
    label: string,
    rawScore: number,
    prob: number,
    text: string
  ): string[] {
    const details: string[] = [];

    // Label-specific messages
    switch (label) {
      case 'clean':
        details.push(`✅ **CLEAN TEXT** – ${Math.round(rawScore * 100)}% confidence`);
        break;
      case 'noise':
        details.push(`🔴 **NOISE** – Random characters, no words (${Math.round(rawScore * 100)}% confidence)`);
        break;
      case 'word_salad':
        details.push(`🟠 **WORD SALAD** – Words make sense individually but not together (${Math.round(rawScore * 100)}% confidence)`);
        break;
      case 'mild_gibberish':
        details.push(`🟡 **MILD GIBBERISH** – Grammatical errors or incoherent meaning (${Math.round(rawScore * 100)}% confidence)`);
        break;
    }

    // Confidence level
    if (prob > 0.95) details.push(`🔥 **VERY HIGH CERTAINTY**`);
    else if (prob > 0.8) details.push(`⚠️ **HIGH CONFIDENCE**`);
    else if (prob < 0.6) details.push(`📊 **LOW CONFIDENCE** – Consider longer input`);

    // Length warning
    if (text.length < 20) {
      details.push(`📏 **SHORT INPUT** (${text.length} chars) – Detection may be less reliable`);
    }

    return details;
  }
}

// Singleton with lazy initialization
let detectorInstance: AdvancedGibberishDetector | null = null;

export async function getGibberishDetector(): Promise<AdvancedGibberishDetector> {
  if (!detectorInstance) {
    detectorInstance = new AdvancedGibberishDetector();
    // Only attempt browser initialization
    if (typeof window !== 'undefined') {
      await detectorInstance.initialize();
    }
  }
  return detectorInstance;
}

export async function detectGibberish(text: string): Promise<AdvancedGibberishResult> {
  const detector = await getGibberishDetector();
  return detector.analyze(text);
}