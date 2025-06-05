import 'dotenv/config'
import OpenAI from "openai";
import express from "express";
import ViteExpress from "vite-express";
import cors from "cors";

console.log(process.env.VITE_OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

const systemSetup = "You are an AI avatar designed for a live demonstration at an exhibition about artificial intelligence. " +
  "You interact with visitors in real-time, in a clear, concise, and engaging manner. " +
  "Your responses must always be limited to a single sentence, with no extra commentary or elaboration. " +
  "You only respond to the most recent question asked by the user, ignoring all previous ones if they are no longer relevant. " +
  "For every sentence the user says, you will also receive information about the user's gesture. " +
  "You will use this information to response to the user. "


const app = express();
app.use(cors({
  origin: '*', // Allow all origins for demonstration purposes
  methods: ['GET', 'POST'], // Allow GET and POST methods
}));
app.use(express.json());

app.post('/openai/complete', async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemSetup},
        { role: 'user', content: prompt }
      ],
      // model: 'gpt-4',
      model: 'gpt-3.5-turbo',
    });
    console.log('OpenAI response:', chatCompletion.choices[0].message.content);
    res.json({ text: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    res.status(500).send('Error processing your request');
  }
});


const server = app.listen(3000, "0.0.0.0", () =>
  console.log("Server is listening...")
);

ViteExpress.bind(app, server);