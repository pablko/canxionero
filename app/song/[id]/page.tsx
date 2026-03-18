// app/song/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
import { CHROMATIC_SCALE, transposeFullChord, getSemitonesBetween } from '../../../src/lib/musicUtils';
import { useParams } from 'next/navigation';
import { usePlaylist } from '@/src/context/PlaylistContext';

export default function SongPage() {
  const [songHtml, setSongHtml] = useState<string>("");
  const [docTitle, setDocTitle] = useState<string>(""); 
  const [originalKey, setOriginalKey] = useState<string>("C");
  const [currentKey, setCurrentKey] = useState<string>("C");
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const songRef = useRef<HTMLDivElement>(null);

  const hasAppliedInitialKey = useRef(false);

  const { playlist, updateSongKey, isInPlaylist, addToPlaylist, removeFromPlaylist } = usePlaylist();
  const params = useParams();
  const songId = params?.id as string;

  useEffect(() => {
    if (songHtml) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [songHtml]);

  useEffect(() => {
    async function loadSong() {
      if (!songId) return;
      try {
        const res = await fetch(`/api/song/${songId}`);
        const data = await res.json();        
        if (data.error) throw new Error(data.error);

        setSongHtml(data.html);
        
        if (data.title) {
          setDocTitle(data.title);
        }
        
        // ¡FRONTEND LIMPIO! Tomamos la tonalidad mágica que nos mandó el backend
        const detectedKey = data.originalKey || "C";

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

  useEffect(() => {
    if (loading) return;

    if (playlist.length > 0 && songId && originalKey) {
      const savedInPlaylist = playlist.find(s => s.id === songId);
      if (savedInPlaylist) {
        if (savedInPlaylist.key && savedInPlaylist.key !== 'orig' && savedInPlaylist.key !== '-') {
          setCurrentKey(savedInPlaylist.key);
          hasAppliedInitialKey.current = true;
        } else {
          updateSongKey(songId, originalKey);
        }
      }
    }
  }, [playlist, songId, originalKey, updateSongKey, loading]);

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

  const handleTogglePlaylist = () => {
    if (isInPlaylist(songId)) {
      removeFromPlaylist(songId);
    } else {
      const cleanName = docTitle.includes('-') ? docTitle.split('-')[0].trim() : docTitle || "Canción";
      addToPlaylist({ id: songId, name: cleanName, key: currentKey });
    }
  };

  const handleDownloadPDF = async () => {
    if (!songRef.current) return;
    setIsGeneratingPdf(true);

    try {
      let title = "Canción";
      let artist = "Artista";

      if (docTitle.includes('-')) {
        const parts = docTitle.split('-');
        title = parts[0].trim();
        artist = parts.slice(1).join('-').trim(); 
      } else if (docTitle) {
        title = docTitle.trim();
      }

      const sectionsHtml = Array.from(songRef.current.children);
      const sectionsData: any[] = [];

      sectionsHtml.forEach((section) => {
        const spans = Array.from(section.querySelectorAll('span'));
        const lines: any[] = [];
        let currentLineText = "";
        let currentLineIsChord = false;
        let currentLineWeight = 400;

        spans.forEach(span => {
          if (span.style.fontSize === '26px' || span.style.fontSize === '16px' || span.style.columnSpan === 'all') {
            return;
          }

          const text = span.textContent || "";
          if (!text) return;

          const spanWeight = parseInt(span.style.fontWeight) || 400;
          const isChord = span.getAttribute('data-chord') === 'true';

          const parts = text.split('\n');
          for (let i = 0; i < parts.length; i++) {
            currentLineText += parts[i];
            
            if (isChord) currentLineIsChord = true;
            if (spanWeight > currentLineWeight) currentLineWeight = spanWeight;

            if (i < parts.length - 1) {
              lines.push({
                text: currentLineText.replace(/\u00A0/g, " "),
                isChord: currentLineIsChord,
                weight: currentLineWeight,
                isEmpty: currentLineText.trim() === ""
              });
              currentLineText = "";
              currentLineIsChord = false;
              currentLineWeight = 400;
            }
          }
        });

        if (currentLineText) {
          lines.push({
            text: currentLineText.replace(/\u00A0/g, " "),
            isChord: currentLineIsChord,
            weight: currentLineWeight,
            isEmpty: currentLineText.trim() === ""
          });
        }

        if (lines.some(l => !l.isEmpty)) {
          sectionsData.push(lines);
        }
      });

      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist, sections: sectionsData }),
      });

      if (!response.ok) throw new Error("El servidor no pudo generar el PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      const safeTitle = title.replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, "").trim().replace(/\s+/g, "-");
      const safeArtist = artist.replace(/[^a-zA-Z0-9 áéíóúÁÉÍÓÚñÑ]/g, "").trim().replace(/\s+/g, "-");
      
      a.href = url;
      a.download = `${safeTitle}_${safeArtist}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error("Error al descargar el PDF:", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsGeneratingPdf(false);
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
      <div className="fixed bottom-[96px] right-6 z-[50] flex flex-col gap-4 items-center">
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

        <button 
          onClick={handleDownloadPDF}
          disabled={isGeneratingPdf}
          className={`w-12 h-12 bg-white text-[#33658A] rounded-full shadow-lg flex items-center justify-center font-black transition-all border-2 border-gray-200 hover:border-[#33658A] hover:bg-gray-50 active:scale-95 ${
            isGeneratingPdf ? 'opacity-60 cursor-wait' : ''
          }`}
          title="Descargar PDF"
        >
          {isGeneratingPdf ? (
            <span className="text-[10px] tracking-tighter uppercase font-bold text-[#F26419] animate-pulse">Pdf...</span>
          ) : (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 8H5V3H19V8ZM16 5H8V6H16V5ZM19 9H5C3.34315 9 2 10.3431 2 12V17H6V21H18V17H22V12C22 10.3431 20.6569 9 19 9ZM16 19H8V14H16V19ZM19 13C18.4477 13 18 12.5523 18 12C18 11.4477 18.4477 11 19 11C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13Z" />
            </svg>
          )}
        </button>
      </div>

      <div 
        className="bg-white p-4 md:p-[1.5cm] shadow-md sm:shadow-2xl rounded-sm mx-auto mb-10 overflow-hidden relative"
        style={{
          width: '100%',
          maxWidth: '21cm',
          minHeight: '29.7cm',
        }}
      >
        <div 
          ref={songRef}
          className="text-[#2F4858]"
          style={{ 
            fontFamily: 'var(--font-montserrat)',
            fontSize: '14px', 
            lineHeight: '1.3', 
            whiteSpace: 'pre-wrap',
            columnCount: typeof window !== 'undefined' && window.innerWidth >= 768 ? 2 : 1,
            columnGap: '2rem',
            columnFill: 'auto',
            height: '100%', 
          }}
          dangerouslySetInnerHTML={{ __html: songHtml }} 
        />
      </div>
    </main>
  );
}