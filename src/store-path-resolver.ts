export class StorePathResolver {
  public rootFolder: string;
  public splitter: string;
  public readonly defaultCheckpointNs = '__DEFAULT_NS__';

  constructor(rootFolder?: string, splitter?: string) {
    this.rootFolder = rootFolder ?? './checkpoint-file-store';
    this.splitter = splitter ?? '$$';
  }

  public joinWithSplitter(...args: (string | number)[]) {
    return args?.join(this.splitter);
  }

  public splitWithSplitter(str: string) {
    return str.split(this.splitter);
  }

  public getThreadPath(threadId: string) {
    return `${this.rootFolder}/${this.joinWithSplitter(threadId)}`;
  }

  public getCheckpointNsPath(threadId: string, checkpointNs: string) {
    return `${this.getThreadPath(threadId)}/${checkpointNs || this.defaultCheckpointNs}`;
  }

  public getCheckpointFolderPath(threadId: string, checkpointNs: string, checkpointId: string) {
    return `${this.getCheckpointNsPath(threadId, checkpointNs)}/${checkpointId}`;
  }

  public getWritesPath(threadId: string, checkpointNs: string, checkpointId: string) {
    return `${this.getCheckpointFolderPath(threadId, checkpointNs, checkpointId)}/writes`;
  }

  public getCheckpointsPath(threadId: string, checkpointNs: string, checkpointId: string) {
    return `${this.getCheckpointFolderPath(threadId, checkpointNs, checkpointId)}/checkpoints`;
  }
}
