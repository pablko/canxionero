// src/components/Navbar.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isHome = pathname === '/';
  
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Valor actual de la búsqueda en la URL
  const currentSearch = searchParams.get('q') || '';
  // Estado local para el input (para que se sienta rápido al teclear)
  const [inputValue, setInputValue] = useState(currentSearch);

  // Sincronizar el input si la URL cambia por otro medio
  useEffect(() => {
    setInputValue(currentSearch);
  }, [currentSearch]);

  // Lógica de Scroll
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
        setIsVisible(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (isScrollingUp) {
        setIsVisible(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (window.scrollY >= 150) setIsVisible(false);
        }, 5000);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [lastScrollY, isHome]);

  // Función que maneja la búsqueda y actualiza la URL
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setInputValue(term);

    // Creamos un timeout para esperar a que el usuario deje de teclear (Debounce de 300ms)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set('q', term);
      } else {
        params.delete('q');
      }

      // Si no estamos en el Home, navegamos al Home con la búsqueda
      if (!isHome) {
        router.push(`/?${params.toString()}`);
      } else {
        // Si estamos en el Home, solo reemplazamos la URL para no recargar la página
        router.replace(`/?${params.toString()}`);
      }
    }, 300);
  };

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 transition-transform duration-500 ease-in-out bg-[#33658A] shadow-lg ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-3 gap-3">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group w-full sm:w-auto justify-center sm:justify-start">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#F6AE2D" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-110 transition-transform">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          <span className="text-[#F6AE2D] font-montserrat font-black text-xl tracking-widest uppercase">
            Canxionero
          </span>
        </Link>

        {/* BUSCADOR */}
        <div className="w-full sm:flex-1 flex sm:justify-end">
          <div className="relative w-full sm:max-w-md md:max-w-lg">
            <input 
              value={inputValue}
              onChange={handleSearchChange}
              className="py-2 pl-4 pr-10 w-full bg-white/10 text-white placeholder-gray-300 border border-white/20 rounded-full outline-none focus:bg-white/20 focus:border-[#F6AE2D] transition-all text-sm" 
              type="text" 
              placeholder="Buscar canción, artista o letra..." 
            />
            <svg 
              className="absolute right-3 top-1/2 -translate-y-1/2" 
              width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.836 10.615 15 14.695" stroke="#F6AE2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path clipRule="evenodd" d="M9.141 11.738c2.729-1.136 4.001-4.224 2.841-6.898S7.67.921 4.942 2.057C2.211 3.193.94 6.281 2.1 8.955s4.312 3.92 7.041 2.783" stroke="#F6AE2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

      </div>
    </nav>
  );
}