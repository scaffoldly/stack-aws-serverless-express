import { Controller, Get, Route, Tags } from '@tsoa/runtime';
import packageJson from '../../package.json';
import { HealthResponse } from './responses/responses';

@Route('/health')
@Tags('Health')
export class HealthApi extends Controller {
  @Get()
  public async get(): Promise<HealthResponse> {
    return {
      name: packageJson.name,
      healty: true,
      now: new Date(),
      version: packageJson.version,
    };
  }
}
