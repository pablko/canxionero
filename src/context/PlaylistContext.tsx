"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Song {
  id: string;
  name: string;
  key?: string;
}

interface PlaylistContextType {
  playlist: Song[];
  addToPlaylist: (song: Song) => void;
  removeFromPlaylist: (id: string) => void;
  updateSongKey: (id: string, newKey: string) => void;
  reorderPlaylist: (startIndex: number, endIndex: number) => void;
  isInPlaylist: (id: string) => boolean;
  clearPlaylist: () => void;
  isImporting: boolean;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const isImportedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  // 1. Carga inicial e IMPORTACIÓN (Limpiando URL)
  useEffect(() => {
    if (isImportedRef.current) return;
    
    const params = new URLSearchParams(window.location.search);
    const sharedList = params.get('list');

    if (sharedList) {
      isImportedRef.current = true;
      setIsImporting(true);
      try {
        const decoded = sharedList.split(',').map((item: string) => {
          const parts = item.split(':');
          return { 
            id: parts[0], 
            key: (!parts[1] || parts[1] === 'orig') ? undefined : parts[1], 
            name: "Cargando..." 
          };
        }).filter((s: Song) => s.id);
        
        if (decoded.length > 0) {
          setPlaylist(decoded);
          localStorage.setItem('canxionero-playlist', JSON.stringify(decoded));
          
          // LIMPIEZA DE URL: Eliminamos el ?list=... de la barra de direcciones
          // Esto evita que al recargar se vuelva a disparar la importación
          router.replace(pathname);
        }
      } catch (e) {
        console.error("Error importando:", e);
      } finally {
        setIsImporting(false);
      }
    } else {
      // Si no hay lista en URL, cargamos lo que haya en LocalStorage
      const saved = localStorage.getItem('canxionero-playlist');
      if (saved) {
        try {
          setPlaylist(JSON.parse(saved));
        } catch (e) {
          console.error("Error localstorage", e);
        }
      }
    }
  }, [pathname, router]);

  // 2. Recuperar nombres reales de la API Bulk
  useEffect(() => {
    const fetchNames = async () => {
      const missing = playlist.filter((s: Song) => s.name === "Cargando...");
      if (missing.length === 0) return;

      const ids = missing.map((s: Song) => s.id).join(',');
      try {
        const res = await fetch(`/api/songs/bulk?ids=${ids}`);
        if (!res.ok) throw new Error("Error en API");
        const data = await res.json();

        if (Array.isArray(data)) {
          setPlaylist((current: Song[]) => 
            current.map((song: Song) => {
              const found = data.find((d: any) => d.id === song.id);
              return (found && song.name === "Cargando...") ? { ...song, name: found.name } : song;
            })
          );
        }
      } catch (err) {
        console.error("Error nombres:", err);
      }
    };

    const timer = setTimeout(fetchNames, 500);
    return () => clearTimeout(timer);
  }, [playlist.length]);

  const addToPlaylist = (song: Song) => {
    setPlaylist((prev: Song[]) => {
      if (prev.find(s => s.id === song.id)) return prev;
      const newList = [...prev, song];
      localStorage.setItem('canxionero-playlist', JSON.stringify(newList));
      return newList;
    });
  };

  const removeFromPlaylist = (id: string) => {
    setPlaylist((prev: Song[]) => {
      const newList = prev.filter(s => s.id !== id);
      localStorage.setItem('canxionero-playlist', JSON.stringify(newList));
      return newList;
    });
  };

  const updateSongKey = (id: string, newKey: string) => {
    setPlaylist((prev: Song[]) => {
      const newList = prev.map(s => s.id === id ? { ...s, key: newKey } : s);
      localStorage.setItem('canxionero-playlist', JSON.stringify(newList));
      return newList;
    });
  };

  const reorderPlaylist = (startIndex: number, endIndex: number) => {
    setPlaylist((prev: Song[]) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      localStorage.setItem('canxionero-playlist', JSON.stringify(result));
      return result;
    });
  };

  const isInPlaylist = (id: string) => playlist.some((s: Song) => s.id === id);

  const clearPlaylist = () => {
    localStorage.removeItem('canxionero-playlist');
    setPlaylist([]);
    // Forzamos navegación al index para limpiar cualquier rastro en la URL si lo hubiera
    router.replace(pathname);
  };

  return (
    <PlaylistContext.Provider value={{ 
      playlist, addToPlaylist, removeFromPlaylist, 
      updateSongKey, reorderPlaylist, isInPlaylist, clearPlaylist, isImporting 
    }}>
      {children}
    </PlaylistContext.Provider>
  );
}

export const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (!context) throw new Error("usePlaylist error");
  return context;
};