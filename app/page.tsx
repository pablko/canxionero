import { getSongsList } from '../src/lib/googleDrive';
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
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
            <span className="text-blue-600">CANXIONERO</span>
          </h1>
        </header>

        {/* Ahora 'songs' es del tipo exacto que espera SongListClient */}
        <SongListClient initialSongs={songs} />
      </div>
    </main>
  );
}