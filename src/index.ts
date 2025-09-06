import { type RunnableConfig } from '@langchain/core/runnables';
import {
  BaseCheckpointSaver,
  CheckpointListOptions,
  CheckpointTuple,
  copyCheckpoint,
  getCheckpointId,
  WRITES_IDX_MAP,
  type Checkpoint,
  type CheckpointMetadata,
  type PendingWrite,
  type SerializerProtocol,
} from '@langchain/langgraph-checkpoint';
import { StorePathResolver } from './store-path-resolver';
import {
  checkFileExists,
  checkOrCreateFolder,
  listDirs,
  listFiles,
  readBinary,
  readJSON,
  safeDeleteFile,
  writeBinary,
  writeJSON,
} from './utils';

export class FileSystemSaver extends BaseCheckpointSaver {
  public pathResolver: StorePathResolver;

  constructor(options?: { serde?: SerializerProtocol; rootFolder?: string; splitter?: string }) {
    const { rootFolder, splitter, serde } = options ?? {};
    super(serde);
    this.pathResolver = new StorePathResolver(rootFolder, splitter);
  }

  async *list(config: RunnableConfig, options?: CheckpointListOptions) {
    const { before, limit, filter } = options ?? {};

    const threadIds = config.configurable?.thread_id
      ? [config.configurable.thread_id]
      : await listDirs(this.pathResolver.rootFolder); // list all folder names of threads if there is no thread_id

    const configCheckpointNamespace = config.configurable?.checkpoint_ns;
    const configCheckpointId = config.configurable?.checkpoint_id;

    for (const threadId of threadIds) {
      const checkpointNsPaths = await listDirs(this.pathResolver.getThreadPath(threadId)); // list all folder names of checkpoint namespaces

      for (const checkpointNsPath of checkpointNsPaths) {
        if (
          configCheckpointNamespace !== undefined &&
          // ! Notice here, the default value of param `checkpoint_ns` is actually `""`, but we use `__DEFAULT_NS__` folder name to represent it
          checkpointNsPath !== (configCheckpointNamespace || this.pathResolver.defaultCheckpointNs)
        ) {
          continue;
        }

        const checkpointIds = await listDirs(this.pathResolver.getCheckpointNsPath(threadId, checkpointNsPath));

        const sortedCheckpointIds = checkpointIds.sort((a, b) => b.localeCompare(a)); // sort checkpoint ids by descending order

        // Filter by checkpoint ID from config
        let filteredCheckpointIds = sortedCheckpointIds.filter((checkpointId) => {
          if (configCheckpointId && checkpointId !== configCheckpointId) {
            return false;
          }
          return true;
        });

        // Filter by checkpoint ID from before config
        filteredCheckpointIds = filteredCheckpointIds.filter((checkpointId) => {
          if (before && before.configurable?.checkpoint_id && checkpointId >= before.configurable.checkpoint_id) {
            return false;
          }
          return true;
        });

        // limit the number of checkpoint tuples
        const limitedCheckpointTuples = filteredCheckpointIds.slice(0, limit);

        // get all checkpoint tuples
        const checkpointTuples = await Promise.all(
          limitedCheckpointTuples.map(async (checkpointId) => {
            return this.getTuple({
              configurable: {
                thread_id: threadId,
                // ! Notice here, the default value of param `checkpoint_ns` is actually `""`, but we use `__DEFAULT_NS__` folder name to represent it
                checkpoint_ns: checkpointNsPath === this.pathResolver.defaultCheckpointNs ? '' : checkpointNsPath,
                checkpoint_id: checkpointId,
              },
            });
          }),
        );

        // filter the checkpoint tuples by metadata
        for (const checkpointTuple of checkpointTuples) {
          if (!checkpointTuple) {
            continue;
          }

          if (
            filter &&
            !Object.entries(filter).every(
              ([key, value]) => (checkpointTuple?.metadata as unknown as Record<string, unknown>)[key] === value,
            )
          ) {
            continue;
          }

          yield checkpointTuple;
        }
      }
    }
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    const checkpointNs = config.configurable?.checkpoint_ns;

    const checkpointId = getCheckpointId(config);

    if (checkpointId) {
      const checkpointsPath = this.pathResolver.getCheckpointsPath(threadId, checkpointNs, checkpointId);
      const accessed = await checkFileExists(checkpointsPath);

      if (accessed) {
        const extraPath = `${checkpointsPath}/extra.json`;
        const metadataPath = `${checkpointsPath}/metadata`;
        const checkpointPath = `${checkpointsPath}/checkpoint`;

        const [extraJson, metadata, checkpoint] = await Promise.all([
          readJSON(extraPath),
          readBinary(metadataPath),
          readBinary(checkpointPath),
        ]);

        const [deserializedMetadata, deserializedCheckpoint] = await Promise.all([
          this.serde.loadsTyped('json', metadata),
          this.serde.loadsTyped('json', checkpoint),
        ]);

        const writesPath = this.pathResolver.getWritesPath(threadId, checkpointNs, checkpointId);

        const savedWritesFileNames = await listFiles(writesPath); // list all file names of writes binary

        const pendingWrites = await Promise.all(
          savedWritesFileNames.map(async (singleWriteFileName) => {
            const [taskId, channel] = this.pathResolver.splitWithSplitter(singleWriteFileName);
            const writeFilePath = `${writesPath}/${singleWriteFileName}`;
            const fileContent = await readBinary(writeFilePath);
            const deserializedWritesValue = await this.serde.loadsTyped('json', fileContent);
            return [taskId, channel, deserializedWritesValue] as [string, string, unknown];
          }),
        );

        const checkpointTuple: CheckpointTuple = {
          config,
          checkpoint: deserializedCheckpoint,
          metadata: deserializedMetadata,
          pendingWrites,
        };

        if (extraJson.parentCheckpointId) {
          checkpointTuple.parentConfig = {
            configurable: {
              thread_id: threadId,
              checkpoint_ns: checkpointNs,
              checkpoint_id: extraJson.parentCheckpointId,
            },
          };
        }

        return checkpointTuple;
      }
    } else {
      const checkpointNsPath = this.pathResolver.getCheckpointNsPath(threadId, checkpointNs);
      await checkOrCreateFolder(checkpointNsPath);

      const checkpointIds = await listDirs(checkpointNsPath); // list all folder names of checkpoints (the folder name is the checkpoint_id)
      const checkpointId = checkpointIds.sort((a, b) => b.localeCompare(a))[0]; // get the latest checkpoint id
      const checkpointsPath = this.pathResolver.getCheckpointsPath(threadId, checkpointNs, checkpointId);
      const accessed = await checkFileExists(checkpointsPath);

      if (accessed) {
        const extraPath = `${checkpointsPath}/extra.json`;
        const metadataPath = `${checkpointsPath}/metadata`;
        const checkpointPath = `${checkpointsPath}/checkpoint`;

        const [extraJson, metadata, checkpoint] = await Promise.all([
          readJSON(extraPath),
          readBinary(metadataPath),
          readBinary(checkpointPath),
        ]);

        const [deserializedMetadata, deserializedCheckpoint] = await Promise.all([
          this.serde.loadsTyped('json', metadata),
          this.serde.loadsTyped('json', checkpoint),
        ]);

        const writesPath = this.pathResolver.getWritesPath(threadId, checkpointNs, checkpointId);

        const savedWritesFiles = await listFiles(writesPath); // list all file names of writes binary

        const pendingWrites = await Promise.all(
          savedWritesFiles.map(async (singleWriteFileName) => {
            const [taskId, channel] = this.pathResolver.splitWithSplitter(singleWriteFileName);
            const writeFilePath = `${writesPath}/${singleWriteFileName}`;
            const fileContent = await readBinary(writeFilePath);
            const deserializedWritesValue = await this.serde.loadsTyped('json', fileContent);
            return [taskId, channel, deserializedWritesValue] as [string, string, unknown];
          }),
        );

        const checkpointTuple: CheckpointTuple = {
          config: {
            configurable: {
              ...config.configurable,
              checkpoint_id: checkpointId, // set checkpoint_id to the latest checkpoint id
            },
          },
          checkpoint: deserializedCheckpoint,
          metadata: deserializedMetadata,
          pendingWrites,
        };

        if (extraJson.parentCheckpointId) {
          checkpointTuple.parentConfig = {
            configurable: {
              thread_id: threadId,
              checkpoint_ns: checkpointNs,
              checkpoint_id: extraJson.parentCheckpointId,
            },
          };
        }

        return checkpointTuple;
      }
    }

    return undefined;
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata) {
    const preparedCheckpoint: Partial<Checkpoint> = copyCheckpoint(checkpoint);
    const threadId = config.configurable?.thread_id;
    const checkpointNs = config.configurable?.checkpoint_ns;
    const parentCheckpointId = config.configurable?.checkpoint_id; // parent checkpoint id
    const checkpointId = checkpoint.id;

    if (threadId === undefined) {
      throw new Error(
        `Failed to put checkpoint. The passed RunnableConfig is missing a required "thread_id" field in its "configurable" property.`,
      );
    }

    const checkpointsPath = this.pathResolver.getCheckpointsPath(threadId, checkpointNs, checkpointId);

    await checkOrCreateFolder(checkpointsPath);

    const [[, serializedCheckpoint], [, serializedMetadata]] = await Promise.all([
      this.serde.dumpsTyped(preparedCheckpoint),
      this.serde.dumpsTyped(metadata),
    ]);

    await writeBinary(`${checkpointsPath}/checkpoint`, serializedCheckpoint);

    await writeBinary(`${checkpointsPath}/metadata`, serializedMetadata);

    await writeJSON(`${checkpointsPath}/extra.json`, { parentCheckpointId });

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: checkpointId,
      },
    };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string) {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;
    const checkpointNs = config.configurable?.checkpoint_ns;

    if (threadId === undefined) {
      throw new Error(
        `Failed to put writes. The passed RunnableConfig is missing a required "thread_id" field in its "configurable" property`,
      );
    }

    if (checkpointId === undefined) {
      throw new Error(
        `Failed to put writes. The passed RunnableConfig is missing a required "checkpoint_id" field in its "configurable" property.`,
      );
    }

    const writesPath = this.pathResolver.getWritesPath(threadId, checkpointNs, checkpointId);

    await checkOrCreateFolder(writesPath);

    const promises = writes.map(async ([channel, value], idx) => {
      const innerKeys: [string, string, number] = [taskId, channel, WRITES_IDX_MAP[channel] || idx];

      const filePath = `${writesPath}/${this.pathResolver.joinWithSplitter(...innerKeys)}`;

      // first-write-win
      if (innerKeys[2] >= 0 && (await checkFileExists(filePath))) {
        return;
      }

      const [, serializedValue] = await this.serde.dumpsTyped(value);

      await writeBinary(filePath, serializedValue);
    });

    await Promise.all(promises);
  }

  public async deleteThread(threadId: string) {
    return safeDeleteFile(`${this.pathResolver.getThreadPath(threadId)}`);
  }
}
