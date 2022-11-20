require("dotenv").config();
const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const app = express();
const bodyParse = require("body-parser");
const util = require("util"); // import util
const exec = util.promisify(require("child_process").exec); // exec
const fs = require("fs");
const _ = require("lodash");
const stringSimilarity = require("string-similarity");

//CockroachDB
const Pool = require("pg").Pool;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const getDirectories = (source) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

//MiddleWare
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"),
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, DELETE, PATCH, GET");
    return res.status(200).json({});
  }
  next();
});

//TEST
app.use(cors());
app.use(bodyParse.urlencoded({ extended: true }));
app.use(bodyParse.json());
app.use(morgan("dev"));

// Extract and store sound data
app.get("/", async (req, res) => {
  try {
    res.status(200).send({ msg: "Welcome to Trojan hack backend" });
  } catch (error) {
    console.log(error);
  }
});

app.get("/words", async (req, res) => {
  pool.query("SELECT * FROM words ORDER BY word ASC", (error, results) => {
    if (error) {
      throw error;
    }
    res.status(200).json(results.rows);
  });
});

app.post("/sound", async (req, res) => {
  const { userInput } = req.body;

  const words = userInput.split(" ");
  const logger = fs.createWriteStream("log.txt");

  words.forEach((word) => {
    const newWord = word.toLowerCase().trim();
    let checkComma = newWord.split(",");

    if (checkComma[0] === "" && checkComma[1] === "") {
      checkComma.pop();
    }

    let wordDatabase = [];
    checkComma.forEach(async (word) => {
      const finalWord = stringSimilarity.findBestMatch(
        word === "" ? "delay_time" : word,
        wordDatabase
      ).bestMatch.target;

      try {
        const files = await fs.promises.readdir(`./ed-sheeran/${finalWord}`);
        const wordVariant = _.sample(files);
        logger.write(`file ./ed-sheeran/${finalWord}/${wordVariant}\n`); // again
      } catch (error) {
        console.log(error);
      }

      console.log(
        "DEBUG:",
        finalWord,
        "- ORIG:",
        word === "" ? "delay_time" : word
      );
    });
  });

  try {
    await exec("ffmpeg -f concat -safe 0  -i log.txt -c copy -y -ac 1 out.wav");
  } catch (error) {
    console.log(error);
  }

  return res.status(200).send({ result: "Ready to download" });
});

app.post("/share_friend", (req, res) => {
  const { email } = req.body;
  const API_KEY = process.env.SEND_GRID_API;

  const sg = require("@sendgrid/mail");
  sg.setApiKey(API_KEY);

  const message = {
    to: email, //insert email from form over here
    from: "climapmessage@gmail.com",
    subject: "Ed Sheeran sings for you! 🎵",
    text:
      "Hello, your friend shared you an Ed Sheeran Song: \n" +
      "https://TROJAN-HACK-backend.herokuapp.com/music", //insert
  };

  sg.send(message)
    .then(() => {
      res.status(200).send({ msg: "Sent message" });
    })
    .catch((error) => {
      res.status(404).send({ error: error.response.body });
    });
});

app.get("/music/", (req, res) => {
  res.sendFile(__dirname + "/out.wav");
});

app.get("/download", (req, res) => {
  res.download(__dirname + "/out.wav");
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log("Running Server at " + port));
