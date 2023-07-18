/*   Build Application using Electron Forge   */
/*  Code by KOREA UNIVERSITY IRL Hyojong Jeon */
//============================================//
"use strict";
//============================================//

// Include Library //
const { app, BrowserWindow, ipcMain, webContents } = require('electron');
const path = require('path');
const ModbusRTU = require ("modbus-serial");
const { SerialPort } = require('serialport');
const WebSocketClient = require('websocket').client;

// Declaration //
const clientRTU = new ModbusRTU();
const clientWS = new WebSocketClient();
/* -------------------------------------------------------------------- */
// RTU Initial Setup //
const MB_TIMEOUT = 50;
const MB_INTERVAL = 100;
const SYS_CLOCK = 10;

let MB_PORT_OPENED = false;
let sysClockCnt = 0;
let MB_READ_ON = false;
let MB_SEND_BUFFER = [];
let MB_READ_FAIL_CNT = 0;
let MB_CUR_ERROR_CNT = 0;
let MB_OLD_CUR_VALUE = 0;
let MB_FAULT_OCCURRED = false;

var gripperData = new Object();
gripperData.state    = new Int16Array([0]);
gripperData.position = new Int16Array([0]);
gripperData.velocity = new Int16Array([0]);
gripperData.current  = new Int16Array([0]);
gripperData.grpPos   = new Int16Array([0]);
gripperData.faultNow = new Int16Array([0]);
gripperData.faultOccurred = new Int16Array([0]);
gripperData.Vbus = new Int16Array([0]);
gripperData.mbMessage1 = "MODBUS SEND STATE";
gripperData.mbMessage2 = "";

var listCOMPort = [];

//** DATC-EMD MODBUS COMMAND **/
const ENABLE    = 1;
const STOP_P    = 2;
const STOP_V    = 3;
const DISABLE   = 4;
const POS_CTRL  = 5;
const VEL_CTRL  = 6;
const TOR_CTRL  = 7;
const RESET_POS = 8;
const ERROR_CLEAR = 9;
const SYS_RESET = 10;

const CHANGE_MB_ID    = 50;
const CHANGE_EL_ANGLE = 51;

const GRP_SET_DIR  = 100;
const GRP_INIT     = 101;
const GRP_OPEN     = 102;
const GRP_CLOSE    = 103;
const GRP_POS_CTRL = 104; // 0 ~ 100%
const MB_GRP_INIT2 = 105;
const MB_VAC_ON    = 106;
const MB_VAC_OFF   = 107;
//** DATC-EMD MODBUS COMMAND **/

setInterval(systemInterrupt, SYS_CLOCK);

function systemInterrupt() {
  // MODBUS READ TIMING //
  if (sysClockCnt % 10 === 0) {
    if (MB_READ_ON === true) {
      if (MB_READ_FAIL_CNT > 10) {
        //  MB_READ_ON = false;
        MB_READ_FAIL_CNT = 0;
      } else {
        MB_READ();
      }
    }
  }

  // MODBUS SEND TIMING //
  if (sysClockCnt % 10 === 7) {
    if (MB_SEND_BUFFER.length > 0) {
      MB_SEND(MB_SEND_BUFFER[0]);
      MB_SEND_BUFFER.shift();
    }
  }

  // USB PORT Check //
  if (sysClockCnt % 100 === 99) {
    checkUSBConnection();
  }

  // STM Fault Check //
  if (sysClockCnt % 100 === 51) {
    if (gripperData.faultOccurred > 0) {
      MB_FAULT_OCCURRED = true;
    }
    if (MB_FAULT_OCCURRED === true) {
      MB_SEND_BUFFER.push([ERROR_CLEAR]);
    }
  }

  // Current Current Check //
  // if (sysClockCnt % 10 === 2) {
  //   let MB_MOTOR_EN = (gripperData.state & 1) !== 0;
  //   console.log(MB_MOTOR_EN);

  //   if (MB_READ_ON === true && MB_MOTOR_EN === true) {
  //     if (MB_OLD_CUR_VALUE === gripperData.current) {
  //       ++MB_CUR_ERROR_CNT;
  //       console.log(MB_CUR_ERROR_CNT);
  //       MB_OLD_CUR_VALUE = gripperData.current;
  //     } else {
  //       MB_CUR_ERROR_CNT = 0;
  //       MB_OLD_CUR_VALUE = gripperData.current;
  //     }
  //     if (MB_CUR_ERROR_CNT > 5) {
  //       MB_SEND_BUFFER.push([SYS_RESET]);
  //       MB_SEND_BUFFER.push([ENABLE]);
  //       MB_SEND_BUFFER.push([MB_VAC_ON]);
  //       console.log("RESET SYSTEM!");
  //     }
  //   }
  // }

  sysClockCnt++;
  if (sysClockCnt > 99) {
    sysClockCnt = 0;
  }
}

