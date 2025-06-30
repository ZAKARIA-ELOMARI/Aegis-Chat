const OpenAI = require('openai');
const logger = require('../config/logger');

// Configure the OpenAI client with your API key from .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// @desc   Get a response from the AI chatbot
// @route  POST /api/ai/chat
// @access Private
exports.askAIChatbot = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: 'A prompt is required.' });
    }

    // This is where we define the AI's personality and instructions.
    // It helps ensure the responses are focused and appropriate.
    const systemPrompt = "You are Aegis, a friendly and professional cybersecurity assistant. Your goal is to provide clear, concise, and helpful advice on cybersecurity topics. Do not go off-topic. Format your answers clearly, using bullet points or numbered lists where appropriate.";

    // Make the API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // A fast and cost-effective model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
    });

    // Extract the AI's message from the response
    const aiResponse = completion.choices[0].message.content;

    res.status(200).json({ response: aiResponse });

  } catch (error) {
    logger.error('OpenAI API request failed:', { error: error.message, prompt: req.body.prompt, userId: req.user?.id });
    res.status(500).json({ message: 'Failed to get a response from the AI assistant.' });
  }
};