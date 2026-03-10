import { NextResponse } from 'next/server';
import { getSongsList } from '@/src/lib/googleDrive';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  
  if (!idsParam) return NextResponse.json([]);

  try {
    const ids = idsParam.split(',');
    const allSongs = await getSongsList();
    
    if (!allSongs) return NextResponse.json([]);

    const filtered = allSongs
      .filter(s => s.id && ids.includes(s.id))
      .map(s => ({ 
        id: s.id as string, 
        name: s.name || "Sin título" 
      }));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error en API Bulk:", error);
    // Devolvemos array vacío pero con status 500 para que el cliente sepa que falló
    return NextResponse.json([], { status: 500 });
  }
}