import { getSongContent } from '@/src/lib/googleDrive';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const { id } = await params; 
    
    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const data = await getSongContent(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API [id]:", error);
    return NextResponse.json({ error: "Error al cargar la canción" }, { status: 500 });
  }
}