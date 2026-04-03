import { useSyncExternalStore } from 'react';

import { getState, subscribe } from '@/state';

export function useAppState(selector = (state) => state) {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(getState())
  );
}
