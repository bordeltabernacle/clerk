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

 // retrieve previously entered BT email address
 document.getElementById('btEmailInput')
   .value = localStorage.btEmail;

 /**
  * validates project input form fields
  * @param  {String} email            BT Email Address
  * @param  {String} name             User's Name
  * @param  {String} ref              Project Reference
  * @param  {Object} messageType      Which message to be displayed
  * @return {boolean}                 Validation success/failure
  */
 function validateProjectInput(email, name, ref, messageType) {
   const btEmailRegex = /\w+\.?\d?\.\w+@bt\.com/;
   const projectNameRegex = /[\w\-\_\s]+/;
   const emailEmptyMessage = '<li>Please Enter your BT Email Address</li>';
   const emailInvalidMessage = '<li>Please Enter a valid BT Email Address</li>';
   const projectRefEmptyMessage = '<li>Please Enter a Project Reference</li>';
   const projectNameEmptyMessage = '<li>Please Enter the Project Name</li>';
   const projectNameInvalidMessage =
     '<li>The Project Name can only contain ' +
     'uppercase and lowercase letters, numbers, ' +
     'and the <b>-</b> & <b>_</b> characters</li>';
   // check if all form fields have been filled correctly
   return (
     validateNotEmpty(email, emailEmptyMessage, messageType) &&
     validateNotEmpty(name, projectNameEmptyMessage, messageType) &&
     validateNotEmpty(ref, projectRefEmptyMessage, messageType) &&
     validateAcceptableInput(email, btEmailRegex, emailInvalidMessage, messageType) &&
     validateAcceptableInput(name, projectNameRegex, projectNameInvalidMessage, messageType)
   );
 }

 function validateNotEmpty(field, message, messageType) {
   return (field === '') ? displayMessage(messageType, message) : true;
 }

 function validateAcceptableInput(field, regex, message, messageType) {
   return (regex.test(field)) ? true : displayMessage(messageType, message);
 }

 /**
  * Display message type with given message
  * @param  {Object} messageType Which message to be displayed
  * @param  {String} message     Message to be displayed
  * no @return
  */
 function displayMessage(messageType, message) {
   // make message div visible
   messageType.style.display = 'block';
   // add message
   messageType.innerHTML += message;
 }

 // Actions to take when user clicks to move on from opening Project Input page
 document.getElementById('projectInputContinue')
   .addEventListener('click', (event) => {
     const alertMessage = document.getElementById('alertMessage');
     const btEmailInput = document.getElementById('btEmailInput');
     const projectNameInput = document.getElementById('projectNameInput');
     const projectRefInput = document.getElementById('projectRefInput');
     // clear any previous alert messages
     alertMessage.innerHTML = '';
     if (validateProjectInput(
       btEmailInput.value,
       projectNameInput.value,
       projectRefInput.value,
       alertMessage
     )) {
       localStorage.btEmail = btEmailInput.value;
       project.name = projectNameInput.value.replace(/\s+/g, '_');
       project.ref = projectRefInput.value;
       project.user = document.getElementById('btEmailInput').value;
       const d = new Date();
       const [y, m, date, h, min, s] =
         [d.getFullYear(), (d.getMonth() + 1), d.getDate(),
         d.getHours(), d.getMinutes(), d.getSeconds()
       ];
       const defaultFilename =
         `${project.name}_inventory_${y}${m}${date}${h}${min}${s}`;
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
     ipcRenderer.send(
       'build', showFilesDirPath, outputDirPath, inventoryFilename);
   });

 ipcRenderer.on('stats', (
   event,
   inventoryFilename,
   noOfFiles,
   noOfDevices,
   timeTaken
 ) => {
   document.getElementById('inputForm').style.display = 'none';
   document.getElementById('resultMessage').style.display = 'block';
   document.getElementById('msg').innerHTML = `<b>${inventoryFilename}</b>`;
   document.getElementById('stats').innerHTML =
     `<p><b>${noOfFiles}</b> files and <b>${noOfDevices}</b> ` +
     `devices processed in <b>${timeTaken}ms</b>.</p>`;
   pushToDb(
     String(new Date()),
     project.user,
     project.name,
     project.ref,
     noOfFiles,
     noOfDevices,
     timeTaken);
 });

 function pushToDb(date, user, project, ref, files, devices, time) {
   db.push({
     date, user, project, ref, files, devices, time
   });
 }

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
