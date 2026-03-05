"use client";

import { useEffect, useState, useRef } from 'react';
import { CHROMATIC_SCALE, transposeFullChord, getSemitonesBetween, detectScale } from '../../../src/lib/musicUtils';
import { useParams } from 'next/navigation';

export default function SongPage() {
  const [songHtml, setSongHtml] = useState<string>("");
  const [originalKey, setOriginalKey] = useState<string>("C");
  const [currentKey, setCurrentKey] = useState<string>("C");
  const [loading, setLoading] = useState(true);
  const songRef = useRef<HTMLDivElement>(null);
  
  const params = useParams();
  const songId = params?.id as string;

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

        const match = plainText.match(/Nota:\s*([A-G][#b]?)/i);
        
        if (match) {
          const detectedKey = match[1].toUpperCase();
          setOriginalKey(detectedKey);
          setCurrentKey(detectedKey);
        } else {
          const chordSpans = tempDiv.querySelectorAll('[data-chord="true"]');
          const chordsInSong: string[] = [];
          
          chordSpans.forEach(span => {
            const content = span.textContent || "";
            const found = content.match(/([A-G][#b]?m?)(?:\/([A-G][#b]?))?/g);
            if (found) chordsInSong.push(...found);
          });

          const autoDetected = detectScale(chordsInSong);
          setOriginalKey(autoDetected);
          setCurrentKey(autoDetected);
        }
      } catch (e) { 
        console.error("Error al cargar canción:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSong();
  }, [songId]);

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
      <div className="flex justify-center items-center min-h-screen bg-gray-100 font-montserrat">
        <p className="text-xl font-bold text-gray-600 animate-pulse">Cargando canción...</p>
      </div>
    );
  }

  return (
    <main className="p-10 font-montserrat flex flex-col items-center bg-gray-100 min-h-screen">
      
      <div className="mb-8 bg-white p-4 shadow-lg rounded-xl flex items-center gap-6 top-5 z-20 border border-gray-200">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Tono Actual</span>
          <select 
            value={currentKey} 
            onChange={(e) => setCurrentKey(e.target.value)}
            className="p-1 text-lg bg-transparent text-blue-600 font-black focus:outline-none cursor-pointer"
          >
            {CHROMATIC_SCALE.map((note: string) => ( // Añadido el tipo :string aquí
              <option key={note} value={note}>{note}</option>
            ))}
          </select>
        </div>

        <div className="h-8 w-[1px] bg-gray-200"></div>

        <button 
          onClick={() => setCurrentKey(originalKey)}
          className="px-4 py-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg text-xs font-bold transition-colors"
        >
          RESETEAR ({originalKey})
        </button>
      </div>

      <div className="bg-white p-16 shadow-2xl rounded-sm w-full max-w-[21cm] min-h-[29.7cm] mb-20">
        <div 
          ref={songRef}
          className="whitespace-pre-wrap text-[17px] leading-[1.6] text-gray-900"
          style={{ fontFamily: 'var(--font-montserrat)' }}
          dangerouslySetInnerHTML={{ __html: songHtml }} 
        />
      </div>
    </main>
  );
}