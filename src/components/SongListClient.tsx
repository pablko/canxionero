"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Song {
  id: string;
  name: string;
}

export default function SongListClient({ initialSongs }: { initialSongs: Song[] }) {
  const [songs, setSongs] = useState(initialSongs);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  console.log("Termino de búsqueda actual:", searchTerm); // <--- RASTREO 1

  if (searchTerm.trim() === "") {
    setSongs(initialSongs);
    return;
  }

  const delayDebounceFn = setTimeout(async () => {
    setLoading(true);
    try {
      console.log("Llamando a la API con:", searchTerm); // <--- RASTREO 2
      const res = await fetch(`/api/songs/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      
      console.log("Datos recibidos de la API:", data); // <--- RASTREO 3
      
      if (!data.error) {
        setSongs(data);
      }
    } catch (error) {
      console.error("Error en el fetch:", error);
    } finally {
      setLoading(false);
    }
  }, 500);

  return () => clearTimeout(delayDebounceFn);
}, [searchTerm, initialSongs]);

  return (
    <div className="space-y-6">
      {/* BUSCADOR */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por título o letra (ej. 'Cristo nos llama')..."
          className="w-full p-4 pl-12 bg-white shadow-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute left-4 top-4">
          {loading ? (
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          ) : (
            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* LISTA DE CANCIONES */}
      <div className="grid gap-3">
        {songs.length > 0 ? (
          songs.map((song) => (
            <Link 
              key={song.id} 
              href={`/song/${song.id}`}
              className="group flex items-center justify-between p-5 bg-white hover:bg-blue-50 border border-gray-100 rounded-xl shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6V9a5 5 0 11-2 0V5.414l1.293 1.293a1 1 0 001.414-1.414L16.414 3H18z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-700 group-hover:text-blue-700">
                  {song.name.replace(/\.[^/.]+$/, "")}
                </span>
              </div>
              <svg className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))
        ) : (
          <p className="text-center text-gray-400 py-10">No se encontraron canciones que coincidan...</p>
        )}
      </div>
    </div>
  );
}