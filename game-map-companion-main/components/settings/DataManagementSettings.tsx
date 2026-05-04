import React from 'react';
import { Download, Upload } from 'lucide-react';

interface DataManagementSettingsProps {
  handleExport: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DataManagementSettings({ handleExport, handleImport }: DataManagementSettingsProps) {
  return (
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
  );
}
