import { getSongsList } from '@/src/lib/googleDrive';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || "";

    const songs = await getSongsList(q);
    
    // Mapeo ultra-seguro
    const formattedSongs = (songs || []).map(song => ({
      id: song.id ?? '',
      name: song.name ?? 'Sin título'
    })).filter(s => s.id !== '');

    return NextResponse.json(songs);
  } catch (error) {
        return NextResponse.json([]); // Si falla, devuelve lista vacía en lugar de error
    }
}