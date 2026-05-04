import React from 'react';

interface LLMSettingsProps {
  aiProvider: string;
  setAiProvider: (provider: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  localAiEndpoint: string;
  setLocalAiEndpoint: (endpoint: string) => void;
  localAiModel: string;
  setLocalAiModel: (model: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  maxTokens: number;
  setMaxTokens: (tokens: number) => void;
  includeMapContext: boolean;
  setIncludeMapContext: (include: boolean) => void;
  includeMarkersContext: boolean;
  setIncludeMarkersContext: (include: boolean) => void;
}

export function LLMSettings({
  aiProvider,
  setAiProvider,
  geminiApiKey,
  setGeminiApiKey,
  localAiEndpoint,
  setLocalAiEndpoint,
  localAiModel,
  setLocalAiModel,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  includeMapContext,
  setIncludeMapContext,
  includeMarkersContext,
  setIncludeMarkersContext,
}: LLMSettingsProps) {
  return (
    <div className="flex flex-col gap-8">
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
              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="local">Local AI (LM Studio, Ollama, etc.)</option>
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
    </div>
  );
}
