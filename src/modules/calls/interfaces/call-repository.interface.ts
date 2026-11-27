import { CallEntity, CallListResult } from '../calls.types.js';
import { CreateCallDto } from '../dto/create-call.dto.js';
import { UpdateCallDto } from '../dto/update-call.dto.js';
import { QueryCallDto } from '../dto/query-call.dto.js';

export interface ICallRepository {
  create(dto: CreateCallDto): Promise<CallEntity>;
  findById(id: string): Promise<CallEntity | null>;
  findAll(query: QueryCallDto): Promise<CallListResult>;
  update(id: string, dto: UpdateCallDto): Promise<CallEntity>;
  delete(id: string): Promise<void>;
}
