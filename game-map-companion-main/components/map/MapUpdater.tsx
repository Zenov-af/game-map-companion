import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export function MapUpdater({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds);
  }, [bounds, map]);
  return null;
}
