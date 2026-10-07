import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = 3000;

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

/**
 * Robust helper to generate text with fallback models
 */
async function generateContentWithFallback(
  contents: any,
  systemInstruction: string,
  configOverride: any = {}
): Promise<string> {
  if (!ai) {
    throw new Error('Google Gemini API Key is not configured in environment.');
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const config: any = {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        ...configOverride,
      };

      // Turn off deep thinking for Gemini 3 models to achieve near-instant latency
      if (model.startsWith('gemini-3')) {
        config.thinkingConfig = { thinkingLevel: 'MINIMAL' };
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (error: any) {
      console.warn(`Model ${model} failed:`, error.message || error);
      lastError = error;
    }
  }

  throw new Error(`All fallback models exhausted. Last error: ${lastError?.message || lastError}`);
}

/**
 * Handle custom Open-Weight inference endpoints (Ollama, Together, Groq, custom APIs)
 */
async function queryCustomOpenWeightModel(
  customConfig: {
    provider: string;
    endpoint?: string;
    apiKey?: string;
    model?: string;
  },
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const provider = customConfig.provider;
  let url = customConfig.endpoint || '';
  let model = customConfig.model || 'gemma2';
  let authHeader = '';

  if (provider === 'ollama') {
    url = url || 'http://localhost:11434/v1/chat/completions';
  } else if (provider === 'groq') {
    url = url || 'https://api.groq.com/openai/v1/chat/completions';
    authHeader = `Bearer ${customConfig.apiKey || ''}`;
    model = customConfig.model || 'gemma2-9b-it';
  } else if (provider === 'together') {
    url = url || 'https://api.together.xyz/v1/chat/completions';
    authHeader = `Bearer ${customConfig.apiKey || ''}`;
    model = customConfig.model || 'google/gemma-2-9b-it';
  }

  if (!url) {
    throw new Error(`Endpoint not specified for custom provider: ${provider}`);
  }

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Custom open-weight endpoint error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || 'Empty response from open-weight model.';
}

const app = express();
app.use(express.json({ limit: '15mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', hasGeminiKey: !!apiKey });
});

