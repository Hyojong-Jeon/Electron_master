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