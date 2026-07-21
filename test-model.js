const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const m = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await m.generateContent('hi');
    console.log('SUCCESS:', result.response.text());
  } catch (e) {
    console.log('FAILED:', e.message);
  }
}
run();
