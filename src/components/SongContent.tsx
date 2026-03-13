"use client";
import React, { useState, useEffect } from 'react';
import { usePlaylist } from '@/src/context/PlaylistContext';

interface SongContentProps {
  id: string;
  initialHtml: string;
  name: string;
  initialKey?: string;
}

export default function SongContent({ id, initialHtml, name, initialKey }: SongContentProps) {
  const [html, setHtml] = useState(initialHtml);
  const [currentKey, setCurrentKey] = useState(initialKey || '');
  const [isChangingKey, setIsChangingKey] = useState(false);
  const { addToPlaylist, isInPlaylist, updateSongKey, playlist } = usePlaylist();

  // SOLUCIÓN AL PROBLEMA DE SCROLL: Forzar scroll arriba al cargar nueva canción
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const savedSong = playlist.find(s => s.id === id);
    if (savedSong?.key) {
      handleKeyChange(savedSong.key);
    } else {
      setHtml(initialHtml);
      setCurrentKey(initialKey || '');
    }
  }, [id, initialHtml, initialKey, playlist]);

  const handleKeyChange = async (targetKey: string) => {
    setIsChangingKey(true);
    try {
      const res = await fetch(`/api/songs/transpose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: initialHtml, targetKey })
      });
      const data = await res.json();
      if (data.html) {
        setHtml(data.html);
        setCurrentKey(targetKey);
        if (isInPlaylist(id)) {
          updateSongKey(id, targetKey);
        }
      }
    } catch (error) {
      console.error("Error transponiendo:", error);
    } finally {
      setIsChangingKey(false);
    }
  };

  const handleAddToPlaylist = () => {
    addToPlaylist({ id, name, key: currentKey || undefined });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-white shadow-lg rounded-xl mb-24 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b pb-6">
        <h1 className="text-2xl sm:text-4xl font-black text-[#2F4858] uppercase tracking-tight">
          {name.replace(/\.[^/.]+$/, "")}
        </h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
            {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((k) => (
              <button
                key={k}
                onClick={() => handleKeyChange(k)}
                disabled={isChangingKey}
                className={`px-3 py-1.5 rounded-md text-xs font-black transition-all ${
                  currentKey === k 
                    ? 'bg-[#33658A] text-white shadow-md scale-105' 
                    : 'text-gray-500 hover:bg-white hover:text-[#33658A]'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {!isInPlaylist(id) ? (
            <button
              onClick={handleAddToPlaylist}
              className="bg-[#F26419] hover:bg-[#F6AE2D] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              </svg>
              AÑADIR
            </button>
          ) : (
            <div className="bg-[#55DDE0] text-[#2F4858] px-5 py-2.5 rounded-lg font-bold text-sm shadow-inner flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
              EN LISTA
            </div>
          )}
        </div>
      </div>

      <div 
        className={`prose prose-slate max-w-none transition-opacity duration-300 ${isChangingKey ? 'opacity-30' : 'opacity-100'}`}
        style={{ 
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.8'
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}