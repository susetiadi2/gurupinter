const { Document, Packer, Paragraph, TextRun, Numbering } = require('docx');

async function test() {
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
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 }
                }
              }
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
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 }
                }
              }
            }
          ]
        }
      ]
    },
    sections: [{
      children: [
        new Paragraph({
          text: "Item 1",
          numbering: { reference: "my-numbered-list", level: 0 }
        }),
        new Paragraph({
          text: "Item 2",
          numbering: { reference: "my-numbered-list", level: 0 }
        }),
        new Paragraph({
          text: "Bullet 1",
          numbering: { reference: "my-bullet-list", level: 0 }
        })
      ]
    }]
  });
  
  const buffer = await Packer.toBuffer(doc);
  console.log("OK:", buffer.length);
}

test().catch(console.error);
