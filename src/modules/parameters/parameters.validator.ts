import { validateRequest } from '../../core/http/middleware/validation.middleware.js';
import { createParameterSchema } from './dto/create-parameter.dto.js';
import { updateParameterSchema } from './dto/update-parameter.dto.js';
import { queryParameterSchema, parameterIdParamSchema } from './dto/query-parameter.dto.js';

export const validateCreateParameter = validateRequest({ body: createParameterSchema });
export const validateUpdateParameter = validateRequest({ params: parameterIdParamSchema, body: updateParameterSchema });
export const validateGetParameterById = validateRequest({ params: parameterIdParamSchema });
export const validateListParameters = validateRequest({ query: queryParameterSchema });
export const validateDeleteParameter = validateRequest({ params: parameterIdParamSchema });
