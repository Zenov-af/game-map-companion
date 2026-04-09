import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { context, history, userParts } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set in environment variables.');
      return NextResponse.json({ error: 'Gemini API key not configured on the server.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Using gemini-1.5-flash as it is a stable model.
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        { role: 'user', parts: [{ text: context }] },
        { role: 'model', parts: [{ text: 'Understood. I will use this context to help the user.' }] },
        ...history,
        { role: 'user', parts: userParts }
      ],
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate response from AI.' },
      { status: 500 }
    );
  }
}
