import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

// ===================================================
// THIS IS THE FIX: Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ===================================================

// Set NODE_ENV for the main process
process.env.NODE_ENV = 'production';

const store = new Store();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Key security settings:
      contextIsolation: true, // Isolate preload scripts from the renderer
      nodeIntegration: false, // Prevent Node.js APIs in the renderer
      preload: path.join(__dirname, 'preload.js'), // Securely expose APIs
    },
  });

  // Load the React app
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Security: Block navigation and new window creation from renderer
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow external links to open in the default browser
    if (url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ipcMain.handle('electron-store-get', async (event, key) => {
    return store.get(key);
  });
  
  ipcMain.handle('electron-store-set', async (event, key, value) => {
    store.set(key, value);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});