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

// MODIFICADO: Ahora acepta un searchTerm
export async function getSongsList(searchTerm?: string) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    let query = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`;
    
    // Si hay término de búsqueda, usamos fullText pero QUITAMOS el orderBy
    const hasSearch = searchTerm && searchTerm.trim() !== "";
    
    if (hasSearch) {
      const escapedTerm = searchTerm.replace(/'/g, "\\'");
      query += ` and (name contains '${escapedTerm}' or fullText contains '${escapedTerm}')`;
    }

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      pageSize: 1000,
      // Solo ordenamos por nombre si NO estamos buscando por contenido
      // Google Drive no permite orderBy junto con fullText
      orderBy: hasSearch ? undefined : 'name',
    });

    return response.data.files || [];
  } catch (error: any) {
    console.error("❌ Error en Google Drive API:", error.message);
    // Devolvemos vacío para que el error no rompa la app
    return [];
  }
}

export async function getSongContent(documentId: string) {
  try {
    const res = await docs.documents.get({ documentId });
    let htmlContent = "";

    res.data.body?.content?.forEach((element) => {
      if (element.paragraph) {
        element.paragraph.elements?.forEach((el) => {
          if (el.textRun) {
            const style = el.textRun.textStyle;
            const rgb = style?.foregroundColor?.color?.rgbColor;
            
            const isChordColor = rgb && 
                                 rgb.red === 1 && 
                                 rgb.green && rgb.green > 0.45 && rgb.green < 0.48;

            const gWeight = style?.weightedFontFamily?.weight;
            const isBold = style?.bold;
            let finalWeight = 400;
            if (gWeight === 800) finalWeight = 900;
            else if (isBold === true) finalWeight = 700;
            else if (gWeight === 600) finalWeight = 400;

            const isUnderline = style?.underline;
            const underlineStyle = isUnderline ? "text-decoration: underline;" : "";

            let colorStyle = "";
            if (rgb) {
              const r = Math.round((rgb.red || 0) * 255);
              const g = Math.round((rgb.green || 0) * 255);
              const b = Math.round((rgb.blue || 0) * 255);
              colorStyle = `color: rgb(${r}, ${g}, ${b});`;
            }

            let contentText = el.textRun.content || "";
            const escapedText = contentText
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");

            if (isChordColor) {
              htmlContent += `<span data-chord="true" style="font-weight: 700; color: rgb(255, 119, 0); cursor: pointer;">${escapedText}</span>`;
            } else {
              htmlContent += `<span style="font-weight: ${finalWeight}; ${colorStyle} ${underlineStyle}">${escapedText}</span>`;
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