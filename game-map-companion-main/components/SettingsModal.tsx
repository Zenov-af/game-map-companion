import { useState, useEffect } from 'react';
import { db, Persona } from '@/lib/db';
import { X, Download, Upload, Save, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { LLMSettings } from './settings/LLMSettings';
import { PersonaSettings } from './settings/PersonaSettings';
import { DataManagementSettings } from './settings/DataManagementSettings';

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

  const [activeTab, setActiveTab] = useState<'llm' | 'personas' | 'data'>('llm');
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
        
                <div className="border-b border-gray-200 px-6 flex gap-6">
          <button
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'llm' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('llm')}
          >
            LLM Settings
          </button>
          <button
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'personas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('personas')}
          >
            Personas
          </button>
          <button
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('data')}
          >
            Data Management
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'llm' && (
            <LLMSettings
              aiProvider={aiProvider} setAiProvider={setAiProvider}
              geminiApiKey={geminiApiKey} setGeminiApiKey={setGeminiApiKey}
              localAiEndpoint={localAiEndpoint} setLocalAiEndpoint={setLocalAiEndpoint}
              localAiModel={localAiModel} setLocalAiModel={setLocalAiModel}
              temperature={temperature} setTemperature={setTemperature}
              maxTokens={maxTokens} setMaxTokens={setMaxTokens}
              includeMapContext={includeMapContext} setIncludeMapContext={setIncludeMapContext}
              includeMarkersContext={includeMarkersContext} setIncludeMarkersContext={setIncludeMarkersContext}
            />
          )}

          {activeTab === 'personas' && (
            <PersonaSettings
              systemPrompt={systemPrompt} setSystemPrompt={setSystemPrompt}
              personas={personas} addPersona={addPersona}
              updatePersona={updatePersona} deletePersona={deletePersona}
            />
          )}

          {activeTab === 'data' && (
            <DataManagementSettings handleExport={handleExport} handleImport={handleImport} />
          )}
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
