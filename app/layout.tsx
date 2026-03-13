// app/layout.tsx
import './globals.css';
import { PlaylistProvider } from '@/src/context/PlaylistContext';
import FloatingPlaylist from '@/src/components/FloatingPlaylist';
import Navbar from '@/src/components/Navbar'; 

export const metadata = {
  title: 'Canxionero',
  description: 'Tu cancionero personal inteligente',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* Añadimos bg-gray-100 al body global para mantener la consistencia */}
      <body className="font-montserrat bg-gray-100 text-gray-900 min-h-screen">
        <PlaylistProvider>
          {/* 1. Navbar global */}
          <Navbar />
          
          {/* 2. El pt-[76px] sm:pt-[64px] compensa la altura del Navbar fixed */}
          <div className="pt-[100px] sm:pt-[70px]">
            {children}
          </div>

          {/* 3. Playlist Flotante global */}
          <FloatingPlaylist />
        </PlaylistProvider>
      </body>
    </html>
  );
}