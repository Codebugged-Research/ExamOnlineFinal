const videoElem = document.getElementById("videoElem");
const resultElem = document.getElementById("results");
const LoginElem = document.getElementById("Login");
const QueryImageCapture = document.getElementById("QueryImageCapture");
const inputImgEl = document.createElement("img");
const queryImgEl = document.createElement("img");

//for login
var inputLabel;
var inputScore;
var ouputLabel;
var ouputScore;
const height = 480;
const width = 640;

navigator.mediaDevices.getUserMedia({
  video: true
}).then(async (stream) => {
  videoElem.srcObject = stream;
  await run();
  //main chain
}).catch((err) => {
  console.log(err);
});

addLog = (data) => {
  var li = document.createElement("li");
  li.appendChild(document.createTextNode(data));
  resultElem.appendChild(li);
}

//authentication
async function run() {
  await faceapi.loadFaceLandmarkModel('https://propview.ap-south-1.linodeobjects.com/')
  await faceapi.loadFaceRecognitionModel('https://propview.ap-south-1.linodeobjects.com/')
  await faceapi.nets.ssdMobilenetv1.loadFromUri('https://propview.ap-south-1.linodeobjects.com/')
  addLog("Face Recognistion model loaded");
  LoginElem.style = "display: box";
  LoginElem.addEventListener('click', async function (ev) {
    // await updateReferenceImageResults("https://img.lovepik.com/photo/50152/4070.jpg_wh860.jpg")
    await updateReferenceImageResults("https://propview.ap-south-1.linodeobjects.com/sambit.jpg")
    ev.preventDefault();
  }, false);
  QueryImageCapture.addEventListener('click', async function (ev) {
    takepicture();
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
  addLog(`${labels.length} face Detected in refrence image`);
  if (labels.length === 1) {
    resizedResults.forEach(({ detection, descriptor }) => {
      const label = faceMatcher.findBestMatch(descriptor).toString();
      inputLabel = label;
      inputScore = detection.score;
      console.log(inputLabel);
      console.log(inputScore);
    })
    LoginElem.style = "display: none";
    QueryImageCapture.style = "display: box";
  } else {
    addLog(`check refernce image`);
    LoginElem.style = "display: none";
  }
  return
}

//capture query image
function takepicture() {
  const tempCanvas = document.createElement("canvas");
  var context = tempCanvas.getContext('2d');
  tempCanvas.width = width;
  tempCanvas.height = height;
  context.drawImage(videoElem, 0, 0, width, height);
  var data = tempCanvas.toDataURL('image/png');
  queryImgEl.setAttribute('src', data);
  queryImgEl.style = "-webkit-transform: scaleX(-1); transform: scaleX(-1);"
  addLog("Webcam picture captureed");
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
    console.log(ouputLabel, ouputScore);
    var length = ouputLabel.length;
    var length2 = inputLabel.length;
    if (inputLabel.substring(0, length2 - 3) === ouputLabel.substring(0, length - 6)) {
      addLog(`Face sucessfully matched with ${(ouputScore * 100).toFixed(2)}% accuracy`);
    } else {
      addLog("Face is not matching");
    }
  })
}