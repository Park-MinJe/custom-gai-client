const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let pyProc = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadURL('http://localhost:3000'); // React dev server
}

app.whenReady().then(() => {
  pyProc = spawn('python', ['./backend/main.py']);
  pyProc.stdout.on('data', (data) => console.log(`Python: ${data}`));
  pyProc.stderr.on('data', (data) => console.error(`Python Error: ${data}`));
  createWindow();
});

app.on('will-quit', () => {
  if (pyProc) pyProc.kill();
});
