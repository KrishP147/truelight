/**
 * AI Assistant Service (Sierra)
 * 
 * Inspired by Saight project - provides intelligent scene understanding
 * and interactive Q&A using Gemini AI.
 * 
 * Features:
 * - Scene description and analysis
 * - Object identification with context
 * - Question answering about surroundings
 * - Color-blind aware descriptions
 */

import { ColorblindnessType } from '../constants/accessibility';
import { getColorProfile } from '../constants/colorProfiles';

// Gemini API configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
// Updated to use Gemini 2.5 Flash model
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

export interface SceneAnalysis {
  description: string;
  objects: string[];
  hazards: string[];
  trafficSignals: string[];
  suggestedAction: string;
  colorWarnings: string[]; // Colors user might have trouble seeing
}

export interface AIResponse {
  text: string;
  confidence: number;
  processingTimeMs: number;
}

/**
 * Analyze a scene using Gemini Vision AI
 */
export async function analyzeScene(
  base64Image: string,
  colorblindType: ColorblindnessType = 'unknown',
  context?: {
    currentSpeed?: number;
    transportMode?: string;
    recentAlerts?: string[];
  }
): Promise<SceneAnalysis> {
  const startTime = Date.now();
  
  // Get user's color profile for contextual descriptions
  const colorProfile = getColorProfile(colorblindType);
  const problematicColors = colorProfile.problematicColors.join(', ');
  
  const systemPrompt = `You are Sierra, an AI assistant helping a person with ${colorblindType === 'normal' ? 'normal vision' : colorblindType + ' color blindness'} navigate their environment safely.

${colorblindType !== 'normal' ? `IMPORTANT: The user has difficulty seeing these colors: ${problematicColors}. Always explicitly describe any objects in these colors and provide alternative cues (position, shape, brightness).` : ''}

Analyze the image and provide:
1. A brief, clear description of the scene (1-2 sentences)
2. List of key objects visible
3. Any potential hazards (traffic, obstacles, moving vehicles)
4. Traffic signals/signs if visible (describe position AND color)
5. Suggested action (safe to proceed, stop, wait, caution)
6. Any colors the user might have trouble distinguishing

Be concise and focus on safety-relevant information. Speak as if directly talking to the user.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse the response into structured format
    return parseSceneAnalysis(text, Date.now() - startTime);
  } catch (error) {
    console.error('[AI Assistant] Scene analysis error:', error);
    return {
      description: 'Unable to analyze scene at the moment.',
      objects: [],
      hazards: [],
      trafficSignals: [],
      suggestedAction: 'Proceed with caution.',
      colorWarnings: [],
    };
  }
}

/**
 * Ask a question about the current scene or general knowledge
 */
export async function askQuestion(
  question: string,
  base64Image?: string,
  colorblindType: ColorblindnessType = 'unknown'
): Promise<AIResponse> {
  const startTime = Date.now();
  
  const colorProfile = getColorProfile(colorblindType);
  
  const systemPrompt = `You are Sierra, a helpful AI assistant for a person${colorblindType !== 'normal' ? ` with ${colorblindType} color blindness` : ''}. 

Answer questions concisely and clearly. If the question is about something visual${base64Image ? ' (you have an image)' : ' (no image provided)'}, describe what you see in a way that's helpful for the user.

${colorblindType !== 'normal' ? `Remember: The user has difficulty with ${colorProfile.problematicColors.join(', ')} colors. Always provide alternative descriptions when these colors are relevant.` : ''}

Keep responses brief (1-3 sentences) and actionable.`;

  try {
    const parts: any[] = [{ text: `${systemPrompt}\n\nQuestion: ${question}` }];
    
    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
        }
      });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 200,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I couldn\'t understand that. Could you rephrase?';
    
    return {
      text: text.trim(),
      confidence: 0.8,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[AI Assistant] Question error:', error);
    return {
      text: 'I\'m having trouble connecting right now. Please try again.',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Generate a description of detected objects suitable for audio
 */
export function generateObjectDescription(
  objects: Array<{ label: string; confidence: number; isProblematicColor?: boolean }>,
  colorblindType: ColorblindnessType = 'unknown'
): string {
  if (objects.length === 0) {
    return 'No objects detected in view.';
  }
  
  // Sort by confidence and problematic colors first
  const sorted = [...objects].sort((a, b) => {
    // Prioritize problematic colors
    if (a.isProblematicColor && !b.isProblematicColor) return -1;
    if (!a.isProblematicColor && b.isProblematicColor) return 1;
    return b.confidence - a.confidence;
  });
  
  // Take top 5 most relevant
  const top = sorted.slice(0, 5);
  
  // Generate description
  const problematic = top.filter(o => o.isProblematicColor);
  const normal = top.filter(o => !o.isProblematicColor);
  
  let description = '';
  
  if (problematic.length > 0) {
    description += `Attention: ${problematic.map(o => o.label).join(', ')}. `;
  }
  
  if (normal.length > 0) {
    description += `Also visible: ${normal.map(o => o.label).join(', ')}.`;
  }
  
  return description.trim();
}

/**
 * Parse Gemini's text response into structured scene analysis
 */
function parseSceneAnalysis(text: string, processingTimeMs: number): SceneAnalysis {
  // Simple parsing - in production, use structured output from Gemini
  const lines = text.split('\n').filter(l => l.trim());
  
  // Extract key information using simple heuristics
  const description = lines[0] || 'Scene analyzed.';
  
  const objects: string[] = [];
  const hazards: string[] = [];
  const trafficSignals: string[] = [];
  const colorWarnings: string[] = [];
  let suggestedAction = 'Proceed with caution.';
  
  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Look for traffic signals
    if (lower.includes('traffic light') || lower.includes('signal') || lower.includes('stop sign')) {
      trafficSignals.push(line.replace(/^[-*•]\s*/, '').trim());
    }
    
    // Look for hazards
    if (lower.includes('hazard') || lower.includes('danger') || lower.includes('caution') || 
        lower.includes('vehicle') || lower.includes('car') || lower.includes('pedestrian')) {
      hazards.push(line.replace(/^[-*•]\s*/, '').trim());
    }
    
    // Look for action suggestions
    if (lower.includes('stop') || lower.includes('wait') || lower.includes('proceed') || 
        lower.includes('go') || lower.includes('safe') || lower.includes('caution')) {
      suggestedAction = line.replace(/^[-*•]\s*/, '').trim();
    }
    
    // Look for color warnings
    if (lower.includes('red') || lower.includes('green') || lower.includes('yellow') ||
        lower.includes('orange') || lower.includes('blue')) {
      colorWarnings.push(line.replace(/^[-*•]\s*/, '').trim());
    }
  }
  
  return {
    description,
    objects,
    hazards,
    trafficSignals,
    suggestedAction,
    colorWarnings,
  };
}

/**
 * Get a contextual greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning! Sierra here, ready to help you navigate.';
  if (hour < 17) return 'Good afternoon! Sierra at your service.';
  return 'Good evening! Sierra here to assist you.';
}

/**
 * Generate safety tips based on detected conditions
 */
export function getSafetyTip(
  conditions: {
    hasTrafficSignal?: boolean;
    hasVehicles?: boolean;
    hasPedestrians?: boolean;
    isLowLight?: boolean;
  }
): string {
  const tips: string[] = [];
  
  if (conditions.hasTrafficSignal) {
    tips.push('Always verify traffic signals before crossing.');
  }
  if (conditions.hasVehicles) {
    tips.push('Be aware of moving vehicles nearby.');
  }
  if (conditions.hasPedestrians) {
    tips.push('Watch for pedestrians in your path.');
  }
  if (conditions.isLowLight) {
    tips.push('Low light conditions - proceed carefully.');
  }
  
  return tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : '';
}
