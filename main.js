/*   Build Application using Electron Forge   */
/*  Code by KOREA UNIVERSITY IRL Hyojong Jeon */
//============================================//
"use strict";
//============================================//

// Include Library //
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ModbusRTU = require ("modbus-serial");

// Declaration //
const clientRTU = new ModbusRTU();
/* -------------------------------------------------------------------- */

// RTU Initial Setup //
var MB_TIMEOUT;
var gripperData = new Object();
gripperData.position = new Int16Array([0]);
gripperData.velocity = new Int16Array([0]);
gripperData.current  = new Int16Array([0]);

let intervalID;

const ENABLE    = 1;
const STOP_P    = 2;
const STOP_V    = 3;
const DISABLE   = 4;
const POS_CTRL  = 5;
const VEL_CTRL  = 6;
const TOR_CTRL  = 7;
const RESET_POS = 8;

const CHANGE_MB_ID    = 50;
const CHANGE_EL_ANGLE = 51;

const GRP_SET_DIR  = 100;
const GRP_INIT     = 101;
const GRP_OPEN     = 102;
const GRP_CLOSE    = 103;
const GRP_POS_CTRL = 104; // 0 ~ 100

// RTU Function Declaration //
const MB_OPEN = function(baudRateVal, comPortVal, modbusID) {
    clientRTU.setID      (modbusID);
    clientRTU.setTimeout (MB_TIMEOUT);
    clientRTU.connectRTUBuffered (comPortVal, { baudRate: baudRateVal, parity: "none", dataBits: 8, stopBits: 1 })
        .then(function() {
            console.log("[" + comPortVal + " 장치와 연결되었습니다.]");
        })
        .catch(function(e) {
            console.log(e);
        })
};

const MB_CLOSE = function() {
    clientRTU.close(function() {console.log("[장치와의 연결이 종료되었습니다.]")});
};

const MB_SEND = function(values) {
    const START_ADDRESS = 0; // negative values (< 0) have to add 65535 for Modbus registers

    clientRTU.writeRegisters(START_ADDRESS, values)
        .then(function(d) {
            console.log("[MODBUS Write Registers", values, d,"]");
        })
        .catch(function(e) {
            console.log("["+e.message+"]");
        })
};

const MB_READ = function() {
    // try to read data
    const START_ADDRESS = 11;
    const DATA_LENGTH = 3;

    clientRTU.readHoldingRegisters(START_ADDRESS, DATA_LENGTH)
        .then(function(data) {
            gripperData.position = new Int16Array([Number(data.data[0])]);
            gripperData.current  = new Int16Array([Number(data.data[1])]);
            gripperData.velocity = new Int16Array([Number(data.data[2])]);
            console.log( gripperData );
        })
        .catch(function(e) {
            console.log(e);
        });
};

/* -------------------------------------------------------------------- */

// Others: Electron Function //

function createWindow () {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  ipcMain.on('connectClient', (event, data) => {
    const comPort  = data.comPort;
    const bitRate  = (Number)(data.bitRate);
    const modbusID = (Number)(data.modbusID);
    MB_OPEN(bitRate, comPort, modbusID);
    console.log(data);
    // console.log(bitRate, comPort, modbusID);
  });

  ipcMain.on('disconnectClient', (event) => {
    MB_CLOSE();
    // console.log(event);
  });

  ipcMain.on('gripperInitialize', (event) => {
    MB_SEND([GRP_INIT]);
  });

  ipcMain.on('gripperOpen', (event) => {
    MB_SEND([GRP_OPEN]);
  });

  ipcMain.on('gripperClose', (event) => {
    MB_SEND([GRP_CLOSE]);
  });

  ipcMain.on('gripperPosCtrl', (event, data) => {
    const gripperPosValue = 100*(Number)(data);
    MB_SEND([GRP_POS_CTRL, gripperPosValue]);
  });

  ipcMain.on('writeMBAddress', (event, data) => {
    const MBAddress = (Number)(data);
    MB_SEND([CHANGE_MB_ID, MBAddress]);
  });

  ipcMain.on('writeElAngle', (event) => {
    MB_SEND([CHANGE_EL_ANGLE]);
  });

  ipcMain.on('gripperData', (event, data) => {
    const dataRepeat = data.dataRepeat;

    if(dataRepeat == true) {
      intervalID = setInterval(MB_READ, 100);
      console.log("[Gripper] Data Send ON");
    } else {
      clearInterval(intervalID);
      console.log("[Gripper] Data Send OFF");
    }

    MB_SEND([CHANGE_EL_ANGLE]);
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
});