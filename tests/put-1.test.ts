import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { mockPutCheckpoint, mockPutConfig, mockPutMetadata } from '../mocks/put.input';
import { mockPutWritesConfig, mockPutWritesTaskId, mockPutWritesWrites } from '../mocks/putWrites.input';
import { FileSystemSaver } from '../src';
import { checkFileExists, readBinary, readJSON, safeDeleteFile } from '../src/utils';
const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-put-1');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

describe('put', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  // putWrites
  await FILE_SAVER.putWrites(mockPutWritesConfig, mockPutWritesWrites, mockPutWritesTaskId);

  // put checkpoint
  const configuration = await FILE_SAVER.put(mockPutConfig, mockPutCheckpoint, mockPutMetadata);

  const checkpointPath = FILE_SAVER.pathResolver.getCheckpointsPath(
    mockPutConfig.configurable!.thread_id,
    mockPutConfig.configurable!.checkpoint_ns,
    mockPutCheckpoint.id,
  );

  it('check put files exist', async () => {
    expect(await checkFileExists(checkpointPath)).toEqual(true);
    expect(await checkFileExists(`${checkpointPath}/extra.json`)).toEqual(true);
    expect(await checkFileExists(`${checkpointPath}/metadata`)).toEqual(true);
    expect(await checkFileExists(`${checkpointPath}/checkpoint`)).toEqual(true);
  });

  it('should put checkpoint return write configuration', async () => {
    expect(configuration.configurable).toEqual({
      ...mockPutConfig.configurable,
      checkpoint_id: mockPutCheckpoint.id,
    });
  });

  it('should put checkpoint return write configuration', async () => {
    const configuration = await FILE_SAVER.put(mockPutConfig, mockPutCheckpoint, mockPutMetadata);
    expect(configuration.configurable).toEqual({
      ...mockPutConfig.configurable,
      checkpoint_id: mockPutCheckpoint.id,
    });
  });

  it('check checkpoint.parentCheckpointId', async () => {
    const extraJson = await readJSON(`${checkpointPath}/extra.json`);

    expect(extraJson.parentCheckpointId).toEqual(mockPutConfig.configurable!.checkpoint_id);
  });

  it('check checkpoint.metadata', async () => {
    const metadataBinary = await readBinary(`${checkpointPath}/metadata`);

    const metadata = await FILE_SAVER.serde.loadsTyped('json', metadataBinary);

    expect(metadata).toEqual(expect.objectContaining(mockPutMetadata));
  });

  it('check checkpoint.checkpoint', async () => {
    const checkpointBinary = await readBinary(`${checkpointPath}/checkpoint`);

    const checkpoint = await FILE_SAVER.serde.loadsTyped('json', checkpointBinary);

    expect(checkpoint).toEqual(expect.objectContaining(mockPutCheckpoint));
  });
});
