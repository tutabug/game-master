const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');

async function testGemini() {
  console.log('Testing Gemini API connection...');

  const chat = new ChatGoogleGenerativeAI({
    apiKey: 'AIzaSyBhUBho3HLuLdZSgAzbRDHN5xpLYRZHm0A',
    model: 'gemini-2.5-flash',
    temperature: 0.3,
  });

  console.log('Sending test message...');

  try {
    const response = await chat.invoke([{ role: 'user', content: 'Say hello in one word' }]);

    console.log('Success! Response:', response.content);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testGemini();
