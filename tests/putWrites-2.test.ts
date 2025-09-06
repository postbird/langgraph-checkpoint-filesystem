import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { mockPutWritesConfig, mockPutWritesTaskId, mockPutWritesWrites } from '../mocks/putWrites.input';
import { FileSystemSaver } from '../src';
import { listFiles, safeDeleteFile } from '../src/utils';

const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-2');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

describe('putWrites first write win logic', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  await FILE_SAVER.deleteThread(mockPutWritesConfig.configurable!.thread_id);

  // first write win
  await FILE_SAVER.putWrites(mockPutWritesConfig, mockPutWritesWrites, mockPutWritesTaskId);

  await FILE_SAVER.putWrites(mockPutWritesConfig, mockPutWritesWrites, mockPutWritesTaskId);

  const checkpointId = mockPutWritesConfig.configurable!.checkpoint_id;

  const writesPath = FILE_SAVER.pathResolver.getWritesPath(
    mockPutWritesConfig.configurable!.thread_id,
    mockPutWritesConfig.configurable!.checkpoint_ns,
    checkpointId,
  );

  const storedWriteNames = await listFiles(writesPath);

  it('first write win', async () => {
    expect(storedWriteNames.length).toEqual(3);
  });
});
