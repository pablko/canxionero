"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

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
  reorderPlaylist: (startIndex: number, endIndex: number) => void; // Nueva función
  isInPlaylist: (id: string) => boolean;
  clearPlaylist: () => void;
  isImporting: boolean;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const isImportedRef = useRef(false);

  useEffect(() => {
    if (isImportedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const sharedList = params.get('list');

    if (sharedList) {
      isImportedRef.current = true;
      setIsImporting(true);
      try {
        const decoded = sharedList.split(',').map(item => {
          const [id, key] = item.split(':');
          return { id, key: (!key || key === 'orig') ? undefined : key, name: "Cargando..." };
        }).filter(Boolean) as Song[];
        
        if (decoded.length > 0) {
          setPlaylist(decoded);
          localStorage.setItem('canxionero-playlist', JSON.stringify(decoded));
        }
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } catch (e) { console.error(e); } finally { setIsImporting(false); }
    } else {
      const saved = localStorage.getItem('canxionero-playlist');
      if (saved) setPlaylist(JSON.parse(saved));
    }
  }, []);

  // Carga automática de nombres
  useEffect(() => {
    const fetchMissingNames = async () => {
      const missing = playlist.filter(s => s.name === "Cargando...");
      if (missing.length === 0) return;
      const ids = missing.map(s => s.id).join(',');
      try {
        const res = await fetch(`/api/songs/bulk?ids=${ids}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setPlaylist(prev => prev.map(song => {
            const found = data.find(d => d.id === song.id);
            return found ? { ...song, name: found.name } : song;
          }));
        }
      } catch (e) { console.error(e); }
    };
    fetchMissingNames();
  }, [playlist.length]);

  const addToPlaylist = (song: Song) => {
    setPlaylist(prev => prev.find(s => s.id === song.id) ? prev : [...prev, song]);
  };

  const removeFromPlaylist = (id: string) => setPlaylist(prev => prev.filter(s => s.id !== id));

  const updateSongKey = (id: string, newKey: string) => {
    setPlaylist(prev => {
      const newList = prev.map(s => s.id === id ? { ...s, key: newKey } : s);
      localStorage.setItem('canxionero-playlist', JSON.stringify(newList));
      return newList;
    });
  };

  // Función para mover elementos en la lista
  const reorderPlaylist = (startIndex: number, endIndex: number) => {
    setPlaylist(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const isInPlaylist = (id: string) => playlist.some(s => s.id === id);
  const clearPlaylist = () => setPlaylist([]);

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