const videoElem = document.getElementById("videoElem");

navigator.mediaDevices.getUserMedia({
    video: true
}).then((stream) => {

    videoElem.srcObject = stream;
})
.catch((err) => {
    console.log(err);
})