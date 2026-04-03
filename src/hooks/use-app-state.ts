import { useSyncExternalStore } from 'react';

import { getStateSnapshot, subscribe } from '@/state';

export function useAppState(selector = (state) => state) {
  const state = useSyncExternalStore(
    subscribe,
    getStateSnapshot,
    getStateSnapshot
  );

  return selector(state);
}