// 1. Mission Generator Route
app.post('/api/gemma/mission', async (req: Request, res: Response) => {
  try {
    const { activity, availableTime, difficulty, environment, goal, customConfig } = req.body;
    
    const systemPrompt = `You are Gemma 2 9B IT, Google's advanced, privacy-first, open-weight AI model.
You are Gemma TrailMate, a voice-first outdoor AI companion. Your core guiding principle is: "The screen should be the shortest part of the experience."
Your task is to generate a short, personalized outdoor mission based on the user's choices.
Return a clean JSON object containing:
- title: A short title for the mission (e.g. "Silent Canopy Walk", "Garden Shape Hunt").
- description: A short, active, engaging instruction (under 60 words). Keep it simple, actionable, and encouraging so the user can lock their phone and go outside. Include safe recommendations (stay on paths, be mindful of surroundings).
- checklist: An array of 3 quick tasks they should check off while completing the mission.
- reminder: A supportive signoff encouraging them to put the phone away.

Ensure the output is valid JSON strictly fitting this format:
{
  "title": "...",
  "description": "...",
  "checklist": ["task 1", "task 2", "task 3"],
  "reminder": "..."
}`;

    const userPrompt = `Generate an outdoor mission for:
- Activity Type: ${activity || 'Walking'}
- Duration: ${availableTime || 20} minutes
- Difficulty: ${difficulty || 'Easy'}
- Environment: ${environment || 'Any'}
- Goal: ${goal || 'Relax'}`;

    let resultText = '';

    if (customConfig && customConfig.provider !== 'gemini') {
      resultText = await queryCustomOpenWeightModel(customConfig, systemPrompt, userPrompt);
    } else {
      resultText = await generateContentWithFallback(
        userPrompt,
        systemPrompt,
        { responseMimeType: 'application/json' }
      );
    }

    // Try to parse JSON output safely
    try {
      const parsed = JSON.parse(resultText);
      res.json(parsed);
    } catch (jsonErr) {
      // Fallback parse if markdown block wraps JSON
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json(parsed);
        } catch (_) {}
      }
      // Ultimate hardcoded fallback if model produced non-JSON
      res.json({
        title: `${activity || 'Nature'} Quest`,
        description: `Enjoy a peaceful ${availableTime || 20}-minute ${activity || 'walk'} in the ${environment || 'outdoors'}. Keep your eyes open for local plant life and feel the fresh air.`,
        checklist: [
          "Find 3 unique leaves or natural textures",
          "Stand still for 60 seconds listening to sounds",
          "Take a deep breath and enjoy the fresh environment"
        ],
        reminder: "Lock your phone, slip it in your pocket, and let's go!"
      });
    }
  } catch (error: any) {
    console.error('Mission API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 2. Voice-First Nature Guide Route
app.post('/api/gemma/guide', async (req: Request, res: Response) => {
  try {
    const { question, customConfig } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const systemPrompt = `You are Gemma 2 9B IT, Google's advanced, privacy-first, open-weight AI model acting as Gemma TrailMate.
You are a voice-first assistant. Keep answers highly concise, educational, and direct. Keep your answer under 75 words.
If the question is not about nature, plants, wildlife, trails, weather, or outdoor exploration, gently guide the user back to nature.
Include safety notices when appropriate (e.g., do not approach wild animals, do not eat wild mushrooms or plants).
Always speak in an encouraging, nature-loving tone. Add a footnote that you are powered by Gemma open-weight AI.`;

    const userPrompt = `Nature Question: "${question}"`;
    let answerText = '';

    if (customConfig && customConfig.provider !== 'gemini') {
      answerText = await queryCustomOpenWeightModel(customConfig, systemPrompt, userPrompt);
    } else {
      answerText = await generateContentWithFallback(userPrompt, systemPrompt);
    }

    res.json({ answer: answerText });
  } catch (error: any) {
    console.error('Guide API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 3. Photo Observation Route
app.post('/api/gemma/observe', async (req: Request, res: Response) => {
  try {
    const { image, description, customConfig } = req.body;
    // image is expected to be a base64 data URL or raw base64 string

    const systemPrompt = `You are Gemma 2 9B IT, Google's open-weight AI model.
Analyze this natural observation. Since nature is complex, never present identification with absolute certainty.
Return a valid JSON object with the following fields:
- noticed: What specific features, colors, and textures you notice in the plant/leaf/animal/object.
- observe: 2-3 specific things the user can look closer to inspect (e.g. leaf vein pattern, petal count, bark texture).
- interestingFact: A fascinating nature educational nugget about this category of object.
- confidenceText: A friendly statement specifying confidence, e.g., "Possible match: English Oak Leaf (Quercus robur). Always verify unknown species safely and never touch or eat unidentified flora."

Ensure the output is valid JSON strictly fitting this format:
{
  "noticed": "...",
  "observe": "...",
  "interestingFact": "...",
  "confidenceText": "..."
}`;

    const textPrompt = `Observe natural specimen. Description: "${description || 'A wild plant, leaf, or natural object.'}"`;

    let resultText = '';

    if (image && (!customConfig || customConfig.provider === 'gemini')) {
      // Vision query using Gemini as Gemma-adaptor
      if (!ai) {
        throw new Error('Google Gemini API Key is not configured in environment.');
      }
      
      const rawBase64 = image.includes('base64,') ? image.split('base64,')[1] : image;
      const mimeType = image.includes('image/jpeg') ? 'image/jpeg' : 
                       image.includes('image/webp') ? 'image/webp' : 'image/png';

      const imagePart = {
        inlineData: {
          mimeType,
          data: rawBase64
        }
      };

      const textPart = {
        text: textPrompt + ` Verify visual traits from the attached image.`
      };

      // Query the primary model in fallback for vision
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: [imagePart, textPart] },
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.4,
            thinkingConfig: { thinkingLevel: 'MINIMAL' },
            responseMimeType: 'application/json'
          }
        });
        resultText = response.text || '';
      } catch (err) {
        // Fallback to text analysis if vision model has a glitch
        resultText = await generateContentWithFallback(textPrompt, systemPrompt, { responseMimeType: 'application/json' });
      }
    } else {
      // Fallback to text-only generation (or custom endpoint without vision support)
      if (customConfig && customConfig.provider !== 'gemini') {
        resultText = await queryCustomOpenWeightModel(customConfig, systemPrompt, textPrompt);
      } else {
        resultText = await generateContentWithFallback(textPrompt, systemPrompt, { responseMimeType: 'application/json' });
      }
    }

    try {
      const parsed = JSON.parse(resultText);
      res.json(parsed);
    } catch (err) {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return res.json(JSON.parse(jsonMatch[0]));
        } catch (_) {}
      }
      res.json({
        noticed: "The general shapes and organic patterns of nature.",
        observe: "Look at the edge shapes, the vein branching, or the colors to see fine details.",
        interestingFact: "Many plants adapt their structure based on sunlight and wind patterns.",
        confidenceText: "Observation recorded. Let's research local plant guides for a verified match!"
      });
    }

  } catch (error: any) {
    console.error('Observe API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// 4. Reflection Route
app.post('/api/gemma/reflection', async (req: Request, res: Response) => {
  try {
    const { reflection, mood, customConfig } = req.body;
    if (!reflection) {
      return res.status(400).json({ error: 'Reflection text is required' });
    }

    const systemPrompt = `You are Gemma 2 9B IT, Google's advanced, privacy-first open-weight AI model acting as Gemma TrailMate.
Transform the user's quick, raw speech or text reflection about their outdoor time into a beautiful, poetical, yet concise nature journal entry (approx 35-50 words).
Keep it focused on the landscape, peace, sensations, and their mood ("${mood || 'Great'}").
Avoid screen-oriented language. Emphasize physical details like the wind, leaves, sky, or bird sounds.`;

    const userPrompt = `User Reflection: "${reflection}"`;
    let journalText = '';

    if (customConfig && customConfig.provider !== 'gemini') {
      journalText = await queryCustomOpenWeightModel(customConfig, systemPrompt, userPrompt);
    } else {
      journalText = await generateContentWithFallback(userPrompt, systemPrompt);
    }

    res.json({ entry: journalText });
  } catch (error: any) {
    console.error('Reflection API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Vite Integration Middleware / Static Delivery
const isProd = process.env.NODE_ENV === 'production';

if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
    appType: 'custom'
  });
  app.use(vite.middlewares);
  app.use('*', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.originalUrl;
      let template = fs.readFileSync(path.resolve('.', 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  // Production static files build
  app.use(express.static(path.resolve('.', 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve('.', 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gemma TrailMate server running on http://0.0.0.0:${PORT}`);
});
