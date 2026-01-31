import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './config/index.js';
import apiRoutes from './api/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// API routes
app.use('/api', apiRoutes);

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Booking server running at http://localhost:${config.port}`);
  console.log(`📅 Owner: ${config.booking.ownerName}`);
  console.log(`⏰ Working hours: ${config.booking.workingHoursStart}:00 - ${config.booking.workingHoursEnd}:00`);
  console.log(`📆 Slot duration: ${config.booking.slotDuration} minutes`);
});
