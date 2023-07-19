const { raw } = require('express');
const net = require('net');

const client = new net.Socket();

const host = '192.168.0.223';
const port = 4001;

client.connect(port, host, () => {
  console.log('TCP/IP Server Connected Successfully');
  //                    STD    INDEX   LENG  D0   D1   D2   D3   D4   D5   D6   D7
  const STOP_TX      = '04'+'00000102'+'08'+'01'+'00'+'00'+'00'+'00'+'00'+'00'+'00';
  const BIAS_INIT    = '04'+'00000102'+'08'+'01'+'02'+'01'+'00'+'00'+'00'+'00'+'00';
  const BIAS_CLEAR   = '04'+'00000102'+'08'+'01'+'02'+'02'+'00'+'00'+'00'+'00'+'00';
  const ENABLE_TX    = '04'+'00000102'+'08'+'01'+'03'+'01'+'00'+'00'+'00'+'00'+'00';
  const RATE_SET     = '04'+'00000102'+'08'+'01'+'05'+'27'+'10'+'00'+'00'+'00'+'00';

  client.write(ENABLE_TX);
});

let Force_buffer = new Object();

client.on('data', (data) => {
  const raw_data = data;

  const CAN_DATA_LENGTH = 14;
  const eCAN_length = raw_data.length;

  const remainder = eCAN_length % CAN_DATA_LENGTH;
  const CAN_DATA_NUMBER = eCAN_length/CAN_DATA_LENGTH;

  if ( remainder === 0) {
    for (let i = 0; i < CAN_DATA_NUMBER; i++) {
      if (raw_data[4 + CAN_DATA_LENGTH * i] === 1) { // index == 1 일때 힘값
        Force_buffer.Fx = Number(((raw_data[ 6+CAN_DATA_LENGTH*i]*256 + raw_data[ 7+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));
        Force_buffer.Fy = Number(((raw_data[ 8+CAN_DATA_LENGTH*i]*256 + raw_data[ 9+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));
        Force_buffer.Fz = Number(((raw_data[10+CAN_DATA_LENGTH*i]*256 + raw_data[11+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));

      } else if (raw_data[4 + CAN_DATA_LENGTH * i] === 2) {  // index == 2 일때 토크값
        Force_buffer.Tx = Number(((raw_data[ 6+CAN_DATA_LENGTH*i]*256 + raw_data[ 7+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));
        Force_buffer.Ty = Number(((raw_data[ 8+CAN_DATA_LENGTH*i]*256 + raw_data[ 9+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));
        Force_buffer.Tz = Number(((raw_data[10+CAN_DATA_LENGTH*i]*256 + raw_data[11+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));

      }
    }
  } else {
    // receive error
  }

});

client.on('end', () => {
  console.log('TCP/IP Server is closed!');
});


