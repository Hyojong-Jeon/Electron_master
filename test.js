var gripperData = {};

var abc = '40000';

gripperData.position = new Int16Array([2]);
gripperData.velocity = new Int16Array([0]);
gripperData.current  = new Int16Array([0]);

gripperData.position = new Int16Array([Number(abc)]);

console.log("abc",(Number)(gripperData.position));



 var 플래그 = true;
if(플래그) {
    console.log("왜 한글이 되지?");
}