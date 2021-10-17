const videoElem = document.getElementById("videoElem");
const resultElem = document.getElementById("results");
const LoginElem = document.getElementById("Login");
const actual = document.getElementById("actual");
const inputurlEl = document.getElementById("inputurl");
const calibrationEye = document.getElementById("calibration_eye");
const logbox = document.getElementById("logbox");
const QueryImageCapture = document.getElementById("QueryImageCapture");
const startProctoringbtn = document.getElementById("startProctoring");
const resumeProctoringbtn = document.getElementById("resumeProctoring");
const pauseProctoringbtn = document.getElementById("pauseProctoring");
const stopProctoringbtn = document.getElementById("stopProctoring");
const inputImgEl = document.createElement("img");
const queryImgEl = document.createElement("img");
const liveImgEl = document.createElement("img");
const obejctDetectImageEl = document.createElement("img");

const controls = window;
const drawingUtils = window;
const mpFaceMesh = window;

let maxPredictions;

let photoUrl = "https://propview.ap-south-1.linodeobjects.com/sambit.jpg";

//for login
let inputLabel;
let inputScore;
let ouputLabel;
let ouputScore;
const height = 640;
const width = 640;

//model load
let objectModel;
let spoofModel;
let lipModel;

//intervals
faceCheckInterval = 1000;
objectCheckInterval = 1000;
spoofCheckInterval = 3000;
lipTrackerInterval = 1000;

//interval controller
let faceCheck;
let objectCheck;
let spoofCheck;
let lipTrackCheck;
let faceMesh;

let capturedStream;
let camera;

window.onload = async function () {
  // webgazer.params.showVideoPreview = true;
  // await webgazer.setRegression('ridge')
  //   .setGazeListener(function (data, clock) {
  //   })
  //   .saveDataAcrossSessions(true)
  //   .begin();
  // webgazer.showVideoPreview(true)
  //   .showPredictionPoints(true)
  //   .applyKalmanFilter(true);

  // var setup = function () {

  //   //Set up the main canvas. The main canvas is used to calibrate the webgazer.
  //   var canvas = document.getElementById("plotting_canvas");
  //   canvas.width = window.innerWidth;
  //   canvas.height = window.innerHeight;
  //   canvas.style.position = 'fixed';
  // };
  // setup();
  start();
};

window.saveDataAcrossSessions = true;

window.onbeforeunload = function () {
  webgazer.end();
}

//event logger
addLog = (data) => {
  let li = document.createElement("li");
  li.appendChild(document.createTextNode(data));
  resultElem.appendChild(li);
  logbox.scrollTop = logbox.scrollHeight;
}

async function start() {
  // webgazer.pause();
  // webgazer.params.showVideoPreview = false;
  // $('#webgazerVideoContainer').remove();
  resultElem.innerHTML = "";
  $('#tempImg').hide();
  inputurlEl.style = "display: box";
  // calibrationEye.style = "display: none";
}

async function loadReference() {
  inputurlEl.style = "display: none";
  actual.style = "display: box";
  navigator.mediaDevices.getUserMedia({
    video: true
  }).then(async (stream) => {
    videoElem.srcObject = stream;
    await run();
  }).catch((err) => {
    alert(err);
  });
}

async function stop() {
  LoginElem.style = "display: box";
  await clearInterval(faceCheck);
  // await clearInterval(objectCheck);
  await clearInterval(spoofCheck);
  // await camera.stop();
  location.reload();
}


async function resume() {
  pauselip = false;
  await proct();
  resumeProctoringbtn.style = "display: none";
  pauseProctoringbtn.style = "display: box";
}
let pauselip = false;
async function pause() {
  await clearInterval(faceCheck);
  await clearInterval(objectCheck);
  await clearInterval(spoofCheck);
  // await camera.stop();
  pauselip = true;
  pauseProctoringbtn.style = "display: none";
  resumeProctoringbtn.style = "display: box";
}

async function proct() {
  addLog("-x- Procting started");
  addLog("-x- Live webcam picture captured");
  // webgazer.resume();

  //start monitoring
  //face and person
  faceCheck = setInterval(async () => { await CheckFace(); }, faceCheckInterval);
  //object
  objectCheck = setInterval(async () => { await CheckObject(); }, objectCheckInterval);
  //spoof
  spoofCheck = setInterval(async () => { await CheckSpoof(); }, spoofCheckInterval);
  // lip  
  checkLipTracker();
}

function Restart() {
  document.getElementById("Accuracy").innerHTML = "<a>Not yet Calibrated</a>";
  webgazer.clearData();
  ClearCalibration();
  PopUpInstruction();
}

async function uploadRefImage(e) {
  const imgFile = $('#refImgUploadInput').get(0).files[0]
  const img = await faceapi.bufferToImage(imgFile)
  photoUrl = img.src;
  $('#tempImg').get(0).src = img.src;
  $('#tempImg').show();
}


