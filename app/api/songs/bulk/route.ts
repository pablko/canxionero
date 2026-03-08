// app/api/songs/bulk/route.ts
import { NextResponse } from 'next/server';
import { getSongsList } from '@/src/lib/googleDrive';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  
  if (!idsParam) return NextResponse.json([]);

  try {
    const ids = idsParam.split(',');
    // Obtenemos todas las canciones (Drive no permite filtrar por múltiples IDs fácilmente en una sola query de forma eficiente aquí)
    const allSongs = await getSongsList();
    
    // Filtramos solo las que están en nuestra lista de IDs
    const filtered = allSongs
      .filter(s => ids.includes(s.id))
      .map(s => ({ id: s.id, name: s.name }));

    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener nombres" }, { status: 500 });
  }
}