const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  findPortClient:   () => ipcRenderer.send('findPortClient'),
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
  const grpPos  = document.getElementById("grpPos");
  const grpVel  = document.getElementById("grpVel");
  const grpCur  = document.getElementById("grpCur");
  const grpPos2 = document.getElementById("grpPos2");
  const faultNow = document.getElementById("faultNow");
  const faultOccurred = document.getElementById("faultOccurred");
  const busVoltage = document.getElementById("busVoltage");

  grpPos.text = arg.position[0]+" deg";
  grpVel.text = arg.velocity[0]+" RPM";
  grpCur.text = arg.current[0]+" mA";
  grpPos2.text = arg.grpPos[0]/100+" %";
  faultNow.value = arg.faultNow[0];
  faultOccurred.value = arg.faultOccurred[0];
  busVoltage.value = arg.Vbus[0]+" V";
});

ipcRenderer.on('findPort-reply', (event, arg) => {
  const portMessages = document.getElementById("portMessages");
  portMessages.text = JSON.stringify(arg);
});

ipcRenderer.on('connectClient-reply', (event, arg) => {
  const portMessages = document.getElementById("portMessages");
  portMessages.text = arg;
});

ipcRenderer.on('disconnectClient-reply', (event, arg) => {
  const portMessages = document.getElementById("portMessages");
  // portMessages.text = JSON.stringify(arg);
  portMessages.text = arg;
});