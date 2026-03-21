"use client";
import { useState, useEffect, useRef } from 'react';
import { usePlaylist } from '@/src/context/PlaylistContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { transposeFullChord, getSemitonesBetween } from '@/src/lib/musicUtils';

const getNextSundayFormatted = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); 
  const daysUntilSunday = (7 - dayOfWeek) % 7; 
  
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  
  const day = String(nextSunday.getDate()).padStart(2, '0');
  const month = String(nextSunday.getMonth() + 1).padStart(2, '0');
  const year = nextSunday.getFullYear();
  
  return `${day}-${month}-${year}`;
};

export default function FloatingPlaylist() {
  const { playlist, removeFromPlaylist, clearPlaylist, reorderPlaylist, undoClear, canUndo, clearBackup } = usePlaylist();
  const [isOpen, setIsOpen] = useState(false);
  const [emptyAlert, setEmptyAlert] = useState(false);
  const [isCopied, setIsCopied] = useState(false); 
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); 
  
  const pathname = usePathname();
  const isHome = pathname === '/';

  const playlistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && playlistRef.current && !playlistRef.current.contains(event.target as Node)) {
        handleCloseModal();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, playlist.length]);

  if (isHome && playlist.length === 0 && !canUndo) return null;

  const formatTitle = (name: string) => {
    let clean = name.replace(/\.[^/.]+$/, "").split(" - ")[0].trim();
    if (clean.length > 18) {
      return clean.substring(0, 18).toUpperCase() + "...";
    }
    return clean.toUpperCase();
  };

  const copyToClipboard = async () => {
    if (playlist.length === 0) return;
    const listData = playlist.map(s => `${s.id}:${s.key || 'C'}`).join(',');
    const shareUrl = `${window.location.origin}/song/${playlist[0].id}?list=${listData}`;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Error al copiar el enlace:", error);
    }
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    if (playlist.length === 0) {
      clearBackup();
    }
  };

  const handleMainButtonClick = () => {
    if (playlist.length === 0 && !canUndo) {
      setEmptyAlert(true);
      setTimeout(() => setEmptyAlert(false), 3000);
    } else {
      setIsOpen(true);
    }
  };

  const handleDownloadPlaylistPDF = async () => {
    if (playlist.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const songsDataPayload = await Promise.all(
        playlist.map(async (song) => {
          const res = await fetch(`/api/song/${song.id}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);

          const originalKey = data.originalKey || 'C';
          const targetKey = (song.key && song.key !== 'orig' && song.key !== '-') ? song.key : originalKey;
          const semitones = getSemitonesBetween(originalKey, targetKey);

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = data.html;

          const chordElements = tempDiv.querySelectorAll('[data-chord="true"]');
          chordElements.forEach((el) => {
            let originalChord = el.getAttribute('data-original');
            if (!originalChord) {
              originalChord = (el.textContent || "").replace(/\u00A0/g, " ");
            }
            const newChord = transposeFullChord(originalChord, semitones);
            el.textContent = newChord;
          });

          let docTitle = data.title || song.name || "Canción";
          let title = "Canción";
          let artist = "Artista";

          if (docTitle.includes('-')) {
            const parts = docTitle.split('-');
            title = parts[0].trim();
            artist = parts.slice(1).join('-').trim();
          } else {
            title = docTitle.trim();
          }

          const sectionsHtml = Array.from(tempDiv.children);
          const sectionsData: any[] = [];

          sectionsHtml.forEach((section) => {
            const spans = Array.from(section.querySelectorAll('span'));
            const lines: any[] = [];
            let currentLineText = "";
            let currentLineIsChord = false;
            let currentLineWeight = 500;

            spans.forEach(span => {
              if (span.style.fontSize === '26px' || span.style.fontSize === '16px' || span.style.columnSpan === 'all') {
                return;
              }

              const text = span.textContent || "";
              if (!text) return;

              const spanWeight = parseInt(span.style.fontWeight) || 500;
              const isChord = span.getAttribute('data-chord') === 'true';

              const parts = text.split('\n');
              for (let i = 0; i < parts.length; i++) {
                currentLineText += parts[i];
                
                // 🛑 SOLUCIÓN AL EFECTO CONTAGIO: 
                // Solo hereda el color naranja o negrita si el span tiene texto real (ignora espacios invisibles)
                if (parts[i].trim() !== "") {
                  if (isChord) currentLineIsChord = true;
                  if (spanWeight > currentLineWeight) currentLineWeight = spanWeight;
                }

                if (i < parts.length - 1) {
                  lines.push({
                    text: currentLineText.replace(/\u00A0/g, " "),
                    isChord: currentLineIsChord,
                    weight: currentLineWeight,
                    isEmpty: currentLineText.trim() === ""
                  });
                  currentLineText = "";
                  currentLineIsChord = false;
                  currentLineWeight = 500;
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

          return { title, artist, sections: sectionsData };
        })
      );

      const response = await fetch('/api/pdf/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: songsDataPayload }),
      });

      if (!response.ok) throw new Error("El servidor no pudo generar la Playlist");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      const sundayDate = getNextSundayFormatted();
      a.href = url;
      a.download = `Lista_domingo_${sundayDate}_Canxionero.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error("Error al descargar la Playlist:", error);
      alert("Hubo un error al compilar el PDF de la Playlist.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <>
      {emptyAlert && (
        <div className="fixed bottom-9 right-28 bg-[#F26419] text-white px-4 py-2 rounded-xl shadow-lg font-bold animate-in fade-in slide-in-from-right-4 duration-300 whitespace-nowrap z-[100] border border-[#F6AE2D]/50 text-sm">
          La lista está vacía 🎵
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-[60] font-montserrat flex flex-col items-end" ref={playlistRef}>
        
        {isOpen && (playlist.length > 0 || canUndo) ? (
          <div className="bg-white shadow-2xl rounded-2xl border border-gray-200 w-[85vw] sm:w-80 max-h-[70vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 mb-2">
            <div className="p-4 bg-[#33658A] text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase tracking-widest text-[#F6AE2D]">Lista ({playlist.length})</span>
              <button onClick={handleCloseModal} className="p-1 hover:text-[#55DDE0] transition-colors">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto p-3 space-y-2 bg-gray-50 flex-1 min-h-[100px] flex flex-col justify-center">
              {playlist.length > 0 ? (
                <DragDropContext onDragEnd={(res) => res.destination && reorderPlaylist(res.source.index, res.destination.index)}>
                  <Droppable droppableId="playlist">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                        {playlist.map((song, index) => (
                          <Draggable key={song.id} draggableId={song.id} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center gap-2">
                                <div {...provided.dragHandleProps} className="text-gray-500 p-1 cursor-grab">
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
                                </div>
                                <Link href={`/song/${song.id}`} onClick={handleCloseModal} className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-[#2F4858] flex justify-between items-center shadow-sm hover:border-[#55DDE0] transition-colors">
                                  <span className="truncate italic">- {formatTitle(song.name)}</span>
                                  <span className="bg-[#55DDE0]/20 text-[#33658A] px-2 py-0.5 rounded text-[10px] font-black border border-[#55DDE0]/50 ml-2">
                                    {song.key || '-'}
                                  </span>
                                </Link>
                                <button onClick={() => removeFromPlaylist(song.id)} className="text-gray-300 hover:text-[#F26419] p-1">
                                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" /></svg>
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <p className="text-center text-gray-500 text-xs italic">Lista vacía...</p>
              )}
            </div>

            <div className="p-4 border-t bg-white flex justify-center items-center gap-6 shrink-0">
              
              <button onClick={copyToClipboard} className="group flex flex-col items-center gap-1 transition-all" title="Copiar Enlace">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isCopied ? 'bg-[#55DDE0]' : 'bg-[#33658A]/10 group-hover:bg-[#33658A]'}`}>
                  {isCopied ? (
                    <svg className="w-6 h-6 stroke-[#2F4858]" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 fill-[#33658A] group-hover:fill-white transition-colors" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.49 3 10.74.37A1.22 1.22 0 0 0 9.86 0h-4a1.25 1.25 0 0 0-1.22 1.25v11a1.25 1.25 0 0 0 1.25 1.25h6.72a1.25 1.25 0 0 0 1.25-1.25V3.88a1.22 1.22 0 0 0-.37-.88zm-.88 9.25H5.89v-11h2.72v2.63a1.25 1.25 0 0 0 1.25 1.25h2.75zm0-8.37H9.86V1.25l2.75 2.63z"></path>
                      <path d="M10.11 14.75H3.39v-11H4V2.5h-.61a1.25 1.25 0 0 0-1.25 1.25v11A1.25 1.25 0 0 0 3.39 16h6.72a1.25 1.25 0 0 0 1.25-1.25v-.63h-1.25z"></path>
                    </svg>
                  )}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-tighter ${isCopied ? 'text-[#55DDE0]' : 'text-[#33658A]'}`}>
                  {isCopied ? 'Copiado' : 'Copiar'}
                </span>
              </button>

              {canUndo ? (
                <button onClick={undoClear} className="group flex flex-col items-center gap-1 animate-in zoom-in duration-300" title="Deshacer vaciado">
                  <div className="w-12 h-12 bg-[#55DDE0]/20 group-hover:bg-[#55DDE0] rounded-full flex items-center justify-center transition-colors border border-[#55DDE0]/50">
                    <svg className="w-6 h-6 stroke-[#2F4858]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 7H15C16.8692 7 17.8039 7 18.5 7.40193C18.9561 7.66523 19.3348 8.04394 19.5981 8.49999C20 9.19615 20 10.1308 20 12C20 13.8692 20 14.8038 19.5981 15.5C19.3348 15.9561 18.9561 16.3348 18.5 16.5981C17.8039 17 16.8692 17 15 17H8.00001M4 7L7 4M4 7L7 10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </div>
                  <span className="text-[9px] font-bold text-[#2F4858] uppercase tracking-tighter">Deshacer</span>
                </button>
              ) : (
                <button onClick={clearPlaylist} className="group flex flex-col items-center gap-1 transition-all" title="Vaciar Lista">
                  <div className="w-12 h-12 bg-red-50 group-hover:bg-[#F26419] rounded-full flex items-center justify-center transition-colors border border-red-100 group-hover:border-[#F26419]">
                    <svg className="w-6 h-6 stroke-[#F26419] group-hover:stroke-white transition-colors" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 12V17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> 
                      <path d="M14 12V17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> 
                      <path d="M4 7H20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> 
                      <path d="M6 10V18C6 19.6569 7.34315 21 9 21H15C16.6569 21 18 19.6569 18 18V10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> 
                      <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                  </div>
                  <span className="text-[9px] font-bold text-[#F26419] uppercase tracking-tighter">Vaciar</span>
                </button>
              )}

              <button 
                onClick={handleDownloadPlaylistPDF}
                disabled={isGeneratingPdf || playlist.length === 0}
                className={`group flex flex-col items-center gap-1 transition-all ${isGeneratingPdf ? 'opacity-50 cursor-wait' : ''}`} 
                title="Guardar en PDF"
              >
                <div className="w-12 h-12 bg-[#83e160]/10 group-hover:bg-[#83e160] rounded-full flex items-center justify-center transition-colors border border-[#83e160]/30 group-hover:border-[#83e160]">
                  {isGeneratingPdf ? (
                    <div className="w-5 h-5 border-2 border-white border-t-[#83e160] rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-6 h-6 fill-[#83e160] group-hover:fill-white transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <g strokeWidth="0"></g>
                      <g strokeLinecap="round" strokeLinejoin="round"></g>
                      <g>
                        <path d="M19.2,6.67,12.34,0H2.74A2.77,2.77,0,0,0,.81.78,2.62,2.62,0,0,0,0,2.67V21.33a2.62,2.62,0,0,0,.81,1.89A2.77,2.77,0,0,0,2.74,24H16.46a2.77,2.77,0,0,0,1.93-.78,2.62,2.62,0,0,0,.81-1.89V20H24V9.33H19.2ZM11.66,2.16,17,7.33H11.66Zm11,8.51v8H6.17v-8Z"></path>
                        <path d="M11.76,13.69a1.71,1.71,0,0,1-.12.71,1.58,1.58,0,0,1-.43.59,2.41,2.41,0,0,1-1.56.46h-.5v1.89H8V12H9.76a2.22,2.22,0,0,1,1.5.42,1.67,1.67,0,0,1,.38.58A1.6,1.6,0,0,1,11.76,13.69Zm-2.64.85h.39a1.29,1.29,0,0,0,.79-.21.9.9,0,0,0,.21-.27.88.88,0,0,0,.07-.32.89.89,0,0,0-.05-.32,1,1,0,0,0-.17-.27A1,1,0,0,0,9.67,13H9.15v1.57Z"></path>
                        <path d="M17.33,14.65a2.7,2.7,0,0,1-.16,1.09,2.64,2.64,0,0,1-.61.93,3.13,3.13,0,0,1-2.22.7H12.77V12H14.5a3,3,0,0,1,2.09.7,2.47,2.47,0,0,1,.74,1.92Zm-1.21,0c0-1.14-.52-1.7-1.56-1.7h-.64v3.46h.5a1.53,1.53,0,0,0,1.7-1.76Z"></path>
                        <path d="M19.6,17.37H18.45V12h3.16V13h-2v1.38h1.87v.94H19.6Z"></path>
                      </g>
                    </svg>
                  )}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-tighter ${isGeneratingPdf ? 'text-gray-500' : 'text-[#83e160]'}`}>
                  {isGeneratingPdf ? 'Pensando...' : 'Guardar'}
                </span>
              </button>

            </div>
          </div>
        ) : (
          <button 
            onClick={handleMainButtonClick} 
            className="w-16 h-16 bg-[#33658A] rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all active:scale-95 border-4 border-white relative group"
          >
            <svg viewBox="0 0 30 30" className="w-7 h-7 fill-current group-hover:scale-110 transition-transform">
              <path d="M 4 5 C 3.446 5 3 5.446 3 6 C 3 6.554 3.446 7 4 7 L 19 7 C 19.554 7 20 6.554 20 6 C 20 5.446 19.554 5 19 5 L 4 5 z M 4 12 C 3.446 12 3 12.446 3 13 C 3 13.554 3.446 14 4 14 L 22 14 C 22.554 14 23 13.554 23 13 C 23 12.446 22.554 12 22 12 L 4 12 z M 20 17 C 20.01669 20.089967 20.000381 24.694577 20 27 L 26.484375 22.587891 C 26.876112 22.196153 26.876112 21.565565 26.484375 21.173828 L 20 17 z M 4 19 C 3.446 19 3 19.446 3 20 C 3 20.554 3.446 21 4 21 L 14 21 C 14.554 21 15 20.554 15 20 C 15 19.446 14.554 19 14 19 L 4 19 z" />
            </svg>
            
            {playlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#F26419] text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {playlist.length}
              </span>
            )}
          </button>
        )}
      </div>
    </>
  );
}