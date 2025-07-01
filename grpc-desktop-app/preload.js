const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runGraph: (input) => ipcRenderer.invoke('run-graph', input),
});
