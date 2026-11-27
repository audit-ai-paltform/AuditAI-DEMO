import { Router } from 'express';
import { parameterController } from './parameters.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';
import {
  validateCreateParameter,
  validateUpdateParameter,
  validateGetParameterById,
  validateListParameters,
  validateDeleteParameter,
} from './parameters.validator.js';

const router = Router();

router.post('/ai-suggest', asyncHandler(parameterController.aiSuggest));
router.post('/', validateCreateParameter, asyncHandler(parameterController.create));
router.get('/', validateListParameters, asyncHandler(parameterController.list));
router.get('/:id', validateGetParameterById, asyncHandler(parameterController.getById));
router.patch('/:id', validateUpdateParameter, asyncHandler(parameterController.update));
router.delete('/:id', validateDeleteParameter, asyncHandler(parameterController.delete));

export const parameterRoutes = router;
