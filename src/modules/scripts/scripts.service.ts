import { IScriptRepository } from './interfaces/script-repository.interface.js';
import { scriptRepository } from './scripts.repository.js';
import { ScriptEntity, ScriptListResult } from './scripts.types.js';
import { CreateScriptDto } from './dto/create-script.dto.js';
import { UpdateScriptDto } from './dto/update-script.dto.js';
import { QueryScriptDto } from './dto/query-script.dto.js';
import { NotFoundException } from '../../core/exceptions/not-found.exception.js';

export class ScriptService {
  constructor(private readonly repo: IScriptRepository = scriptRepository) {}

  public async createScript(dto: CreateScriptDto): Promise<ScriptEntity> {
    return this.repo.create(dto);
  }

  public async getScriptById(id: string): Promise<ScriptEntity> {
    const script = await this.repo.findById(id);
    if (!script) {
      throw new NotFoundException(`Script with ID '${id}' not found`);
    }
    return script;
  }

  public async listScripts(query: QueryScriptDto): Promise<ScriptListResult> {
    return this.repo.findAll(query);
  }

  public async updateScript(id: string, dto: UpdateScriptDto): Promise<ScriptEntity> {
    await this.getScriptById(id);
    return this.repo.update(id, dto);
  }

  public async deleteScript(id: string): Promise<void> {
    await this.getScriptById(id);
    await this.repo.delete(id);
  }
}

export const scriptService = new ScriptService();
