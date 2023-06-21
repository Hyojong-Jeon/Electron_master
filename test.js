const { SerialPort } = require('serialport')

SerialPort.list()
.then (ports => {
    const compPortNum = ports.length;
    if (compPortNum === 0) {
        console.log('No comport');
    } else if (compPortNum > 0) {
        let array = [];
        for (let i = 0; i < compPortNum; i++) {
            array[i] = ports[i].path;
            // console.log(array[i]);
        }
    } else {
        console.log('Comport length error');
    }
})
.catch(err => {
    console.log(err)
});

const arr = [[1, 2], [4], [5, 6]];

arr.shift();
arr.shift();
console.log(arr[0]); // [1, 2]
arr.push([10,11]);
console.log(arr); // [1, 2]