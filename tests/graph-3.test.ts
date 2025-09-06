import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { FileSystemSaver } from '../src';
import { safeDeleteFile } from '../src/utils';
const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-checkpoint-3');

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

const llm2Node = async () => {
  return {
    messages: [new AIMessage({ content: 'Hi, I am your assistant 2' })],
    foo: 'foo2',
  };
};

const graph = new StateGraph(GRAPH_STATE)
  .addNode('llm', llmNode)
  .addNode('llm2', llm2Node)
  .addEdge(START, 'llm')
  .addEdge(START, 'llm2')
  .addEdge('llm', END)
  .addEdge('llm2', END)
  .compile({ checkpointer: FILE_SAVER });

const threadId = 'test-thread-id-3';

describe('checkpointer for state graph: parallel', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  await graph.invoke({ messages: [new HumanMessage('Hi')] }, { configurable: { thread_id: threadId } });

  it('getState: ', async () => {
    const state = await graph.getState({ configurable: { thread_id: threadId } });

    expect(state.values.messages.length).toEqual(3);
  });
});
