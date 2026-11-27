import { Router } from 'express';
import { agentController } from './agents.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';
import {
  validateCreateAgent,
  validateUpdateAgent,
  validateGetAgentById,
  validateListAgents,
  validateDeleteAgent,
} from './agents.validator.js';

const router = Router();

router.post('/', validateCreateAgent, asyncHandler(agentController.create));
router.get('/', validateListAgents, asyncHandler(agentController.list));
router.get('/:id', validateGetAgentById, asyncHandler(agentController.getById));
router.patch('/:id', validateUpdateAgent, asyncHandler(agentController.update));
router.delete('/:id', validateDeleteAgent, asyncHandler(agentController.delete));

export const agentRoutes = router;
