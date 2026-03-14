"use client";
import { useState, useEffect, useRef } from 'react';
import { usePlaylist } from '@/src/context/PlaylistContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function FloatingPlaylist() {
  const { playlist, removeFromPlaylist, clearPlaylist, reorderPlaylist, undoClear, canUndo, clearBackup } = usePlaylist();
  const [isOpen, setIsOpen] = useState(false);
  const [emptyAlert, setEmptyAlert] = useState(false);
  const [isCopied, setIsCopied] = useState(false); // NUEVO: Estado para el botón de copiado
  
  const pathname = usePathname();
  const isHome = pathname === '/';

  // NUEVO: Referencia para el contenedor de la playlist
  const playlistRef = useRef<HTMLDivElement>(null);

  // NUEVO: Cerrar la playlist al hacer clic fuera
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
      // Intentamos usar el API moderno si está disponible (Producción / HTTPS)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // FALLBACK: Para móviles en red local (HTTP)
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        
        // Evitamos que el celular haga scroll raro o abra el teclado virtual
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // Si todo sale bien, activamos la animación visual
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

  return (
    <>
      {/* Alerta Lista Vacía flotando a la izquierda del botón */}
      {emptyAlert && (
        <div className="fixed bottom-9 right-28 bg-[#F26419] text-white px-4 py-2 rounded-xl shadow-lg font-bold animate-in fade-in slide-in-from-right-4 duration-300 whitespace-nowrap z-[100] border border-[#F6AE2D]/50 text-sm">
          La lista está vacía 🎵
        </div>
      )}

      {/* Se añade la referencia playlistRef al contenedor principal */}
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
                                <div {...provided.dragHandleProps} className="text-gray-400 p-1 cursor-grab">
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
                                </div>
                                <Link href={`/song/${song.id}`} onClick={handleCloseModal} className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-[11px] font-bold text-[#2F4858] flex justify-between items-center shadow-sm">
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
                <p className="text-center text-gray-400 text-xs italic">Lista vacía...</p>
              )}
            </div>

            <div className="p-4 border-t bg-white flex justify-center items-center gap-8 shrink-0">
              
              {/* BOTÓN COPIAR MODIFICADO */}
              <button onClick={copyToClipboard} className="group flex flex-col items-center gap-1 transition-all" title="Copiar Enlace">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isCopied ? 'bg-[#55DDE0]' : 'bg-[#33658A]/10 group-hover:bg-[#33658A]'}`}>
                  {isCopied ? (
                    // Checkmark cuando se copia
                    <svg className="w-6 h-6 stroke-[#2F4858]" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    // Documento original
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

              {/* Botón Deshacer/Vaciar intacto */}
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