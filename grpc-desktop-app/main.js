const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const isDevImport = require('electron-is-dev');
const isDev = typeof isDevImport === 'boolean' ? isDevImport : isDevImport.default;

// Python related Subprocesses
let pyProc = null;
let grpcClient = null;

// Python related path
let pythonPath = null;
let pipPath = null;
let uvPath = null;
let uvxPath = null;

// Node related path
let nodePath = null;
let npmPath = null;
let npxPath = null;

// Python Procs
let testPyProc = null;
let testPipProc = null;
let testUvProc = null;
let testUvxProc = null;

// Node Procs
let testNodeProc = null;
let testNpmProc = null;
let testNpxProc = null;

let mainWindow = null;

function sendLog(log_message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', log_message);
  }
}

function setRuntimes() {
  console.log('[Electron] Setting Runtimes started...');
  sendLog('[Electron] Setting Runtimes started...');
  console.debug('.   isDev =', isDev);

  if (process.platform === 'win32') {
    baseDir = isDev
      ? path.join(__dirname, 'runtimes', 'win32')
      : path.join(process.resourcesPath, 'runtimes');

    // Python related
    pythonPath = path.join(baseDir, 'python', 'python.exe');
    pipPath = path.join(baseDir, 'python', 'Scripts', 'pip.exe');
    uvPath = path.join(baseDir, 'python', 'Scripts', 'uv.exe');
    uvxPath = path.join(baseDir, 'python', 'Scripts', 'uvx.exe');

    // Node related
    nodePath = path.join(baseDir, 'node', 'node.exe');
    npmPath = path.join(baseDir, 'node', 'npm.cmd');
    npxPath = path.join(baseDir, 'node', 'npx.cmd');
  } else {
    baseDir = isDev
      ? path.join(__dirname, 'runtimes', 'darwin-arm64')
      : path.join(process.resourcesPath, 'runtimes');

    // Python related
    pythonPath = path.join(baseDir, 'python', 'bin', 'python3.11');
    pipPath = path.join(baseDir, 'python', 'bin', 'pip');
    uvPath = path.join(baseDir, 'python', 'bin', 'uv');
    uvxPath = path.join(baseDir, 'python', 'bin', 'uvx');

    // Node related
    nodePath = path.join(baseDir, 'node', 'bin', 'node');
    npmPath = path.join(baseDir, 'node', 'bin', 'npm')
    npxPath = path.join(baseDir, 'node', 'bin', 'npx');
  }
  
  console.debug('.   Python Path =', pythonPath);
  console.debug('.   Node Path =', nodePath);
}

function testRuntimes() {
  // Python Procs
  testPyProc = spawn(pythonPath, ['--version']);
  testPipProc = spawn(pipPath, ['--version']);
  testUvProc = spawn(uvPath, ['--version']);
  testUvxProc = spawn(uvxPath, ['--version']);

  // Node Procs
  testNodeProc = spawn(nodePath, ['--version']);
  testNpmProc = spawn(npmPath, ['--version']);
  testNpxProc = spawn(npxPath, ['--version']);

  // Test Python Procs
  testPyProc.stdout.on('data', (data) => {
    test_output = `[Electron] Python version = ${data}`;
    console.log(test_output);
    sendLog(test_output);
  });
  testPipProc.stdout.on('data', (data) => {
    test_output = `[Electron] Pip version = ${data}`;
    console.log(test_output);
    sendLog(test_output);
  });
  testUvProc.stdout.on('data', (data) => {
    test_output = `[Electron] UV version = ${data}`;
    console.log(test_output);
    sendLog(test_output);
  });
  testUvxProc.stdout.on('data', (data) => {
    test_output = `[Electron] UVX version = ${data}`;
    console.log(test_output);
    sendLog(test_output);
  });

  // Test Node Procs
  testNodeProc.stdout.on('data', (data) => {
    test_output = `[Electron] NODE version = ${data}`;
    console.log(test_output);
    sendLog(test_output);
  });
  testNpmProc.stdout.on('data', (data) => {
    test_output = `[Electron] NPM version = ${data}`;
    console.log(test_output);
    sendLog(test_output);
  });
  testNpxProc.stdout.on('data', (data) => {
    test_output = `[Electron] NPX version = ${data}`;
    console.log(test_output);
    sendLog(test_output);
  });
}

function startPython() {
  console.log('[Electron] Python process started...');
  sendLog('[Electron] Python process started...');
  console.debug('.   isDevImport =', isDevImport);
  console.debug('.   isDev =', isDev);
  console.debug('.   platform = ', process.platform);

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
    sendLog(`[Python] ${data}`);
  });
  pyProc.stderr.on('data', (data) => {
    console.error(`[Python error] ${data}`);
    sendLog(`[Python error] ${data}`);
  });

  pyProc.on('error', (err) => {
    console.error(`[Python failed to start] ${err}`);
    sendLog(`[Python failed to start] ${err}`);
  });

  pyProc.on('close', (code) => {
    console.log(`[Python exited with code ${code}]`);
    sendLog(`[Python exited with code ${code}]`);
  });
}

function setupGrpc() {
  console.log('[Electron] gRPC process started...');
  sendLog('[Electron] gRPC process started...');
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
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend/dist/index.html'))
    .then(() => {
      console.log('[Electron] Frontend loaded');
      testRuntimes();
    })
    .catch(err => console.error('[Electron] Failed to load UI:', err));

  mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  console.log('[Electron] main.js started')

  createWindow();
  setRuntimes();
  startPython();
  setupGrpc();

  // Unary
  ipcMain.handle('run-graph', async (event, input) => {
    console.log('[Electron] run-graph input:', input);
    return new Promise((resolve, reject) => {
      grpcClient.RunGraph({ user_input: input }, (err, res) => {
        if (err) {
          console.error('[Electron] gRPC error:', err);
          sendLog(`[Electron] gRPC error: ${err}`);
          reject(err);
        }
        else {
          console.log('[Electron] gRPC response:', res);
          sendLog(`[Electron] gRPC response: ${res}`);
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
        sendLog(`Electron] gRPC stream error: ${err}`);
        reject(err);
      });
    });
  });
});

app.on('before-quit', () => {
  if (pyProc) pyProc.kill();

  // Python Procs
  if (testPyProc) testPyProc.kill();
  if (testPipProc) testPipProc.kill();
  if (testUvProc) testUvProc.kill();
  if (testUvxProc) testUvxProc.kill();

  // Node Procs
  if (testNodeProc) testNodeProc.kill();
  if (testNpmProc) testNpmProc.kill();
  if (testNpxProc) testNpxProc.kill();
});
