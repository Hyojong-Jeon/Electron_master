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
var MB_COMPORT;
var MB_BAUDRATE = 38400; 
var MB_ID = 1;
var MB_TIMEOUT;
var gripperData = new Object();
gripperData.position = new Int16Array([0]);
gripperData.velocity = new Int16Array([0]); 
gripperData.current  = new Int16Array([0]); 

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
    clientRTU.close(function() {console.log("[" + MB_COMPORT + ' 장치와의 연결이 종료되었습니다.]')});
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
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('index.html')
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  })
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});