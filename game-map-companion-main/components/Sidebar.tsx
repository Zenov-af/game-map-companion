import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Map as MapIcon, Image as ImageIcon, MessageSquare, Plus, Trash2, Settings, Search } from 'lucide-react';

export default function Sidebar({ 
  onSelectMap, 
  onSelectChat, 
  selectedMapId, 
  isChatSelected,
  activeProfileId,
  onProfileChange,
  onOpenSettings
}: { 
  onSelectMap: (id: string) => void; 
  onSelectChat: () => void;
  selectedMapId: string | null;
  isChatSelected: boolean;
  activeProfileId: string;
  onProfileChange: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const profiles = useLiveQuery(() => db.profiles.toArray());
  const maps = useLiveQuery(() => db.maps.where('profileId').equals(activeProfileId).toArray(), [activeProfileId]);
  const customIcons = useLiveQuery(() => db.customIcons.where('profileId').equals(activeProfileId).toArray(), [activeProfileId]);
  const allMarkers = useLiveQuery(() => db.markers.where('profileId').equals(activeProfileId).toArray(), [activeProfileId]);
  
  const [searchQuery, setSearchQuery] = useState('');

  const mapsById = useMemo(() => {
    const map = new Map();
    maps?.forEach(m => map.set(m.id, m));
    return map;
  }, [maps]);

  const handleProfileAdd = async () => {
    const name = prompt('Enter new profile name (e.g., "Skyrim", "Cyberpunk"):');
    if (name) {
      const id = uuidv4();
      await db.profiles.add({ id, name });
      onProfileChange(id);
    }
  };

  const handleMapUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const newMap = {
          id: uuidv4(),
          profileId: activeProfileId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          image: event.target?.result as string,
          width: img.width,
          height: img.height,
        };
        await db.maps.add(newMap);
        onSelectMap(newMap.id);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        await db.customIcons.add({
          id: uuidv4(),
          profileId: activeProfileId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          image: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const deleteMap = async (id: string) => {
    await db.maps.delete(id);
    if (selectedMapId === id) {
      onSelectMap('');
    }
  };

  const deleteIcon = async (id: string) => {
    await db.customIcons.delete(id);
  };

  const searchResults = allMarkers?.filter(m => 
    searchQuery && (
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.notes.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="w-72 bg-neutral-900 text-white flex flex-col h-full border-r border-neutral-800 shrink-0">
      <div className="p-5 border-b border-neutral-800 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-3">
            <MapIcon className="w-6 h-6 text-blue-400" />
            Companion
          </h1>
          <button onClick={onOpenSettings} className="p-2 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            value={activeProfileId}
            onChange={(e) => onProfileChange(e.target.value)}
          >
            {profiles?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button 
            onClick={handleProfileAdd}
            className="p-2 bg-neutral-800 border border-neutral-700 rounded-md hover:bg-neutral-700 transition-colors"
            title="Add New Profile"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Search markers..." 
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md py-2 pl-9 pr-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-neutral-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8">
        {searchQuery && searchResults && searchResults.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Search Results</h2>
            <ul className="flex flex-col gap-2">
              {searchResults.map(marker => {
                const map = mapsById.get(marker.mapId);
                return (
                  <li key={marker.id} className="bg-neutral-800/50 border border-neutral-700 rounded-md p-2 text-sm cursor-pointer hover:bg-neutral-700 transition-colors" onClick={() => onSelectMap(marker.mapId)}>
                    <div className="font-semibold text-blue-300 truncate">{marker.title || 'Untitled Marker'}</div>
                    <div className="text-neutral-400 text-xs truncate">{map?.name || 'Unknown Map'}</div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Maps Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Maps</h2>
            <label className="cursor-pointer text-blue-400 hover:text-blue-300 transition-colors p-1 rounded hover:bg-neutral-800">
              <Plus className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleMapUpload} />
            </label>
          </div>
          <ul className="flex flex-col gap-1.5">
            {maps?.map(map => (
              <li key={map.id} className="flex items-center justify-between group">
                <button
                  className={`flex-1 text-left px-3 py-2 rounded-md text-sm font-medium transition-colors truncate ${
                    selectedMapId === map.id && !isChatSelected ? 'bg-blue-600 text-white' : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                  onClick={() => onSelectMap(map.id)}
                  title={map.name}
                >
                  {map.name}
                </button>
                <button 
                  className="p-2 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteMap(map.id)}
                  title="Delete Map"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
            {maps?.length === 0 && (
              <div className="text-sm text-neutral-500 italic px-3 py-4 bg-neutral-800/50 rounded-lg border border-neutral-800 border-dashed text-center">
                Upload an image to create your first map.
              </div>
            )}
          </ul>
        </section>

        {/* Custom Icons Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Custom Icons</h2>
            <label className="cursor-pointer text-blue-400 hover:text-blue-300 transition-colors p-1 rounded hover:bg-neutral-800" title="Upload multiple icons">
              <Plus className="w-4 h-4" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleIconUpload} />
            </label>
          </div>
          <ul className="flex flex-col gap-2">
            {customIcons?.map(icon => (
              <li key={icon.id} className="flex items-center justify-between bg-neutral-800/50 border border-neutral-800 px-3 py-2 rounded-md group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center shrink-0 p-1">
                    <img src={icon.image} alt={icon.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-sm text-neutral-300 truncate" title={icon.name}>{icon.name}</span>
                </div>
                <button 
                  className="p-1.5 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteIcon(icon.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
            {customIcons?.length === 0 && (
              <div className="text-sm text-neutral-500 italic px-3 py-4 bg-neutral-800/50 rounded-lg border border-neutral-800 border-dashed text-center">
                Upload images to use as custom markers. You can select multiple files at once.
              </div>
            )}
          </ul>
        </section>
      </div>

      <div className="p-5 border-t border-neutral-800">
        <button
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${
            isChatSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
          onClick={onSelectChat}
        >
          <MessageSquare className="w-5 h-5" />
          AI Assistant
        </button>
      </div>
    </div>
  );
}
