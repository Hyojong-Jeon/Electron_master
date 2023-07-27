const net = require('net');

// 연결할 서버의 호스트와 포트 정보
const serverHost = '192.168.0.223'; // 또는 원격 서버의 IP 주소
const serverPort = 4001; // 서버가 열어둔 포트 번호

// TCP 클라이언트 생성
const client = net.createConnection(serverPort, serverHost, () => {
  console.log('서버에 연결되었습니다.');

  // 클라이언트가 서버로 데이터를 보내는 예제
  const TX_TEST = '08'+'00000500'+'08'+'00'+'01'+'00'+'00'+'00'+'00'+'00'+'00';
  const TX_1    = 'FF'+'00000000'+'00'+'00'+'00'+'00'+'00'+'00'+'00'+'00'+'00';
  const TX_2 = new Uint8Array([4,0,0,5,0,8,0,101,0,0,0,0,0,0]);
  client.write(TX_2);
  console.log(TX_2[7]);
  // 여기서 추가적인 데이터 전송 또는 작업을 수행할 수 있습니다.
});

// 서버로부터 데이터를 받았을 때의 이벤트 처리
client.on('data', (data) => {
  console.log(data);
  // 수신된 데이터를 처리하는 로직을 작성합니다.
});

// 서버와의 연결이 종료되었을 때의 이벤트 처리
client.on('end', () => {
  console.log('서버와의 연결이 종료되었습니다.');
});

// 에러가 발생했을 때의 이벤트 처리
client.on('error', (err) => {
  console.error('오류가 발생했습니다:', err);
});

// 서버와의 연결이 종료되면 클라이언트를 종료합니다.
// 이 부분은 필요에 따라 수정하거나 생략할 수 있습니다.
client.on('close', () => {
  console.log('클라이언트가 종료됩니다.');
  process.exit(0);
});