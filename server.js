import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import emailScheduler from './emailScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('TimeCapsule Backend is running...');
});

// Start the scheduler
emailScheduler();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
