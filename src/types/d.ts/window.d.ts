/* eslint-disable @typescript-eslint/consistent-type-imports */

interface Window {
  cosmostation: {
    cosmos: {
      request: (message: { method: string; params?: unknown }) => Promise<T>;
      on: (event: import('~/types/cosmos').EventListenerType, handler: (data?: unknown) => void) => void;
      off: (event: import('~/types/cosmos').EventListenerType, handler: (data?: unknown) => void) => void;
    };
  };
}
