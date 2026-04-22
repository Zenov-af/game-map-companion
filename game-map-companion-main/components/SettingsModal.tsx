import { useState, useEffect } from 'react';
import { db, Persona } from '@/lib/db';
import { X, Download, Upload, Save, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function SettingsModal({ activeProfileId, onClose }: { activeProfileId: string, onClose: () => void }) {
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant for a game map companion app.');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [localAiEndpoint, setLocalAiEndpoint] = useState('http://localhost:1234/v1/chat/completions');
  const [localAiModel, setLocalAiModel] = useState('local-model');

  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [includeMapContext, setIncludeMapContext] = useState<boolean>(true);
  const [includeMarkersContext, setIncludeMarkersContext] = useState<boolean>(true);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | undefined>(undefined);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await db.settings.get(activeProfileId);
      if (settings) {
        setSystemPrompt(settings.systemPrompt || 'You are a helpful AI assistant for a game map companion app.');
        if (settings.aiProvider) setAiProvider(settings.aiProvider);
        if (settings.geminiApiKey) setGeminiApiKey(settings.geminiApiKey);
        if (settings.localAiEndpoint) setLocalAiEndpoint(settings.localAiEndpoint);
        if (settings.localAiModel) setLocalAiModel(settings.localAiModel);

        if (settings.temperature !== undefined) setTemperature(settings.temperature);
        if (settings.maxTokens !== undefined) setMaxTokens(settings.maxTokens);
        if (settings.includeMapContext !== undefined) setIncludeMapContext(settings.includeMapContext);
        if (settings.includeMarkersContext !== undefined) setIncludeMarkersContext(settings.includeMarkersContext);
        if (settings.personas) setPersonas(settings.personas);
        if (settings.activePersonaId) setActivePersonaId(settings.activePersonaId);
      }
    };
    loadSettings();
  }, [activeProfileId]);

  const handleSave = async () => {
    setIsSaving(true);
    await db.settings.put({
      id: activeProfileId,
      profileId: activeProfileId,
      systemPrompt,
      aiProvider,
      geminiApiKey,
      localAiEndpoint,
      localAiModel,
      temperature,
      maxTokens,
      includeMapContext,
      includeMarkersContext,
      personas,
      activePersonaId
    });
    setIsSaving(false);
    onClose();
  };

  const addPersona = () => {
    setPersonas([...personas, { id: uuidv4(), name: 'New Persona', prompt: 'You are a helpful assistant.' }]);
  };

  const updatePersona = (id: string, updates: Partial<Persona>) => {
    setPersonas(personas.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePersona = (id: string) => {
    setPersonas(personas.filter(p => p.id !== id));
  };

  const handleExport = async () => {
    const data = {
      profiles: await db.profiles.toArray(),
      maps: await db.maps.toArray(),
      markers: await db.markers.toArray(),
      drawings: await db.drawings.toArray(),
      customIcons: await db.customIcons.toArray(),
      chatMessages: await db.chatMessages.toArray(),
      settings: await db.settings.toArray(),
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-companion-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        await db.transaction('rw', [db.profiles, db.maps, db.markers, db.drawings, db.customIcons, db.chatMessages, db.settings], async () => {
          if (data.profiles) await db.profiles.bulkPut(data.profiles);
          if (data.maps) await db.maps.bulkPut(data.maps);
          if (data.markers) await db.markers.bulkPut(data.markers);
          if (data.drawings) await db.drawings.bulkPut(data.drawings);
          if (data.customIcons) await db.customIcons.bulkPut(data.customIcons);
          if (data.chatMessages) await db.chatMessages.bulkPut(data.chatMessages);
          if (data.settings) await db.settings.bulkPut(data.settings);
        });
        alert('Import successful! Please refresh the page.');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to import data. Invalid format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-800">Settings</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8">
          {/* AI Configuration Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">AI Configuration</h3>
            <p className="text-sm text-gray-500 mb-4">
              Choose your AI provider and configure the necessary endpoints or keys.
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="local">Local AI (Ollama / LM Studio)</option>
                </select>
              </div>

              {aiProvider === 'gemini' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key (Optional)</label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Leave empty to use the built-in key if available"
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide your own API key to bypass limits, or if the server key is not configured.
                  </p>
                </div>
              )}

              {aiProvider === 'local' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Local AI Endpoint</label>
                    <input
                      type="url"
                      value={localAiEndpoint}
                      onChange={(e) => setLocalAiEndpoint(e.target.value)}
                      placeholder="http://localhost:1234/v1/chat/completions"
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must be an OpenAI-compatible API endpoint. Make sure CORS is enabled on your local server.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Local Model Name</label>
                    <input
                      type="text"
                      value={localAiModel}
                      onChange={(e) => setLocalAiModel(e.target.value)}
                      placeholder="e.g. llama3, local-model"
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-sm text-yellow-800">
                    <strong>Note:</strong> Some local AI models do not natively support image inputs (Vision).
                    If you intend to use images in your chat, ensure your local model supports vision, or route
                    your requests through an interrupter AI/pipeline tool that can pre-process images before sending text to the LLM.
                    We send images using the standard OpenAI Vision format.
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* AI Advanced Generation Parameters */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Advanced Parameters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temperature: {temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Controls randomness. Lower is more deterministic.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens: {maxTokens}</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum length of AI response.</p>
              </div>
            </div>
          </section>

          {/* Context Control Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Context Control</h3>
            <p className="text-sm text-gray-500 mb-4">
              Limit what information is sent to the AI to save tokens or improve performance with local models.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeMapContext} onChange={(e) => setIncludeMapContext(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Include Current Map Name & Layout Context</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeMarkersContext} onChange={(e) => setIncludeMarkersContext(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Include All Placed Markers & Notes</span>
              </label>
            </div>
          </section>

          {/* AI Personas Section */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800">Personas (Gems)</h3>
              <button onClick={addPersona} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                <Plus size={16} /> Add Persona
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Create specific personas or rulesets you can quickly switch between during chat.
            </p>

            <div className="flex flex-col gap-4">
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium text-gray-700 mb-2">Default Base Prompt</h4>
                <textarea
                  className="w-full h-24 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Base instructions applied to all conversations."
                />
              </div>

              {personas.map((persona) => (
                <div key={persona.id} className="border border-gray-200 rounded-lg p-4 bg-white relative">
                  <button onClick={() => deletePersona(persona.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                  <div className="mb-2 w-3/4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={persona.name}
                      onChange={(e) => updatePersona(persona.id, { name: e.target.value })}
                      className="w-full border border-gray-200 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">System Instructions</label>
                    <textarea
                      className="w-full h-20 border border-gray-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      value={persona.prompt}
                      onChange={(e) => updatePersona(persona.id, { prompt: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Data Management Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Data Management</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export your data to back it up, or import a previous backup. This includes all profiles, maps, markers, and chat history.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
              >
                <Download size={16} />
                Export Data (JSON)
              </button>
              
              <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm cursor-pointer">
                <Upload size={16} />
                Import Data
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
