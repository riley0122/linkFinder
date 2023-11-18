const PORT = 3000;
const express = require("express");
const app = express();
const axios = require("axios");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let cache = {};

app.get("/scan/:link", (req, res) => {
  console.log(`Client connected (${req.ip})`);
  console.log("Scanning " + req.params.link);
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ name: "started", data: "url" })}\n\n`);

  if (cache.hasOwnProperty(req.params.link)) {
    console.log("using cache");
    for (let i = 0; i < cache[req.params.link].length; i++) {
      const element = cache[req.params.link][i];
      res.write(
        `data: ${JSON.stringify({
          name: "url",
          data: element.split('href="')[1].split('"')[0],
        })}\n\n`
      );
    }
    res.write(`data: ${JSON.stringify({ name: "finished" })}\n\n`);

    res.end();
    return;
  }

  axios
    .get(req.params.link)
    .then((result) => {
      console.log("uncached");
      cache[req.params.link] = result.data.match(/(?:href="http).*?(?:")/g);
      for (
        let i = 0;
        i < result.data.match(/(?:href="http).*?(?:")/g).length;
        i++
      ) {
        const element = result.data.match(/(?:href="http).*?(?:")/g)[i];
        let url = element.split('href="')[1].split('"')[0];
        if (url.endsWith("/")) {
          url.slice(0, -1);
        }
        res.write(
          `data: ${JSON.stringify({
            name: "url",
            data: url,
          })}\n\n`
        );
      }
      res.write(`data: ${JSON.stringify({ name: "finished" })}\n\n`);
    })
    .catch((error) => {
      res.write(
        `data: ${JSON.stringify({
          name: "error",
          data: "Invalid url",
        })}\n\n`
      );
    });

  res.on("close", () => {
    console.log("client dropped me");
    res.end();
  });
});

app.listen(PORT);
