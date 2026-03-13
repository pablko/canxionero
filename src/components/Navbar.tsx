"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Interfaz para los resultados de búsqueda
interface SongResult {
  id: string;
  name: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHome = pathname === '/';
  
  // Estados de visibilidad del Navbar
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estados de Búsqueda y Modal
  const currentSearch = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(isHome ? currentSearch : '');
  const [searchResults, setSearchResults] = useState<SongResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Referencia para detectar clics fuera del modal
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sincronizar el input con la URL SOLO si estamos en el Home
  useEffect(() => {
    if (isHome) {
      setInputValue(currentSearch);
    }
  }, [currentSearch, isHome]);

  // Detector de clics fuera del buscador para cerrar el modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lógica de Scroll (Aparición y Desaparición)
  useEffect(() => {
    if (isHome) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingUp = currentScrollY < lastScrollY;
      const isNearTop = currentScrollY < 150; 

      if (isNearTop) {
        setIsVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (!isNearTop && !isScrollingUp) {
        // Esconder si bajamos, a menos que el modal de búsqueda esté abierto
        if (!isDropdownOpen) setIsVisible(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (isScrollingUp) {
        setIsVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (window.scrollY >= 150 && !isDropdownOpen) setIsVisible(false);
        }, 5000);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [lastScrollY, isHome, isDropdownOpen]);

  // Función para buscar resultados silenciosamente (Para el Modal)
  const fetchModalResults = async (term: string) => {
    setIsSearching(true);
    setIsDropdownOpen(true);
    try {
      const res = await fetch(`/api/songs/search?q=${encodeURIComponent(term)}`);
      const data = await res.json();
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error buscando canciones:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Manejador del Input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setInputValue(term);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Si borra el input, cerramos modal o limpiamos URL
    if (!term) {
      setIsDropdownOpen(false);
      setSearchResults([]);
      if (isHome) router.replace('/');
      return;
    }

    // Debounce de 300ms
    timeoutRef.current = setTimeout(() => {
      if (isHome) {
        // En el index, actualizamos URL para que reaccione SongListClient
        const params = new URLSearchParams(searchParams.toString());
        params.set('q', term);
        router.replace(`/?${params.toString()}`);
      } else {
        // En la canción, abrimos el modal
        fetchModalResults(term);
      }
    }, 300);
  };

  // Al seleccionar una canción del modal
  const handleSelectSong = (songId: string) => {
    setIsDropdownOpen(false);
    setInputValue(''); // Limpiamos la barra al navegar
    router.push(`/song/${songId}`);
  };

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 transition-transform duration-500 ease-in-out bg-[#33658A] shadow-lg ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-3 gap-3">
        
        {/* LOGO */}
        <Link href="/" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 shrink-0 group w-full sm:w-auto justify-center sm:justify-start">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#F6AE2D" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <span className="text-[#F6AE2D] font-montserrat font-black text-xl tracking-widest uppercase">
            Canxionero
          </span>
        </Link>

        {/* CONTENEDOR DE BÚSQUEDA Y MODAL */}
        <div className="w-full sm:flex-1 flex sm:justify-end relative" ref={searchContainerRef}>
          <div className="relative w-full sm:max-w-md md:max-w-lg">
            
            <input 
              value={inputValue}
              onChange={handleSearchChange}
              onFocus={() => { if (inputValue && !isHome) setIsDropdownOpen(true); }}
              className="py-2 pl-4 pr-10 w-full bg-white/10 text-white placeholder-gray-300 border border-white/20 rounded-full outline-none focus:bg-white/20 focus:border-[#F6AE2D] transition-all text-sm" 
              type="text" 
              placeholder="Buscar canción, artista o letra..." 
            />
            
            <svg className="absolute right-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.836 10.615 15 14.695" stroke="#F6AE2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path clipRule="evenodd" d="M9.141 11.738c2.729-1.136 4.001-4.224 2.841-6.898S7.67.921 4.942 2.057C2.211 3.193.94 6.281 2.1 8.955s4.312 3.92 7.041 2.783" stroke="#F6AE2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* MODAL DESPLEGABLE (Dropdown) */}
            {isDropdownOpen && !isHome && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[100] max-h-72 overflow-y-auto font-montserrat animate-in fade-in slide-in-from-top-2 duration-200">
                {isSearching ? (
                  <div className="p-4 text-center text-sm font-semibold text-[#33658A] animate-pulse">
                    Buscando...
                  </div>
                ) : searchResults.length > 0 ? (
                  <ul className="flex flex-col">
                    {searchResults.map((song) => (
                      <li key={song.id}>
                        <button
                          onClick={() => handleSelectSong(song.id)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-none transition-colors group"
                        >
                          <span className="text-[#2F4858] group-hover:text-[#F6AE2D] transition-colors font-semibold text-sm line-clamp-1">
                            {song.name.replace('.pdf', '').replace('.docx', '')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No encontramos resultados para "{inputValue}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}