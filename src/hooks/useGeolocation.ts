import { useState } from 'react';

interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeoError {
  code: number;
  message: string;
}

const useGeolocation = () => {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<GeoError | null>(null);
  const [loading, setLoading] = useState(false);

  const getPosition = (): Promise<Position> => {
    setLoading(true);
    setError(null);
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = { code: 0, message: 'Geolocation not supported' };
        setError(err);
        setLoading(false);
        reject(err);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setPosition(p);
          setLoading(false);
          resolve(p);
        },
        (err) => {
          const e = { code: err.code, message: err.message };
          setError(e);
          setLoading(false);
          reject(e);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  return { position, error, loading, getPosition };
};

export default useGeolocation;
