const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require('../../firebase.config');
const admin = require('firebase-admin'); // Added for Firestore FieldValue
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const getDocumentData = require('../index')

const textOnly = async (prompt) => {
  // For text-only input, use the gemini-1.5-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const multimodal = async (imageBinary) => {
  // For multimodal input, use the gemini-1.5-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const prompt = "ช่วยบรรยายภาพนี้ให้หน่อย";
  const mimeType = "image/png";

  const imageParts = [
    {
      inlineData: {
        data: Buffer.from(imageBinary, "binary").toString("base64"),
        mimeType,
      },
    },
  ];

  const result = await model.generateContent([prompt, ...imageParts]);
  return result.response.text();
};

const chat = async (prompt) => {
  try{
  // For chat-based input, use the gemini-1.5-pro model for consistency
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  // Start a new chat with the provided prompt and limited chat history
  const chat = model.startChat({
    history: [
      // Limit the history to the last 5 messages if available
      ...(getDocumentData ? getDocumentData().slice(-5) : []),
      { role: "user", parts: [{ text: prompt }] }
    ]
  });

  const result = await chat.sendMessage(prompt);
  console.log("RESULT MESSAGE", result)

  // Store the chat history in Firestore
  const chatHistoryRef =  db.collection('line-chat-history').doc('history');
  await chatHistoryRef.set({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    sender: "user",
    message: prompt,
  });

  await chatHistoryRef.collection('messages').add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    sender: "model",
    message: result.response.text(),
  });

  await chatHistoryRef()

  return result.response.text();
  
  }
  catch (error) {
    console.error("Error during chat interaction:", error);
    // Handle the error appropriately, such as displaying an error message to the user.
  }
};

module.exports = { textOnly, multimodal, chat };
