import express from "express";

const app = express();
const PORT = 8000;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Node.js",
    data: {
      id: 1,
      name: "Shuaib Khan",
      profession: "Software Engineer"
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
