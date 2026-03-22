import Dexie, { Table } from 'dexie';

export interface Profile {
  id: string;
  name: string;
}

export interface GameMap {
  id: string;
  profileId: string;
  name: string;
  image: string; // Data URL
  width: number;
  height: number;
  parentId?: string; // If it's a sub-map
}

export interface CustomIcon {
  id: string;
  profileId: string;
  name: string;
  image: string; // Data URL
}

export interface Marker {
  id: string;
  profileId: string;
  mapId: string;
  lat: number;
  lng: number;
  iconId: string; // references CustomIcon or built-in
  title: string;
  notes: string;
  linkedMapId?: string; // ID of another map to open when clicked
  category?: string;
}

export interface Drawing {
  id: string;
  profileId: string;
  mapId: string;
  type: 'line' | 'polygon';
  points: [number, number][];
  color: string;
  title: string;
  notes: string;
  category?: string;
}

export interface ChatMessage {
  id: string;
  profileId: string;
  role: 'user' | 'model';
  text: string;
  imageData?: string; // base64 image data
  timestamp: number;
}

export interface AppSettings {
  id: string; // 'default'
  profileId: string;
  systemPrompt: string;
}

export class CompanionDB extends Dexie {
  profiles!: Table<Profile>;
  maps!: Table<GameMap>;
  customIcons!: Table<CustomIcon>;
  markers!: Table<Marker>;
  drawings!: Table<Drawing>;
  chatMessages!: Table<ChatMessage>;
  settings!: Table<AppSettings>;

  constructor() {
    super('CompanionDB');
    this.version(1).stores({
      maps: 'id, name, parentId',
      customIcons: 'id, name',
      markers: 'id, mapId, iconId',
      chatMessages: 'id, timestamp'
    });
    this.version(2).stores({
      profiles: 'id, name',
      maps: 'id, profileId, name, parentId',
      customIcons: 'id, profileId, name',
      markers: 'id, profileId, mapId, iconId, category',
      drawings: 'id, profileId, mapId, category',
      chatMessages: 'id, profileId, timestamp',
      settings: 'id, profileId'
    }).upgrade(tx => {
      tx.table('profiles').add({ id: 'default', name: 'Default Profile' });
      tx.table('maps').toCollection().modify(map => { map.profileId = 'default'; });
      tx.table('customIcons').toCollection().modify(icon => { icon.profileId = 'default'; });
      tx.table('markers').toCollection().modify(marker => { marker.profileId = 'default'; marker.category = 'General'; });
      tx.table('chatMessages').toCollection().modify(msg => { msg.profileId = 'default'; });
    });
  }
}

export const db = new CompanionDB();
