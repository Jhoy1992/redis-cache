const express = require("express");
const redis = require("redis");
const bodyParser = require("body-parser");
const cors = require("cors");
const { promisify } = require("util");

const redisClient = redis.createClient();
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const expireAsync = promisify(redisClient.expire).bind(redisClient);
const existsAsync = promisify(redisClient.exists).bind(redisClient);

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

const getResultFromCache = async (number, res) => {
  const cacheTime = Date.now();

  const result = await getAsync(number);

  if (!result) return error.message;

  console.log("Cache request took", Date.now() - cacheTime, " ms");
  res.redirect("/done?result=" + result + "&from=cache");
};

const getResultFromApi = async (number, res) => {
  const getResult = (number) =>
    new Promise((resolve, reject) => {
      setTimeout(() => resolve(number * 2), 1500);
    });

  const ApiTime = Date.now();
  const result = await getResult(number);

  console.log("API Request took", Date.now() - ApiTime, "Milliseconds");

  await setAsync(number, result);
  await expireAsync(number, 60);

  res.redirect("/done?result=" + result + "&from=API");
};

app.post("/", async (req, res) => {
  const { number } = req.body;

  const hasCache = await existsAsync(number);

  if (hasCache) {
    getResultFromCache(number, res);
  } else {
    getResultFromApi(number, res);
  }
});

app.get("/", (req, res) => {
  res.send(`
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>Document</title>
      </head>
      <body>
        hi there
        <form action="/" method="post">
          <input type="number" name="number" placeholder="a number" />
          <input type="submit" />
        </form>
      </body>
    </html>
  `);
});

app.get("/done", (req, res) => {
  res.send(`
   <html>
      <head>
      </head>
      <body>
        The Result is: ${req.query.result}
        <br/>
        So the original value is ${req.query.result / 2}
        <br/>
        And comes from: ${req.query.from}
      </body>
   </html>
   `);
});

app.listen(8080);
