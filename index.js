import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();

const cors = require("cors");

app.use(cors());

const port = 3000;

// Middleware
app.use(bodyParser.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// Moderation logic
const bannedWords = ["kill", "bomb", "hack"];

function violatesModeration(text) {
  return bannedWords.some(word => text.toLowerCase().includes(word));
}

// Routes
app.post("/generate", async (req, res) => {
  const userPrompt = req.body.prompt;

  // 1️⃣ Input moderation
  if (violatesModeration(userPrompt)) {
    return res.status(400).json({ message: "❌ Your input violated the moderation policy." });
  }

  const systemPrompt = `You are a helpful and safe AI assistant. Always respond politely and avoid unsafe or illegal topics.`;

  try {
    // 2️⃣ Combine system + user prompts
    const prompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

    // 3️⃣ Send to Gemini
    const result = await model.generateContent(prompt);
    let aiResponse = result.response.text();

    // 4️⃣ Output moderation
    if (violatesModeration(aiResponse)) {
      aiResponse = aiResponse.replace(
        new RegExp(bannedWords.join("|"), "gi"),
        "[REDACTED]"
      );
    }

    // 5️⃣ Respond
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
