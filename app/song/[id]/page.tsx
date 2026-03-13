// app/song/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { CHROMATIC_SCALE, transposeFullChord, getSemitonesBetween, detectScale } from '../../../src/lib/musicUtils';
import { useParams } from 'next/navigation';
import { usePlaylist } from '@/src/context/PlaylistContext';

export default function SongPage() {
  const [songHtml, setSongHtml] = useState<string>("");
  const [originalKey, setOriginalKey] = useState<string>("C");
  const [currentKey, setCurrentKey] = useState<string>("C");
  const [loading, setLoading] = useState(true);
  const songRef = useRef<HTMLDivElement>(null);

  const hasAppliedInitialKey = useRef(false);

  const { playlist, updateSongKey, isInPlaylist, addToPlaylist, removeFromPlaylist } = usePlaylist();
  const params = useParams();
  const songId = params?.id as string;

  // 1. SOLUCIÓN AL SCROLL: Obligamos a ir arriba cuando se carga el HTML
  useEffect(() => {
    if (songHtml) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [songHtml]);

  // 2. Cargar la canción y detectar tono
  useEffect(() => {
    async function loadSong() {
      if (!songId) return;
      try {
        const res = await fetch(`/api/song/${songId}`);
        const data = await res.json();        
        if (data.error) throw new Error(data.error);

        setSongHtml(data.html);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.html;
        const plainText = tempDiv.textContent || tempDiv.innerText;

        let detectedKey = "C";
        const match = plainText.match(/Nota:\s*([A-G][#b]?)/i);
        
        if (match) {
          detectedKey = match[1].toUpperCase();
        } else {
          const chordSpans = tempDiv.querySelectorAll('[data-chord="true"]');
          const chordsInSong: string[] = [];
          chordSpans.forEach(span => {
            const content = span.textContent || "";
            const found = content.match(/([A-G][#b]?m?)(?:\/([A-G][#b]?))?/g);
            if (found) chordsInSong.push(...found);
          });
          detectedKey = detectScale(chordsInSong);
        }

        setOriginalKey(detectedKey);
        
        if (!hasAppliedInitialKey.current) {
          setCurrentKey(detectedKey);
        }

      } catch (e) { 
        console.error("Error al cargar canción:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSong();
  }, [songId]);

  // 3. Sincronizar y reparar notas faltantes en la Playlist
  useEffect(() => {
    if (playlist.length > 0 && songId && originalKey) {
      const savedInPlaylist = playlist.find(s => s.id === songId);
      if (savedInPlaylist) {
        if (savedInPlaylist.key && savedInPlaylist.key !== 'orig') {
          setCurrentKey(savedInPlaylist.key);
          hasAppliedInitialKey.current = true;
        } else if (!savedInPlaylist.key) {
          // SOLUCIÓN A LA NOTA "-": Si la canción se agregó desde el buscador (sin nota),
          // ahora que la hemos detectado, actualizamos la playlist silenciosamente.
          updateSongKey(songId, originalKey);
        }
      }
    }
  }, [playlist, songId, originalKey, updateSongKey]);

  // 4. Efecto para transponer los acordes visualmente
  useEffect(() => {
    if (!songRef.current || !songHtml) return;

    const semitones = getSemitonesBetween(originalKey, currentKey);
    const chordElements = songRef.current.querySelectorAll('[data-chord="true"]');

    chordElements.forEach((el) => {
      let originalChord = el.getAttribute('data-original');
      if (!originalChord) {
        originalChord = (el.textContent || "").replace(/\u00A0/g, " ");
        el.setAttribute('data-original', originalChord);
      }

      const newChord = transposeFullChord(originalChord, semitones);
      el.textContent = newChord;
    });
  }, [currentKey, originalKey, songHtml]);

  // Manejador para agregar la canción desde el FAB (+ / -)
  const handleTogglePlaylist = () => {
    if (isInPlaylist(songId)) {
      removeFromPlaylist(songId);
    } else {
      let extractTitle = "Canción sin título";
      if (songRef.current) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = songHtml;
        const firstLine = tempDiv.textContent?.split('\n')[0]?.trim();
        if (firstLine) extractTitle = firstLine;
      }
      addToPlaylist({ id: songId, name: extractTitle, key: currentKey });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 font-montserrat p-4 text-center">
        <p className="text-xl font-bold text-[#33658A] animate-pulse">Cargando canción...</p>
      </div>
    );
  }

  const isAdded = isInPlaylist(songId);

  return (
    <main className="p-4 sm:p-10 font-montserrat flex flex-col items-center min-h-screen pb-32">
      
      {/* MENÚ FLOTANTE VERTICAL (Botones 1 y 2) */}
      <div className="fixed bottom-[96px] right-6 z-[50] flex flex-col gap-4 items-center">
        
        {/* BOTÓN 1: Selector de Tono */}
        <div 
          className="relative w-12 h-12 bg-[#33658A] text-[#F6AE2D] rounded-full shadow-lg flex items-center justify-center font-black text-sm border-2 border-[#55DDE0]/30 hover:border-[#55DDE0] transition-colors"
          title="Cambiar Tono"
        >
          {currentKey}
          <select 
            value={currentKey} 
            onChange={(e) => {
              const newKey = e.target.value;
              setCurrentKey(newKey);
              if (isAdded) updateSongKey(songId, newKey);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {CHROMATIC_SCALE.map((note: string) => (
              <option key={note} value={note}>{note}</option>
            ))}
          </select>
        </div>

        {/* BOTÓN 2: Agregar/Quitar (+ / -) */}
        <button 
          onClick={handleTogglePlaylist}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center font-black text-2xl transition-all border-2 ${
            isAdded 
              ? "bg-[#F26419] text-white border-[#F26419]/50 hover:bg-red-600" 
              : "bg-[#33658A] text-[#55DDE0] border-[#55DDE0]/30 hover:border-[#55DDE0]"
          }`}
          title={isAdded ? "Quitar de la Playlist" : "Añadir a la Playlist"}
        >
          {isAdded ? "−" : "+"}
        </button>

      </div>

      {/* Papel de la canción */}
      <div className="bg-white p-4 sm:p-16 shadow-md sm:shadow-2xl rounded-sm w-full max-w-none sm:max-w-[21cm] mb-10">
        <div 
          ref={songRef}
          className="whitespace-pre text-[15px] sm:text-[17px] leading-[1.5] text-[#2F4858]"
          style={{ fontFamily: 'var(--font-montserrat)' }}
          dangerouslySetInnerHTML={{ __html: songHtml }} 
        />
      </div>
    </main>
  );
}