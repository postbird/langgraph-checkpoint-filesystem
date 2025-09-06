import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, MessagesAnnotation, START, StateGraph, StateSnapshot } from '@langchain/langgraph';
import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { FileSystemSaver } from '../src';
import { safeDeleteFile } from '../src/utils';
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

const threadId = 'test-thread-id';

describe('checkpointer for state graph', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  await graph.invoke({ messages: [new HumanMessage('Hi')] }, { configurable: { thread_id: threadId } });

  it('checkpoint.config -> should be equal to threadId', async () => {
    const tuple = await FILE_SAVER.getTuple({ configurable: { thread_id: threadId } });

    expect(tuple?.config.configurable!.thread_id).toEqual(threadId);
  });

  it('getState -> should be equal latest checkpoint tuple', async () => {
    const tuple = await FILE_SAVER.getTuple({ configurable: { thread_id: threadId } });

    const state = await graph.getState({ configurable: { thread_id: threadId } });

    expect(state?.values?.messages?.length).toEqual(2);

    expect(state?.values?.foo).toEqual('foo2');

    expect(tuple?.parentConfig).toEqual(
      expect.objectContaining({
        ...state.parentConfig,
      }),
    );

    expect(tuple?.config).toEqual(
      expect.objectContaining({
        ...state.config,
      }),
    );

    expect(tuple?.checkpoint.channel_values.foo).toEqual(
      expect.objectContaining({
        ...state.values.foo,
      }),
    );

    expect(tuple?.checkpoint.channel_values.messages).toEqual(expect.arrayContaining([...state.values.messages]));
  });

  it('getStateHistory -> 4', async () => {
    const historyGenerator = graph.getStateHistory({ configurable: { thread_id: threadId } });

    const historyList: StateSnapshot[] = [];

    for await (const state of historyGenerator) {
      historyList.push(state);
    }

    expect(historyList.length).toEqual(4);
  });

  it('getStateHistory -> limit 0', async () => {
    const historyGenerator = graph.getStateHistory({ configurable: { thread_id: threadId } }, { limit: 0 });

    const historyList: StateSnapshot[] = [];

    for await (const state of historyGenerator) {
      historyList.push(state);
    }

    expect(historyList.length).toEqual(0);
  });

  it('getStateHistory -> checkpoint_id', async () => {
    const tuple = await FILE_SAVER.getTuple({ configurable: { thread_id: threadId } });

    const checkpointId = tuple?.checkpoint.id;

    const historyGenerator = graph.getStateHistory({
      configurable: { thread_id: threadId, checkpoint_id: checkpointId },
    });

    const historyList: StateSnapshot[] = [];

    for await (const state of historyGenerator) {
      historyList.push(state);
    }

    expect(historyList.length).toEqual(1);
  });

  it('getStateHistory -> filter by metadata -> source:loop -> 3', async () => {
    const historyGenerator = graph.getStateHistory(
      {
        configurable: { thread_id: threadId },
      },
      { filter: { source: 'loop' } },
    );

    const historyList: StateSnapshot[] = [];

    for await (const state of historyGenerator) {
      historyList.push(state);
    }

    expect(historyList.length).toEqual(3);
  });
});
