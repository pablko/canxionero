import { google } from 'googleapis';

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

    res.data.body?.content?.forEach((element) => {
      if (element.paragraph) {
        // Verificamos si el párrafo tiene contenido real antes de contar la línea
        const paragraphText = element.paragraph.elements
          ?.map(el => el.textRun?.content || "")
          .join("")
          .trim() || ""; // Aseguramos que si es undefined, sea un string vacío

        if (paragraphText.length > 0) {
          lineCounter++;
        }

        element.paragraph.elements?.forEach((el) => {
          if (el.textRun) {
            const style = el.textRun.textStyle;
            const contentText = el.textRun.content || "";
            
            // --- DETECCIÓN CRÍTICA: ¿Es solo un salto de línea? ---
            const isJustANewLine = contentText === "\n";

            // Solo aplicamos estilos de cabecera si NO es un simple salto de línea
            let headerStyle = "";
            if (!isJustANewLine) {
              if (lineCounter === 1) {
                headerStyle = "font-size: 26px; font-weight: 800; line-height: 1;";
              } else if (lineCounter === 2) {
                headerStyle = "font-size: 18px; font-weight: 400; line-height: 1; color: #666;";
              }
            }

            // Lógica de color de acordes
            const rgb = style?.foregroundColor?.color?.rgbColor;
            const isChordColor = rgb && 
                                 rgb.red === 1 && 
                                 rgb.green && rgb.green > 0.45 && rgb.green < 0.48;

            // Pesos de fuente
            const gWeight = style?.weightedFontFamily?.weight;
            const isBold = style?.bold;
            let finalWeight = 400;
            if (gWeight === 800) finalWeight = 900;
            else if (isBold === true) finalWeight = 700;

            const underlineStyle = style?.underline ? "text-decoration: underline;" : "";

            let colorStyle = "";
            if (rgb) {
              const r = Math.round((rgb.red || 0) * 255);
              const g = Math.round((rgb.green || 0) * 255);
              const b = Math.round((rgb.blue || 0) * 255);
              colorStyle = `color: rgb(${r}, ${g}, ${b});`;
            }

            const escapedText = contentText
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");

            if (isChordColor) {
              htmlContent += `<span data-chord="true" style="font-weight: 700; color: rgb(255, 119, 0); cursor: pointer; ${headerStyle}">${escapedText}</span>`;
            } else {
              // Si es un salto de línea (\n), lo imprimimos pelado, sin font-size
              if (isJustANewLine) {
                htmlContent += `<span>${escapedText}</span>`;
              } else {
                htmlContent += `<span style="font-weight: ${finalWeight}; ${colorStyle} ${underlineStyle} ${headerStyle}">${escapedText}</span>`;
              }
            }
          }
        });
      }
    });

    return { title: res.data.title, html: htmlContent };
  } catch (error) {
    console.error("Error al obtener contenido de Google Docs:", error);
    throw new Error("No se pudo cargar la canción.");
  }
}