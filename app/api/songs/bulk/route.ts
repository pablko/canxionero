import { NextResponse } from 'next/server';
import { getSongsList } from '@/src/lib/googleDrive';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  
  // Si no hay IDs, devolvemos array vacío pero con formato JSON
  if (!idsParam) return NextResponse.json([]);

  try {
    const ids = idsParam.split(',');
    const allSongs = await getSongsList();
    
    // Si por alguna razón Google Drive devuelve vacío
    if (!allSongs || allSongs.length === 0) {
        return NextResponse.json([]);
    }

    const filtered = allSongs
      .filter(s => s.id && ids.includes(s.id))
      .map(s => ({ 
        id: s.id as string, 
        name: s.name || "Sin título" 
      }));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error en API Bulk:", error);
    // IMPORTANTE: Devolver un JSON aunque haya error para que res.json() no explote
    return NextResponse.json([], { status: 500 });
  }
}