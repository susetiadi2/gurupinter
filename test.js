const htmlToDocx = require('html-to-docx');
const { marked } = require('marked');

async function test() {
  try {
    const markdown = '| Header |\n| --- |\n| Data |';
    let htmlContent = await marked.parse(markdown);
    
    // Inject inline styles into markdown tables so they render properly in Word without relying on complex CSS
    htmlContent = htmlContent.replace(/<table/g, '<table border="1" style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid black;"');
    htmlContent = htmlContent.replace(/<th/g, '<th style="border: 1px solid black; padding: 5px; text-align: left; vertical-align: top;"');
    htmlContent = htmlContent.replace(/<td/g, '<td style="border: 1px solid black; padding: 5px; text-align: left; vertical-align: top;"');

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: "Times New Roman", Times, serif; font-size: 12pt; }
        </style>
      </head>
      <body>
        <div>
          ${htmlContent}
        </div>
      </body>
      </html>
    `;
    
    await htmlToDocx(fullHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });
    console.log('Success (inline injected styles)');
  } catch(e) {
    console.error('Error (inline injected styles):', e);
  }

  try {
    const fullHtml2 = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: "Times New Roman", Times, serif; font-size: 12pt; }
          table { border: 1px solid black; }
          th, td { border: 1px solid black; }
        </style>
      </head>
      <body>
        <table style="border: none;">
          <tr><td style="border: none;">Test</td></tr>
        </table>
      </body>
      </html>
    `;
    await htmlToDocx(fullHtml2, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });
    console.log('Success (inline border none)');
  } catch(e) {
    console.error('Error (inline border none):', e);
  }
}

test();
