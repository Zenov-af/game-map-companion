import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { context, history, userParts, temperature, maxTokens } = await req.json();

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
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response from AI.' },
      { status: 500 }
    );
  }
}