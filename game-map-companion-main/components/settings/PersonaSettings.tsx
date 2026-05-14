import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Persona } from '@/lib/db';

interface PersonaSettingsProps {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  personas: Persona[];
  addPersona: () => void;
  updatePersona: (id: string, updates: Partial<Persona>) => void;
  deletePersona: (id: string) => void;
}

export function PersonaSettings({
  systemPrompt,
  setSystemPrompt,
  personas,
  addPersona,
  updatePersona,
  deletePersona
}: PersonaSettingsProps) {
  return (
    <section>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Personas (Gems)</h3>
        <button onClick={addPersona} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium" data-testid="add-persona-button">
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
            data-testid="system-prompt-textarea"
          />
        </div>

        {personas.map((persona) => (
          <div key={persona.id} className="border border-gray-200 rounded-lg p-4 bg-white relative" data-testid={`persona-item-${persona.id}`}>
            <button onClick={() => deletePersona(persona.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500" data-testid={`delete-persona-${persona.id}`}>
              <Trash2 size={16} />
            </button>
            <div className="mb-2 w-3/4">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={persona.name}
                onChange={(e) => updatePersona(persona.id, { name: e.target.value })}
                className="w-full border border-gray-200 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                data-testid={`persona-name-${persona.id}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">System Instructions</label>
              <textarea
                className="w-full h-20 border border-gray-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={persona.prompt}
                onChange={(e) => updatePersona(persona.id, { prompt: e.target.value })}
                data-testid={`persona-prompt-${persona.id}`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
