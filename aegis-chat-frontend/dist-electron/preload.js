import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("electronAPI", {
  // We will add functions here later for things like file system access
  // or other OS-level interactions that the React app shouldn't do directly.
});
