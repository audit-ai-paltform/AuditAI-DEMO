import { validateRequest } from '../../core/http/middleware/validation.middleware.js';
import { createCallSchema } from './dto/create-call.dto.js';
import { updateCallSchema } from './dto/update-call.dto.js';
import { queryCallSchema, callIdParamSchema } from './dto/query-call.dto.js';

export const validateCreateCall = validateRequest({ body: createCallSchema });
export const validateUpdateCall = validateRequest({ params: callIdParamSchema, body: updateCallSchema });
export const validateGetCallById = validateRequest({ params: callIdParamSchema });
export const validateListCalls = validateRequest({ query: queryCallSchema });
export const validateDeleteCall = validateRequest({ params: callIdParamSchema });
