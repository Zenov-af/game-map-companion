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

export interface Persona {
  id: string;
  name: string;
  prompt: string;
}

export interface AppSettings {
  id: string; // 'default'
  profileId: string;
  systemPrompt: string;
  aiProvider?: string; // 'gemini' | 'local'
  geminiApiKey?: string;
  localAiEndpoint?: string;
  localAiModel?: string;

  // Advanced parameters
  temperature?: number;
  maxTokens?: number;

  // Context toggles
  includeMapContext?: boolean;
  includeMarkersContext?: boolean;

  // Personas (Gems)
  personas?: Persona[];
  activePersonaId?: string;
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
    this.version(3).stores({
      memories: 'id, profileId, timestamp'
    });
    this.version(4).stores({}).upgrade(async tx => {
      // Seed default Project ARI persona into the default profile settings if it exists
      const defaultSettings = await tx.table('settings').get('default');
      const ariPersona = {
        id: 'ari-default',
        name: 'Project ARI',
        prompt: 'You are Project ARI (Artificial Reality Interface), an advanced, highly capable, and slightly sarcastic AI companion. You have deep knowledge of game systems, lore, and mechanics. You address the user as "Operator" and treat the game map as a live tactical feed. You analyze markers and drawings to provide tactical advice, lore breakdowns, and optimization strategies, while keeping your responses concise and occasionally throwing in a dry quip about the Operator\'s choices.'
      };

      if (defaultSettings) {
        if (!defaultSettings.personas) defaultSettings.personas = [];
        const hasAri = defaultSettings.personas.find((p: Persona) => p.id === 'ari-default');
        if (!hasAri) {
          defaultSettings.personas.push(ariPersona);
          await tx.table('settings').put(defaultSettings);
        }
      } else {
        await tx.table('settings').put({
          id: 'default',
          profileId: 'default',
          systemPrompt: 'You are a helpful AI assistant for a game map companion app.',
          personas: [ariPersona]
        });
      }
    });
  }
}

export const db = new CompanionDB();
