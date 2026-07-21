import { NextResponse } from 'next/server';
// @ts-ignore
import HTMLtoDOCX from 'html-to-docx';
import { marked } from 'marked';

export async function POST(req: Request) {
  try {
    const { 
      markdown, 
      subject, 
      phase,
      placeName, 
      principalName, 
      principalNip, 
      teacherName, 
      teacherNip,
      dateString
    } = await req.json();

    if (!markdown) {
      return NextResponse.json({ error: 'Markdown content is required' }, { status: 400 });
    }

    // 1. Convert Markdown to HTML
    const htmlContent = await marked.parse(markdown);

    // 2. Build the full HTML Document
    // Using basic inline styles that html-to-docx can interpret
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Modul Ajar</title>
        <style>
          body { font-family: "Times New Roman", Times, serif; font-size: 12pt; }
          h1, h2, h3, h4, h5, h6 { font-family: "Times New Roman", Times, serif; }
          .center { text-align: center; }
          .title { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 0px; }
          .subtitle { font-size: 14pt; font-weight: bold; margin-top: 5px; margin-bottom: 20px; }
          .border-bottom { border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; }
          .signature-table { border: none; width: 100%; margin-top: 50px; }
          .signature-table td { border: none; text-align: center; width: 50%; }
          .signature-line { font-weight: bold; text-decoration: underline; margin-bottom: 0px; }
          .nip { margin-top: 2px; }
        </style>
      </head>
      <body>
        <div style="text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="text-align: center; font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">MODUL AJAR ${(subject || '').toUpperCase()}</h1>
          <h2 style="text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 0px;">FASE ${(phase || '').toUpperCase()}</h2>
        </div>

        <div>
          ${htmlContent}
        </div>

        <table class="signature-table">
          <tr>
            <td>
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <br><br><br><br>
              <p class="signature-line">${principalName || "(............................................)"}</p>
              <p class="nip">NIP. ${principalNip || "........................................"}</p>
            </td>
            <td>
              <p>${placeName || "................."}, ${dateString || ''}</p>
              <p>Guru Mata Pelajaran</p>
              <br><br><br><br>
              <p class="signature-line">${teacherName || "(............................................)"}</p>
              <p class="nip">NIP. ${teacherNip || "........................................"}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 3. Convert to DOCX Buffer
    const fileBuffer = await HTMLtoDOCX(fullHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    // 4. Return the file as response
    const safeSubject = String(subject || 'RPP').replace(/[^a-zA-Z0-9]/g, '_');
    const contentDisposition = 'attachment; filename="Modul_Ajar_' + safeSubject + '.docx"';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': contentDisposition
      }
    });

  } catch (error: any) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json(
      { error: 'Failed to generate Word Document' },
      { status: 500 }
    );
  }
}
