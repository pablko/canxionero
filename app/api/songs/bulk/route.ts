// app/api/songs/bulk/route.ts
import { NextResponse } from 'next/server';
import { getSongContent } from '@/src/lib/googleDrive';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  
  if (!idsParam) return NextResponse.json([]);

  try {
    const ids = idsParam.split(',');

    // --- MAGIA DEL BACKEND ULTRA-RÁPIDO ---
    // Ya no buscamos en todo Drive, vamos directo a los documentos que necesitamos
    const songsWithKeys = await Promise.all(
      ids.map(async (id) => {
        try {
          const content = await getSongContent(id);
          return { 
            id, 
            name: content.title || "Sin título",
            originalKey: content.originalKey || 'C'
          };
        } catch (error) {
          // Si falla una, no rompemos el resto
          return { id, name: "Canción no disponible", originalKey: 'C' };
        }
      })
    );

    return NextResponse.json(songsWithKeys);
  } catch (error) {
    console.error("Error en API Bulk:", error);
    return NextResponse.json([], { status: 500 });
  }
}