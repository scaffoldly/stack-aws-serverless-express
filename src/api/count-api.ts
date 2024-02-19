import { Controller, Get, Route, Tags, Post } from 'tsoa';
import { HttpError } from './internal/errors';
import { CounterSchema, CounterTable } from './db/counter';

@Route('/api/count')
@Tags('Count Api')
export class CountApi extends Controller {
  counterTable: CounterTable;

  constructor() {
    super();
    this.counterTable = new CounterTable();
  }

  @Get('')
  public async getCount(): Promise<CounterSchema | undefined> {
    const item = await this.counterTable
      .get(this.counterTable.hashKey('global'), this.counterTable.rangeKey(''))
      .exec();

    return item.Item;
  }

  @Post('')
  public async incrementCount(): Promise<CounterSchema> {
    const item = await this.counterTable
      .update(
        this.counterTable.hashKey('global'),
        this.counterTable.rangeKey(''),
      )
      .add('count', 1)
      .return('ALL_NEW')
      .exec();

    if (!item.Attributes) {
      throw new HttpError(500, {
        error: new Error('Unable to increment count'),
      });
    }

    return item.Attributes;
  }
}
