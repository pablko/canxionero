import { getSongsList } from '../src/lib/googleDrive';
import { Suspense } from 'react';
import SongListClient from '../src/components/SongListClient';

export default async function HomePage() {
  // 1. Obtenemos la lista de canciones desde Google Drive
  const rawSongs = await getSongsList();

  // 2. Mapeamos y aseguramos que 'id' y 'name' siempre sean strings
  // Esto elimina el error de "string | null | undefined"
  const songs = rawSongs.map(song => ({
    id: song.id ?? '',
    name: song.name ?? 'Canción sin título'
  })).filter(song => song.id !== ''); // Filtramos por si acaso algún ID viniera vacío

  return (
    <main className="p-6 md:p-12 bg-gray-50 min-h-screen font-montserrat">
      <div className="max-w-4xl mx-auto">
        Suspense fallback={<div>Cargando lista...</div>}>
          <SongListClient initialSongs={songs} />
      </Suspense>
      </div>
    </main>
  );
}