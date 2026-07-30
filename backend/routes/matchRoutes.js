import express from 'express';
import {
  likeUser,
  unlikeUser,
  getMatches,
  getLikesReceived,
  getLikesSent,
  acceptMatch,
  rejectMatch,
} from '../controllers/matchController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { userIdParamValidator, matchIdParamValidator } from '../validators/matchValidators.js';

const router = express.Router();

router.post('/like/:userId', protect, userIdParamValidator, validate, likeUser);
router.delete('/unlike/:userId', protect, userIdParamValidator, validate, unlikeUser);
router.get('/', protect, getMatches);
router.get('/likes/received', protect, getLikesReceived);
router.get('/likes/sent', protect, getLikesSent);
router.put('/:matchId/accept', protect, matchIdParamValidator, validate, acceptMatch);
router.put('/:matchId/reject', protect, matchIdParamValidator, validate, rejectMatch);

export default router;