//actual detection
async function run() {
  pauseProctoringbtn.addEventListener('click', async function (ev) { await pause(); });
  resumeProctoringbtn.addEventListener('click', async function (ev) { await resume(); });
  addLog("-x- Fetching Models");
  await faceapi.loadFaceLandmarkModel('https://propview.ap-south-1.linodeobjects.com/');
  await faceapi.loadFaceRecognitionModel('https://propview.ap-south-1.linodeobjects.com/');
  await faceapi.nets.ssdMobilenetv1.loadFromUri('https://propview.ap-south-1.linodeobjects.com/');
  addLog("-x- Face Recognistion model loaded");
  objectModel = await tf.loadGraphModel("./public/object/model.json");
  addLog("-x- Object model loaded");
  spoofModel = await tf.loadGraphModel("./public/spoof2/model.json");
  addLog("-x- Spoof model loaded");
  faceMesh = new FaceMesh({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  faceMesh.onResults(onResults);
  camera = new Camera(videoElem, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElem });
    },
    width: 1280,
    height: 720
  });
  addLog("-x- Lip model loaded");

  LoginElem.style = "display: box";
  LoginElem.addEventListener('click', async function (ev) {
    await updateReferenceImageResults(photoUrl);
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
  let context = tempCanvas.getContext('2d');
  tempCanvas.width = width;
  tempCanvas.height = height;
  context.drawImage(videoElem, 0, 0, width, height);
  let data = tempCanvas.toDataURL('image/png');
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
    let length = ouputLabel.length;
    let length2 = inputLabel.length;
    if (inputLabel.substring(0, length2 - 3) === ouputLabel.substring(0, length - 6)) {
      addLog(`Face sucessfully matched with ${(ouputScore * 100).toFixed(2)}% accuracy`);
      QueryImageCapture.style = "display: none";
      startProctoringbtn.style = "display: box";
      startProctoringbtn.addEventListener('click', async function (ev) {
        //start monitoring        
        startProctoringbtn.style = "display: none";
        stopProctoringbtn.style = "display: box";
        pauseProctoringbtn.style = "display: box";
        stopProctoringbtn.addEventListener('click', async function (ev) {
          //stop monitoring        
          await stop();
          ev.preventDefault();
        }, false);
        await proct();
        ev.preventDefault();
      }, false);
    } else {
      addLog("Face is not matching");
    }
  })
}

//lip draw
function onResults(results) {
  const canvasElement = document.createElement('canvas');
  const canvasCtx = canvasElement.getContext('2d');
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.image, 0, 0, canvasElement.width, canvasElement.height);
  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, { color: '#E0E0E0' });
    }
  }
  canvasCtx.restore();
}

let counter = 0;
let counter2 = 0;
//check face during exam
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
    counter2++;
    if (counter2 === 3) {
      addLog("candidate looking outside the screen");
      counter2 = 0;
    }
  }

  if (results.length > 1) {
    addLog("More than 1 person detected");
  }

  results.forEach(({ detection, descriptor }) => {
    const label = faceMatcher.findBestMatch(descriptor).toString()
    ouputLabel = label;
    ouputScore = detection.score;
    let length = ouputLabel.length;
    let length2 = inputLabel.length;
    if (inputLabel.substring(0, length2 - 3) === ouputLabel.substring(0, length - 6)) {
      // addLog("Candidate present");
    } else {
      counter++;
      if (counter === 15) {
        addLog("Candidate absent");
        counter = 0;
      }
    }

  })
}

const labelMap = {
  1: { name: 'Book', color: 'red' },
  2: { name: 'Phone', color: 'yellow' },
}
//check for objects during exam
async function CheckObject() {
  const img = tf.browser.fromPixels(videoElem);
  const resized = tf.image.resizeBilinear(img, [640, 640]);
  const casted = resized.cast("int32");
  const expanded = casted.expandDims(0);
  const obj = await objectModel.executeAsync(expanded);

  const boxes = await obj[6].array();
  const classes = await obj[2].array();
  const scores = await obj[3].array();
  drawRect(
    boxes[0],
    classes[0],
    scores[0],
);
  tf.dispose(img);
  tf.dispose(resized);
  tf.dispose(casted);
  tf.dispose(expanded);
  tf.dispose(obj);
}

async function CheckSpoof() {
  const tfImg = tf.browser.fromPixels(videoElem).resizeNearestNeighbor([224, 224])
    .toFloat()
    .expandDims();
  const prediction = await spoofModel.predict(tfImg);
  const values = prediction.dataSync();
  const arr = Array.from(values);
  if (arr[1].toFixed(2) > 0.98) {
    addLog("spoof detected");
  }
  
  tf.dispose(tfImg);
  tf.dispose(prediction);
  tf.dispose(values);
  tf.dispose(arr);
}

async function checkLipTracker() {
  await camera.start();
}


drawRect = (boxes, classes, scores) => {
  for (let i = 0; i < boxes.length; i++) {
      if (classes[i] === 1) {
          if (scores[i] > 0.6) {
              console.log("Book" + Math.round(scores[i] * 100) / 100,);    
              addLog("Book detected");          
          }
      } 
      if (classes[i] === 2) {
          if (scores[i] > 0.75) {
              console.log("Phone" + Math.round(scores[i] * 100) / 100,);  
              addLog("Phone detected");          
          }
      }
  }
}