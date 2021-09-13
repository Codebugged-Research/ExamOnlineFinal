const videoElem = document.getElementById("videoElem");
const resultElem = document.getElementById("results");
const LoginElem = document.getElementById("Login");

const capturedStream;

navigator.mediaDevices.getUserMedia({
    video: true
}).then((stream) => {
    capturedStream = stream;
    videoElem.srcObject = stream;
    
    await run()
    .then(() => {
      mainModelChain();
    })
    .catch((err) => {
      alert(err);
    })
}).catch((err) => {
  alert(err);
});

addLog = (data) => {
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(data));
    resultElem.appendChild(li);
}

async function run() {
    addLog("Auth started");
    await faceapi.loadFaceLandmarkModel('https://propview.ap-south-1.linodeobjects.com/')
    await faceapi.loadFaceRecognitionModel('https://propview.ap-south-1.linodeobjects.com/')
    await faceapi.nets.ssdMobilenetv1.loadFromUri('https://propview.ap-south-1.linodeobjects.com/')    
    addLog("Face Recognistion model loaded");
    LoginElem.addEventListener('click', async function (ev) {
        await updateReferenceImageResults("https://propview.ap-south-1.linodeobjects.com/sambit.jpg")
        // ev.preventDefault();
    }, false);
}

  async function updateReferenceImageResults(url) {
    return new Promise((resolve, reject) => {

      const inputImgEl = document.createElement("img");
      inputImgEl.src = url
      const canvas = document.createElement("canvas");
  
      const fullFaceDescriptions = await faceapi
          .detectAllFaces(inputImgEl, getFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors()
  
        if (!fullFaceDescriptions.length) {
          return
        }
        faceMatcher = new faceapi.FaceMatcher(fullFaceDescriptions)
  
        faceapi.matchDimensions(canvas, inputImgEl)
        const resizedResults = faceapi.resizeResults(fullFaceDescriptions, inputImgEl)
        const labels = faceMatcher.labeledDescriptors
          .map(ld => ld.label)
        resizedResults.forEach(({ detection, descriptor }) => {
          const label = faceMatcher.findBestMatch(descriptor).toString();
          inputLabel = label;
          inputScore = detection.score;
          const options = { label }
          const drawBox = new faceapi.draw.DrawBox(detection.box, options)
          drawBox.draw(canvas)
        })
    })
  }