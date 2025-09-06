import { type RunnableConfig } from '@langchain/core/runnables';
import { type PendingWrite } from '@langchain/langgraph-checkpoint';

export const mockPutWritesConfig: RunnableConfig = {
  tags: [],
  metadata: { thread_id: 'th_123' },
  callbacks: undefined,
  recursionLimit: 25,
  configurable: {
    checkpoint_ns: '',
    thread_id: 'th_123',
    checkpoint_id: '1f088b35-7f0d-6590-ffff-22262f298615',
  },
};

export const mockPutWritesWrites: PendingWrite[] = [
  ['foo', 'foo1'],
  ['bar', ['bar1']],
  ['branch:to:nodeB', null],
];

export const mockPutWritesWrites2: PendingWrite[] = [
  ['foo', 'foo2'],
  ['bar', ['bar2']],
  ['branch:to:nodeB', null],
];

export const mockPutWritesTaskId = 'task_123456';

export const mockPutWritesTaskId2 = 'task_123457';
