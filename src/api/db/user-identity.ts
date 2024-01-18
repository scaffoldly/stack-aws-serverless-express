import { BaseSchema, BaseTable } from './base';

export type UserIdentitySchema = BaseSchema & {
  fullName?: string;
  email?: string | null;
};

export class UserIdentityTable extends BaseTable<
  UserIdentitySchema,
  'user',
  'identity'
> {
  constructor() {
    super(process.env.TABLE_NAME!, 'user', 'identity');
  }
}
