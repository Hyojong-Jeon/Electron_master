const findPort        = document.getElementById("findPort");
const connectBtn      = document.getElementById("connectBtn");
const disconnectBtn   = document.getElementById("disconnectBtn");
const gripperInitBtn  = document.getElementById("gripperInitBtn");
const gripperOpenBtn  = document.getElementById("gripperOpenBtn");
const gripperCloseBtn = document.getElementById("gripperCloseBtn");
const gripperRepeatBtn = document.getElementById("gripperRepeatBtn");
const bitRateVal      = document.getElementById("bitRate");
const comPortVal      = document.getElementById("comPort");
const modbusIDVal     = document.getElementById("modbusID");
const changeMBAddressVal = document.getElementById("writeMBAddress");
const changeElAngleVal   = document.getElementById("writeElAngle");
const slider = document.getElementById("grpPosRNG");
const output = document.getElementById("sliderValue");
const writeMBAddressBtn = document.getElementById("writeMBAddressBtn");
const writeElAngleBtn   = document.getElementById("writeElAngleBtn");
const dataReceive       = document.getElementById("dataReceive");
const motorEnable       = document.getElementById("motorEnable");
const gripperInitialize = document.getElementById("gripperInitialize");
const pumpONOFF         = document.getElementById("pumpONOFF");
const portMessages      = document.getElementById("portMessages");
const init2Btn          = document.getElementById("init2Btn");
const init2Input        = document.getElementById("init2Input");
const SysResetBtn       = document.getElementById("SysResetBtn");
const webSocketBtn      = document.getElementById("webSocketBtn");
const webSocketInput    = document.getElementById("webSocketInput");
const CAN_EnableBtn     = document.getElementById("CAN_EnableBtn");
const CAN_DisableBtn    = document.getElementById("CAN_DisableBtn");
const CAN_InitBtn       = document.getElementById("CAN_InitBtn");
const PIDSetBtn         = document.getElementById("PIDSetBtn");
const PGainInput        = document.getElementById("PGainInput");
const IGainInput        = document.getElementById("IGainInput");
const DGainInput        = document.getElementById("DGainInput");

PIDSetBtn.addEventListener('click', () => { // Connect MODBUS Req.
    const PGain = PGainInput.value;
    const IGain = IGainInput.value;
    const DGain = DGainInput.value;

    let data = new Object();
    data.PGain  = PGain;
    data.IGain  = IGain;
    data.DGain = DGain;

    window.electronAPI.setPIDGain(data);
});

findPort.addEventListener('click', () => { // Connect MODBUS Req.
    window.electronAPI.findPortClient();
});

connectBtn.addEventListener('click', () => { // Connect MODBUS Req.
    const comPort  = comPortVal.value;
    const bitRate  = bitRateVal.value;
    const modbusID = modbusIDVal.value;

    let data = new Object();
    data.comPort  = comPort;
    data.bitRate  = bitRate;
    data.modbusID = modbusID;

    window.electronAPI.connectClient(data);
});

disconnectBtn.addEventListener('click', () => { // Disconnect MODBUS Req.
    window.electronAPI.disconnectClient();
});

gripperInitBtn.addEventListener ('click', () => {window.electronAPI.gripperInitialize()});
gripperOpenBtn.addEventListener ('click', () => {window.electronAPI.gripperOpen()});
gripperCloseBtn.addEventListener('click', () => {window.electronAPI.gripperClose()});
gripperRepeatBtn.addEventListener('click', () => {window.electronAPI.gripperRepeat()});

writeMBAddressBtn.addEventListener('click', () => {
    const changeMBAddress = changeMBAddressVal.value;
    window.electronAPI.writeMBAddress(changeMBAddress);
});

writeElAngleBtn.addEventListener('click', () => {window.electronAPI.writeElAngle()});

SysResetBtn.addEventListener('click', () => {window.electronAPI.SysReset()});

output.innerHTML = slider.value + '%';
slider.oninput = function() {
    output.innerHTML = this.value + '%';
};

slider.onchange = function() {
    const data = this.value;
    window.electronAPI.gripperPosCtrl(data);
};

let intervalID;

function readData() {
    window.electronAPI.gripperDataRes();
};

dataReceive.onchange = function() {
    if (dataReceive.checked) {
        data = {dataRepeat: true};
        intervalID = setInterval(readData, 100);
    } else {
        data = {dataRepeat: false};
        clearInterval(intervalID);
    }
    window.electronAPI.gripperDataReq(data);
};

motorEnable.onchange = function() {
    if (motorEnable.checked) {
        checkBox = true;
    } else {
        checkBox = false;
    }
    window.electronAPI.motorEnable(checkBox);
};

pumpONOFF.onchange = function() {
    if (pumpONOFF.checked) {
        checkBox = true;
    } else {
        checkBox = false;
    }
    window.electronAPI.pumpONOFF(checkBox);
};

init2Btn.addEventListener('click', () => {
    const init2Value = init2Input.value;
    window.electronAPI.gripperInitialize2(init2Value);
});

webSocketBtn.addEventListener('click', () => {
    const webSocketPort = webSocketInput.value;
    window.electronAPI.startWebSocClient(webSocketPort);
});

function webSocketInterval() {
    window.electronAPI.webSocState();
}
setInterval(webSocketInterval, 500);

CAN_EnableBtn.addEventListener('click', () => { // Disconnect MODBUS Req.
    window.electronAPI.CAN_Enable();
});

CAN_DisableBtn.addEventListener('click', () => { // Disconnect MODBUS Req.
    window.electronAPI.CAN_Disable();
});

CAN_InitBtn.addEventListener('click', () => { // Disconnect MODBUS Req.
    window.electronAPI.CAN_Init();
});


