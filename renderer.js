const connectBtn      = document.getElementById("connectBtn");
const disconnectBtn   = document.getElementById("disconnectBtn");
const gripperInitBtn  = document.getElementById("gripperInitBtn");
const gripperOpenBtn  = document.getElementById("gripperOpenBtn");
const gripperCloseBtn = document.getElementById("gripperCloseBtn");
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

writeMBAddressBtn.addEventListener('click', () => {
    const changeMBAddress = changeMBAddressVal.value;
    window.electronAPI.writeMBAddress(changeMBAddress);
});

writeElAngleBtn.addEventListener('click', () => {window.electronAPI.writeElAngle()});

output.innerHTML = slider.value + '%';
slider.oninput = function() {
    output.innerHTML = this.value + '%';
};

slider.onchange = function() {
    const data = this.value;
    window.electronAPI.gripperPosCtrl(data);
};

let intervalID;

dataReceive.onchange = function() {
    if (dataReceive.checked) {
        data = {dataRepeat: true};
        intervalID = setInterval(readData, 100);
    } else {
        data = {dataRepeat: false};
        clearInterval(intervalID);
    }

    window.electronAPI.gripperData(data);
};

function readData() {



    const grpPos = document.getElementById("grpPos");
    const grpVel = document.getElementById("grpVel");
    const grpCur = document.getElementById("grpCur");

    grpPos.text = int16Array1[0]+" deg";
    grpVel.text = int16Array2[0]+" RPM";
    grpCur.text = int16Array3[0]+" mA";
};

