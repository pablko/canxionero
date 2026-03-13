// Si necesitas revisar app/api/songs/route.ts
import { NextResponse } from 'next/server';
import { getSongsList } from '@/src/lib/googleDrive';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || ''; // Toma el parámetro q
  
  try {
    const songs = await getSongsList(q); // Pasa la búsqueda a Google Drive
    return NextResponse.json(songs);
  } catch (error) {
    return NextResponse.json({ error: "Error loading songs" }, { status: 500 });
  }
}