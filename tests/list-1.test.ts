import { CheckpointTuple } from '@langchain/langgraph-checkpoint';
import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { mockPutCheckpoint, mockPutConfig, mockPutMetadata } from '../mocks/put.input';
import { mockPutWritesConfig, mockPutWritesTaskId, mockPutWritesWrites } from '../mocks/putWrites.input';
import { FileSystemSaver } from '../src';
import { safeDeleteFile } from '../src/utils';
const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-list-1');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

describe('list', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  // putWrites
  await FILE_SAVER.putWrites(mockPutWritesConfig, mockPutWritesWrites, mockPutWritesTaskId);

  // put checkpoint
  const putResultConfig = await FILE_SAVER.put(mockPutConfig, mockPutCheckpoint, mockPutMetadata);

  it('list -> list length should be 1', async () => {
    const listGenerator = FILE_SAVER.list({ configurable: { thread_id: mockPutWritesConfig.configurable!.thread_id } });
    const lists: CheckpointTuple[] = [];
    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(1);
  });

  it('list -> list[0].config should be equal to putResultConfig', async () => {
    const listGenerator = FILE_SAVER.list({ configurable: { thread_id: mockPutWritesConfig.configurable!.thread_id } });
    const lists: CheckpointTuple[] = [];
    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists[0].config).toEqual(expect.objectContaining({ ...putResultConfig }));
  });

  it('list -> list[0].checkpoint should be equal to mockPutCheckpoint', async () => {
    const listGenerator = FILE_SAVER.list({ configurable: { thread_id: mockPutWritesConfig.configurable!.thread_id } });
    const lists: CheckpointTuple[] = [];
    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists[0].checkpoint).toEqual(expect.objectContaining({ ...mockPutCheckpoint }));
  });

  it('list -> list[0].pendingWrites[channels/values] should be equal to mockPutWritesWrites[channels/values]', async () => {
    const listGenerator = FILE_SAVER.list({ configurable: { thread_id: mockPutWritesConfig.configurable!.thread_id } });
    const lists: CheckpointTuple[] = [];
    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    const channels = lists[0].pendingWrites?.map((item) => item[1]);

    const channelsValues = lists[0].pendingWrites?.map((item) => item[2]);

    expect(channels).toEqual(expect.arrayContaining([...mockPutWritesWrites.map((item) => item[0])]));

    expect(channelsValues).toEqual(expect.arrayContaining([...mockPutWritesWrites.map((item) => item[1])]));
  });

  it('list -> list[0].parentConfig should be equal to mockPutConfig', async () => {
    const listGenerator = FILE_SAVER.list({ configurable: { thread_id: mockPutWritesConfig.configurable!.thread_id } });
    const lists: CheckpointTuple[] = [];
    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    const parentConfig = lists[0].parentConfig;

    expect(parentConfig).toEqual(
      expect.objectContaining({
        configurable: {
          ...mockPutConfig.configurable,
          checkpoint_id: mockPutConfig.configurable!.checkpoint_id,
        },
      }),
    );
  });

  it('list -> filter by checkpoint_id', async () => {
    const listGenerator = FILE_SAVER.list({
      configurable: { thread_id: mockPutWritesConfig.configurable!.thread_id, checkpoint_id: mockPutCheckpoint.id },
    });

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(1);

    expect(lists[0].config).toEqual(expect.objectContaining({ ...putResultConfig }));
  });

  it('list -> filter by checkpoint_id -> not found', async () => {
    const listGenerator = FILE_SAVER.list({
      configurable: { thread_id: mockPutWritesConfig.configurable!.thread_id, checkpoint_id: 'not-found' },
    });

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(0);
  });

  it('list -> before found', async () => {
    const listGenerator = FILE_SAVER.list(
      {
        configurable: {
          thread_id: mockPutWritesConfig.configurable!.thread_id,
        },
      },
      { before: { configurable: { checkpoint_id: '1f088b35-7f0d-6591-ffff-22262f298615' } } }, // this is a checkpoint id that is greater than mockPutCheckpoint.id
    );

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(1);
  });

  it('list ->  before not found', async () => {
    const listGenerator = FILE_SAVER.list(
      {
        configurable: {
          thread_id: mockPutWritesConfig.configurable!.thread_id,
        },
      },
      { before: { configurable: { checkpoint_id: '1f088b35-7f0d-658f-ffff-22262f298615' } } }, // this is a checkpoint id that is less than mockPutCheckpoint.id
    );

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(0);
  });

  it('list -> limit -> 0', async () => {
    const listGenerator = FILE_SAVER.list(
      {
        configurable: {
          thread_id: mockPutWritesConfig.configurable!.thread_id,
        },
      },
      { limit: 0 },
    );

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(0);
  });

  it('list ->  limit -> 1', async () => {
    const listGenerator = FILE_SAVER.list(
      {
        configurable: {
          thread_id: mockPutWritesConfig.configurable!.thread_id,
        },
      },
      { limit: 1 },
    );

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(1);
  });

  it('list -> filter by metadata -> found', async () => {
    const listGenerator = FILE_SAVER.list(
      {
        configurable: {
          thread_id: mockPutWritesConfig.configurable!.thread_id,
        },
      },
      { filter: { source: 'loop' } },
    );

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(1);
  });

  it('list -> filter by metadata -> not found', async () => {
    const listGenerator = FILE_SAVER.list(
      {
        configurable: {
          thread_id: mockPutWritesConfig.configurable!.thread_id,
        },
      },
      { filter: { source: 'not-found' } },
    );

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(0);
  });

  it('list -> no thread_id', async () => {
    const listGenerator = FILE_SAVER.list({}, {});

    const lists: CheckpointTuple[] = [];

    for await (const tuple of listGenerator) {
      lists.push(tuple);
    }

    expect(lists.length).toEqual(1);
  });
});
