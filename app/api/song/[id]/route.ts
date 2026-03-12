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

    // 1. Obtenemos el contenido
    const data = await getSongContent(id);

    // 2. LOG PARA DEPURACIÓN (Míralo en la terminal de tu computadora, no en el navegador)
    console.log("--- INICIO HTML RECIBIDO DE GOOGLE ---");
    // Si data es un objeto con { html }, logueamos data.html, si es un string, data.
    const rawHtml = typeof data === 'string' ? data : data.html;
    console.log(rawHtml ? rawHtml.substring(0, 1500) : "No hay HTML disponible");
    console.log("--- FIN ---");

    // 3. Devolvemos la respuesta normal
    return NextResponse.json(typeof data === 'string' ? { html: data } : data);

  } catch (error) {
    console.error("Error en API [id]:", error);
    return NextResponse.json({ error: "Error al cargar la canción" }, { status: 500 });
  }
}