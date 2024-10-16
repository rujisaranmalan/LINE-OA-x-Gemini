const { onRequest } = require("firebase-functions/v2/https");
const line = require("./utils/line");
const gemini = require("./utils/gemini");
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();

// Wrap the Firestore document retrieval in an async function
const getDocumentData = async () => {
  const docRef = db.collection('line-chat-history').doc('history');
  const doc = await docRef.get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
  }
};

// Add a new document with a generated id.
const addDocumentData = async () => {
  try {
    const res = await db.collection('line-chat-history').add({
      user: 'What is LINE API',
      model: 'LINE API'
    });
    console.log('Added document with ID: ', res.id);
  } catch (error) {
    console.error('Error adding document: ', error);
  }
};


exports.webhook = onRequest(async (req, res) => {
  if (req.method === "POST") {
    const events = req.body.events;
    for (const event of events) {
      switch (event.type) {
        case "message":
          // Handle text messages
          if (event.message.type === "text") {
            console.log(event.message.text);
            const msg = await gemini.textOnly(event.message.text);
            await line.reply(event.replyToken, [{ type: "text", text: msg }]);
            return res.end();
          }
          
          // Handle image messages
          if (event.message.type === "image") {
            const imageBinary = await line.getImageBinary(event.message.id);
            const msg = await gemini.multimodal(imageBinary);
            await line.reply(event.replyToken, [{ type: "text", text: msg }]);
            return res.end();
          }
        break;
      }
    }
  }
  res.send(req.method);
});

module.exports = { getDocumentData, addDocumentData};