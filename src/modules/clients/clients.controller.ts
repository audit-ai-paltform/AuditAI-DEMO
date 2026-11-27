import { Request, Response } from 'express';
import { BaseController } from '../../core/http/base.controller.js';
import { clientService, ClientService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { QueryClientDto } from './dto/query-client.dto.js';

export class ClientController extends BaseController {
  constructor(private readonly service: ClientService = clientService) {
    super();
  }

  public create = async (req: Request, res: Response): Promise<Response> => {
    const dto = req.body as CreateClientDto;
    const client = await this.service.createClient(dto);
    return this.created(res, client);
  };

  public getById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const client = await this.service.getClientById(id);
    return this.ok(res, client);
  };

  public list = async (req: Request, res: Response): Promise<Response> => {
    const query = req.query as unknown as QueryClientDto;
    const result = await this.service.listClients(query);
    return this.ok(res, result.clients, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  };

  public update = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    const dto = req.body as UpdateClientDto;
    const updated = await this.service.updateClient(id, dto);
    return this.ok(res, updated);
  };

  public delete = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params as { id: string };
    await this.service.deleteClient(id);
    return this.ok(res, { message: 'Client deleted successfully' });
  };
}

export const clientController = new ClientController();
