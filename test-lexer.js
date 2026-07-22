const { marked } = require('marked');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } = require('docx');

const md = `
# Judul
Ini teks biasa dengan **tebal**.

- List 1
- List 2

| Kolom 1 | Kolom 2 |
|---------|---------|
| A       | B       |
| C       | D       |
`;

const tokens = marked.lexer(md);

function processTokens(tokens) {
  const docChildren = [];
  
  for (const token of tokens) {
    if (token.type === 'heading') {
      docChildren.push(new Paragraph({
        children: [new TextRun({ text: token.text, bold: true, size: 24 })]
      }));
    } else if (token.type === 'paragraph') {
      // Simplified inline parser for bold
      const runs = [];
      const parts = token.text.split(/(\*\*.*?\*\*)/g);
      for (const p of parts) {
        if (p.startsWith('**')) {
          runs.push(new TextRun({ text: p.slice(2, -2), bold: true, size: 24 }));
        } else if (p) {
          runs.push(new TextRun({ text: p, size: 24 }));
        }
      }
      docChildren.push(new Paragraph({ children: runs }));
    } else if (token.type === 'list') {
      for (const item of token.items) {
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: item.text, size: 24 })],
          bullet: { level: 0 }
        }));
      }
    } else if (token.type === 'table') {
      const rows = [];
      // Header
      const headerCells = token.header.map(h => 
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h.text, bold: true, size: 24 })]})] })
      );
      rows.push(new TableRow({ children: headerCells }));
      // Rows
      for (const row of token.rows) {
        const rowCells = row.map(c => 
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.text, size: 24 })]})] })
        );
        rows.push(new TableRow({ children: rowCells }));
      }
      docChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows
      }));
    } else if (token.type === 'space') {
      docChildren.push(new Paragraph({ children: [new TextRun({ text: "" })]}));
    }
  }
  return docChildren;
}

const doc = new Document({ sections: [{ children: processTokens(tokens) }] });
Packer.toBuffer(doc).then(b => console.log("OK:", b.length)).catch(console.error);
