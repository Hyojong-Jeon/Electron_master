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
const net = require('net');
const { stringify } = require('querystring');

// Declaration //
const clientRTU = new ModbusRTU();
const clientWS = new WebSocketClient();
const clientTCP = new net.Socket();
/* -------------------------------------------------------------------- */
// RTU Initial Setup //
const MB_TIMEOUT = 50;
const MB_INTERVAL = 100;
const SYS_CLOCK = 10;

let MB_PORT_OPENED = false;
let sysClockCnt = 0;
let repeatFlag = false;
let MB_READ_ON = false;
let MB_SEND_BUFFER = [];
let MB_READ_FAIL_CNT = 0;
let MB_CUR_ERROR_CNT = 0;
let MB_OLD_CUR_VALUE = 0;
let MB_FAULT_OCCURRED = false;

let WS_PORT_OPENED = false;
let WS_STATE = 'WS_CLOSED';
let WS_STATE_MESSAGE = '';
let WS_INTERVAL;
let intervalID2;

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

//** DATC-EMD MODBUS COMMAND BEGIN **/
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

const MB_SET_MAX_VAL  = 201;
const MB_SET_PID_GAIN = 211;
const MB_SET_TORQUE   = 212;
const MB_SET_VELOCITY = 213;
//** DATC-EMD MODBUS COMMAND END **/

setInterval(systemInterrupt, SYS_CLOCK);

