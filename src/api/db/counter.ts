import { BaseSchema, BaseTable } from './base';

export type CounterSchema = BaseSchema & {
  count: number;
};

export class CounterTable extends BaseTable<CounterSchema, 'count', ''> {
  constructor() {
    super(process.env.TABLE_NAME!, 'count', '');
  }
}
