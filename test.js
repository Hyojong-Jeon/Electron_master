const WebSocketClient = require('websocket').client;

const clientWS = new WebSocketClient();

clientWS.on('connectFailed', (error) => {
  console.log(`서버에 연결 실패: ${error.toString()}`);
});

clientWS.on('connect', (connection) => {
  console.log('서버에 연결 성공');

  connection.on('message', (message) => {
    if (message.type === 'utf8') {
      console.log(`서버로부터 메시지 수신: ${message.utf8Data}`);
    }
  });

  connection.on('close', () => {
    console.log('서버와의 연결이 종료되었습니다.');
  });
});

clientWS.connect('ws://localhost:8080');
