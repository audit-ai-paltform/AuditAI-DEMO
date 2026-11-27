import { ScriptEntity, ScriptListResult } from '../scripts.types.js';
import { CreateScriptDto } from '../dto/create-script.dto.js';
import { UpdateScriptDto } from '../dto/update-script.dto.js';
import { QueryScriptDto } from '../dto/query-script.dto.js';

export interface IScriptRepository {
  create(dto: CreateScriptDto): Promise<ScriptEntity>;
  findById(id: string): Promise<ScriptEntity | null>;
  findAll(query: QueryScriptDto): Promise<ScriptListResult>;
  update(id: string, dto: UpdateScriptDto): Promise<ScriptEntity>;
  delete(id: string): Promise<void>;
}
