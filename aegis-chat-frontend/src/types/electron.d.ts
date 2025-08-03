// In src/types/electron.d.ts
export interface IElectronAPI {
  getStoreValue: (key: string) => Promise<unknown>;
  setStoreValue: (key: string, value: unknown) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}