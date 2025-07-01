const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const isDev = require('electron-is-dev');

let pyProc = null;
let grpcClient = null;

function startPython() {
  console.log('[Electron] Python process started...');

  // pyProc = spawn('python', ['-u', './backend/main.py']);
  const scriptPath = isDev
    ? path.join(__dirname, 'backend', 'main.py')
    : path.join(process.resourcesPath, 'backend', 'main.exe');
  pyProc = spawn(scriptPath, [], {
    cwd: path.dirname(scriptPath),
    windowsHide: true
  });

  pyProc.stdout.on('data', (data) => {
    console.log(`[Python] ${data}`);
  });
  pyProc.stderr.on('data', (data) => {
    console.error(`[Python error] ${data}`);
  });

  pyProc.on('error', (err) => {
    console.error(`[Python failed to start] ${err}`);
  });

  pyProc.on('close', (code) => {
    console.log(`[Python exited with code ${code}]`);
  });
}

function setupGrpc() {
  const protoPath = path.join(__dirname, 'backend', 'langgraph.proto');
  const def = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  const pkg = grpc.loadPackageDefinition(def).langgraph;

  grpcClient = new pkg.LangGraphService('localhost:50051', grpc.credentials.createInsecure());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'frontend/dist/index.html'));

  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  console.log('[Electron] main.js started')

  startPython();
  setupGrpc();
  createWindow();

  // Unary
  ipcMain.handle('run-graph', async (event, input) => {
    console.log('[Electron] run-graph input:', input);
    return new Promise((resolve, reject) => {
      grpcClient.RunGraph({ user_input: input }, (err, res) => {
        if (err) {
          console.error('[Electron] gRPC error:', err);
          reject(err);
        }
        else {
          console.log('[Electron] gRPC response:', res);
          resolve(res.result);
        }
      });
    });
  });

  // Streaming
  ipcMain.handle('run-graph-stream', async (event, input) => {
    return new Promise((resolve, reject) => {
      const call = grpcClient.RunGraphStream({ user_input: input });

      const chunks = [];

      call.on('data', (response) => {
        event.sender.send('graph-stream-chunk', response.result); // send back to renderer
        chunks.push(response.result);
      });

      call.on('end', () => {
        resolve(chunks); // optionally resolve full stream after all chunks
      });

      call.on('error', (err) => {
        console.error('[Electron] gRPC stream error:', err);
        reject(err);
      });
    });
});

});

app.on('before-quit', () => {
  if (pyProc) pyProc.kill();
});
