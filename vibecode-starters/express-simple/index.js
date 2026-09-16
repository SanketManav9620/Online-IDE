const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('<h1>⚡ VibeCode Express Starter</h1><p>Server running successfully in WebContainer!</p>');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
