 // *******************************************************
 // * Copyright (C) BT - All Rights Reservedrob.phoenix@bt.com
 // * Unauthorized copying of this file, via any medium is strictly prohibited
 // * Proprietary and confidential
 // * Written by Rob Phoenix <rob.phoenix@bt.com>, 2016
 // *******************************************************

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
 $('#btEmailInput').val(localStorage.btEmail);

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
   $(messageType).show();
   $(messageType).append(message);
 }

 function openDirDialog(pathDivID) {
   $('#showFilesError').hide();
   $(`#${pathDivID}`).val(
     dialog.showOpenDialog({
       properties: ['openDirectory']
     }));
 }

 // present a directory chooser to select the show files directory
 $('#showFilesDirSelect').on('click', () => {
   openDirDialog('showFilesDirPath');
 });

 // present a directory chooser for the output directory
 $('#outputDirSelect').on('click', () => {
   openDirDialog('outputDirPath');
 });

 // actions to take when user clicks on the build button
 $('#build').on('click', () => {

   const alertMessage = '#alertMessage';
   const btEmailInput = $('#btEmailInput');
   const projectNameInput = $('#projectNameInput');
   const projectRefInput = $('#projectRefInput');
   // clear any previous alert messages
   $(alertMessage).html('');
   // validate input
   if (validateProjectInput(
     btEmailInput.val(),
     projectNameInput.val(),
     projectRefInput.val(),
     alertMessage)) {
     // store email for next time
     localStorage.btEmail = btEmailInput.val();
     // project name will be used in the filename so
     // replace any spaces with underscores
     project.name = projectNameInput.val().replace(/\s+/g, '_');
     project.ref = projectRefInput.val();
     project.user = $('#btEmailInput').val();
     // use current time to the second to keep filenames unique
     const d = new Date();
     const [y, m, date, h, min, s] =
       [d.getFullYear(), (d.getMonth() + 1), d.getDate(),
       d.getHours(), d.getMinutes(), d.getSeconds()
     ];
     const defaultFilename =
       `${project.name}_inventory_${y}${m}${date}${h}${min}${s}`;
     // $('#inventoryFilename').val(defaultFilename);
     // as all is successful we can moce onto the next page
     $(alertMessage).hide();

     const showFilesDirPath = $('#showFilesDirPath').val();
     const outputDirPath = $('#outputDirPath').val();
     // const inventoryFilename = $('#inventoryFilename').val();
     // send the relevant data to the main process
     ipcRenderer.send(
       'build', showFilesDirPath, outputDirPath, defaultFilename);
   }
 });

 // actions to take when receive messages to 'stats' channel
 ipcRenderer.on('stats', (
   event,
   inventoryFilename,
   noOfFiles,
   noOfDevices,
   timeTaken) => {
   // move page onto result message
   $('#inputForm').hide();
   $('#resultMessage').show();
   // display inventory file name and location
   $('#msg').html(`<b>${inventoryFilename}</b>`);
   $('#stats').html(
     `<p><b>${noOfFiles}</b> files and <b>${noOfDevices}</b> ` +
     `devices processed in <b>${timeTaken}ms</b>.</p>`);
   // push data to Firebase
   pushToDb(
     String(new Date()),
     project.user,
     project.name,
     project.ref,
     noOfFiles,
     noOfDevices,
     timeTaken);
   $('#openFile').on('click', () => {
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
 $('startAgain').on('click', () => {
   // clear data and move back to first page
   $('#alertMessage').css('visibility', 'hidden');
   $('#resultMessage').hide();
   $('#showFilesDirPath').val('');
   $('#outputDirPath').val('');
   $('#projectInput').show();
 });

 // actions to take when receive error regarding invalid show file directory
 ipcRenderer.on('showFilesENOENT', (event, path) => {
   // display error
   const showFilesError = document.getElementById('showFilesError');
   const message = `<p>The Show Files directory <b>${path}</b> is not a valid directory.</p>`;
   displayMessage(showFilesError, message);
 });
