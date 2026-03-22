# Game Map Companion

A companion app for massive open-world games like Skyrim, Fallout, Cyberpunk, and more. Upload your own custom maps, place interactive markers, keep detailed notes, and chat with a context-aware AI assistant about your playthroughs.

## Features
- **Profiles**: Create separate profiles for different games or playthroughs to keep your maps and markers organized.
- **Custom Maps**: Upload any image to use as an interactive, zoomable map.
- **Custom Markers & Icons**: Upload your own icons to use as map markers. You can upload multiple icons at once!
- **Drawing Tools**: Draw lines and polygons on your maps to mark routes, territories, or areas of interest.
- **Categories & Filtering**: Categorize your markers and drawings, and filter them on the map.
- **Global Search**: Search across all your markers and maps within a profile.
- **Interactive Notes**: Click on markers to add titles, detailed notes, and link them to other maps (e.g., linking a city marker to a detailed interior map).
- **Context-Aware AI**: Chat with an AI that knows which map you are looking at and can read the notes on your placed markers.
- **Multi-modal AI Chat**: Upload images directly into the chat to ask the AI questions about screenshots or references.
- **AI Personas**: Customize the AI's system prompt per profile to give it a specific personality or set of rules.
- **Data Export/Import**: Backup your entire database (maps, markers, drawings, chat history) to a JSON file and restore it later.
- **Local Storage**: All data is saved locally in your browser using IndexedDB (Dexie.js).

---

## Guide: Uploading a Pack of Custom Icons

If you have a collection of custom icons (e.g., a zip file of PNGs for Skyrim locations), you can easily add them to your profile:

1. **Extract your icons**: If your icons are in a `.zip` or `.rar` file, extract them to a folder on your computer first. Ensure they are in a supported web image format (like `.png`, `.jpg`, `.svg`, or `.webp`).
2. **Open the Sidebar**: In the Game Map Companion app, look at the left sidebar.
3. **Find the "Custom Icons" section**: Scroll down to the "Custom Icons" area in the sidebar.
4. **Click "Upload Icon(s)"**: Click the upload button.
5. **Select Multiple Files**: In the file browser dialog that appears, navigate to the folder where you extracted your icons. You can select multiple files at once by:
   - Clicking and dragging a box around them.
   - Holding `Ctrl` (Windows) or `Cmd` (Mac) and clicking individual files.
   - Clicking the first file, holding `Shift`, and clicking the last file to select a range.
   - Pressing `Ctrl+A` (Windows) or `Cmd+A` (Mac) to select all files in the folder.
6. **Confirm Upload**: Click "Open". The app will process and add all the selected icons to your current profile. They will now be available when you place a new marker on any map within that profile!

---

## Guide: Integrating Local AI & Custom Instructions

If you want to modify this app to use a local AI (like Ollama or LM Studio) or add custom instructions (like Gemini Gems or ChatGPT Custom Instructions), follow these steps:

### 1. Integrating Local AI (Ollama / LM Studio)
Most local AI tools provide an OpenAI-compatible API endpoint. To use them, you would replace the Gemini SDK call in `components/ChatComponent.tsx` with a standard `fetch` call to your local server.

**Example modification in `ChatComponent.tsx`:**
```typescript
// Replace the GoogleGenAI block with this:
const response = await fetch('http://localhost:1234/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'local-model', // e.g., 'llama3'
    messages: [
      { role: 'system', content: context },
      ...history.map(m => ({ role: m.role, content: m.parts[0].text })),
      { role: 'user', content: userText }
    ]
  })
});

const data = await response.json();
const aiText = data.choices[0].message.content;
```
*Note: You may need to configure CORS in your local AI server settings to allow requests from the app.*

### 2. Adding Custom Instructions (Like "Gems")
To give the AI a specific persona (e.g., "Act like a Skyrim Guard" or "You are a Cyberpunk Netrunner"), you can use the `systemInstruction` configuration in the Gemini API.

*Note: This feature is now built into the app! You can set a custom System Prompt per profile in the Settings menu.*

**Example modification in `ChatComponent.tsx` (if doing it manually):**
```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-preview',
  contents: [
    { role: 'user', parts: [{ text: context }] },
    { role: 'model', parts: [{ text: 'Understood.' }] },
    ...history,
    { role: 'user', parts: [{ text: userText }] }
  ],
  config: {
    // Add your custom instructions here!
    systemInstruction: "You are a grumpy dwarf from a fantasy RPG. Always complain about elves, but provide helpful advice about the map and markers.",
  }
});
```

### 3. Adding "Memories" (Persistent Global Context)
To make the AI remember things across all maps (e.g., "My character is a stealth archer named Elara"), you can add a new table to the database for `userProfile` or `memories`.

1. Update `lib/db.ts` to include a `memories` table.
2. Create a UI in the Sidebar to let the user add facts about their playthrough.
3. In `ChatComponent.tsx`, fetch these memories and append them to the `context` string before sending the prompt to the AI.

```typescript
// Example context injection:
const memories = await db.memories.toArray();
let context = 'You are a helpful AI assistant...\n';
context += 'User Memories:\n' + memories.map(m => `- ${m.text}`).join('\n') + '\n';
```