function systemInterrupt() { // 10ms
  // MODBUS READ TIMING //
  if (sysClockCnt % 5 === 0) {
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
  if (sysClockCnt % 5 === 3) {
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
      // MB_SEND_BUFFER.push([ERROR_CLEAR]);
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

  ipcMain.on('gripperRepeat', (event) => {
    repeatFlag = !repeatFlag;

    if (repeatFlag) {
      intervalID2 = setInterval(()=>{
        MB_SEND_BUFFER.push([GRP_OPEN]);
        setTimeout(()=>{
          MB_SEND_BUFFER.push([GRP_CLOSE]);
          },2500);
        }, 5000);
    } else {
      clearInterval(intervalID2);
    }
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

  ipcMain.on('webSocState', (event) => {
    switch (WS_STATE) {
      case 'WS_OPENED': {
        WS_STATE_MESSAGE = 'Websocket Opened';
      } break;

      case 'WS_OPENING': {
        WS_STATE_MESSAGE = 'Websocket opening';
      } break;

      case 'WS_CLOSED': {
        WS_STATE_MESSAGE = 'Websocket Closed';
      } break;

      case 'WS_FAILED': {
        WS_STATE_MESSAGE = 'Websocket Failed';
      } break;

      default : {

      } break;
    }

    event.reply('wsState-reply', WS_STATE_MESSAGE);
  });

  ipcMain.on('startWebSocClient', (event, data) => {
    const localhost = 'ws://localhost:' + data;
    clientWS.connect(localhost);
    WS_STATE = 'WS_OPENING';
  });

  ipcMain.on('CAN_Enable', (event) => {
    const TX_2 = new Uint8Array([4,0,0,5,0,8,0,1,0,0,0,0,0,0]);
    client.write(TX_2);
    console.log(TX_2);
  });

  ipcMain.on('CAN_Disable', (event) => {
    const TX_TEST = '04'+'00000500'+'08'+'00'+'04'+'00'+'00'+'00'+'00'+'00'+'00';
    const abc = clientTCP.write(TX_TEST, ()=> {
      console.log(abc);
    });
  });

  ipcMain.on('CAN_Init', (event) => {
    const TX_TEST = '04'+'00000500'+'08'+'00'+'65'+'00'+'00'+'00'+'00'+'00'+'00';
    clientTCP.write(TX_TEST);
  });

  ipcMain.on('setPIDGain', (event, data) => {
    const PGain = data.PGain;
    const IGain = data.IGain;
    const DGain = data.DGain;

    MB_SEND_BUFFER.push([MB_SET_PID_GAIN, PGain, IGain, DGain]);
  });

  ipcMain.on('PosMove', (event, data) => {
    let position_uint16 = new Uint16Array(1);
    position_uint16[0] = (Number)(data.position) + (Number)(gripperData.position);

    const position = position_uint16[0];
    const duration = data.duration;

    MB_SEND_BUFFER.push([POS_CTRL, position, duration]);
    // MB_SEND_BUFFER.push([TOR_CTRL, 1000]);
  });

  ipcMain.on('setTorque', (event, data) => {
    const setTorque = data;
    MB_SEND_BUFFER.push([MB_SET_TORQUE, setTorque]);
  });

  ipcMain.on('setVelocity', (event, data) => {
    const setVelocity = data;
    MB_SEND_BUFFER.push([MB_SET_VELOCITY, setVelocity]);
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
  WS_STATE = 'WS_FAILED';
});

clientWS.on('connect', (connection) => {
  console.log('Success to connect server');
  WS_STATE = 'WS_OPENED';

  connection.on('message', (message) => {
    if (message.type === 'utf8') {
      console.log(`Messages from server: ${message.utf8Data}`);
    }
  });

  connection.on('close', () => {
    WS_STATE = 'WS_CLOSED';
    clearInterval(WS_INTERVAL);
    console.log('Websocket sever is closed');
  });

  WS_INTERVAL = setInterval(() => {
    let jsonData = new Object();

    jsonData.position = gripperData.position;
    jsonData.velocity = gripperData.velocity;
    jsonData.current  = gripperData.current;

    connection.sendUTF(JSON.stringify(jsonData));
  });
});


/* -------------------------------------------------------------------- */

// Others: eCAN Communication (with AIDIN ROBOTICS FT Sensor) //
// const host = '192.168.0.223';
// const port = 4001;

// let Force_buffer = new Object();

// clientTCP.connect(port, host, () => {
//   console.log('TCP/IP Server Connected Successfully');
//   //                    STD    INDEX   LENG  D0   D1   D2   D3   D4   D5   D6   D7
//   const STOP_TX      = '04'+'00000102'+'08'+'01'+'00'+'00'+'00'+'00'+'00'+'00'+'00';
//   const BIAS_INIT    = '04'+'00000102'+'08'+'01'+'02'+'01'+'00'+'00'+'00'+'00'+'00';
//   const BIAS_CLEAR   = '04'+'00000102'+'08'+'01'+'02'+'02'+'00'+'00'+'00'+'00'+'00';
//   const ENABLE_TX    = '04'+'00000102'+'08'+'01'+'03'+'01'+'00'+'00'+'00'+'00'+'00';
//   const RATE_SET     = '04'+'00000102'+'08'+'01'+'05'+'27'+'10'+'00'+'00'+'00'+'00';

//   clientTCP.write(ENABLE_TX);
// });

// clientTCP.on('data', (data) => {
//   const raw_data = data;

//   const CAN_DATA_LENGTH = 14;
//   const eCAN_length = raw_data.length;

//   const remainder = eCAN_length % CAN_DATA_LENGTH;
//   const CAN_DATA_NUMBER = eCAN_length/CAN_DATA_LENGTH;

//   if ( remainder === 0) {
//     for (let i = 0; i < CAN_DATA_NUMBER; i++) {
//       if (raw_data[4 + CAN_DATA_LENGTH * i] === 1) { // index == 1 일때 힘값
//         Force_buffer.Fx = Number(((raw_data[ 6+CAN_DATA_LENGTH*i]*256 + raw_data[ 7+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));
//         Force_buffer.Fy = Number(((raw_data[ 8+CAN_DATA_LENGTH*i]*256 + raw_data[ 9+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));
//         Force_buffer.Fz = Number(((raw_data[10+CAN_DATA_LENGTH*i]*256 + raw_data[11+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));

//       } else if (raw_data[4 + CAN_DATA_LENGTH * i] === 2) {  // index == 2 일때 토크값
//         Force_buffer.Tx = Number(((raw_data[ 6+CAN_DATA_LENGTH*i]*256 + raw_data[ 7+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));
//         Force_buffer.Ty = Number(((raw_data[ 8+CAN_DATA_LENGTH*i]*256 + raw_data[ 9+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));
//         Force_buffer.Tz = Number(((raw_data[10+CAN_DATA_LENGTH*i]*256 + raw_data[11+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));

//       }
//     }
//   } else {
//     // receive error
//   }

// });

// clientTCP.on('end', () => {
//   console.log('TCP/IP Server is closed!');
// });

/* -------------------------------------------------------------------- */

// Others: eCAN Communication (with DATC) //
const host = '192.168.0.223';
const port = 4001;

clientTCP.connect(port, host, () => {
  console.log('TCP/IP Server Connected Successfully');
});

clientTCP.on('data', (data) => {
  const raw_data = data;
  console.log(raw_data);
});

clientTCP.on('end', () => {
  console.log('TCP/IP Server is closed!');
});

clientTCP.on('error', function (e) {
  if (e.code == 'EADDRINUSE') {
    console.log('Address in use, retrying...');
    setTimeout(function () {
      clientTCP.close();
      clientTCP.listen(port, host);
    }, 1000);
  }
});

clientTCP.on('close', () => {
  console.log('TCP/IP Server is closed!');
});