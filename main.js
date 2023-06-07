/*   Build Application using Electron Forge   */
/*  Code by KOREA UNIVERSITY IRL Hyojong Jeon */
//============================================//
"use strict";
//============================================//

// Include Library //
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ModbusRTU = require ("modbus-serial");
const SerialPort = require('serialport');

// Declaration //
const clientRTU = new ModbusRTU();
/* -------------------------------------------------------------------- */

// RTU Initial Setup //
var MB_TIMEOUT = 100;
var gripperData = new Object();
gripperData.position = new Int16Array([0]);
gripperData.velocity = new Int16Array([0]);
gripperData.current  = new Int16Array([0]);
gripperData.grpPos   = new Int16Array([0]);

let isClientComm = false;
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
const MB_GRP_INIT2 = 105;
const MB_VAC_ON    = 106;
const MB_VAC_OFF   = 107;

function checkUSBConnection() {
  SerialPort.list()
    .then(ports => {
      // 연결된 모든 시리얼 포트 확인
      const connectedPorts = ports.filter(port => port.manufacturer === "Your Device Manufacturer");
      if (connectedPorts.length > 0) {
        console.log("USB 장치가 연결되었습니다.");
        // 여기에 연결된 장치 처리 로직 추가
      } else {
        console.log("USB 장치가 연결되지 않았습니다.");
        // 여기에 연결되지 않은 장치 처리 로직 추가
      }
    })
    .catch(error => {
      console.error("USB 연결 상태 확인 중 에러:", error);
    });
}

// 1초마다 USB 연결 상태 확인
// setInterval(checkUSBConnection, 1000);


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

// 사용 중인 모든 포트 가져오기
// SerialPort.list().then(ports => {
//   const comPort = 'COM1'; // 확인하고자 하는 포트

//   // 포트 목록에서 확인하려는 포트 찾기
//   const portInUse = ports.some(port => port.path === comPort);

//   if (portInUse) {
//     console.log(`${comPort}는 이미 사용 중입니다.`);
//   } else {
//     console.log(`${comPort}는 사용 가능합니다.`);
//   }
// }).catch(error => {
//   console.error('COM 포트 확인 중 오류가 발생했습니다:', error);
// });

}

function MB_CLOSE() {
  clientRTU.close(function() {console.log("[The connection with the device has been terminated.]")});
}

function MB_SEND(values) {
  // 재시도 메커니즘
  // const MAX_RETRY = 3;
  // let retryCount = 0;

  // async function performWriteRegisters() {
  //   try {
  //     await client.writeRegisters(address, values);
  //     console.log("통신 성공");
  //   } catch (error) {
  //     console.error("통신 실패:", error);
  //     if (retryCount < MAX_RETRY) {
  //       retryCount++;
  //       console.log(`재시도 (${retryCount}/${MAX_RETRY})`);
  //       await performWriteRegisters();
  //     } else {
  //       console.error("재시도 횟수 초과");
  //       // 재시도 횟수 초과에 대한 예외 처리
  //     }
  //   }
  // }

  // performWriteRegisters();

  const START_ADDRESS = 0; // negative values (< 0) have to add 65535 for Modbus registers

  if (isClientComm) {
    return false;
  } else {
    clientRTU.writeRegisters(START_ADDRESS, values)
    .then(function(d) {
        console.log("[MODBUS Write Registers", values, d,"]");
        isClientComm = false;
    })
    .catch(function(e) {
        console.log("[MB_SEND ERROR: "+e.message+"]");
        isClientComm = false;
    })

    return true;
  }
}

function MB_READ() {
    // try to read data
    const START_ADDRESS = 11;
    const DATA_LENGTH = 4;

    if (isClientComm) {
      return;
    } else {
      isClientComm = true;
      clientRTU.readHoldingRegisters(START_ADDRESS, DATA_LENGTH)
      .then(function(data) {
          gripperData.position = new Int16Array([Number(data.data[0])]);
          gripperData.current  = new Int16Array([Number(data.data[1])]);
          gripperData.velocity = new Int16Array([Number(data.data[2])]);
          gripperData.grpPos   = new Int16Array([Number(data.data[3])]);
          // console.log( gripperData );
          isClientComm = false;
      })
      .catch(function(e) {
          console.log("[MB_READ ERROR: "+e.message+"]");
          isClientComm = false;
      });
    }
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

  ipcMain.on('gripperDataReq', (event, data) => {
    const dataRepeat = data.dataRepeat;
    // console.log(data);

    if(dataRepeat) {
      intervalID = setInterval(MB_READ, 100);
      console.log("[Gripper] Data Send ON");
    } else {
      clearInterval(intervalID);
      console.log("[Gripper] Data Send OFF");
    }
  });

  ipcMain.on('gripperDataRes', (event) => {
    event.reply('asynchronous-reply', gripperData);
  });

  ipcMain.on('motorEnable', (event, data) => {
    const checkBox = data;
    if (checkBox) {
      MB_SEND([ENABLE]);
    } else {
      MB_SEND([DISABLE]);
    }
  });

  ipcMain.on('pumpONOFF', (event, data) => {
    const checkBox = data;
    if (checkBox) {
      MB_SEND([MB_VAC_ON]);
    } else {
      MB_SEND([MB_VAC_OFF]);
    }
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