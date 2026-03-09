import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { PlaylistProvider } from '@/src/context/PlaylistContext';
import FloatingPlaylist from '@/src/components/FloatingPlaylist';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'], 
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: "Canxionero",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} font-sans antialiased`}
      >
        {/* 2. Envolvemos los children con el Provider */}
        <PlaylistProvider>
          {children}
          <FloatingPlaylist />
        </PlaylistProvider>
      </body>
    </html>
  );
}