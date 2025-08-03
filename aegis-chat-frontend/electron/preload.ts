// In electron/preload.ts
import { contextBridge } from 'electron';

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // We will add functions here later for things like file system access
  // or other OS-level interactions that the React app shouldn't do directly.
});