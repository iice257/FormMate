import assert from 'node:assert/strict';

const storeFactory = () => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
  };
};

const localStorageMock = storeFactory();
const sessionStorageMock = storeFactory();

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
  },
  configurable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
});

const stateModule = await import('./src/state');

stateModule.setState({
  answers: {},
  answerHistory: {},
  answerHistoryIndex: {},
  answeredCount: 0,
});

stateModule.updateAnswer('q1', 'First answer', 'user');
assert.equal(stateModule.getState().answeredCount, 1, 'adding a non-empty answer should increment answeredCount');

stateModule.updateAnswer('q1', '', 'user');
assert.equal(stateModule.getState().answeredCount, 0, 'clearing an answer should decrement answeredCount');

stateModule.undoAnswer('q1');
assert.equal(stateModule.getState().answeredCount, 1, 'undo should restore answeredCount');

stateModule.redoAnswer('q1');
assert.equal(stateModule.getState().answeredCount, 0, 'redo should re-apply answeredCount changes');

console.log('test-state-answers: ok');
