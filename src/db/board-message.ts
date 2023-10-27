import { BaseSchema, BaseTable } from './base';

export type BoardMessageSchema = BaseSchema & {
  boardName: string;
  message: string;
  sender: string;
};

export class BoardMessageTable extends BaseTable<BoardMessageSchema, 'board', 'message'> {
  constructor() {
    super(process.env.DEFAULT_TABLE_NAME!, 'board', 'message');
  }
}
