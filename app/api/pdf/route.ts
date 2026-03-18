// app/api/pdf/route.ts
import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

export async function POST(req: Request) {
  try {
    const { title, artist, sections } = await req.json();

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const margin = 40; 
    const colGap = 30; 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const colWidth = (pageWidth - (margin * 2) - colGap) / 2;
    const bottomLimit = pageHeight - margin; 

    let currentX = margin;
    let currentY = margin;
    let isCol1 = true;
    const textOptions = { baseline: "top" as const };

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
    
    // Espacio entre artista y comienzo de la cancion
    currentY += 45; 
    const startY = currentY;

    // --- DIBUJO DE ESTROFAS Y ACORDES ---
    doc.setFontSize(11);
    doc.setLineHeightFactor(1.3);

    sections.forEach((sectionLines: any[]) => {
      while(sectionLines.length > 0 && sectionLines[0].isEmpty) {
        sectionLines.shift();
      }
      if (sectionLines.length === 0) return;

      // Calcular altura (añadiendo el margen extra si es header)
      let sectionHeight = 0;
      sectionLines.forEach((line: any) => {
        if (line.isEmpty) {
          sectionHeight += 8;
        } else {
          const splitText = doc.splitTextToSize(line.text, colWidth);
          sectionHeight += splitText.length * doc.getLineHeight();
          const isHeader = /^(VERSO|CORO|PUENTE|INTERLUDIO|REFRAIN|PRE-CORO|PRE CORO|INTRO|OUTRO|FINAL|INSTRUMENTAL|CODA)(\s.*)?$/i.test(line.text.trim());
          if (isHeader) sectionHeight += 6; // Sumamos el espacio que agregaremos luego
        }
      });

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

      sectionLines.forEach((line: any) => {
        if (line.isEmpty) {
          currentY += 8;
        } else {
          
          const isHeader = /^(VERSO|CORO|PUENTE|INTERLUDIO|REFRAIN|PRE-CORO|PRE CORO|INTRO|OUTRO|FINAL|INSTRUMENTAL|CODA)(\s.*)?$/i.test(line.text.trim());
          
          if (line.isChord) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 119, 0); 
          } else if (line.weight > 400 || isHeader) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(47, 72, 88); 
          } else {
            doc.setFont("helvetica", "normal"); 
            doc.setTextColor(47, 72, 88); 
          }

          const splitText = doc.splitTextToSize(line.text, colWidth);
          doc.text(splitText, currentX, currentY, textOptions);

          if (isHeader) {
            doc.setDrawColor(47, 72, 88); 
            doc.setLineWidth(0.8); 
            
            // Subrayado de secciones de la cancion
            const yOffset = doc.getFontSize() * 1; 
            const textWidth = doc.getTextWidth(line.text.trim()); 
            
            doc.line(currentX, currentY + yOffset, currentX + textWidth, currentY + yOffset);
          }

          currentY += splitText.length * doc.getLineHeight();

          // Espacio entre subrayado de seccion y letra inferior
          if (isHeader) {
             currentY += 10; 
          }
        }
      });
      
      currentY += 15;
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cancion.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error al generar PDF en el servidor:", error);
    return NextResponse.json({ error: "Error interno al generar el PDF" }, { status: 500 });
  }
}