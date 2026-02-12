const { app, BrowserWindow } = require("electron");
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: "hiddenInset"
  });

  win.loadFile("index.html");
}

app.whenReady().then(createWindow);
