const HTMLtoDOCX = require('html-to-docx');
const { marked } = require('marked');

async function test() {
  const markdown = "# Hello World\n\nThis is **bold** text and a [link](https://google.com).";
  const html = await marked.parse(markdown);
  
  const combinedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: "Times New Roman", serif; font-size: 12pt; }
          h1, h2, h3 { font-family: "Times New Roman", serif; }
          table { width: 100%; border-collapse: collapse; border: none; }
          td { border: none; padding: 10px; }
        </style>
      </head>
      <body>
        ${html}
        <br><br>
        <table>
          <tr>
            <td style="text-align: center; border: none;">
              Mengetahui,<br>
              Kepala Sekolah<br><br><br><br>
              <u><strong>Nama Kepala</strong></u><br>
              NIP. 12345
            </td>
            <td style="text-align: center; border: none;">
              Jakarta, 12 Januari 2026<br>
              Guru Mata Pelajaran<br><br><br><br>
              <u><strong>Nama Guru</strong></u><br>
              NIP. 67890
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
  
  const buffer = await HTMLtoDOCX(combinedHtml, null, {
    font: 'Times New Roman',
    fontSize: 24, // 24 half-points = 12pt
    table: {
      row: {
        cantSplit: true
      }
    },
    footer: true,
    pageNumber: true
  });
  
  console.log("Success! Buffer size:", buffer.length);
}

test().catch(console.error);
