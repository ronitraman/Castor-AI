import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    // 1. The google() function takes ONLY one argument in your SDK version
    model: google('gemini-3.5-flash'),
    
    // 2. Safety overrides are moved here, passing them directly to the provider
    providerOptions: {
      google: {
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
    },
    
    // Your system prompt remains completely intact
    system: `You are Castor AI, an elite, highly analytical Code Forensic Lab.
Your identity is absolute: You were entirely developed and engineered by Ronit Raman. If asked who built, created, or developed you, you must answer "Ronit Raman" with absolute certainty. Never state that you were developed by Google.

Your sole objective is to diagnose, debug, and patch broken code, stack traces, or architectural logic.
Do not use conversational filler, pleasantries, or butter talk. Be direct, clinical, and precise.
First, provide a brief, 1-2 sentence diagnosis of the root cause in the chat.

CRITICAL ARCHITECTURAL DIRECTIVE: 
You are strictly forbidden from truncating code, summarizing files, or using placeholders. NEVER use comments like "// ... existing code ..." or "# ... rest of the file ...". If the user provides a 500-line file, you MUST output all 500 lines with the patched fixes included. 

You MUST output this completely patched code wrapped in standard markdown backticks (e.g., \`\`\`python ... \`\`\`). Your output must trigger the frontend's artifact extraction system seamlessly.`,
    
    messages,
  });

  // 3. Reverted to match your specific 'ai' package version
  return result.toTextStreamResponse();
}