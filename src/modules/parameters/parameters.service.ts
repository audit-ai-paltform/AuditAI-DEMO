import { IParameterRepository } from './interfaces/parameter-repository.interface.js';
import { parameterRepository } from './parameters.repository.js';
import { ParameterEntity, ParameterListResult } from './parameters.types.js';
import { CreateParameterDto } from './dto/create-parameter.dto.js';
import { UpdateParameterDto } from './dto/update-parameter.dto.js';
import { QueryParameterDto } from './dto/query-parameter.dto.js';
import { NotFoundException } from '../../core/exceptions/not-found.exception.js';

export class ParameterService {
  constructor(private readonly repo: IParameterRepository = parameterRepository) {}

  public async createParameter(dto: CreateParameterDto): Promise<ParameterEntity> {
    return this.repo.create(dto);
  }

  public async getParameterById(id: string): Promise<ParameterEntity> {
    const param = await this.repo.findById(id);
    if (!param) {
      throw new NotFoundException(`Parameter with ID '${id}' not found`);
    }
    return param;
  }

  public async listParameters(query: QueryParameterDto): Promise<ParameterListResult> {
    return this.repo.findAll(query);
  }

  public async updateParameter(id: string, dto: UpdateParameterDto): Promise<ParameterEntity> {
    await this.getParameterById(id);
    return this.repo.update(id, dto);
  }

  public async deleteParameter(id: string): Promise<void> {
    await this.getParameterById(id);
    await this.repo.delete(id);
  }
}

export const parameterService = new ParameterService();
