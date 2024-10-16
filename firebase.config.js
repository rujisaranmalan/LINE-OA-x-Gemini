const admin = require('firebase-admin');

const serviceAccount = require('./functions/config/ai-grounding-llm-tcrb-101-firebase-adminsdk-zc4lo-8568f7a4b4.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://ai-grounding-llm-tcrb-101.firebaseio.com'
});

const db = admin.firestore();

module.exports = { db };
