// window.addEventListener('DOMContentLoaded', () => {
//     const replaceText = (selector, text) => {
//       const element = document.getElementById(selector)
//       if (element) element.innerText = text
//     }

//     for (const type of ['chrome', 'node', 'electron']) {
//       replaceText(`${type}-version`, process.versions[type])
//     }
//   })

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  connectClient:    (data) => ipcRenderer.send('connectClient', data),
  disconnectClient: () => ipcRenderer.send('disconnectClient'),
  gripperInitialize:() => ipcRenderer.send('gripperInitialize'),
  gripperOpen:() => ipcRenderer.send('gripperOpen'),
  gripperClose:() => ipcRenderer.send('gripperClose')
});

// contextBridge.exposeInMainWorld('electronAPI', { disconnectClient: (data) => ipcRenderer.send('disconnectClient', data)});

// contextBridge.exposeInMainWorld('electronAPI', { gripperInitialize: () => ipcRenderer.send('gripperInitialize')});