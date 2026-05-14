import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export function MapInteractionManager({ interactionMode }: { interactionMode: string }) {
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
