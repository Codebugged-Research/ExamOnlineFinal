const videoElem = document.getElementById("videoElem");
const resultElem = document.getElementById("results");
const LoginElem = document.getElementById("Login");
const logbox = document.getElementById("logbox");
const QueryImageCapture = document.getElementById("QueryImageCapture");
const startProctoringbtn = document.getElementById("startProctoring");
const inputImgEl = document.createElement("img");
const queryImgEl = document.createElement("img");
const liveImgEl = document.createElement("img");

//for login
var inputLabel;
var inputScore;
var ouputLabel;
var ouputScore;
const height = 480;
const width = 640;

faceCheckInterval = 1000;

navigator.mediaDevices.getUserMedia({
  video: true
}).then(async (stream) => {

  videoElem.srcObject = stream;
  //auth
  await run();

}).catch((err) => {
  console.log(err);
});

//event logger
addLog = (data) => {
  var li = document.createElement("li");
  li.appendChild(document.createTextNode(data));
  resultElem.appendChild(li);
  logbox.scrollTop = logbox.scrollHeight;
}

async function proct() {
  addLog("-x- Procting started");
  addLog("-x- Live webcam picture captured");
  //start monitoring
  faceCheck = setInterval(async () => { await CheckFace(); }, faceCheckInterval);
}

//authentication
async function run() {
  await faceapi.loadFaceLandmarkModel('https://propview.ap-south-1.linodeobjects.com/')
  await faceapi.loadFaceRecognitionModel('https://propview.ap-south-1.linodeobjects.com/')
  await faceapi.nets.ssdMobilenetv1.loadFromUri('https://propview.ap-south-1.linodeobjects.com/')
  addLog("-x- Face Recognistion model loaded");
  LoginElem.style = "display: box";
  LoginElem.addEventListener('click', async function (ev) {
    // await updateReferenceImageResults("https://img.lovepik.com/photo/50152/4070.jpg_wh860.jpg")
    await updateReferenceImageResults("https://propview.ap-south-1.linodeobjects.com/sambit.jpg")
    ev.preventDefault();
  }, false);
  QueryImageCapture.addEventListener('click', async function (ev) {
    takepicture(queryImgEl);
    addLog("-x- Webcam picture captured");
    await updateQueryImageResults();
    ev.preventDefault();
  }, false);
  return
}

//process refrence image
async function updateReferenceImageResults(url) {
  inputImgEl.src = url;
  inputImgEl.crossOrigin = 'anonymous'
  const fullFaceDescriptions = await faceapi
    .detectAllFaces(inputImgEl, getFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors()
  // document.getElementById('body').appendChild(inputImgEl);
  if (!fullFaceDescriptions.length) {
    addLog("No face Detected in refrence image");
    return
  }
  faceMatcher = new faceapi.FaceMatcher(fullFaceDescriptions)
  const resizedResults = faceapi.resizeResults(fullFaceDescriptions, inputImgEl)
  const labels = faceMatcher.labeledDescriptors
    .map(ld => ld.label)
  addLog(`-x- ${labels.length} face Detected in refrence image`);
  if (labels.length === 1) {
    resizedResults.forEach(({ detection, descriptor }) => {
      const label = faceMatcher.findBestMatch(descriptor).toString();
      inputLabel = label;
      inputScore = detection.score;
    })
    LoginElem.style = "display: none";
    QueryImageCapture.style = "display: box";
    addLog("-x- Refrence Image Processed");
  } else {
    addLog(`check refernce image`);
    LoginElem.style = "display: none";
  }
  return
}

//capture query image
function takepicture(imageElement) {
  const tempCanvas = document.createElement("canvas");
  var context = tempCanvas.getContext('2d');
  tempCanvas.width = width;
  tempCanvas.height = height;
  context.drawImage(videoElem, 0, 0, width, height);
  var data = tempCanvas.toDataURL('image/png');
  imageElement.setAttribute('src', data);
  imageElement.style = "-webkit-transform: scaleX(-1); transform: scaleX(-1);"
  return
}

//face recognition for authetication
async function updateQueryImageResults() {
  if (!faceMatcher) {
    addLog("face recognition not initialized");
    return
  }

  const results = await faceapi
    .detectAllFaces(queryImgEl, getFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors()

  const resizedResults = faceapi.resizeResults(results, queryImgEl);

  resizedResults.forEach(({ detection, descriptor }) => {
    const label = faceMatcher.findBestMatch(descriptor).toString()
    ouputLabel = label;
    ouputScore = detection.score;
    var length = ouputLabel.length;
    var length2 = inputLabel.length;
    if (inputLabel.substring(0, length2 - 3) === ouputLabel.substring(0, length - 6)) {
      addLog(`Face sucessfully matched with ${(ouputScore * 100).toFixed(2)}% accuracy`);
      QueryImageCapture.style = "display: none";
      startProctoringbtn.style = "display: box";
      startProctoringbtn.addEventListener('click', async function (ev) {
        //start monitoring
        await proct();
        ev.preventDefault();
      }, false);
    } else {
      addLog("Face is not matching");
    }
  })
}

async function CheckFace() {
  takepicture(liveImgEl);
  if (!faceMatcher) {
    return
  }

  const results = await faceapi
    .detectAllFaces(liveImgEl, getFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors()

  if (!results.length) {
    addLog("Candidate absent");
  }

  if (results.length > 1) {
    addLog("More than 1 person detected");
  }

  results.forEach(({ detection, descriptor }) => {
    const label = faceMatcher.findBestMatch(descriptor).toString()
    ouputLabel = label;
    ouputScore = detection.score;
    var length = ouputLabel.length;
    var length2 = inputLabel.length;
    if (inputLabel.substring(0, length2 - 3) === ouputLabel.substring(0, length - 6)) {
      addLog("Candidate present");
    } else {
      addLog("unknown candidate");
    }

  })
}