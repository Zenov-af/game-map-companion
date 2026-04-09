'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, ImageOverlay, Marker as LeafletMarker, Popup, useMapEvents, useMap, Polyline, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { PenTool, Hexagon, MapPin, Check, X } from 'lucide-react';

// Fix default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEvents({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function MapUpdater({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds);
  }, [bounds, map]);
  return null;
}

function MapInteractionManager({ interactionMode }: { interactionMode: string }) {
  const map = useMap();
  useEffect(() => {
    if (interactionMode !== 'none') {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
    }
  }, [interactionMode, map]);
  return null;
}

export default function MapComponent({ mapId, onSelectMap, activeProfileId }: { mapId: string, onSelectMap: (id: string) => void, activeProfileId: string }) {
  const mapData = useLiveQuery(() => db.maps.get(mapId), [mapId]);
  const markers = useLiveQuery(() => db.markers.where('mapId').equals(mapId).toArray(), [mapId]);
  const drawings = useLiveQuery(() => db.drawings.where('mapId').equals(mapId).toArray(), [mapId]);
  const customIcons = useLiveQuery(() => db.customIcons.where('profileId').equals(activeProfileId).toArray(), [activeProfileId]);
  const allMaps = useLiveQuery(() => db.maps.where('profileId').equals(activeProfileId).toArray(), [activeProfileId]);

  const [interactionMode, setInteractionMode] = useState<'none' | 'marker' | 'line' | 'polygon'>('none');
  const [selectedIconId, setSelectedIconId] = useState<string>('default');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);

  const categories = ['All', 'General', 'Quests', 'Loot', 'Enemies', 'Merchants', 'Locations'];

  // Memoize filtered lists to avoid redundant calculations on every re-render
  const filteredMarkers = useMemo(() =>
    markers?.filter(m => selectedCategory === 'All' || m.category === selectedCategory),
    [markers, selectedCategory]
  );

  const filteredDrawings = useMemo(() =>
    drawings?.filter(d => selectedCategory === 'All' || d.category === selectedCategory),
    [drawings, selectedCategory]
  );

  const bounds = useMemo(() => {
    if (!mapData) return null;
    return [[0, 0], [mapData.height, mapData.width]] as L.LatLngBoundsExpression;
  }, [mapData]);

  const handleMapClick = async (latlng: L.LatLng) => {
    if (interactionMode === 'none' || !mapData) return;
    
    if (interactionMode === 'marker') {
      await db.markers.add({
        id: uuidv4(),
        profileId: activeProfileId,
        mapId: mapData.id,
        lat: latlng.lat,
        lng: latlng.lng,
        iconId: selectedIconId,
        title: 'New Marker',
        notes: '',
        category: selectedCategory === 'All' ? 'General' : selectedCategory
      });
      setInteractionMode('none');
    } else if (interactionMode === 'line' || interactionMode === 'polygon') {
      setCurrentPoints(prev => [...prev, [latlng.lat, latlng.lng]]);
    }
  };

  const handleFinishDrawing = async () => {
    if (currentPoints.length < 2 || !mapData) return;
    
    await db.drawings.add({
      id: uuidv4(),
      profileId: activeProfileId,
      mapId: mapData.id,
      type: interactionMode as 'line' | 'polygon',
      points: currentPoints,
      color: '#3b82f6', // blue-500
      title: 'New Drawing',
      notes: '',
      category: selectedCategory === 'All' ? 'General' : selectedCategory
    });
    setCurrentPoints([]);
    setInteractionMode('none');
  };

  const cancelDrawing = () => {
    setCurrentPoints([]);
    setInteractionMode('none');
  };

  const updateMarker = async (id: string, updates: Partial<{ title: string; notes: string; linkedMapId: string; category: string; lat: number; lng: number }>) => {
    await db.markers.update(id, updates);
  };

  const deleteMarker = async (id: string) => {
    await db.markers.delete(id);
  };

  const updateDrawing = async (id: string, updates: Partial<{ title: string; notes: string; color: string; category: string }>) => {
    await db.drawings.update(id, updates);
  };

  const deleteDrawing = async (id: string) => {
    await db.drawings.delete(id);
  };

  if (!mapData || !bounds) return <div className="flex items-center justify-center h-full text-gray-500">Loading map...</div>;

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg flex flex-col gap-3 border border-gray-200">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Category:</label>
          <select 
            className="border border-gray-300 rounded-md p-1.5 text-sm bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div className="h-px bg-gray-200 w-full"></div>

        <div className="flex items-center gap-2">
          <button 
            className={`p-2 rounded-md transition-colors ${interactionMode === 'marker' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            onClick={() => setInteractionMode(interactionMode === 'marker' ? 'none' : 'marker')}
            title="Add Marker"
          >
            <MapPin size={20} />
          </button>
          <button 
            className={`p-2 rounded-md transition-colors ${interactionMode === 'line' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            onClick={() => setInteractionMode(interactionMode === 'line' ? 'none' : 'line')}
            title="Draw Line"
          >
            <PenTool size={20} />
          </button>
          <button 
            className={`p-2 rounded-md transition-colors ${interactionMode === 'polygon' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            onClick={() => setInteractionMode(interactionMode === 'polygon' ? 'none' : 'polygon')}
            title="Draw Polygon"
          >
            <Hexagon size={20} />
          </button>

          {interactionMode === 'marker' && (
            <select 
              className="border border-gray-300 rounded-md p-1.5 text-sm bg-gray-50 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none ml-2"
              value={selectedIconId}
              onChange={(e) => setSelectedIconId(e.target.value)}
            >
              <option value="default">Default Icon</option>
              {customIcons?.map(icon => (
                <option key={icon.id} value={icon.id}>{icon.name}</option>
              ))}
            </select>
          )}

          {(interactionMode === 'line' || interactionMode === 'polygon') && (
            <div className="flex items-center gap-1 ml-2">
              <button onClick={handleFinishDrawing} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Finish Drawing">
                <Check size={16} />
              </button>
              <button onClick={cancelDrawing} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Cancel Drawing">
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        className="w-full h-full flex-1 bg-neutral-900"
        minZoom={-3}
        maxZoom={3}
      >
        <MapInteractionManager interactionMode={interactionMode} />
        <MapUpdater bounds={bounds} />
        <ImageOverlay url={mapData.image} bounds={bounds} />
        <MapEvents onMapClick={handleMapClick} />

        {currentPoints.length > 0 && interactionMode === 'line' && (
          <Polyline positions={currentPoints} color="#3b82f6" weight={4} />
        )}
        {currentPoints.length > 0 && interactionMode === 'polygon' && (
          <Polygon positions={currentPoints} color="#3b82f6" weight={4} />
        )}

        {filteredDrawings?.map(drawing => {
          const Component = drawing.type === 'line' ? Polyline : Polygon;
          return (
            <Component key={drawing.id} positions={drawing.points} color={drawing.color} weight={4}>
              <Popup>
                <div className="flex flex-col gap-3 min-w-[220px] p-1">
                  <input 
                    type="text" 
                    className="font-bold text-lg border-b border-gray-200 pb-1 focus:outline-none focus:border-blue-500 text-gray-800"
                    defaultValue={drawing.title}
                    onBlur={(e) => updateDrawing(drawing.id, { title: e.target.value })}
                    placeholder="Drawing Title"
                  />
                  <textarea 
                    className="w-full h-28 border border-gray-200 rounded-md p-2 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700"
                    defaultValue={drawing.notes}
                    placeholder="Add notes here..."
                    onBlur={(e) => updateDrawing(drawing.id, { notes: e.target.value })}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                    <select 
                      className="border border-gray-200 rounded-md p-1.5 text-sm bg-gray-50 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={drawing.category || 'General'}
                      onChange={(e) => updateDrawing(drawing.id, { category: e.target.value })}
                    >
                      {categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Color</label>
                    <input 
                      type="color" 
                      value={drawing.color} 
                      onChange={(e) => updateDrawing(drawing.id, { color: e.target.value })}
                      className="w-full h-8 cursor-pointer"
                    />
                  </div>
                  <button 
                    className="text-red-500 text-sm font-semibold self-end hover:text-red-700 transition-colors mt-1"
                    onClick={() => deleteDrawing(drawing.id)}
                  >
                    Delete Drawing
                  </button>
                </div>
              </Popup>
            </Component>
          );
        })}

        {filteredMarkers?.map(marker => {
          let icon = new L.Icon.Default();
          if (marker.iconId !== 'default') {
            const customIcon = customIcons?.find(i => i.id === marker.iconId);
            if (customIcon) {
              icon = L.icon({
                iconUrl: customIcon.image,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32],
              });
            }
          }

          return (
            <LeafletMarker 
              key={marker.id} 
              position={[marker.lat, marker.lng]} 
              icon={icon}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const markerInstance = e.target;
                  const position = markerInstance.getLatLng();
                  updateMarker(marker.id, { lat: position.lat, lng: position.lng });
                }
              }}
            >
              <Popup>
                <div className="flex flex-col gap-3 min-w-[220px] p-1">
                  <input 
                    type="text" 
                    className="font-bold text-lg border-b border-gray-200 pb-1 focus:outline-none focus:border-blue-500 text-gray-800"
                    defaultValue={marker.title}
                    onBlur={(e) => updateMarker(marker.id, { title: e.target.value })}
                    placeholder="Marker Title"
                  />
                  <textarea 
                    className="w-full h-28 border border-gray-200 rounded-md p-2 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700"
                    defaultValue={marker.notes}
                    placeholder="Add notes here..."
                    onBlur={(e) => updateMarker(marker.id, { notes: e.target.value })}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Category</label>
                    <select 
                      className="border border-gray-200 rounded-md p-1.5 text-sm bg-gray-50 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={marker.category || 'General'}
                      onChange={(e) => updateMarker(marker.id, { category: e.target.value })}
                    >
                      {categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Link to Map</label>
                    <select 
                      className="border border-gray-200 rounded-md p-1.5 text-sm bg-gray-50 text-gray-800 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      value={marker.linkedMapId || ''}
                      onChange={(e) => updateMarker(marker.id, { linkedMapId: e.target.value })}
                    >
                      <option value="">None</option>
                      {allMaps?.filter(m => m.id !== mapData.id).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  {marker.linkedMapId && (
                    <button 
                      className="w-full bg-blue-100 text-blue-700 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-200 transition-colors"
                      onClick={() => onSelectMap(marker.linkedMapId!)}
                    >
                      Open Linked Map
                    </button>
                  )}
                  <button 
                    className="text-red-500 text-sm font-semibold self-end hover:text-red-700 transition-colors mt-1"
                    onClick={() => deleteMarker(marker.id)}
                  >
                    Delete Marker
                  </button>
                </div>
              </Popup>
            </LeafletMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
