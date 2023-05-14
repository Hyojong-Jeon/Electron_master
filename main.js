/*   Build Application using Electron Forge   */
/*  Code by KOREA UNIVERSITY IRL Hyojong Jeon */
//============================================//
"use strict";
//============================================//

// Include Library //
const { app, BrowserWindow } = require('electron');
const path = require('path');
const express   = require('express');
const ModbusRTU = require ("modbus-serial");

// Declaration //
const clientTCP = express();
const clientRTU = new ModbusRTU();

/* -------------------------------------------------------------------- */

// TCP Initial Setup //
const LOCAL_HOST = 3000;

clientTCP.use(express.json()); // POST 요청에서 JSON 파일을 PARSING 하기 위해 필요
clientTCP.use(express.static('public', {
    mimeTypes: { // MIME 타입 설정 //   기타 파일 타입에 대한 설정
        'html': 'text/html',
        'js': 'application/javascript',
    }
}));

clientTCP.listen(LOCAL_HOST, () => {
    console.log('Server listening on "http://localhost:3000/"');
});

clientTCP.get('/', (req, res) => {
    const filePath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(filePath);
});

/* -------------------------------------------------------------------- */

// RTU Initial Setup //
var MB_COMPORT;
var MB_BAUDRATE; 
var MB_ID;
var MB_TIMEOUT;
var gripperData = new Object(); gripperData.position = 0; gripperData.velocity = 0; gripperData.current = 0;

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

    clientRTU.readHoldingRegisters (START_ADDRESS, DATA_LENGTH)
        .then(function(data) {
            const int16Array = new Int16Array(DATA_LENGTH); // 16비트 정수 배열 생성
            int16Array[0] = data.data[0];
            int16Array[1] = data.data[1];
            int16Array[2] = data.data[2];

            gripperData.position = int16Array[0];
            gripperData.current  = int16Array[1];
            gripperData.velocity = int16Array[2];
            console.log( gripperData );
        })
        .catch(function(e) {
            console.log(e);
        });
};

const API_GRP_INIT = function() {
    MB_SEND([101]);
};

const API_GRP_OPEN = function() {
    MB_SEND([102]);
};

const API_GRP_CLOSE = function() {
    MB_SEND([103]);
};

const API_GRP_POSCTRL = function(POS) {
    MB_SEND([104, POS]); // POS = 0 ~ 10000, 10000 means 100.00%, 5020 = 50.20%
};

const API_GRP_MB_ID = function(ID) {
    MB_SEND([50, ID]); // ID = 1 ~ 248
};

const API_GRP_EL_ANGLE = function() {
    MB_SEND([51]);
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