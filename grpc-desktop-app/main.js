const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const isDevImport = require('electron-is-dev');
const isDev = typeof isDevImport === 'boolean' ? isDevImport : isDevImport.default;

let pyProc = null;
let grpcClient = null;

let pythonPath = null;

function setRuntimes() {
  console.log('[Electron] Setting Runtimes started...');
  console.debug('.   isDev =', isDev);

  if (process.platform === 'win32') {
    pythonPath = isDev
      ? path.join(__dirname, 'runtimes', 'win32', 'python', 'python.exe')
      : path.join(process.resourcesPath, 'runtimes', 'python', 'python.exe');
  } else {
    pythonPath = isDev
      ? path.join(__dirname, 'runtimes', 'darwin-arm64', 'python', 'bin', 'python3.11')
      : path.join(process.resourcesPath, 'runtimes', 'python', 'bin', 'python3.11');
  }
  
  console.debug('.   Python Path =', pythonPath);
}

function startPython() {
  console.log('[Electron] Python process started...');
  console.debug('isDevImport =', isDevImport);
  console.debug('isDev =', isDev);
  console.debug('platform = ', process.platform);

  // pyProc = spawn('python', ['-u', './backend/main.py']);

  let scriptPath;
  let command;
  let args;

  // On macOS
  scriptPath = isDev
    ? path.join(__dirname, 'backend', 'main.py')
    : path.join(process.resourcesPath, 'backend', 'main.py');
  command = pythonPath
  args = ['-u', scriptPath]
  
  console.debug('.   scriptPath =', scriptPath);
  console.debug('.   command =', command);
  console.debug('.   args =', args);

  pyProc = spawn(command, args);

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
  console.log('[Electron] gRPC process started...');
  console.debug('isDev = ', isDev);

  const protoPath = isDev
      ? path.join(__dirname, 'backend', 'langgraph.proto')
      : path.join(process.resourcesPath, 'backend', 'langgraph.proto');
  console.debug('.   __dirname =', __dirname);
  console.debug('.   process.resourcesPath =', process.resourcesPath);
  console.debug('.   protoPath =', protoPath);

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

  win.loadFile(path.join(__dirname, 'frontend/dist/index.html'))
    .then(() => console.log('[Electron] Frontend loaded'))
    .catch(err => console.error('[Electron] Failed to load UI:', err));

  win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  console.log('[Electron] main.js started')

  setRuntimes();
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
