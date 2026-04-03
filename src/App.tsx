import { useEffect } from 'react';

import { getSession } from './auth/auth-service';
import { FormMateApp } from './components/formmate-app';
import { initRouter } from './router';
import { getState, setState, subscribe } from './state';
import { hydrateFromRemote } from './storage/storage-provider';
import { applyTheme } from './theme';

let booted = false;

export default function App() {
  useEffect(() => {
    const unsubscribe = subscribe((nextState) => {
      applyTheme(nextState?.settings?.ui?.theme);
    });

    if (booted) {
      applyTheme(getState().settings?.ui?.theme);
      return () => {
        unsubscribe();
      };
    }

    booted = true;

    const boot = async () => {
      applyTheme(getState().settings?.ui?.theme);

      try {
        const session = getSession();
        if (session?.user) {
          setState({ isAuthenticated: true, authUser: session.user, tier: session.user.tier || session.tier || 'free' });

          try {
            const hydrated = await hydrateFromRemote(session.user);
            if (hydrated) {
              setState(hydrated);
              applyTheme(hydrated?.settings?.ui?.theme ?? getState().settings?.ui?.theme);
            }
          } catch (error) {
            console.warn('[boot] Remote storage hydration failed; continuing with local cache.', error);
          }
        }
      } catch (error) {
        console.warn('[boot] Failed to restore auth session.', error);
      }

      initRouter();
    };

    void boot();

    return () => {
      unsubscribe();
    };
  }, []);

  return <FormMateApp />;
}
