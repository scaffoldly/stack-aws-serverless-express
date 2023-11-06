export interface BaseMessage {
  type: string;
  version: number;
  queueUrl: string;
  id: string;
  timestamp: number;
}
