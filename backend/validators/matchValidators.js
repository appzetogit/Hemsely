import { param } from 'express-validator';

export const userIdParamValidator = [param('userId').isMongoId().withMessage('Invalid user id')];
export const matchIdParamValidator = [param('matchId').isMongoId().withMessage('Invalid match id')];
