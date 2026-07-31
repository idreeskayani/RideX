import React, { useEffect, useState } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { fetchOSRMRoute, type Coords } from '../utils/navigation';

interface Props {
  /** Pass geometry directly (for progressive trimming) */
  geometry?: { type: 'LineString'; coordinates: [number, number][] } | null;
  /** Or pass from/to for auto-fetch */
  from?: Coords;
  to?: Coords;
  color?: string;
  id?: string;
  width?: number;
}

export default function MapRoute({ geometry, from, to, color = '#2563EB', id = 'route', width = 4 }: Props) {
  const [autoGeometry, setAutoGeometry] = useState<any>(null);

  useEffect(() => {
    if (geometry !== undefined) return; // controlled externally
    if (!from || !to) return;
    fetchOSRMRoute(from, to).then(r => setAutoGeometry(r ? { type: 'LineString', coordinates: r.coordinates } : null));
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude]);

  const shape = geometry !== undefined ? geometry : autoGeometry;
  if (!shape) return null;

  return (
    <GeoJSONSource id={id} data={shape}>
      <Layer
        id={`${id}-line`}
        type="line"
        style={{
          lineColor: color,
          lineWidth: width,
          lineOpacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </GeoJSONSource>
  );
}
