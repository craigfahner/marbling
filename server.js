const express = require("express");
const path = require("path");

const app = express();

const port = process.env.PORT || 3000;

app.use("/", express.static(path.join(__dirname, "public")));
app.use("/marbling", express.static(path.join(__dirname, "dist1")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist1", "index.html"));
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
