import { RunnableConfig } from '@langchain/core/runnables';
import { Checkpoint, CheckpointMetadata } from '@langchain/langgraph-checkpoint';
import { mockPutWritesConfig } from './putWrites.input';

export const mockPutConfig: RunnableConfig = {
  tags: [],
  metadata: { thread_id: `th_123` },
  callbacks: undefined,
  recursionLimit: 25,
  configurable: {
    checkpoint_ns: '',
    thread_id: `th_123`,
    checkpoint_id: '1f088b35-7f0d-6590-ffff-parent-id', // parent checkpoint id
  },
};

export const mockPutCheckpoint: Checkpoint = {
  v: 4,
  id: mockPutWritesConfig.configurable!.checkpoint_id, // checkpoint id
  ts: '2025-09-03T07:28:32.524Z',
  channel_values: {
    foo: 'foo1',
    bar: ['bar1'],
    __pregel_tasks: [[], []],
    'branch:to:nodeB': null,
  },
  channel_versions: {
    __start__: 2,
    'branch:to:nodeA': 3,
    foo: 3,
    bar: 3,
    'branch:to:nodeB': 3,
  },
  versions_seen: {
    __input__: {},
    __start__: { __start__: 1 },
    nodeA: { 'branch:to:nodeA': 2 },
  },
};

export const mockPutMetadata: CheckpointMetadata = { source: 'loop', step: 1, parents: {} };
