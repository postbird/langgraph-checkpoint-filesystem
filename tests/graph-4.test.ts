import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { FileSystemSaver } from '../src';
import { safeDeleteFile } from '../src/utils';

const threadId = 'test-thread-id-4';

const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-checkpoint-4');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

const GRAPH_STATE = Annotation.Root({
  ...MessagesAnnotation.spec,
  foo: Annotation<string>({ default: () => '', reducer: (_, next) => next }),
});

const llmNode = async () => {
  return {
    messages: [new AIMessage({ content: 'Hi, I am your assistant 1' })],
    foo: 'foo1',
  };
};

const graph1 = new StateGraph(GRAPH_STATE)
  .addNode('llm', llmNode)
  .addEdge(START, 'llm')
  .addEdge('llm', END)
  .compile({ checkpointer: FILE_SAVER });

const graph2llmNode = async () => {
  const res = await graph1.invoke(
    { messages: [new HumanMessage('Hi, llm2')] },
    { configurable: { thread_id: threadId } },
  );

  return {
    ...res,
  };
};

const graph2 = new StateGraph(GRAPH_STATE)
  .addNode('llm2', graph2llmNode)
  .addEdge(START, 'llm2')
  .addEdge('llm2', END)
  .compile({ checkpointer: FILE_SAVER });

describe('checkpointer for state graph: subgraph', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  await graph2.invoke({ messages: [new HumanMessage('Hi')] }, { configurable: { thread_id: threadId } });

  it('getState: ', async () => {
    const state = await graph2.getState({ configurable: { thread_id: threadId } });

    expect(state.values.messages.length).toEqual(3);

    expect(state.values.messages[2].content).toEqual('Hi, I am your assistant 1');

    expect(state.values.foo).toEqual('foo1');
  });
});
