import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import {
  mockPutWritesConfig,
  mockPutWritesTaskId,
  mockPutWritesTaskId2,
  mockPutWritesWrites,
  mockPutWritesWrites2,
} from '../mocks/putWrites.input';
import { FileSystemSaver } from '../src';
import { listFiles, safeDeleteFile } from '../src/utils';

const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-3');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

describe('parallel putWrites', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  await Promise.all([
    FILE_SAVER.putWrites(mockPutWritesConfig, mockPutWritesWrites, mockPutWritesTaskId),
    FILE_SAVER.putWrites(mockPutWritesConfig, mockPutWritesWrites2, mockPutWritesTaskId2),
  ]);

  const checkpointId = mockPutWritesConfig.configurable!.checkpoint_id;

  const writesPath = FILE_SAVER.pathResolver.getWritesPath(
    mockPutWritesConfig.configurable!.thread_id,
    mockPutWritesConfig.configurable!.checkpoint_ns,
    checkpointId,
  );

  const storedWriteNames = await listFiles(writesPath);

  it('parallel putWrites should be equal to 6', async () => {
    expect(storedWriteNames.length).toEqual(6);
  });
});
