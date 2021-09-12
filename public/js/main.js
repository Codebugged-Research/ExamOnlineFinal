const videoElem = document.getElementById("videoElem");
const resultElem = document.getElementById("results");
const LoginElem = document.getElementById("Login");
const logbox = document.getElementById("logbox");
const QueryImageCapture = document.getElementById("QueryImageCapture");
const startProctoringbtn = document.getElementById("startProctoring");
const stopProctoringbtn = document.getElementById("stopProctoring");
const inputImgEl = document.createElement("img");
const queryImgEl = document.createElement("img");
const liveImgEl = document.createElement("img");

//for login
let inputLabel;
let inputScore;
let ouputLabel;
let ouputScore;
const height = 480;
const width = 640;

//model load
let objectModel;
let spoofModel;

//intervals
faceCheckInterval = 1000;
objectCheckInterval = 1000;
spoofCheckInterval = 1000;

//interval controller
let faceCheck;
let objectCheck;
let spoofCheck;

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
  let li = document.createElement("li");
  li.appendChild(document.createTextNode(data));
  resultElem.appendChild(li);
  logbox.scrollTop = logbox.scrollHeight;
}

async function stop() {
  LoginElem.style = "display: box";
  await clearInterval(faceCheck);
  await clearInterval(objectCheck);
  await clearInterval(spoofCheck);
  location.reload();
}
async function proct() {
  addLog("-x- Procting started");
  addLog("-x- Live webcam picture captured");

  //start monitoring
  //face and person
  faceCheck = setInterval(async () => { await CheckFace(); }, faceCheckInterval);
  //object
  objectCheck = setInterval(async () => { await CheckObject(); }, objectCheckInterval);
  //spoof
  spoofCheck = setInterval(async () => { await CheckSpoof(); }, spoofCheckInterval);
}

//authentication
async function run() {
  await faceapi.loadFaceLandmarkModel('https://propview.ap-south-1.linodeobjects.com/');
  await faceapi.loadFaceRecognitionModel('https://propview.ap-south-1.linodeobjects.com/');
  await faceapi.nets.ssdMobilenetv1.loadFromUri('https://propview.ap-south-1.linodeobjects.com/');
  addLog("-x- Face Recognistion model loaded");
  objectModel = await cocoSsd.load();
  addLog("-x- Object model loaded");
  spoofModel = await ml5.imageClassifier('https://teachablemachine.withgoogle.com/models/dpo5k2b9u/model.json');
  addLog("-x- Spoof model loaded");

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
    addLog("Candidate left the frame");
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
      addLog("Candidate present");
    } else {
      addLog("Candidate absent");
    }

  })
}

//check for objects during exam
async function CheckObject() {
  await objectModel.detect(videoElem).then(predictions => {
    predictions.forEach(prediction => {
      if (prediction.class === "book" || prediction.class === "cell phone" || prediction.class === "laptop") {
        addLog(prediction.class + " detected");
      }
      // console.log(prediction.class + " (" + (prediction.score * 100).toFixed(4) + ")");
    });
  });
}

async function CheckSpoof() {
  spoofModel.classify(videoElem, (error, results) => {
    if (error) {
      console.error(error);
      return;
    }
    // console.log(`${(results[0].confidence * 100).toFixed(2)}%`);
    // console.log(`${(results[1].confidence * 100).toFixed(2)}%`);
    if ((results[1].confidence * 100).toFixed(2) > 10.00) {
      addLog("spoofing detected");
    }
  });
}