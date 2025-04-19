const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files (like your index.html)
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
