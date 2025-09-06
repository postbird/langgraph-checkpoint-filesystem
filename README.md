# langgraph-checkpoint-filesystem

An implementation of the `Checkpointer` interface for LangGraph.js, uses file storage to persist state.

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

### Add to your graph

```ts

```

### Params

## Development

### test

```ts
pnpm run test
```