function checkUSBConnection() {
  SerialPort.list()
    .then(ports => {
      const compPortNum = ports.length;
      if (compPortNum === 0) {
          // console.log('NO USB COMPORT');
      } else if (compPortNum > 0) {
          listCOMPort.length = 0;
          for (let i = 0; i < compPortNum; i++) {
            listCOMPort[i] = ports[i].friendlyName;
          }
      } else {
          console.log('Comport length error');
      }
    })
    .catch(error => {
      console.error("USB connection error occured:", error);
    });
}

// RTU Function Declaration //
function MB_OPEN(baudRateVal, comPortVal, modbusID) {
  clientRTU.setID      (modbusID);
  clientRTU.setTimeout (MB_TIMEOUT);
  clientRTU.connectRTUBuffered (comPortVal, { baudRate: baudRateVal, parity: "none", dataBits: 8, stopBits: 1 })
      .then(function() {
          console.log("[" + comPortVal + " The device has been connected.]");
      })
      .catch(function(e) {
          console.log(e);
      })
}

function MB_CLOSE() {
  clientRTU.close(function() {console.log("[The connection with the device has been terminated.]")});
}

function MB_SEND(values) {
  const START_ADDRESS = 0; // negative values (< 0) have to add 65535 for Modbus registers

    clientRTU.writeRegisters(START_ADDRESS, values)
    .then(function(d) {
        gripperData.mbMessage1 = "[MODBUS Write Registers "+ JSON.stringify(values) + JSON.stringify(d) + " ]";
        console.log("[MODBUS Write Registers", values, d,"]");
    })
    .catch(function(e) {
        gripperData.mbMessage1 = "[MB_SEND ERROR: " + e.message + "]";
        console.log("[MB_SEND ERROR: "+e.message+"]");
    })

    return true;
}

function MB_READ() {
  // try to read data
  const START_ADDRESS = 10;
  const DATA_LENGTH = 8;

  clientRTU.readHoldingRegisters(START_ADDRESS, DATA_LENGTH)
  .then(function(data) {
    gripperData.state    = new Int16Array([Number(data.data[0])]);
    gripperData.position = new Int16Array([Number(data.data[1])]);
    gripperData.current  = new Int16Array([Number(data.data[2])]);
    gripperData.velocity = new Int16Array([Number(data.data[3])]);
    gripperData.grpPos   = new Int16Array([Number(data.data[4])]);
    gripperData.faultNow = new Int16Array([Number(data.data[5])]);
    gripperData.faultOccurred = new Int16Array([Number(data.data[6])]);
    gripperData.Vbus = new Int16Array([Number(data.data[7])]);
    gripperData.mbMessage2 = "[MB_READ SUCCESS: NO ERROR]";

    MB_READ_FAIL_CNT = 0;
  })
  .catch(function(e) {
    gripperData.mbMessage2 = "[MB_READ ERROR: " + e.message + "]";
    console.log("[MB_READ ERROR: " + e.message+"]");
    ++MB_READ_FAIL_CNT;
  });
}

/* -------------------------------------------------------------------- */

// Others: Electron Function //

