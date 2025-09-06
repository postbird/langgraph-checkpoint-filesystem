import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { mockPutWritesConfig, mockPutWritesTaskId, mockPutWritesWrites } from '../mocks/putWrites.input';
import { FileSystemSaver } from '../src';
import { listFiles, readBinary, safeDeleteFile } from '../src/utils';

const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-1');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

describe('single putWrites', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  await FILE_SAVER.deleteThread(mockPutWritesConfig.configurable!.thread_id);

  await FILE_SAVER.putWrites(mockPutWritesConfig, mockPutWritesWrites, mockPutWritesTaskId);

  const checkpointId = mockPutWritesConfig.configurable!.checkpoint_id;

  const writesPath = FILE_SAVER.pathResolver.getWritesPath(
    mockPutWritesConfig.configurable!.thread_id,
    mockPutWritesConfig.configurable!.checkpoint_ns,
    checkpointId,
  );

  const storedWriteNames = await listFiles(writesPath);

  it('stored channel names should be equal to mockPutWritesWrites', async () => {
    const storedChannelNames = storedWriteNames
      .map((item) => FILE_SAVER.pathResolver.splitWithSplitter(item))
      .map((item) => item[1]);

    expect(storedChannelNames).toEqual(expect.arrayContaining(mockPutWritesWrites.map((item) => item[0])));
  });

  it('stored channel values should be equal to mockPutWritesWrites', async () => {
    const storedChannelValues = await Promise.all(
      storedWriteNames.map(async (storeName) => {
        const writeFilePath = `${writesPath}/${storeName}`;
        const fileContent = await readBinary(writeFilePath);
        const deserializedWritesValue = await FILE_SAVER.serde.loadsTyped('json', fileContent);
        return deserializedWritesValue;
      }),
    );

    expect(storedChannelValues).toEqual(expect.arrayContaining(mockPutWritesWrites.map((item) => item[1])));
  });
});
