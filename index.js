 // *******************************************************
 // * Copyright (C) BT - All Rights Reservedrob.phoenix@bt.com
 // * Unauthorized copying of this file, via any medium is strictly prohibited
 // * Proprietary and confidential
 // * Written by Rob Phoenix <rob.phoenix@bt.com>, 2016
 // *******************************************************

 require('bootstrap');
 const ipcRenderer = require('electron').ipcRenderer;
 const remote = require('electron').remote;
 const dialog = remote.require('dialog');
 const Firebase = require('firebase');
 const clerkFirebase = new Firebase('https://clerk.firebaseio.com/');

 document.getElementById('btEmailInput').value = localStorage.btEmail;

 document.getElementById('loginPageContinue').addEventListener('click', (event) => {
   t1 = performance.now();
   const btEmailInputValue = document.getElementById('btEmailInput').value;
   const alertEmail = document.getElementById('alertEmail');
   const projectNameInputValue = document.getElementById('projectNameInput').value;
   const alertProjectName = document.getElementById('alertProjectName');
   const projectRefInputValue = document.getElementById('projectRefInput').value;
   const alertProjectRef = document.getElementById('alertProjectRef');
   if (btEmailInputValue === '') {
     alertEmail.innerHTML = 'Please Enter your BT Email Address';
     alertEmail.style.display = 'block';
     return false;
   }
   if (projectNameInputValue === '') {
     alertProjectName.innerHTML = 'Please Enter the Project Name.';
     alertProjectName.style.display = 'block';
     return false;
   }
   if (projectRefInputValue === '') {
     alertProjectRef.innerHTML = 'Please Enter a Project Reference.';
     alertProjectRef.style.display = 'block';
     return false;
   }
   localStorage.btEmail = btEmailInputValue;
   projectName = projectNameInputValue.replace(/ /g, '_');
   projectRef = projectRefInputValue;
   user = document.getElementById('btEmailInput').value;
   const d = new Date();
   const [y, m, date, h, min, s] = [d.getFullYear(), (d.getMonth() + 1), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
   const defaultFilename = `${projectName}_inventory_${y}${m}${date}${h}${min}${s}`;
   document.getElementById('inventoryFilename').value = defaultFilename;
   alertEmail.style.display = 'none';
   alertProjectName.style.display = 'none';
   alertProjectRef.style.display = 'none';
   document.getElementById('loginPage').style.display = 'none';
   document.getElementById('inputForm').style.display = 'block';
 });

 document.getElementById('showFilesDirSelect').addEventListener('click', (event) => {
   const showFilesDir = dialog.showOpenDialog({
     properties: ['openDirectory'],
   });
   document.getElementById('showFilesDirPath').value = showFilesDir;
   // ipcRenderer.send('build', showFilesDir);
 });

 document.getElementById('outputDirSelect').addEventListener('click', (event) => {
   const outputDir = dialog.showOpenDialog({
     properties: ['openDirectory'],
   });
   document.getElementById('outputDirPath').value = outputDir;
   // ipcRenderer.send('build', showFilesDir);
 });

 const buildButton = document.getElementById('build');

 buildButton.addEventListener('click', (event) => {
   const showFilesDirPath = document.getElementById('showFilesDirPath').value;
   const outputDirPath = document.getElementById('outputDirPath').value;
   const inventoryFilename = document.getElementById('inventoryFilename').value.replace(/ /g, '_');
   document.getElementById('inputForm').style.display = 'none';
   ipcRenderer.send('build', showFilesDirPath, outputDirPath, inventoryFilename);
 });

 ipcRenderer.on('result', (event, result, inventoryFilename, noOfFiles, noOfDevices) => {
   document.getElementById('resultMessage').style.display = 'block';
   document.getElementById('msg').innerHTML = `<b>${inventoryFilename}.csv</b>`;
   t2 = performance.now();
   const timeTaken = parseFloat((t2 - t1) / 1000).toFixed(2);
   clerkFirebase.push({
     date: String(new Date()),
     user: user,
     project: projectName,
     reference: projectRef,
     files: noOfFiles,
     devices: noOfDevices,
     time: timeTaken,
   });
 });

 ipcRenderer.on('stats', (event, noOfFiles, noOfDevices, timeTaken) => {
   document.getElementById('stats').innerHTML =
     `<p><b>${noOfFiles}</b> files and <b>${noOfDevices}</b> devices processed in <b>${timeTaken}ms</b>.</p>`;
 });

 document.getElementById('startAgain').addEventListener('click', (event) => {
   document.getElementById('alertMessage').style.visibility = 'hidden';
   document.getElementById('resultMessage').style.display = 'none';
   document.getElementById('showFilesDirPath').value = '';
   document.getElementById('outputDirPath').value = '';
   document.getElementById('loginPage').style.display = 'block';
 });
