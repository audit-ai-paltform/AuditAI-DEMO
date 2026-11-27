import { validateRequest } from '../../core/http/middleware/validation.middleware.js';
import { createScriptSchema } from './dto/create-script.dto.js';
import { updateScriptSchema } from './dto/update-script.dto.js';
import { queryScriptSchema, scriptIdParamSchema } from './dto/query-script.dto.js';

export const validateCreateScript = validateRequest({ body: createScriptSchema });
export const validateUpdateScript = validateRequest({ params: scriptIdParamSchema, body: updateScriptSchema });
export const validateGetScriptById = validateRequest({ params: scriptIdParamSchema });
export const validateListScripts = validateRequest({ query: queryScriptSchema });
export const validateDeleteScript = validateRequest({ params: scriptIdParamSchema });
