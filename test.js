const { raw } = require('express');
const net = require('net');

const client = new net.Socket();

const host = '192.168.0.223';
const port = 4001;

client.connect(port, host, () => {
  console.log('서버에 연결되었습니다.');

  const data = '04'+'00000102'+'08'+'01'+'03'+'01'+'00'+'00'+'00'+'00'+'00';
  //           STD      INDEX   LEN  D1   D2   D3   D4   D5   D6   D7   D8

  const error = 'FF00000000000000000000000000';

  // client.write(data);

  setTimeout(()=> {
    const data2 = '04'+'00000102'+'08'+'01'+'02'+'01'+'00'+'00'+'00'+'00'+'00';
    //            STD      INDEX   LEN  D1   D2   D3   D4   D5   D6   D7   D8
    client.write(data);
    console.log('bias send');
  },1000);
});

let raw_data = '';
let Force_buffer = new Object();

client.on('data', (data) => {
  raw_data = data;
  // console.log(data.toString());
  // client.end();

});

client.on('end', () => {
  console.log('서버 연결이 종료되었습니다.');
});

setInterval(() => {
  const F_MAX_BUFFER = 64;
  const CAN_DATA_LENGTH = 14;
  const eCAN_length = raw_data.length;

  const index = eCAN_length % CAN_DATA_LENGTH;
  const CAN_DATA_NUMBER = eCAN_length/CAN_DATA_LENGTH;

  if ( index === 0) {
    for (let i = 0; i < CAN_DATA_NUMBER; i++) {
      if (raw_data[4+CAN_DATA_LENGTH*i] === 1) {
        Force_buffer.Fx = Number(((raw_data[ 6+CAN_DATA_LENGTH*i]*256 + raw_data[ 7+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));
        Force_buffer.Fy = Number(((raw_data[ 8+CAN_DATA_LENGTH*i]*256 + raw_data[ 9+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));
        Force_buffer.Fz = Number(((raw_data[10+CAN_DATA_LENGTH*i]*256 + raw_data[11+CAN_DATA_LENGTH*i])/100 - 300).toPrecision(4));

      } else if (raw_data[4+CAN_DATA_LENGTH*i] === 2) {
        Force_buffer.Tx = Number(((raw_data[ 6+CAN_DATA_LENGTH*i]*256 + raw_data[ 7+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));
        Force_buffer.Ty = Number(((raw_data[ 8+CAN_DATA_LENGTH*i]*256 + raw_data[ 9+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));
        Force_buffer.Tz = Number(((raw_data[10+CAN_DATA_LENGTH*i]*256 + raw_data[11+CAN_DATA_LENGTH*i])/500 - 50).toPrecision(4));

      }
      console.log(Force_buffer);
    }
  } else {
    // receive error
  }
  // console.log(Force_buffer.Fz, raw_data[10], raw_data[11]);

}, 100);

