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
const downloadLogsbtn = document.getElementById("downloadLog");
const inputImgEl = document.createElement("img");
const queryImgEl = document.createElement("img");
const liveImgEl = document.createElement("img");
const liveImgElHead = document.createElement("img");
const obejctDetectImageEl = document.createElement("img");

const controls = window;
const drawingUtils = window;
const mpFaceMesh = window;

let maxPredictions;

let photoUrl = "https://propview.ap-south-1.linodeobjects.com/sambit.jpg";

//headpose
const imageScaleFactor = 0.50;// image resizing factor 
const flipHorizontal = true; // flipping of video
const outputStride = 16; //body lines

//for login gloabl  variable
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
let poseModel;

//intervals
faceCheckInterval = 1000;
objectCheckInterval = 1000;
spoofCheckInterval = 3000;
lipTrackerInterval = 1000;
headPoseInterval = 1000;

//threshold
// spoofThresshold = 0.98;
bookThresshold = 0.4;
phoneThresshold = 0.4;

//interval controller
let faceCheck;
let objectCheck;
let spoofCheck;
let lipTrackCheck;
let faceMesh;
let headPose;

let capturedStream;
let camera;

window.onload = async function () {
  start();
};

//event logger
addLog = (data) => {
  let li = document.createElement("li");
  li.appendChild(document.createTextNode(data));
  resultElem.appendChild(li);
  logbox.scrollTop = logbox.scrollHeight;
}

function download(filename) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(resultElem.innerText));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

async function start() {
  resultElem.innerHTML = "";
  $('#tempImg').hide();
  inputurlEl.style = "display: box";
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
  await clearInterval(objectCheck);
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
  // await clearInterval(spoofCheck);
  await clearInterval(headPose);
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
  //headpose
  headPose = setInterval(async () => { await CheckHeadPose(); }, headPoseInterval);
  //spoof
  // spoofCheck = setInterval(async () => { await CheckSpoof(); }, spoofCheckInterval);
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
  downloadLogsbtn.addEventListener("click", async function (ev) { download("logs.txt"); });
  pauseProctoringbtn.addEventListener('click', async function (ev) { await pause(); });
  resumeProctoringbtn.addEventListener('click', async function (ev) { await resume(); });
  addLog("-x- Fetching Models");
  await faceapi.loadFaceLandmarkModel('https://propview.ap-south-1.linodeobjects.com/');
  await faceapi.loadFaceRecognitionModel('https://propview.ap-south-1.linodeobjects.com/');
  await faceapi.nets.ssdMobilenetv1.loadFromUri('https://propview.ap-south-1.linodeobjects.com/');
  addLog("-x- Face Recognistion model loaded");
  objectModel = await tf.loadGraphModel("./public/object/model.json");
  addLog("-x- Object model loaded");
  poseModel = await posenet.load();
  addLog("-x- Head Pose model loaded");
  // spoofModel = await tf.loadGraphModel("./public/spoof2/model.json");
  // addLog("-x- Spoof model loaded");
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
        downloadLogsbtn.style = "display: box";
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
    if (counter2 === 5) {
      console.log("candidate looking outside the screen");
      addLog("candidate is absent");
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
      console.log("Candidate present");
    } else {
      counter++;
      if (counter === 5) {
        addLog("Candidate absent or wrong person");
        counter = 0;
      }
    }

  })
}

const labelMap = {
  1: { name: 'Book', color: 'red' },
  3: { name: 'Phone', color: 'yellow' },
}
//check for objects during exam
async function CheckObject() {
  let img = tf.browser.fromPixels(videoElem);
  let resized = tf.image.resizeBilinear(img, [640, 640]);
  let casted = resized.cast("int32");
  let expanded = casted.expandDims(0);
  let obj = await objectModel.executeAsync(expanded);

  var boxes = await obj[2].array(); //
  var classes = await obj[6].array(); //Classes  
  var scores = await obj[0].array();
  boxes = boxes[0];
  classes = classes[0];
  scores = scores[0];
  for (let i = 0; i < boxes.length; i++) {
    if (classes[i] === 1 && scores[i] > bookThresshold) {
      console.log("Book" + Math.round(scores[i] * 100) / 100,);
      addLog("Book detected" + (Math.round(scores[i] * 100) / 100)); break;
    }
    else if (classes[i] === 3 && scores[i] > phoneThresshold) {
      console.log("Phone" + Math.round(scores[i] * 100) / 100,);
      addLog("Phone detected" + (Math.round(scores[i] * 100) / 100)); break;
    }
  }
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
    addLog("spoof detected" + arr[1].toFixed(2));
  }
  tf.dispose(tfImg);
  tf.dispose(prediction);
  tf.dispose(values);
  tf.dispose(arr);
}

async function CheckHeadPose() {
  const pose = await poseModel.estimateSinglePose(videoElem, imageScaleFactor, false, outputStride);
  let nsx = pose.keypoints[0].position.x;
  let nsy = pose.keypoints[0].position.y;
  let lex = pose.keypoints[1].position.x;
  let ley = pose.keypoints[1].position.y;
  let rex = pose.keypoints[2].position.x;
  let rey = pose.keypoints[2].position.y;
  const distToLeftEyeX = Math.abs(lex - nsx);
  const distToRightEyeX = Math.abs(rex - nsx);
  if ((distToRightEyeX - distToLeftEyeX) > 10) {
    console.log("Looking Left");
    addLog("Candidate is looking out of the screen (left)");
  } else if ((distToLeftEyeX - distToRightEyeX) > 10) {
    console.log("Looking Right");
    addLog("Candidate is looking out of the screen (right)");
  } else {
    console.log("Looking Straight");
  }
}

async function checkLipTracker() {
  await camera.start();
}
