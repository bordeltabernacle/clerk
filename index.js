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
 document.getElementById('btEmailInput')
   .value = localStorage.btEmail;

 const btEmailInput = document.getElementById('btEmailInput');
 const projectNameInput = document.getElementById('projectNameInput');
 const projectRefInput = document.getElementById('projectRefInput');
 const alertMessage = document.getElementById('alertMessage');

 function validateProjectInput(email, name, ref) {
   if (email === '' || name === '' || ref === '') {
     if (email === '') {
       const message = '<li>Please Enter your BT Email Address</li>';
       displayAlertMessage(message);
       return false;
     }
     if (name === '') {
       const message = '<li>Please Enter the Project Name</li>';
       displayAlertMessage(message);
     }
     if (ref === '') {
       const message = '<li>Please Enter a Project Reference</li>';
       displayAlertMessage(message);
     }
     if (!/^[\w\-\_]+$/.test(name)) {
       const message =
         '<li>Project Name can only contain uppercase and lowercase letters, numbers, and the <b>-</b> and <b>_</b> characters</li>';
       displayAlertMessage(message);
     }
     return false;
   }
   if (!/^[\w\-\_]+$/.test(name)) {
     const message =
       '<li>The Project Name can only contain uppercase and lowercase letters, numbers, and the <b>-</b> & <b>_</b> characters</li>';
     displayAlertMessage(message);
     return false;
   }
   return true;
 }

 function displayAlertMessage(message) {
   alertMessage.style.display = 'block';
   alertMessage.innerHTML += message;
 }

 document.getElementById('projectInputContinue')
   .addEventListener('click', (event) => {
     alertMessage.innerHTML = '';
     if (validateProjectInput(btEmailInput.value, projectNameInput.value, projectRefInput.value)) {
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

 document.getElementById('showFilesDirSelect')
   .addEventListener(
     'click', (event) => {
       const showFilesDir = dialog.showOpenDialog({
         properties: ['openDirectory']
       });
       document.getElementById('showFilesDirPath').value = showFilesDir;
     });

 document.getElementById('outputDirSelect')
   .addEventListener('click', (event) => {
     const outputDir = dialog.showOpenDialog({
       properties: ['openDirectory']
     });
     document.getElementById('outputDirPath').value = outputDir;
   });

 document.getElementById('build')
   .addEventListener('click', (event) => {
     const showFilesDirPath = document.getElementById('showFilesDirPath').value;
     const outputDirPath = document.getElementById('outputDirPath').value;
     const inventoryFilename = document.getElementById('inventoryFilename')
       .value.replace(/ /g, '_');
     ipcRenderer.send('build', showFilesDirPath, outputDirPath, inventoryFilename);
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

 document.getElementById('startAgain')
   .addEventListener('click', (event) => {
     document.getElementById('alertMessage').style.visibility = 'hidden';
     document.getElementById('resultMessage').style.display = 'none';
     document.getElementById('showFilesDirPath').value = '';
     document.getElementById('outputDirPath').value = '';
     document.getElementById('projectInput').style.display = 'block';
   });

 ipcRenderer.on('showFilesENOENT', (event, path) => {
   const showFilesError = document.getElementById('showFilesError');
   showFilesError.style.display = 'block';
   showFilesError.innerHTML = `<p><b>${path}</b> is not a valid directory.</p>`;
 });
