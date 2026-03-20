// app/layout.tsx
import './globals.css';
import { PlaylistProvider } from '@/src/context/PlaylistContext';
import FloatingPlaylist from '@/src/components/FloatingPlaylist';
import Navbar from '@/src/components/Navbar'; 
import { Suspense } from 'react'; 
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-montserrat'
});

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
    <html lang="es" className={montserrat.variable}>
      <body className="font-montserrat bg-gray-100 text-gray-900 min-h-screen">
        <PlaylistProvider>
          {/* 2. Envuelve el Navbar con Suspense */}
          <Suspense fallback={<div className="h-[70px] bg-[#33658A] w-full" />}>
            <Navbar />
          </Suspense>
          
          <div className="pt-[100px] sm:pt-[70px]">
            {children}
          </div>

          <FloatingPlaylist />
        </PlaylistProvider>
      </body>
    </html>
  );
}