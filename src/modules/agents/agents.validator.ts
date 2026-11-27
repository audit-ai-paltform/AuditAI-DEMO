import { validateRequest } from '../../core/http/middleware/validation.middleware.js';
import { createAgentSchema } from './dto/create-agent.dto.js';
import { updateAgentSchema } from './dto/update-agent.dto.js';
import { queryAgentSchema, agentIdParamSchema } from './dto/query-agent.dto.js';

export const validateCreateAgent = validateRequest({ body: createAgentSchema });
export const validateUpdateAgent = validateRequest({ params: agentIdParamSchema, body: updateAgentSchema });
export const validateGetAgentById = validateRequest({ params: agentIdParamSchema });
export const validateListAgents = validateRequest({ query: queryAgentSchema });
export const validateDeleteAgent = validateRequest({ params: agentIdParamSchema });
