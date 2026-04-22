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

## Setup & Installation

Follow these steps to run the application locally on your machine.

1. **Prerequisites:** Ensure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).
2. **Clone/Download:** Download the project files and open a terminal in the root directory.
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
5. **Open the App:** Navigate to `http://localhost:3000` in your web browser.

---

## Testing the Advanced AI Features

This application has been upgraded with massive customizability, specifically targeted at power-users who want to use Local AI (like Ollama or LM Studio) and advanced features. Here is how to test them:

### 1. Memory Palace
* **What it is:** A global state that the AI always remembers, no matter what map you are currently viewing.
* **How to test:**
  1. Open the **Settings** (gear icon in the bottom left).
  2. Scroll down to **Memory Palace**.
  3. Add a fact, e.g., "My character is a level 15 stealth archer named Elara".
  4. Open the Chat and ask "Who is my character?". The AI will know the answer based on the Memory Palace.

### 2. Personas (Gems)
* **What it is:** The ability to create specific AI personalities (like Gemini Gems) and hot-swap them during a conversation.
* **How to test:**
  1. Open **Settings**. Scroll to the **Personas** section.
  2. Notice the default **Project ARI** persona is already there. You can add more if you wish.
  3. Open the Chat. Look at the dropdown menu right below the "AI Assistant" header.
  4. Switch the dropdown from "Default Persona" to "Project ARI". Ask it a question, and observe its tactical, slightly sarcastic response style.

### 3. Voice Integration (STT & TTS)
* **What it is:** Native browser-based Speech-To-Text (dictation) and Text-To-Speech (reading responses aloud).
* **How to test:**
  1. **Dictation:** Click the **Microphone** icon next to the chat input box. Allow browser microphone permissions if asked. Speak into your mic, and the text will appear in the box.
  2. **Auto-Read:** Click the **Speaker** icon at the top of the chat panel to turn it blue (ON). Send a message. When the AI responds, your browser will read the response aloud to you.

### 4. Local AI Integration
* **What it is:** Run your own AI models entirely locally (100% privacy, no API costs) via tools like LM Studio or Ollama.
* **How to test (with LM Studio):**
  1. Download and install [LM Studio](https://lmstudio.ai/).
  2. Download a model (e.g., `llama-3.2-3b-instruct` or a vision model like `llava`).
  3. Go to the "Local Server" tab in LM Studio. Ensure **CORS is enabled** in the settings on the right panel, and click **Start Server**. Note the port (usually `1234`).
  4. In the Game Map Companion app, open **Settings**.
  5. Change the **AI Provider** dropdown to **Local AI**.
  6. Set the **Local AI Endpoint** to match your LM Studio server (e.g., `http://localhost:1234/v1/chat/completions`).
  7. Set the **Local Model Name** to match the model you loaded in LM Studio.
  8. **Optional - Vision Warning:** If you upload an image to the chat while using Local AI, the app will format it using the standard OpenAI Vision API format. Ensure the model you are running actually supports vision (like LLaVA), or you may receive errors from LM Studio.

### 5. Advanced Context Controls
* **What it is:** For local models, token limits can be restrictive. You can now toggle exactly what data is sent to the AI.
* **How to test:**
  1. Open **Settings**. Look for **Context Control** and **Advanced Parameters**.
  2. You can uncheck "Include Map Context" or "Include Markers" to save tokens if your local model is struggling.
  3. You can also adjust the **Temperature** (creativity) and **Max Tokens** sliders to change how the AI generates text.

