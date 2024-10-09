const { onRequest } = require("firebase-functions/v2/https");
const line = require("./utils/line");
const gemini = require("./utils/gemini");
const ffmpeg = require("fluent-ffmpeg"); // Required for video frame extraction

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

          // Handle video messages
          if (event.message.type === "video") {
            const videoBinary = await line.getVideoBinary(event.message.id);
            const extractedFrames = await extractFramesFromVideo(videoBinary);

            // Process frames with gemini-1.5-flash (multimodal AI)
            const frameDescriptions = [];
            for (const frame of extractedFrames) {
              const description = await gemini.multimodal(frame);
              frameDescriptions.push(description);
            }

            // Combine descriptions and send back as a single response
            const combinedDescription = frameDescriptions.join(" ");
            await line.reply(event.replyToken, [
              { type: "text", text: combinedDescription },
            ]);
            return res.end();
          }
        break;
      }
    }
  }
  res.send(req.method);
});

// Helper function to extract frames from a video
const extractFramesFromVideo = async (videoBinary) => {
  return new Promise((resolve, reject) => {
    const frames = [];
    const tempVideoPath = `/tmp/inputVideo.mp4`; // Temporary location to store video file

    // Write video binary to temp file
    require("fs").writeFileSync(tempVideoPath, videoBinary);

    // Use ffmpeg to extract frames
    ffmpeg(tempVideoPath)
      .on("end", () => {
        resolve(frames);
      })
      .on("error", (err) => {
        reject(err);
      })
      .on("filenames", function (filenames) {
        frames.push(...filenames);
      })
      .screenshots({
        count: 5, // Number of frames to extract (adjust based on performance)
        folder: "/tmp", // Temporary folder to store extracted frames
        filename: "frame-%i.png",
      });
  });
};