function createWindow () {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    width: 650,
    height: 800
  });
  mainWindow.loadFile('index.html');

  ipcMain.on('connectClient', (event, data) => {
    const comPort  = data.comPort;
    const bitRate  = (Number)(data.bitRate);
    const modbusID = (Number)(data.modbusID);
    // MB_OPEN(bitRate, comPort, modbusID);

    if (MB_PORT_OPENED === false) {
      clientRTU.setID      (modbusID);
      clientRTU.setTimeout (MB_TIMEOUT);
      clientRTU.connectRTUBuffered (comPort, { baudRate: bitRate, parity: "none", dataBits: 8, stopBits: 1 })
          .then(function() {
              console.log("[" + comPort + " The device has been connected.]");
              event.reply('connectClient-reply', "[" + comPort + " The device has been connected.]");
              MB_PORT_OPENED = true;
          })
          .catch(function(e) {
              console.log(e);
              event.reply('connectClient-reply', e);
          })
    } else {
      let message = "The port already opened";
      console.log(message);
      event.reply('connectClient-reply', message);
    }
  });

  ipcMain.on('disconnectClient', (event) => {
    if (MB_PORT_OPENED === true) {
      clientRTU.close(function() {console.log("[The connection with the device has been terminated.]")});
      event.reply('connectClient-reply', "[The connection with the device has been terminated.]");
      MB_PORT_OPENED = false;
    } else {
      let message = "The port already closed";
      console.log(message);
      event.reply('connectClient-reply', message);
    }
    // MB_CLOSE();
  });

  ipcMain.on('gripperInitialize', (event) => {
    MB_SEND_BUFFER.push([GRP_INIT]);
  });

  ipcMain.on('gripperOpen', (event) => {
    MB_SEND_BUFFER.push([GRP_OPEN]);
  });

  ipcMain.on('gripperClose', (event) => {
    MB_SEND_BUFFER.push([GRP_CLOSE]);
  });

  ipcMain.on('gripperPosCtrl', (event, data) => {
    const gripperPosValue = 100*(Number)(data);
    MB_SEND_BUFFER.push([GRP_POS_CTRL, gripperPosValue]);
  });

  ipcMain.on('writeMBAddress', (event, data) => {
    const MBAddress = (Number)(data);
    MB_SEND_BUFFER.push([CHANGE_MB_ID, MBAddress]);
  });

  ipcMain.on('writeElAngle', (event) => {
    MB_SEND_BUFFER.push([CHANGE_EL_ANGLE]);
  });

  ipcMain.on('gripperDataReq', (event, data) => {
    const dataRepeat = data.dataRepeat;

    if(dataRepeat) {
      MB_READ_ON = true;
      console.log("[Gripper] Data Send ON");
    } else {
      MB_READ_ON = false;
      console.log("[Gripper] Data Send OFF");
    }
  });

  ipcMain.on('gripperDataRes', (event) => {
    event.reply('asynchronous-reply', gripperData);
  });

  ipcMain.on('findPortClient', (event) => {
    event.reply('findPort-reply', listCOMPort);
  });

  ipcMain.on('motorEnable', (event, data) => {
    const checkBox = data;
    if (checkBox) {
      MB_SEND_BUFFER.push([ENABLE]);
    } else {
      MB_SEND_BUFFER.push([DISABLE]);
    }
  });

  ipcMain.on('pumpONOFF', (event, data) => {
    const checkBox = data;
    if (checkBox) {
      MB_SEND_BUFFER.push([MB_VAC_ON]);
    } else {
      MB_SEND_BUFFER.push([MB_VAC_OFF]);
    }
  });

  ipcMain.on('gripperInitialize2', (event, data) => {
    let INIT2VALUE = (Number)(data);
    if (INIT2VALUE < 0) {
      let temp = new Uint16Array([0]);
      temp[0] = INIT2VALUE;
      INIT2VALUE = (Number)(temp[0]);
    }
    MB_SEND_BUFFER.push([MB_GRP_INIT2, INIT2VALUE]);
  });

  ipcMain.on('SysReset', (event) => {
    MB_SEND_BUFFER.push([SYS_RESET]);
    // MB_SEND_BUFFER.push([ENABLE]);
    // MB_SEND_BUFFER.push([MB_VAC_ON]);
  });

  ipcMain.on('startWebSocClient', (event, data) => {
    const localhost = 'ws://localhost:' + data;
    clientWS.connect(localhost);
  });
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


/* -------------------------------------------------------------------- */

// Others: PlotJuggler //
clientWS.on('connectFailed', (error) => {
  console.log(`Failed to connect server: ${error.toString()}`);
});

clientWS.on('connect', (connection) => {
  console.log('Success to connect server');

  connection.on('message', (message) => {
    if (message.type === 'utf8') {
      console.log(`Messages from server: ${message.utf8Data}`);
    }
  });

  connection.on('close', () => {
    console.log('.');
  });
});

/* -------------------------------------------------------------------- */