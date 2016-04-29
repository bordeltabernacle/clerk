 // *******************************************************
 // * Copyright (C) BT - All Rights Reservedrob.phoenix@bt.com
 // * Unauthorized copying of this file, via any medium is strictly prohibited
 // * Proprietary and confidential
 // * Written by Rob Phoenix <rob.phoenix@bt.com>, 2016
 // *******************************************************

 require('bootstrap');
 const electron = require('electron');
 const ipcRenderer = electron.ipcRenderer;
 const dialog = electron.remote.require('dialog');
 const shell = electron.shell;
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

 /**
  * validate field is not empty, otherwise display message
  * @param  {String} field       form field
  * @param  {String} message     message to be displayed
  * @param  {Object} messageType which message to display
  * @return {Boolean}            result of validation check
  */
 function validateNotEmpty(field, message, messageType) {
   return (field === '') ? displayMessage(messageType, message) : true;
 }

 /**
  * validate field meets criteria described by regex
  * @param  {String} field       form field
  * @param  {String} regex       regular expression
  * @param  {String} message     message to be displayed
  * @param  {Object} messageType which message to display
  * @return {Boolean}            result of validation check
  */
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
   messageType.style.display = 'block';
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
     // validate input
     if (validateProjectInput(
       btEmailInput.value,
       projectNameInput.value,
       projectRefInput.value,
       alertMessage
     )) {
       // store email for next time
       localStorage.btEmail = btEmailInput.value;
       // project name will be used in the filename so
       // replace any spaces with underscores
       project.name = projectNameInput.value.replace(/\s+/g, '_');
       project.ref = projectRefInput.value;
       project.user = document.getElementById('btEmailInput').value;
       // use current time to the second to keep filenames unique
       const d = new Date();
       const [y, m, date, h, min, s] =
         [d.getFullYear(), (d.getMonth() + 1), d.getDate(),
         d.getHours(), d.getMinutes(), d.getSeconds()
       ];
       const defaultFilename =
         `${project.name}_inventory_${y}${m}${date}${h}${min}${s}`;
       document.getElementById('inventoryFilename').value = defaultFilename;
       // as all is successful we can moce onto the next page
       alertMessage.style.display = 'none';
       document.getElementById('projectInput').style.display = 'none';
       document.getElementById('inputForm').style.display = 'block';
     }
   });

 function openDirDialog(pathDivID) {
   document.getElementById('showFilesError').style.display = 'none';
   document.getElementById(pathDivID).value =
     dialog.showOpenDialog({
       properties: ['openDirectory']
     });
 }

 // present a directory chooser to select the show files directory
 document.getElementById('showFilesDirSelect')
   .addEventListener('click', (event) => {
     openDirDialog('showFilesDirPath');
   });

 // present a directory chooser for the output directory
 document.getElementById('outputDirSelect')
   .addEventListener('click', (event) => {
     openDirDialog('outputDirPath');
   });

 // actions to take when user clicks on the build button
 document.getElementById('build')
   .addEventListener('click', (event) => {
     const showFilesDirPath = document.getElementById('showFilesDirPath').value;
     const outputDirPath = document.getElementById('outputDirPath').value;
     const inventoryFilename = document.getElementById('inventoryFilename').value;
     // send the relevant data to the main process
     ipcRenderer.send(
       'build', showFilesDirPath, outputDirPath, inventoryFilename);
   });

 // actions to take when receive messages to 'stats' channel
 ipcRenderer.on('stats', (
   event,
   inventoryFilename,
   noOfFiles,
   noOfDevices,
   timeTaken
 ) => {
   // move page onto result message
   document.getElementById('inputForm').style.display = 'none';
   document.getElementById('resultMessage').style.display = 'block';
   // display inventory file name and location
   document.getElementById('msg').innerHTML = `<b>${inventoryFilename}</b>`;
   document.getElementById('stats').innerHTML =
     `<p><b>${noOfFiles}</b> files and <b>${noOfDevices}</b> ` +
     `devices processed in <b>${timeTaken}ms</b>.</p>`;
   // push data to Firebase
   pushToDb(
     String(new Date()),
     project.user,
     project.name,
     project.ref,
     noOfFiles,
     noOfDevices,
     timeTaken);
   document.getElementById('openFile')
     .addEventListener('click', (event) => {
       shell.openItem(inventoryFilename);
     });
 });

 /**
  * push data to database
  * @param  {String} date    current date
  * @param  {String} user    current user
  * @param  {String} project current project name
  * @param  {String} ref     current project ref
  * @param  {Number} files   number of files processed
  * @param  {Number} devices number of devices processed
  * @param  {String} time    time taken in ms to process
  * no @return
  */
 function pushToDb(date, user, project, ref, files, devices, time) {
   db.push({
     date, user, project, ref, files, devices, time
   });
 }

 // actions to take when user clicks startAgain button
 document.getElementById('startAgain')
   .addEventListener('click', (event) => {
     // clear data and move back to first page
     document.getElementById('alertMessage').style.visibility = 'hidden';
     document.getElementById('resultMessage').style.display = 'none';
     document.getElementById('showFilesDirPath').value = '';
     document.getElementById('outputDirPath').value = '';
     document.getElementById('projectInput').style.display = 'block';
   });

 // actions to take when receive error regarding invalid show file directory
 ipcRenderer.on('showFilesENOENT', (event, path) => {
   // display error
   const showFilesError = document.getElementById('showFilesError');
   const message = `<p>The Show Files directory <b>${path}</b> is not a valid directory.</p>`;
   displayMessage(showFilesError, message);
 });
