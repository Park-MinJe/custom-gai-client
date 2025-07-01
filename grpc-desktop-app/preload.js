const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Unary
  runGraph: (input) => ipcRenderer.invoke('run-graph', input),

  // Streaming
  runGraphStream: (input, onChunk) => {
    ipcRenderer.removeAllListeners('graph-stream-chunk'); // avoid stacking listeners
    ipcRenderer.on('graph-stream-chunk', (event, chunk) => {
      onChunk(chunk); // stream each chunk to UI
    });

    return ipcRenderer.invoke('run-graph-stream', input); // return full stream (if needed)
  }
});
