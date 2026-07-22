const { POST } = require('./.next/server/app/api/export-docx/route.js');

async function run() {
  try {
    const req = {
      json: async () => ({
        markdown: '# Test\n| H |\n| - |\n| 1 |',
        subject: 'Test Subject',
        phase: 'A',
        placeName: 'Jakarta',
        principalName: 'John',
        principalNip: '123',
        teacherName: 'Jane',
        teacherNip: '456',
        dateString: '2026-07-21'
      })
    };
    
    console.log('Calling POST...');
    const res = await POST(req);
    console.log('Status:', res.status);
    if (res.status === 500) {
      const text = await res.text();
      console.log('Error Body:', text);
    } else {
      console.log('Success!');
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

run();
