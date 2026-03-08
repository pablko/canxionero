"use client";
import { useState } from 'react';
import { usePlaylist } from '@/src/context/PlaylistContext';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function FloatingPlaylist() {
  const { playlist, removeFromPlaylist, clearPlaylist, reorderPlaylist } = usePlaylist();
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Función para limpiar el título: "Canción - Artista" -> "Canción"
  const cleanTitle = (name: string) => {
    if (name === "Cargando...") return name;
    // Quitamos la extensión y luego cortamos por el guion
    const baseName = name.replace(/\.[^/.]+$/, "");
    return baseName.split(" - ")[0].trim();
  };

  const copyToClipboard = async () => {
    if (playlist.length === 0) return;
    const firstSongId = playlist[0].id;
    const listData = playlist.map(s => `${s.id}:${s.key || 'orig'}`).join(',');
    const shareUrl = `${window.location.origin}/song/${firstSongId}?list=${listData}`;

    const textArea = document.createElement("textarea");
    textArea.value = shareUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    reorderPlaylist(result.source.index, result.destination.index);
  };

  if (playlist.length === 0) return null;

  return (
    <>
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm">
          <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-gray-700 animate-in fade-in zoom-in duration-300">
            <div className="bg-green-500 p-1 rounded-full"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></div>
            <p className="text-xs font-black uppercase tracking-widest">¡Enlace Copiado!</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-[60] font-montserrat flex flex-col items-end">
        {isOpen ? (
          <div className="bg-white shadow-2xl rounded-2xl border border-gray-200 w-[85vw] sm:w-80 max-h-[70vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center shrink-0">
              <span className="font-black text-xs uppercase tracking-widest">Lista ({playlist.length})</span>
              <button onClick={() => setIsOpen(false)} className="p-1"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="playlist">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="overflow-y-auto p-3 space-y-2 bg-gray-50 flex-1"
                  >
                    {playlist.map((song, index) => (
                      <Draggable key={song.id} draggableId={song.id} index={index}>
                        {(provided) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-2"
                          >
                            {/* Tirador de arrastre */}
                            <div {...provided.dragHandleProps} className="text-gray-400 p-1 cursor-grab active:cursor-grabbing">
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
                            </div>

                            <Link 
                              href={`/song/${song.id}`} 
                              onClick={() => setIsOpen(false)}
                              className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex justify-between items-center shadow-sm"
                            >
                              <span className="truncate pr-2 uppercase italic">{cleanTitle(song.name)}</span>
                              {song.key && song.key !== 'orig' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">{song.key}</span>}
                            </Link>
                            
                            <button onClick={() => removeFromPlaylist(song.id)} className="text-gray-300 hover:text-red-500 p-1">
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

            <div className="p-3 border-t bg-white flex flex-col gap-2 shrink-0">
              <button onClick={copyToClipboard} className="w-full bg-green-500 text-white text-[11px] font-black uppercase py-4 rounded-xl shadow-lg tracking-widest active:scale-95 transition-transform">Copiar Enlace</button>
              <button onClick={clearPlaylist} className="text-[10px] font-black text-gray-400 uppercase py-2">Vaciar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 active:scale-90 transition-transform">
            <div className="bg-red-500 text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-white shadow-md">{playlist.length}</div>
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>
            <span className="font-black text-sm uppercase tracking-tighter pr-2">Lista</span>
          </button>
        )}
      </div>
    </>
  );
}