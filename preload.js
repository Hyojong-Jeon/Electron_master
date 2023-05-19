const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  connectClient:    (data) => ipcRenderer.send('connectClient', data),
  disconnectClient: () => ipcRenderer.send('disconnectClient'),
  gripperInitialize:() => ipcRenderer.send('gripperInitialize'),
  gripperOpen:() => ipcRenderer.send('gripperOpen'),
  gripperClose:() => ipcRenderer.send('gripperClose'),
  gripperPosCtrl:(data) => ipcRenderer.send('gripperPosCtrl', data),
  writeMBAddress:(data) => ipcRenderer.send('writeMBAddress', data),
  writeElAngle:() => ipcRenderer.send('writeElAngle'),
  gripperDataReq:(data) => ipcRenderer.send('gripperDataReq', data),
  gripperDataRes:() => ipcRenderer.send('gripperDataRes'),
  motorEnable: (data) => ipcRenderer.send('motorEnable', data),
  pumpONOFF: (data) => ipcRenderer.send('pumpONOFF', data),
});

ipcRenderer.on('asynchronous-reply', (event, arg) => {
  // console.log(arg)
  const grpPos = document.getElementById("grpPos");
  const grpVel = document.getElementById("grpVel");
  const grpCur = document.getElementById("grpCur");

  grpPos.text = arg.position[0]+" deg";
  grpVel.text = arg.velocity[0]+" RPM";
  grpCur.text = arg.current[0]+" mA";
});
