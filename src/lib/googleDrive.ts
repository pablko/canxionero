import { google } from 'googleapis';
import { detectScale } from './musicUtils'; // <-- IMPORTAMOS EL DETECTOR

const getPrivateKey = () => {
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, '\n').replace(/"/g, '');
};

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: getPrivateKey(),
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
  ],
});

export const drive = google.drive({ version: 'v3', auth });
export const docs = google.docs({ version: 'v1', auth });

export async function getSongsList(searchTerm?: string) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    let query = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`;
    const hasSearch = searchTerm && searchTerm.trim() !== "";
    if (hasSearch) {
      const escapedTerm = searchTerm.replace(/'/g, "\\'");
      query += ` and (name contains '${escapedTerm}' or fullText contains '${escapedTerm}')`;
    }
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      pageSize: 1000,
      orderBy: hasSearch ? undefined : 'name',
    });
    return response.data.files || [];
  } catch (error: any) {
    console.error("❌ Error en Google Drive API:", error.message);
    return [];
  }
}

export async function getSongContent(documentId: string) {
  try {
    const res = await docs.documents.get({ documentId });
    let htmlContent = "";
    let lineCounter = 0;
    let isInsideSection = false;
    
    // --- VARIABLES PARA EL CEREBRO MUSICAL ---
    let detectedNote: string | null = null;
    const chordsInSong: string[] = [];

    res.data.body?.content?.forEach((element) => {
      if (element.paragraph) {
        const paragraphText = element.paragraph.elements
          ?.map(el => el.textRun?.content || "")
          .join("") || "";

        // 1. Buscamos si el usuario escribió la nota explícitamente ("Nota: C#")
        const noteMatch = paragraphText.match(/Nota:\s*([A-G][#b]?)/i);
        if (noteMatch) {
          detectedNote = noteMatch[1].toUpperCase();
        }

        const isEmptyParagraph = paragraphText.trim() === "";

        if (!isEmptyParagraph) {
          lineCounter++;
        }

        if (lineCounter > 2) {
          const isSectionHeader = /^(VERSO|CORO|PUENTE|INTERLUDIO|REFRAIN|PRE-CORO|PRE CORO|INTRO|OUTRO|FINAL|INSTRUMENTAL|CODA)(\s.*)?$/i.test(paragraphText.trim());
          
          if (isSectionHeader) {
            if (isInsideSection) {
              htmlContent += "</div>"; 
            }
            htmlContent += `<div style="break-inside: avoid; page-break-inside: avoid; margin-bottom: 1.5rem;">`;
            isInsideSection = true;
          } else if (!isInsideSection && !isEmptyParagraph) {
            htmlContent += `<div style="break-inside: avoid; page-break-inside: avoid; margin-bottom: 1.5rem;">`;
            isInsideSection = true;
          }
        }

        if (!isEmptyParagraph) {
          element.paragraph.elements?.forEach((el) => {
            if (el.textRun) {
              const style = el.textRun.textStyle;
              const contentText = el.textRun.content || "";
              
              let headerStyle = "";
              if (lineCounter === 1) {
                headerStyle = "font-size: 26px; font-weight: 800; line-height: 1.2; display: block; column-span: all; -webkit-column-span: all; margin-bottom: 4px;";
              } else if (lineCounter === 2) {
                headerStyle = "font-size: 16px; font-weight: 400; line-height: 1.2; color: #666; display: block; column-span: all; -webkit-column-span: all; margin-bottom: 24px;";
              }

              const rgb = style?.foregroundColor?.color?.rgbColor;
              const isChordColor = rgb && rgb.red === 1 && rgb.green && rgb.green > 0.45 && rgb.green < 0.48;

              let finalWeight = 400;
              if (style?.weightedFontFamily?.weight === 800) finalWeight = 900;
              else if (style?.bold === true) finalWeight = 700;

              const underlineStyle = style?.underline ? "text-decoration: underline;" : "";

              let colorStyle = "";
              if (rgb) {
                colorStyle = `color: rgb(${Math.round(rgb.red! * 255)}, ${Math.round(rgb.green! * 255)}, ${Math.round(rgb.blue! * 255)});`;
              }

              const escapedText = contentText
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

              if (isChordColor) {
                htmlContent += `<span data-chord="true" style="font-weight: 700; color: rgb(255, 119, 0); cursor: pointer; ${headerStyle}">${escapedText}</span>`;
                
                // 2. Guardamos silenciosamente todos los acordes que encontremos
                const found = escapedText.match(/([A-G][#b]?m?)(?:\/([A-G][#b]?))?/g);
                if (found) chordsInSong.push(...found);
              } else {
                htmlContent += `<span style="font-weight: ${finalWeight}; ${colorStyle} ${underlineStyle} ${headerStyle}">${escapedText}</span>`;
              }
            }
          });
        }
      }
    });

    if (isInsideSection) {
      htmlContent += "</div>";
    }

    // 3. Resolvemos la tonalidad definitiva (Prioridad a lo escrito, respaldo algorítmico)
    let finalOriginalKey = detectedNote;
    if (!finalOriginalKey) {
      finalOriginalKey = detectScale(chordsInSong);
    }

    // Devolvemos el paquete con la llave original incluida
    return { title: res.data.title, html: htmlContent, originalKey: finalOriginalKey };
  } catch (error) {
    console.error("Error al obtener contenido de Google Docs:", error);
    throw new Error("No se pudo cargar la canción.");
  }
}