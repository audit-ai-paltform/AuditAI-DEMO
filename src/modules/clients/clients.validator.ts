import { validateRequest } from '../../core/http/middleware/validation.middleware.js';
import { createClientSchema } from './dto/create-client.dto.js';
import { updateClientSchema } from './dto/update-client.dto.js';
import { queryClientSchema, clientIdParamSchema } from './dto/query-client.dto.js';

export const validateCreateClient = validateRequest({ body: createClientSchema });
export const validateUpdateClient = validateRequest({ params: clientIdParamSchema, body: updateClientSchema });
export const validateGetClientById = validateRequest({ params: clientIdParamSchema });
export const validateListClients = validateRequest({ query: queryClientSchema });
export const validateDeleteClient = validateRequest({ params: clientIdParamSchema });
