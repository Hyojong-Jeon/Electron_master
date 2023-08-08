let repeatFlag;

repeatFlag = !repeatFlag;

let intervalID2;

if (repeatFlag) {
  intervalID2 = setInterval(()=>{
    MB_SEND_BUFFER.push([GRP_OPEN]);
    MB_SEND_BUFFER.push([GRP_CLOSE]);
  }, 5000);
} else {
  clearInterval(intervalID2);
}