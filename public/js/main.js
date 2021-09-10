const videoElem = document.getElementById("videoElem");
const resultElem = document.getElementById("results");
const LoginElem = document.getElementById("Login");

navigator.mediaDevices.getUserMedia({
    video: true
}).then((stream) => {
    videoElem.srcObject = stream;
    run();
}).catch((err) => {
    console.log(err);
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
    await updateReferenceImageResults("https://propview.ap-south-1.linodeobjects.com/sambit.jpg")
    addLog("Refrence Image loaded and trained");
    LoginElem.addEventListener('click', function (ev) {
        console.log("Take Picture");
        ev.preventDefault();
    }, false);
}

  async function updateReferenceImageResults(url) {
    const inputImgEl = document.createElement("img");
    inputImgEl.src = url

    const fullFaceDescriptions = await faceapi
      .detectAllFaces(inputImgEl, getFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors()

    if (!fullFaceDescriptions.length) {
      return
    }
    faceMatcher = new faceapi.FaceMatcher(fullFaceDescriptions)
    const resizedResults = faceapi.resizeResults(fullFaceDescriptions, inputImgEl)
    const labels = faceMatcher.labeledDescriptors
      .map(ld => ld.label)
      console.log(labels);
    resizedResults.forEach(({ detection, descriptor }) => {
      const label = faceMatcher.findBestMatch(descriptor).toString();
      inputLabel = label;
      inputScore = detection.score;
      const options = { label }
      const drawBox = new faceapi.draw.DrawBox(detection.box, options)
    //   drawBox.draw(canvas)
    })
  }