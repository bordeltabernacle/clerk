 // *******************************************************
 // * Copyright (C) BT - All Rights Reservedrob.phoenix@bt.com
 // * Unauthorized copying of this file, via any medium is strictly prohibited
 // * Proprietary and confidential
 // * Written by Rob Phoenix <rob.phoenix@bt.com>, 2016
 // *******************************************************

 require('bootstrap');
 const electron = require('electron');
 const ipcRenderer = electron.ipcRenderer;
 const remote = electron.remote;
 const dialog = remote.require('dialog');
 const Firebase = require('firebase');
 const db = new Firebase('https://clerk.firebaseio.com/');

 // global object to store user & project info
 const project = {
   user: '',
   name: '',
   ref: ''
 };

 //
 document.getElementById('btEmailInput').value = localStorage.btEmail;

 const projectInputSubmit = document.getElementById('projectInputContinue');
 const btEmailInput = document.getElementById('btEmailInput');
 const projectNameInput = document.getElementById('projectNameInput');
 const projectRefInput = document.getElementById('projectRefInput');
 const alertMessage = document.getElementById('alertMessage');

 function validateProjectInput() {
   if (btEmailInput.value === '' || projectNameInput.value === '' || projectRefInput.value === '') {
     if (btEmailInput.value === '') {
       alertMessage.style.display = 'block';
       alertMessage.innerHTML += '<li>Please Enter your BT Email Address</li>';
       return false;
     }
     if (projectNameInput.value === '') {
       alertMessage.style.display = 'block';
       alertMessage.innerHTML += '<li>Please Enter the Project Name</li>';
     }
     if (projectRefInput.value === '') {
       alertMessage.style.display = 'block';
       alertMessage.innerHTML += '<li>Please Enter a Project Reference</li>';
     }
     if (!/^[\w\-\_]+$/.test(projectNameInput.value)) {
       alertMessage.style.display = 'block';
       alertMessage.innerHTML +=
         '<li>Project Name can contain uppercase and lowercase letters, numbers, and the <b>-</b> and <b>_</b> characters</li>';
     }
     return false;
   }
   if (!/^[\w\-\_]+$/.test(projectNameInput.value)) {
     alertMessage.style.display = 'block';
     alertMessage.innerHTML +=
       '<li>The Project Name can only contain uppercase and lowercase letters, numbers, and the <b>-</b> & <b>_</b> characters</li>';
     return false;
   }
   return true;
 }

 projectInputSubmit.addEventListener('click', (event) => {
   alertMessage.innerHTML = '';
   if (validateProjectInput()) {
     localStorage.btEmail = btEmailInput.value;
     project.name = projectNameInput.value.replace(/ /g, '_');
     project.ref = projectRefInput.value;
     project.user = document.getElementById('btEmailInput').value;
     const d = new Date();
     const [y, m, date, h, min, s] =
       [d.getFullYear(), (d.getMonth() + 1), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
     const defaultFilename = `${project.name}_inventory_${y}${m}${date}${h}${min}${s}`;
     document.getElementById('inventoryFilename').value = defaultFilename;
     alertMessage.style.display = 'none';
     document.getElementById('projectInput').style.display = 'none';
     document.getElementById('inputForm').style.display = 'block';
   }
 });

 const showFilesDirSelect = document.getElementById('showFilesDirSelect');
 showFilesDirSelect.addEventListener(
   'click', (event) => {
     const showFilesDir = dialog.showOpenDialog({
       properties: ['openDirectory']
     });
     document.getElementById('showFilesDirPath').value = showFilesDir;
   });

 const outputDirSelect = document.getElementById('outputDirSelect');
 outputDirSelect.addEventListener('click', (event) => {
   const outputDir = dialog.showOpenDialog({
     properties: ['openDirectory']
   });
   document.getElementById('outputDirPath').value = outputDir;
 });

 const buildButton = document.getElementById('build');
 buildButton.addEventListener('click', (event) => {
   const showFilesDirPath = document.getElementById('showFilesDirPath').value;
   const outputDirPath = document.getElementById('outputDirPath').value;
   const inventoryFilename = document.getElementById('inventoryFilename').value
     .replace(/ /g, '_');
   ipcRenderer.send('build', showFilesDirPath, outputDirPath,
     inventoryFilename);
 });

 ipcRenderer.on('stats', (event, inventoryFilename, noOfFiles, noOfDevices, timeTaken) => {
   document.getElementById('inputForm').style.display = 'none';
   document.getElementById('resultMessage').style.display = 'block';
   document.getElementById('msg').innerHTML = `<b>${inventoryFilename}</b>`;
   document.getElementById('stats').innerHTML =
     `<p><b>${noOfFiles}</b> files and <b>${noOfDevices}</b> devices processed in <b>${timeTaken}ms</b>.</p>`;
   db.push({
     date: String(new Date()),
     user: project.user,
     project: project.name,
     reference: project.ref,
     files: noOfFiles,
     devices: noOfDevices,
     time: timeTaken
   });
 });

 const startAgain = document.getElementById('startAgain');
 startAgain.addEventListener('click', (event) => {
   document.getElementById('alertMessage').style.visibility = 'hidden';
   document.getElementById('resultMessage').style.display = 'none';
   document.getElementById('showFilesDirPath').value = '';
   document.getElementById('outputDirPath').value = '';
   document.getElementById('projectInput').style.display = 'block';
 });

 ipcRenderer.on('showFilesENOENT', (event, path) => {
   const showFilesError = document.getElementById('showFilesError');
   showFilesError.style.display = 'block';
   showFilesError.innerHTML = `<p><b>${path}</b> is not a valid directory.</p>`
 });
