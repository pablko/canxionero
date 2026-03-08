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
  
  // Referencia para evitar que el tono se resetee mientras se carga la playlist
  const hasAppliedInitialKey = useRef(false);

  const { playlist, updateSongKey, isInPlaylist } = usePlaylist();
  const params = useParams();
  const songId = params?.id as string;

  // 1. Cargar la canción y detectar tono original
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
        
        // Si no tenemos tono previo de la playlist, ponemos el detectado
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

  // 2. Sincronizar con el tono de la Playlist (Especial para cuando abres un enlace compartido)
  useEffect(() => {
    if (playlist.length > 0 && songId) {
      const savedInPlaylist = playlist.find(s => s.id === songId);
      if (savedInPlaylist?.key && savedInPlaylist.key !== 'orig') {
        setCurrentKey(savedInPlaylist.key);
        hasAppliedInitialKey.current = true;
      }
    }
  }, [playlist, songId]);

  // 3. Efecto para transponer los acordes visualmente
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 font-montserrat p-4 text-center">
        <p className="text-xl font-bold text-gray-600 animate-pulse">Cargando canción...</p>
      </div>
    );
  }

  return (
    <main className="p-4 sm:p-10 font-montserrat flex flex-col items-center bg-gray-100 min-h-screen">
      
      {/* Herramientas */}
      <div className="mb-6 sm:mb-8 bg-white p-3 sm:p-4 shadow-lg rounded-xl flex flex-wrap items-center justify-center gap-4 sm:gap-6 top-4 z-20 border border-gray-200 w-full max-w-[21cm]">
        <div className="flex flex-col items-center sm:items-start">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tono Actual</span>
          <select 
            value={currentKey} 
            onChange={(e) => {
              const newKey = e.target.value;
              setCurrentKey(newKey);
              if (isInPlaylist(songId)) {
                updateSongKey(songId, newKey);
              }
            }}
            className="p-1 text-lg bg-transparent text-blue-600 font-black focus:outline-none cursor-pointer"
          >
            {CHROMATIC_SCALE.map((note: string) => (
              <option key={note} value={note}>{note}</option>
            ))}
          </select>
        </div>

        <div className="h-8 w-[1px] bg-gray-200 hidden sm:block"></div>

        <button 
          onClick={() => {
            setCurrentKey(originalKey);
            if (isInPlaylist(songId)) {
              updateSongKey(songId, originalKey);
            }
          }}
          className="px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg text-xs font-bold transition-colors w-full sm:w-auto"
        >
          RESETEAR ({originalKey})
        </button>
      </div>

      {/* Papel de la canción */}
      <div className="bg-white p-4 sm:p-16 shadow-md sm:shadow-2xl rounded-sm w-full max-w-none sm:max-w-[21cm] mb-20 border border-gray-100 sm:border-none">
        <div 
          ref={songRef}
          className="whitespace-pre-wrap text-[15px] sm:text-[17px] leading-[1.7] text-gray-900"
          style={{ fontFamily: 'var(--font-montserrat)' }}
          dangerouslySetInnerHTML={{ __html: songHtml }} 
        />
      </div>
    </main>
  );
}