// app/api/pdf/playlist/route.ts
import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

export async function POST(req: Request) {
  try {
    const { songs } = await req.json();

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const margin = 42.5; 
    const colGap = 30; 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const colWidth = (pageWidth - (margin * 2) - colGap) / 2;
    const bottomLimit = pageHeight - margin; 
    const textOptions = { baseline: "top" as const };

    // Bucle Maestro: Repetimos el proceso por cada canción recibida
    songs.forEach((songData: any, index: number) => {
      // Si no es la primera canción, agregamos una hoja nueva para que no se pisen
      if (index > 0) {
        doc.addPage();
      }

      const { title, artist, sections } = songData;
      let currentX = margin;
      let currentY = margin;
      let isCol1 = true;

      // --- ENCABEZADO (TÍTULO Y ARTISTA EN MAYÚSCULAS) ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(47, 72, 88); 
      doc.text(title.toUpperCase(), pageWidth / 2, currentY, { align: "center", ...textOptions });
      
      currentY += 24; 
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(102, 102, 102); 
      doc.text(artist.toUpperCase(), pageWidth / 2, currentY, { align: "center", ...textOptions });
      
      currentY += 35; 
      const startY = currentY;

      // --- DIBUJO DE ESTROFAS Y ACORDES ---
      doc.setFontSize(11);
      doc.setLineHeightFactor(1.3);

      sections.forEach((sectionLines: any[]) => {
        while(sectionLines.length > 0 && sectionLines[0].isEmpty) {
          sectionLines.shift();
        }
        if (sectionLines.length === 0) return;

        let sectionHeight = 0;
        sectionLines.forEach((line: any) => {
          if (line.isEmpty) {
            sectionHeight += 8;
          } else {
            const splitText = doc.splitTextToSize(line.text, colWidth);
            sectionHeight += splitText.length * doc.getLineHeight();
            const isHeader = /^(VERSO|CORO|PUENTE|REFRAIN|INTERLUDIO|PRE-CORO|PRE CORO|INTRO|OUTRO|FINAL|INSTRUMENTAL|CODA)(\s.*)?$/i.test(line.text.trim());
            if (isHeader) sectionHeight += 6; 
          }
        });

        // Salto de columna / página
        if (currentY + sectionHeight > bottomLimit) {
          if (isCol1) {
            isCol1 = false;
            currentX = margin + colWidth + colGap;
            currentY = startY;
          } else {
            doc.addPage();
            isCol1 = true;
            currentX = margin;
            currentY = margin;
          }
        }

        // Dibujar la letra
        sectionLines.forEach((line: any) => {
          if (line.isEmpty) {
            currentY += 8;
          } else {
            
            const isHeader = /^(VERSO|CORO|REFRAIN|PUENTE|INTERLUDIO|PRE-CORO|PRE CORO|INTRO|OUTRO|FINAL|INSTRUMENTAL|CODA)(\s.*)?$/i.test(line.text.trim());
            
            if (line.isChord) {
              doc.setFont("helvetica", "bold");
              doc.setTextColor(255, 119, 0); 
            } else if (line.weight > 500 || isHeader) {
              doc.setFont("helvetica", "bold");
              doc.setTextColor(47, 72, 88); 
            } else {
              doc.setFont("helvetica", "normal"); 
              doc.setTextColor(47, 72, 88); 
            }

            const splitText = doc.splitTextToSize(line.text, colWidth);
            doc.text(splitText, currentX, currentY, textOptions);

            // Subrayado del título de sección
            if (isHeader) {
              doc.setDrawColor(47, 72, 88); 
              doc.setLineWidth(0.8); 
              
              const yOffset = doc.getFontSize() * 1.05; 
              const textWidth = doc.getTextWidth(line.text.trim()); 
              
              doc.line(currentX, currentY + yOffset, currentX + textWidth, currentY + yOffset);
            }

            currentY += splitText.length * doc.getLineHeight();

            if (isHeader) {
               currentY += 6; 
            }
          }
        });
        
        currentY += 15;
      });
    });

    // ¡Todas las canciones armadas! Empaquetamos y devolvemos.
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Playlist.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error al generar el PDF de la Playlist:", error);
    return NextResponse.json({ error: "Error interno al generar el PDF" }, { status: 500 });
  }
}