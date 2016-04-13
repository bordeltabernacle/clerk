require('bootstrap');
const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;
const dialog = remote.require('dialog');
const Firebase = require('firebase');
const clerkFirebase = new Firebase('https://clerk.firebaseio.com/');

// var timeTaken;

document.getElementById('btEmailInput')
  .value = localStorage.btEmail;

document.getElementById('loginPageContinue')
  .addEventListener('click', (event) => {

    t1 = performance.now();

    const btEmailInputValue = document.getElementById('btEmailInput').value;

    const projectNameInputValue = document.getElementById('projectNameInput').value;

    if (btEmailInputValue === '' && projectNameInputValue === '') {
      document.getElementById('alertMessage').innerHTML = 'Please Enter your BT Email Address and a Project name.';
      document.getElementById('alertMessage').style.visibility = 'visible';
    } else if (btEmailInputValue === '') {
      document.getElementById('alertMessage').innerHTML = 'Please Enter your BT Email Address.';
      document.getElementById('alertMessage').style.visibility = 'visible';
    } else if (projectNameInputValue === '') {
      document.getElementById('alertMessage').innerHTML = 'Please Enter a Project name.';
      document.getElementById('alertMessage').style.visibility = 'visible';
    } else {
      localStorage.btEmail = document.getElementById('btEmailInput').value;
      projectName = document.getElementById('projectNameInput').value;
      user = document.getElementById('btEmailInput').value;
      d = new Date();
      const defaultFilename = '${projectName.replace(/ /g, "_")}${_inventory_}${d.getFullYear()}${(d.getMonth() + 1)}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}';
      document.getElementById('inventoryFilename').value = defaultFilename;
      document.getElementById('alertMessage').style.visibility = 'hidden';
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('inputForm').style.display = 'block';
    };
  });

var showFilesDirButton = document.getElementById('showFilesDirSelect');
var outputDirButton = document.getElementById('outputDirSelect');

showFilesDirButton.addEventListener('click', function(event) {
  var showFilesDir = dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  document.getElementById('showFilesDirPath').value = showFilesDir;
  //ipcRenderer.send('build', showFilesDir);
});

outputDirButton.addEventListener('click', function(event) {
  var outputDir = dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  document.getElementById('outputDirPath').value = outputDir;
  //ipcRenderer.send('build', showFilesDir);
})

var buildButton = document.getElementById('build');

buildButton.addEventListener('click', function(event) {
  var showFilesDirPath = document.getElementById('showFilesDirPath').value;
  var outputDirPath = document.getElementById('outputDirPath').value;
  var inventoryFilename = document.getElementById('inventoryFilename').value.replace(/ /g, "_");
  document.getElementById('inputForm').style.display = "none";
  ipcRenderer.send('build', showFilesDirPath, outputDirPath, inventoryFilename);
});

ipcRenderer.on('result', function(event, result, inventoryFilename, noOfFiles, noOfDevices) {
  document.getElementById('resultMessage').style.display = "block";
  document.getElementById('msg').innerHTML = '<b>' + inventoryFilename + ".csv</b>";
  t2 = performance.now();
  const timeTaken = parseFloat((t2 - t1) / 1000).toFixed(2);
  clerkFirebase.push({
    date: String(new Date()),
    user: user,
    project: projectName,
    files: noOfFiles,
    devices: noOfDevices,
    time: timeTaken
  });
});

ipcRenderer.on('stats', function(event, noOfFiles, noOfDevices, timeTaken) {
  output = '<p><b>' + noOfFiles + '</b> files and <b>' +
    noOfDevices + '</b> devices processed in <b>' +
    timeTaken + 'ms</b>.</p>';
  document.getElementById('stats').innerHTML = output;
});

var startAgainButton = document.getElementById('startAgain');

startAgainButton.addEventListener('click', function(event) {
  document.getElementById('alertMessage').style.visibility = "hidden";
  document.getElementById('resultMessage').style.display = "none";
  document.getElementById('showFilesDirPath').value = "";
  document.getElementById('outputDirPath').value = "";
  document.getElementById('loginPage').style.display = "block";
});


//ipcRenderer.on('test', function (event, arg) {
//  console.log(arg);
//});
