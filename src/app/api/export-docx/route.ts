import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } from 'docx';
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

    const docChildren: any[] = [];

    // Tittle
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `MODUL AJAR ${(subject || '').toUpperCase()}`,
            bold: true,
            font: "Times New Roman",
            size: 28, // 14pt
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `FASE ${(phase || '').toUpperCase()}`,
            bold: true,
            font: "Times New Roman",
            size: 24, // 12pt
          })
        ]
      })
    );

    // Markdown Parser
    const tokens = marked.lexer(markdown);
    
    const parseInlineText = (text: string, defaultBold = false) => {
      const runs: TextRun[] = [];
      // Normalize <br>, <br/>, <br /> to a special delimiter
      const normalizedText = text.replace(/<br\s*\/?>/gi, '___BR___');
      const lines = normalizedText.split('___BR___');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isNewLine = i > 0;
        
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        for (let j = 0; j < parts.length; j++) {
          const p = parts[j];
          const needsBreak = (j === 0 && isNewLine) ? 1 : undefined;
          
          if (p.startsWith('**') && p.endsWith('**')) {
            runs.push(new TextRun({ text: p.slice(2, -2).replace(/\*/g, ''), bold: true, font: "Times New Roman", size: 24, break: needsBreak }));
          } else if (p.startsWith('*') && p.endsWith('*')) {
            runs.push(new TextRun({ text: p.slice(1, -1).replace(/\*/g, ''), italics: true, font: "Times New Roman", size: 24, break: needsBreak }));
          } else if (p) {
            const cleanText = p.replace(/\*/g, '');
            if (cleanText) {
              runs.push(new TextRun({ text: cleanText, bold: defaultBold, font: "Times New Roman", size: 24, break: needsBreak }));
            } else if (needsBreak) {
              runs.push(new TextRun({ text: "", break: needsBreak }));
            }
          } else if (needsBreak) {
            runs.push(new TextRun({ text: "", break: needsBreak }));
          }
        }
      }
      return runs;
    };

    for (const token of tokens) {
      let tokenText = token.text || '';
      
      // Auto format section headers (e.g. A. Identitas Modul) to be UPPERCASE and BOLD
      if (token.type === 'heading' || token.type === 'paragraph') {
        const lines = tokenText.split('\n');
        // Match lines starting with A., B., etc., ignoring leading asterisks
        if (/^(?:\*\*?)?[A-Z]\.\s/i.test(lines[0].trim())) {
          lines[0] = lines[0].replace(/\*/g, '').toUpperCase();
          if (token.type === 'paragraph') {
            lines[0] = `**${lines[0]}**`;
          }
          tokenText = lines.join('\n');
        }
      }

      if (token.type === 'heading') {
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: tokenText, bold: true, font: "Times New Roman", size: 28 })],
          spacing: { after: 200 }
        }));
      } else if (token.type === 'paragraph') {
        docChildren.push(new Paragraph({
          children: parseInlineText(tokenText),
          spacing: { after: 120 }
        }));
      } else if (token.type === 'list') {
        const isOrdered = token.ordered;
        for (const item of token.items) {
          docChildren.push(new Paragraph({
            children: parseInlineText(item.text),
            numbering: { 
              reference: isOrdered ? "my-numbered-list" : "my-bullet-list", 
              level: 0 
            },
            spacing: { after: 120 }
          }));
        }
      } else if (token.type === 'table') {
        const rows = [];
        
        // Determine column alignments based on headers
        const colAlignments = token.header.map((h: any) => {
          const headerText = h.text.trim().toLowerCase();
          if (headerText === 'no' || headerText === 'no.' || headerText === 'waktu') {
            return AlignmentType.CENTER;
          }
          return AlignmentType.START;
        });
        
        // Header
        const headerCells = token.header.map((h: any, i: number) => 
          new TableCell({ 
            children: [new Paragraph({ 
              children: parseInlineText(h.text, true),
              alignment: AlignmentType.CENTER // Headers usually look best centered
            })],
            padding: { top: 100, bottom: 100, left: 100, right: 100 },
            shading: { fill: "F3F4F6" } // Light gray background for professional look
          })
        );
        rows.push(new TableRow({ children: headerCells }));
        
        // Rows
        for (const row of token.rows) {
          const rowCells = row.map((c: any, i: number) => {
            // Check if cell content is just a number
            const isJustNumber = /^\d+$/.test(c.text.trim());
            const alignment = isJustNumber ? AlignmentType.CENTER : colAlignments[i];
            
            return new TableCell({ 
              children: [new Paragraph({ 
                children: parseInlineText(c.text),
                alignment: alignment
              })],
              padding: { top: 100, bottom: 100, left: 100, right: 100 }
            });
          });
          rows.push(new TableRow({ children: rowCells }));
        }
        
        docChildren.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows
        }));
        
        // Add spacing after table
        docChildren.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "", size: 24 })] }));
      } else if (token.type === 'space') {
        docChildren.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "", size: 24 })] }));
      }
    }

    // Spacer
    docChildren.push(new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: "" })]
    }));

    // Signature Table (No Borders)
    docChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: { style: BorderStyle.NONE, size: 0 },
                  bottom: { style: BorderStyle.NONE, size: 0 },
                  left: { style: BorderStyle.NONE, size: 0 },
                  right: { style: BorderStyle.NONE, size: 0 },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0 },
                  insideVertical: { style: BorderStyle.NONE, size: 0 }
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Mengetahui,', font: "Times New Roman", size: 24 })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 800 },
                    children: [new TextRun({ text: 'Kepala Sekolah', font: "Times New Roman", size: 24 })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: principalName || '(......................................................)', bold: true, underline: {}, font: "Times New Roman", size: 24 })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `NIP. ${principalNip || '....................................'}`, font: "Times New Roman", size: 24 })]
                  })
                ]
              }),
              new TableCell({
                borders: {
                  top: { style: BorderStyle.NONE, size: 0 },
                  bottom: { style: BorderStyle.NONE, size: 0 },
                  left: { style: BorderStyle.NONE, size: 0 },
                  right: { style: BorderStyle.NONE, size: 0 },
                  insideHorizontal: { style: BorderStyle.NONE, size: 0 },
                  insideVertical: { style: BorderStyle.NONE, size: 0 }
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `${placeName || '.................'}, ${dateString || ''}`, font: "Times New Roman", size: 24 })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 800 },
                    children: [new TextRun({ text: 'Guru Mata Pelajaran', font: "Times New Roman", size: 24 })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: teacherName || '(......................................................)', bold: true, underline: {}, font: "Times New Roman", size: 24 })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `NIP. ${teacherNip || '....................................'}`, font: "Times New Roman", size: 24 })]
                  })
                ]
              })
            ]
          })
        ]
      })
    );

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "my-numbered-list",
            levels: [
              {
                level: 0,
                format: "decimal",
                text: "%1.",
                alignment: "start",
                style: { paragraph: { indent: { left: 720, hanging: 360 } } }
              }
            ]
          },
          {
            reference: "my-bullet-list",
            levels: [
              {
                level: 0,
                format: "bullet",
                text: "\u2022",
                alignment: "start",
                style: { paragraph: { indent: { left: 720, hanging: 360 } } }
              }
            ]
          }
        ]
      },
      sections: [{ children: docChildren }]
    });

    const buffer = await Packer.toBuffer(doc);
    const safeSubject = String(subject || 'RPP').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Modul_Ajar_${safeSubject}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString()
      }
    });

  } catch (error: any) {
    console.error('Error generating DOCX:', error.message);
    return NextResponse.json(
      { error: `Failed to generate Word Document: ${error.message}` },
      { status: 500 }
    );
  }
}


