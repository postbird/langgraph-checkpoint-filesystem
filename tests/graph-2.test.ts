import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, Command, END, interrupt, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { afterAll, describe, expect, it } from '@rstest/core';
import path from 'path';
import { FileSystemSaver } from '../src';
import { safeDeleteFile } from '../src/utils';
const TEST_ROOT_FOLDER = path.resolve(__dirname, './test-checkpoint-file-store-checkpoint-2');

const FILE_SAVER = new FileSystemSaver({
  rootFolder: TEST_ROOT_FOLDER,
});

const GRAPH_STATE = Annotation.Root({
  ...MessagesAnnotation.spec,
  foo: Annotation<string>,
});

const llmNode = async () => {
  const response = interrupt<{ title: string }, string>({ title: 'human-in-the-loop interrupt' });

  return {
    messages: [new AIMessage(response)],
    foo: 'foo1',
  };
};

const graph = new StateGraph(GRAPH_STATE)
  .addNode('llm', llmNode)
  .addEdge(START, 'llm')
  .addEdge('llm', END)
  .compile({ checkpointer: FILE_SAVER });

const threadId = 'test-thread-id-2';

describe('checkpointer for state graph: human-in-the-loop', async () => {
  afterAll(async () => {
    await safeDeleteFile(`${TEST_ROOT_FOLDER}`);
  });

  await graph.invoke({ messages: [new HumanMessage('Hi')] }, { configurable: { thread_id: threadId } });

  it('getState: interrupt and resume', async () => {
    const tuple = await FILE_SAVER.getTuple({ configurable: { thread_id: threadId } });

    const state = await graph.getState({ configurable: { thread_id: threadId } });

    expect(tuple?.config.configurable!.thread_id).toEqual(threadId);

    expect(state.values.messages.length).toEqual(1);

    expect(state.values.messages[0].content).toEqual('Hi');

    expect(state.next).toEqual(['llm']);

    await graph.invoke(new Command({ resume: 'Hi, I am your assistant, I will continue the conversation' }), {
      configurable: { thread_id: threadId },
    });

    const state2 = await graph.getState({ configurable: { thread_id: threadId } });

    expect(state2.values.messages.length).toEqual(2);

    expect(state2.values.messages[1].content).toEqual('Hi, I am your assistant, I will continue the conversation');
  });
});
