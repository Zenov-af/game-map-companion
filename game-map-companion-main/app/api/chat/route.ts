import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { context, history, userParts, temperature, maxTokens } = body;

    // Validation
    if (typeof context !== 'string' || context.trim().length === 0 || context.length > 10000) {
      return NextResponse.json({ error: 'Invalid context: must be a non-empty string under 10,000 characters.' }, { status: 400 });
    }

    if (!Array.isArray(history) || history.length > 50) {
      return NextResponse.json({ error: 'Invalid history: must be an array with up to 50 items.' }, { status: 400 });
    }

    for (const msg of history) {
      if (!msg || typeof msg !== 'object' || !['user', 'model'].includes(msg.role) || !Array.isArray(msg.parts)) {
        return NextResponse.json({ error: 'Invalid history item: each item must have a valid role and parts array.' }, { status: 400 });
      }
    }

    if (!Array.isArray(userParts) || userParts.length === 0 || userParts.length > 10) {
      return NextResponse.json({ error: 'Invalid userParts: must be a non-empty array with up to 10 items.' }, { status: 400 });
    }

    if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
      return NextResponse.json({ error: 'Invalid temperature: must be a number between 0 and 2.' }, { status: 400 });
    }

    if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens <= 0 || maxTokens > 4096)) {
      return NextResponse.json({ error: 'Invalid maxTokens: must be a positive number up to 4096.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables.');
      return NextResponse.json({ error: 'Gemini API key not configured on the server.' }, { status: 500 });
    }

    const contents = [
      { role: 'user', parts: [{ text: context }] },
      { role: 'model', parts: [{ text: 'Understood. I will use this context to help the user.' }] },
      ...history,
      { role: 'user', parts: userParts }
    ];

    const ai = new GoogleGenAI({ apiKey });
    const config: any = {};
    if (temperature !== undefined) config.temperature = temperature;
    if (maxTokens !== undefined) config.maxOutputTokens = maxTokens;

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents,
      config: Object.keys(config).length > 0 ? config : undefined
    });

    const text = result.text;

    return NextResponse.json({ text });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Chat API error:', error.message);
    } else {
      console.error('Chat API error:', error);
    }
    return NextResponse.json(
      { error: 'Failed to generate response from AI.' },
      { status: 500 }
    );
  }
}