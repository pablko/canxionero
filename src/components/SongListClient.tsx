// src/components/SongListClient.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePlaylist } from '@/src/context/PlaylistContext';

interface Song {
  id: string;
  name: string;
}

export default function SongListClient({ initialSongs }: { initialSongs: Song[] }) {
  const [songs, setSongs] = useState(initialSongs);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  
  // Usamos el contexto de la Playlist
  const { addToPlaylist, removeFromPlaylist, isInPlaylist } = usePlaylist();

  useEffect(() => {
    // Si no hay término, mostramos la lista inicial
    if (searchTerm.trim() === "") {
      setSongs(initialSongs);
      return;
    }

    // Debounce: Esperamos 800ms antes de llamar a la API
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/songs/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        
        // Verificamos que data sea un array antes de setearlo
        if (Array.isArray(data)) {
          setSongs(data);
        } else {
          setSongs([]); // Si hay error, limpiamos la lista
        }
      } catch (error) {
        console.error("Error buscando canciones:", error);
        setSongs([]);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, initialSongs]);

  return (
    <div className="space-y-8">
      
      {/* SECCIÓN ELIMINADA: LISTA DE HOY (PLAYLIST SUPERIOR) 
         Ahora solo se gestiona desde el FloatingPlaylist global.
      */}

      {/* BUSCADOR */}
      <div className="relative">
        <div className="absolute left-4 top-4">
          {loading ? (
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          ) : (
            <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* LISTA DE CANCIONES DISPONIBLES */}
      <div className="grid gap-3">
        {songs.length > 0 ? (
          songs.map((song) => (
            <div key={song.id} className="relative flex items-center group">
              {/* LINK PRINCIPAL (Área de clic más grande) */}
              <Link 
                href={`/song/${song.id}`}
                className="flex-1 flex items-center justify-between p-3 bg-white hover:bg-blue-50 border border-gray-100 rounded-xl shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6V9a5 5 0 11-2 0V5.414l1.293 1.293a1 1 0 001.414-1.414L16.414 3H18z" />
                    </svg>
                  </div>
                  {/* truncate evita que nombres largos rompan el diseño */}
                  <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700 truncate max-w-[200px] md:max-w-md">
                    {song.name.replace(/\.[^/.]+$/, "")}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault(); // Por seguridad, aunque ya está fuera del Link
                    if (isInPlaylist(song.id)) {
                      removeFromPlaylist(song.id);
                    } else {
                      addToPlaylist(song); // Pasamos el objeto song completo
                    }
                  }}
                  className={`ml-3 p-4 rounded-xl transition-all shadow-sm flex items-center justify-center ${
                    isInPlaylist(song.id) 
                    ? "bg-blue-600 text-white" 
                    : "bg-white text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white hover:shadow-lg"
                  }`}
                  title={isInPlaylist(song.id) ? "Quitar de la playlist" : "Añadir a playlist"}
                >
                  {isInPlaylist(song.id) ? (
                    // Ícono de Check ✓
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    // Ícono de Más +
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </button>
              </Link>

              {/* BOTÓN + / AGREGAR A PLAYLIST (Fuera del Link para no navegar) */}
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-10 font-medium">No se encontraron canciones que coincidan...</p>
        )}
      </div>
    </div>
  );
}