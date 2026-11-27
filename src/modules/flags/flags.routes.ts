import { Router } from 'express';
import { flagController } from './flags.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';

const router = Router();

router.get('/', asyncHandler(flagController.list));
router.get('/counts', asyncHandler(flagController.counts));
router.get('/types', asyncHandler(flagController.types));
router.get('/:id', asyncHandler(flagController.getById));
router.patch('/:id', asyncHandler(flagController.resolve));
router.post('/:id/resolve', asyncHandler(flagController.resolve));
router.post('/:id/dismiss', asyncHandler(flagController.resolve));

export const flagRoutes = router;
