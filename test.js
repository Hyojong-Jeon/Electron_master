var gripperData = {};

var abc = '40000';

gripperData.position = new Int16Array([2]);
gripperData.velocity = new Int16Array([0]);
gripperData.current  = new Int16Array([0]);

gripperData.position = new Int16Array([Number(abc)]);

console.log("abc",(Number)(gripperData.position));
