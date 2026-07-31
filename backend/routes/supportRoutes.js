import express from 'express';
import {
  getSupportConfig,
  createTicket,
  getUserTickets,
} from '../controllers/ticketController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/config', getSupportConfig);
router.post('/tickets', protect, createTicket);
router.get('/my-tickets', protect, getUserTickets);

export default router;
