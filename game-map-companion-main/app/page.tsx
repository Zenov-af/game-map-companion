'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import ChatComponent from '@/components/ChatComponent';
import SettingsModal from '@/components/SettingsModal';
import { db } from '@/lib/db';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-neutral-500">Loading map...</div>
});

export default function Home() {
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [isChatSelected, setIsChatSelected] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsMounted(true);
      const savedProfile = localStorage.getItem('activeProfileId');
      if (savedProfile) {
        setActiveProfileId(savedProfile);
      } else {
        // Ensure default profile exists
        db.profiles.get('default').then(p => {
          if (!p) {
            db.profiles.add({ id: 'default', name: 'Default Profile' });
          }
        });
      }
    }, 0);
  }, []);

  const handleProfileChange = (id: string) => {
    setActiveProfileId(id);
    localStorage.setItem('activeProfileId', id);
    setSelectedMapId(null);
    setIsChatSelected(false);
  };

  const handleSelectMap = (id: string) => {
    setSelectedMapId(id);
    setIsChatSelected(false);
  };

  const handleSelectChat = () => {
    setIsChatSelected(true);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-neutral-100 overflow-hidden font-sans">
      <Sidebar 
        onSelectMap={handleSelectMap} 
        onSelectChat={handleSelectChat}
        selectedMapId={selectedMapId}
        isChatSelected={isChatSelected}
        activeProfileId={activeProfileId}
        onProfileChange={handleProfileChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="flex-1 relative bg-white">
        {isChatSelected ? (
          <ChatComponent currentMapId={selectedMapId} activeProfileId={activeProfileId} />
        ) : selectedMapId ? (
          <MapComponent mapId={selectedMapId} onSelectMap={handleSelectMap} activeProfileId={activeProfileId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4 p-8 text-center">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
              <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-neutral-800 tracking-tight">Welcome to Map Companion</h2>
            <p className="max-w-md text-neutral-500 leading-relaxed">
              Upload a map image from the sidebar to get started. You can add custom markers, keep notes, and chat with an AI assistant about your progress.
            </p>
          </div>
        )}
      </main>
      {isSettingsOpen && (
        <SettingsModal 
          activeProfileId={activeProfileId} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}
    </div>
  );
}
