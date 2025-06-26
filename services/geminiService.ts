
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { LinkedInProfile } from '../types';
import { GEMINI_MODEL_NAME, GEMINI_PROFILE_ANALYSIS_PROMPT_TEMPLATE } from '../constants';

// IMPORTANT: This service assumes `process.env.API_KEY` is set in the environment.
// In a typical frontend setup, this would be handled via build-time replacement
// (e.g., Vite's `import.meta.env.VITE_API_KEY` or CRA's `process.env.REACT_APP_API_KEY`).
// For this exercise, we follow the strict instruction to use `process.env.API_KEY` directly.
let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.error("Gemini API Key (process.env.API_KEY) is not configured.");
      throw new Error("Gemini API Key is not configured. Please set the API_KEY environment variable.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const analyzeProfileWithGemini = async (profile: LinkedInProfile): Promise<string> => {
  const client = getAiClient();
  
  let prompt = GEMINI_PROFILE_ANALYSIS_PROMPT_TEMPLATE
    .replace('{name}', profile.name)
    .replace('{title}', profile.title)
    .replace('{bio}', profile.bio || 'Not provided');

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        // Omitting thinkingConfig to default to enabled thinking for higher quality
        temperature: 0.7, // Moderately creative but still factual
        topP: 0.9,
        topK: 40,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Received an empty response from Gemini API.");
    }
    return text.trim();

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while communicating with Gemini API.');
  }
};
    