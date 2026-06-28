require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); 
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db.config');
const webhookRoutes = require('./routes/webhook.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Database Connection
connectDB();

// Middleware
app.use(express.json());
app.use(cors()); 

// Routes
app.use('/', webhookRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Webhook server is listening on http://localhost:${PORT}`);
});
