import { ParameterEntity, ParameterListResult } from '../parameters.types.js';
import { CreateParameterDto } from '../dto/create-parameter.dto.js';
import { UpdateParameterDto } from '../dto/update-parameter.dto.js';
import { QueryParameterDto } from '../dto/query-parameter.dto.js';

export interface IParameterRepository {
  create(dto: CreateParameterDto): Promise<ParameterEntity>;
  findById(id: string): Promise<ParameterEntity | null>;
  findAll(query: QueryParameterDto): Promise<ParameterListResult>;
  update(id: string, dto: UpdateParameterDto): Promise<ParameterEntity>;
  delete(id: string): Promise<void>;
}
