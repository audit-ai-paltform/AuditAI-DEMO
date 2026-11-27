import { Router } from 'express';
import { clientController } from './clients.controller.js';
import { asyncHandler } from '../../core/http/middleware/async-handler.js';
import {
  validateCreateClient,
  validateUpdateClient,
  validateGetClientById,
  validateListClients,
  validateDeleteClient,
} from './clients.validator.js';

const router = Router();

router.post('/', validateCreateClient, asyncHandler(clientController.create));
router.get('/', validateListClients, asyncHandler(clientController.list));
router.get('/:id', validateGetClientById, asyncHandler(clientController.getById));
router.patch('/:id', validateUpdateClient, asyncHandler(clientController.update));
router.delete('/:id', validateDeleteClient, asyncHandler(clientController.delete));

export const clientRoutes = router;
