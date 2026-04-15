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

const store = await import('./src/storage/local-store');

store.saveProfile({ name: 'Ada', email: 'ada@example.com' });
assert.equal(localStorage.getItem('formmate_user_profile'), null, 'profile should not persist in localStorage');
assert.notEqual(sessionStorage.getItem('formmate_user_profile'), null, 'profile should persist in sessionStorage');

store.saveSettings({ ui: { theme: 'dark' } });
assert.notEqual(localStorage.getItem('formmate_user_settings'), null, 'settings should persist in localStorage');

localStorage.setItem('formmate_form_history', JSON.stringify({
  value: [{ title: 'Legacy entry' }],
  timestamp: Date.now(),
  ttl: null,
}));

const migratedHistory = store.loadFormHistory();
assert.equal(migratedHistory[0]?.title, 'Legacy entry', 'legacy form history should still load');
assert.equal(localStorage.getItem('formmate_form_history'), null, 'legacy form history should migrate out of localStorage');
assert.notEqual(sessionStorage.getItem('formmate_form_history'), null, 'form history should migrate to sessionStorage');

store.save('answers_state', { q1: { text: 'Hello' } });
assert.notEqual(sessionStorage.getItem('formmate_answers_state'), null, 'answers should persist in sessionStorage');

store.clearAll();
assert.equal(localStorage.length, 0, 'clearAll should clear localStorage FormMate keys');
assert.equal(sessionStorage.length, 0, 'clearAll should clear sessionStorage FormMate keys');

console.log('test-local-store: ok');
