import { Router } from 'express';
import { scriptController } from './scripts.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';
import {
  validateCreateScript,
  validateUpdateScript,
  validateGetScriptById,
  validateListScripts,
  validateDeleteScript,
} from './scripts.validator.js';

const router = Router();

router.post('/extract-rules', asyncHandler(scriptController.extractRules));
router.post('/', validateCreateScript, asyncHandler(scriptController.create));
router.get('/', validateListScripts, asyncHandler(scriptController.list));
router.get('/:id', validateGetScriptById, asyncHandler(scriptController.getById));
router.patch('/:id', validateUpdateScript, asyncHandler(scriptController.update));
router.delete('/:id', validateDeleteScript, asyncHandler(scriptController.delete));

export const scriptRoutes = router;
