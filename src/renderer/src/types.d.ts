import type { CleanApi } from '../../preload/index';

declare global {
  interface Window {
    cleanApi: CleanApi;
  }
}

export {};
