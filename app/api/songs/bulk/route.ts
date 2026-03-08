import { NextResponse } from 'next/server';
import { getSongsList } from '@/src/lib/googleDrive';

export async function GET(request: Request) {
const { searchParams } = new URL(request.url);
const idsParam = searchParams.get('ids');

if (!idsParam) {
return NextResponse.json([]);
}

try {
const ids = idsParam.split(',');

} catch (error) {
console.error("Error en bulk API:", error);
return NextResponse.json({ error: "Error al obtener nombres" }, { status: 500 });
}
}