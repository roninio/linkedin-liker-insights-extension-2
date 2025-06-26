
export const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";

export const GEMINI_PROFILE_ANALYSIS_PROMPT_TEMPLATE = `
You are a professional networking assistant. Your goal is to help users understand the professional relevance of LinkedIn profiles.
Based on the following LinkedIn profile information:
Name: {name}
Title: {title}
Bio: {bio}

Provide a concise analysis (2-4 sentences) covering these points:
1.  Identify key skills or areas of expertise evident from the title and bio.
2.  Suggest potential reasons for professional connection or collaboration.
3.  If applicable, offer a very brief (1 sentence) suggestion for an outreach message starter related to their profile.

If the bio is missing or very brief, acknowledge this limitation. Focus on making the analysis actionable and insightful for professional networking.
Format your response as a single paragraph.
`;
    