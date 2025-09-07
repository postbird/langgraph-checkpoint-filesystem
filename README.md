# langgraph-checkpoint-filesystem

![CI](https://github.com/postbird/langgraph-checkpoint-filesystem/actions/workflows/ci.yml/badge.svg) ![npm](https://img.shields.io/npm/v/langgraph-checkpoint-filesystem.svg) ![Release](https://github.com/postbird/langgraph-checkpoint-filesystem/actions/workflows/release.yml/badge.svg)

An implementation of the `Checkpointer` interface for LangGraph.js, uses file storage to persist state.

[https://www.npmjs.com/package/langgraph-checkpoint-filesystem](https://www.npmjs.com/package/langgraph-checkpoint-filesystem)

Version required:

```json
  "peerDependencies": {
    "@langchain/core": "^0.3.74",
    "@langchain/langgraph-checkpoint": "^0.1.1"
  },
```

## File storage hierarchy

```
|- /{thread_id}
|- |- /{checkpoint_ns}
|- |- |- /{checkpoint_id}
|- |- |- |- /writes
|- |- |- |- |- {task_id}$$${channel}$$${idx}
|- |- |- |- /checkpoints
|- |- |- |- |- extra.json
|- |- |- |- |- metadata
|- |- |- |- |- checkpoint
```

- `checkpoint_ns`: will use `__DEFAULT_NS__` if the ns is empty string `""`;
- `{task_id}$$${channel}$$${idx}`: each writes file is a binary file
- `extra.json`: some extra params of this checkpoint like `parentCheckpointId`
- `metadata`: binary file of this checkpoint's metadata
- `checkpoint`: binary file of this checkpoint

## How to use

### Install dependency

```bash
pnpm add langgraph-checkpoint-filesystem
```

### Use it in your graph

```ts
import path from 'path';
import { FileSystemSaver } from 'langgraph-checkpoint-filesystem';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';

const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-checkpoint-1');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

const GRAPH_STATE = Annotation.Root({
  ...MessagesAnnotation.spec,
  foo: Annotation<string>,
});

const llmNode = () => {
  return {
    messages: [new AIMessage('Hi, I am your assistant')],
    foo: 'foo1',
  };
};

const toolNode = () => {
  return {
    foo: 'foo2',
  };
};

const graph = new StateGraph(GRAPH_STATE)
  .addNode('llm', llmNode)
  .addNode('tool', toolNode)
  .addEdge(START, 'llm')
  .addEdge('llm', 'tool')
  .addEdge('tool', END)
  .compile({ checkpointer: FILE_SAVER });

await graph.invoke({}, { configurable: { thread_id: 'th_1234' } });
```

### Input of the `constructor`

- `rootFolder`: the root folder you want to save the data
- `splitter`: to split the name of `writes` binary file
- `serde`: extending from `BaseCheckpointSaver`

```ts
constructor(options?: { serde?: SerializerProtocol; rootFolder?: string; splitter?: string }) {
    const { rootFolder, splitter, serde } = options ?? {};
    super(serde);
    this.pathResolver = new StorePathResolver(rootFolder, splitter);
}
```

## Development

### test

The test scripts will be auto executed after `commit` action, you can also run it directly.

```ts
pnpm run test
```

```
→ No staged files match any configured task.

> langgraph-checkpoint-filesystem@0.0.1 test
> rstest

  Rstest v0.3.2

 ✓ tests/putWrites-2.test.ts (1)
 ✓ tests/putWrites-3.test.ts (1)
 ✓ tests/getTuple-2.test.ts (5)
 ✓ tests/getTuple-1.test.ts (5)
 ✓ tests/put-1.test.ts (6)
 ✓ tests/putWrites-1.test.ts (2)
 ✓ tests/list-1.test.ts (14)
 ✓ tests/graph-4.test.ts (1)
 ✓ tests/graph-3.test.ts (1)
 ✓ tests/graph-2.test.ts (1)
 ✓ tests/graph-1.test.ts (6)

 Test Files 11 passed
      Tests 43 passed
   Duration 463ms (build 81ms, tests 382ms)
```
