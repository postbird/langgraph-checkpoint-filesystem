import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { mockPutCheckpoint, mockPutConfig, mockPutMetadata } from '../mocks/put.input';
import { mockPutWritesConfig, mockPutWritesTaskId, mockPutWritesWrites } from '../mocks/putWrites.input';
import { FileSystemSaver } from '../src';
import { safeDeleteFile } from '../src/utils';
const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-getTuple-2');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

describe('getTuple-2: without checkpoint_id input', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  // putWrites
  await FILE_SAVER.putWrites(mockPutWritesConfig, mockPutWritesWrites, mockPutWritesTaskId);

  // put checkpoint
  const putResultConfig = await FILE_SAVER.put(mockPutConfig, mockPutCheckpoint, mockPutMetadata);

  const tuple = await FILE_SAVER.getTuple({
    configurable: {
      ...putResultConfig.configurable,
      checkpoint_id: undefined,
    },
  });

  it('getTuple -> tuple.config -> should be equal to mockPutConfig', async () => {
    expect(tuple?.config).toEqual(
      expect.objectContaining({
        configurable: {
          ...mockPutConfig.configurable,
          checkpoint_id: mockPutCheckpoint.id,
        },
      }),
    );
  });

  it('getTuple -> tuple.checkpoint -> should be equal to mockPutCheckpoint', async () => {
    expect(tuple?.checkpoint).toEqual(
      expect.objectContaining({
        ...mockPutCheckpoint,
      }),
    );
  });

  it('getTuple -> tuple.pendingWrites -> channels should be equal to mockPutWritesWrites', async () => {
    const channels = tuple?.pendingWrites?.map((item) => item[1]);
    expect(channels).toEqual(expect.arrayContaining([...mockPutWritesWrites.map((item) => item[0])]));
  });

  it('getTuple -> tuple.pendingWrites -> channels values should be equal to mockPutWritesWrites', async () => {
    const channelsValues = tuple?.pendingWrites?.map((item) => item[2]);
    expect(channelsValues).toEqual(expect.arrayContaining([...mockPutWritesWrites.map((item) => item[1])]));
  });

  it('getTuple -> tuple.parentConfig -> parentConfig should be equal to mockPutConfig.configurable.checkpoint_id', async () => {
    const parentConfig = tuple?.parentConfig;
    expect(parentConfig).toEqual(
      expect.objectContaining({
        configurable: {
          ...mockPutConfig.configurable,
          checkpoint_id: mockPutConfig.configurable!.checkpoint_id,
        },
      }),
    );
  });
});
