import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 3000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// Moderation Setup
const bannedWords = ["kill", "hack", "bomb"];

// Function to check if text contains banned words
function violatesModeration(text) {
  const regex = new RegExp(`\\b(${bannedWords.join("|")})\\b`, "i");
  return regex.test(text);
}

// Function to redact banned words safely
function moderateText(text) {
  const regex = new RegExp(`\\b(${bannedWords.join("|")})\\b`, "gi");
  return text.replace(regex, "[REDACTED]");
}

// Routes
app.post("/generate", async (req, res) => {
  const userPrompt = req.body.prompt;

  // Input Moderation
  if (violatesModeration(userPrompt)) {
    return res
      .status(400)
      .json({ message: "Your input violated the moderation policy." });
  }

  const systemPrompt = `
You are a helpful and safe AI assistant.
Always respond politely and avoid unsafe or illegal topics.
`;

  try {
    // Combine system + user prompts
    const prompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

    // Send to Gemini
    const result = await model.generateContent(prompt);
    let aiResponse = result.response.text();

    // Output Moderation
    if (violatesModeration(aiResponse)) {
      aiResponse = moderateText(aiResponse);
    }

    // Return Response
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () =>
  console.log(`Server running on http://localhost:${port}`)
);
