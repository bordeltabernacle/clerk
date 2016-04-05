const ipcRenderer = require('electron').ipcRenderer;
const remote = require('electron').remote;
const dialog = remote.require('dialog');
var Firebase = require("firebase");

var loginPageContinueButton = document.getElementById('loginPageContinue');
loginPageContinueButton.addEventListener('click', function(event) {
  var btEmailInputValue = document.getElementById('btEmailInput').value;
  var projectNameInputValue = document.getElementById('projectNameInput').value;
  if (btEmailInputValue == "" && projectNameInputValue == "") {
    document.getElementById('alertMessage').innerHTML = "Please Enter your BT Email Address and a Project name.";
    document.getElementById('alertMessage').style.visibility = "visible";
  } else if (btEmailInputValue == "") {
    document.getElementById('alertMessage').innerHTML = "Please Enter your BT Email Address.";
    document.getElementById('alertMessage').style.visibility = "visible";
  } else if (projectNameInputValue == "") {
    document.getElementById('alertMessage').innerHTML = "Please Enter a Project name.";
    document.getElementById('alertMessage').style.visibility = "visible";
  } else {
    document.getElementById('alertMessage').style.visibility = "hidden";
    document.getElementById('loginPage').style.display = "none";
    document.getElementById('inputForm').style.display = "block";
  };
});


var d = new Date()
var defaultFilename = "Inventory_" + d.getFullYear() + "_" + (d.getMonth() + 1) + "_" + d.getDate() + "_" + d.getHours() + d.getMinutes() + d.getSeconds();
document.getElementById('inventoryFilename').value = defaultFilename;

var showFilesDirButton = document.getElementById('showFilesDirSelect');
var outputDirButton = document.getElementById('outputDirSelect');

showFilesDirButton.addEventListener('click', function (event) {
  var showFilesDir = dialog.showOpenDialog({ properties: ['openDirectory'] });
  document.getElementById('showFilesDirPath').value = showFilesDir;
  //ipcRenderer.send('build', showFilesDir);
});

outputDirButton.addEventListener('click', function (event) {
  var outputDir = dialog.showOpenDialog({ properties: ['openDirectory'] });
  document.getElementById('outputDirPath').value = outputDir;
    //ipcRenderer.send('build', showFilesDir);
})

var buildButton = document.getElementById('build');

buildButton.addEventListener('click', function (event) {
  var showFilesDirPath = document.getElementById('showFilesDirPath').value;
  var outputDirPath = document.getElementById('outputDirPath').value;
  var inventoryFilename = document.getElementById('inventoryFilename').value;
  var inputForm = document.getElementById('inputForm');
  inputForm.parentNode.removeChild(inputForm);
  ipcRenderer.send('build', showFilesDirPath, outputDirPath, inventoryFilename);
});

ipcRenderer.on('result', function (event, result, inventoryFilename) {
    document.getElementById('resultMessage').style.display = "block";
    document.getElementById('msg').innerHTML = inventoryFilename + ".csv";
    document.getElementById('resultCSVData').innerHTML = result;
});
