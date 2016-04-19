 // *******************************************************
 // * Copyright (C) BT - All Rights Reservedrob.phoenix@bt.com
 // * Unauthorized copying of this file, via any medium is strictly prohibited
 // * Proprietary and confidential
 // * Written by Rob Phoenix <rob.phoenix@bt.com>, 2016
 // *******************************************************

 const electron = require('electron');
 // Module to control application life.
 const app = electron.app;
 // Module to create native browser window.
 const BrowserWindow = electron.BrowserWindow;
 const ipcMain = electron.ipcMain;
 const fs = require('fs');
 const path = require('path');
 const Immutable = require('immutable');
 const _ = require('lodash');

 /**
  * Electron setup
  */

 // Keep a global reference of the window object, if you don't, the window will
 // be closed automatically when the JavaScript object is garbage collected.
 let mainWindow = null;

 // Quit when all windows are closed.
 app.on('window-all-closed', () => {
   // On OS X it is common for applications and their menu bar
   // to stay active until the user quits explicitly with Cmd + Q
   if (process.platform !== 'darwin') {
     app.quit();
   }
 });

 // This method will be called when Electron has finished
 // initialization and is ready to create browser windows.
 app.on('ready', () => {
   // Create the browser window.
   mainWindow = new BrowserWindow({
     width: 800,
     height: 600,
     center: true,
     resizable: false,
     autoHideMenuBar: true,
   });

   // and load the index.html of the app.
   mainWindow.loadURL(path.join('file://', __dirname, 'index.html'));

   // mainWindow.openDevTools();

   // Emitted when the window is closed.
   mainWindow.on('closed', () => {
     // Dereference the window object, usually you would store windows
     // in an array if your app supports multi windows, this is the time
     // when you should delete the corresponding element.
     mainWindow = null;
   });
 });

 /**
  * Clerk.js functionality
  */

 /**
  * [global object to hold stats on number of files & devices processed]
  * @type {Object}
  */
 const processed = {
   files: 0,
   devices: 0,
 };

 /**
  * Fetches device hostname from fileContent
  * using a regular expression.
  * @param  {string} fileContent [contents of show file]
  * @return {string}             [device hostname]
  */
 function fetchHostname(fileContent) {
   // assumes the hostname is the name of the device
   // before the #show version command, ie.
   // {{hostname}}# sh ver
   // we only need one occurrence of it
   const hostnameRegex = /(\S+)#sh[ow\s]+ver.*/;
   // the hostname is the second item in
   // the array returned by .exec
   return hostnameRegex.exec(fileContent)[1];
 }

 /**
  * Fetches all device serial numbers from fileContent
  * using a regular expression.
  * @param  {string} fileContent [contents of show file]
  * @return {[string,]}          [an array of one or more device serial numbers]
  */
 function fetchSerialNumbers(fileContent) {
   // matches: System serial number            : ANC1111A1AB
   const serialNumberRegex = /[Ss]ystem\s+[Ss]erial\s+[Nn]umber\s+:\s([\w]+)/g;
   // array to hold all found serial numbers
   const serialNumberArray = [];
   // define match variable
   let serialNumberMatch;
   // find all occurences of serialNumberRegex
   while ((serialNumberMatch = serialNumberRegex.exec(fileContent))) {
     // the serial number is the second item
     // in the array returned by .exec
     serialNumberArray.push(serialNumberMatch[1]);
   }
   return serialNumberArray;
 }

 /**
  * [Fetches all model numbers, software versions and software images from
  * fileContent using a regular expression]
  * @param  {string} fileContent [contents of show file]
  * @return {[[string,],]}       [an array of one or more arrays, containing
  *                               model, software version, software image]
  */
 function fetchModelAndSoftware(fileContent) {
   // matches: WS-C2960C-8PC-L    15.0(2)SE5            C2960c405-UNIVERSALK9-M
   const modelSoftwareRegex = /([\w-]+)\s+(\d{2}\.[\w\.)?(?]+)\s+(\w+[-|_][\w-]+\-[\w]+)/g;
   // array to hold all occurences of modelSoftwareRegex,
   // itself split into an array accordingly
   const allModelSoftwareArray = [];
   // define match variable
   let modelSoftwareMatch;
   // find all occurences of modelSoftwareRegex
   while ((modelSoftwareMatch = modelSoftwareRegex.exec(fileContent))) {
     // array to hold results
     const eachModelSoftwareArray = [];
     // modelSoftwareMatch is an array, with the first item is the match,
     // and the next three items are the groups within the match
     eachModelSoftwareArray.push(modelSoftwareMatch[1]); // model
     eachModelSoftwareArray.push(modelSoftwareMatch[2]); // software version
     eachModelSoftwareArray.push(modelSoftwareMatch[3]); // software image
     allModelSoftwareArray.push(eachModelSoftwareArray);
   }
   return allModelSoftwareArray;
 }

 /**
  * [Parses a device show file for attributes]
  * @param  {string} fin [filename]
  * @param  {string} dir [directory path]
  * @return {[string,]}  [an array of one or more strings representing
  *                       a row of comma separated device values]
  */
 function parseFile(fin, dir) {
   // get the absolute file path
   const fileName = path.join(dir, fin);
   // read the contents of the file into a string
   const fileContent = fs.readFileSync(fileName, 'utf8');
   // fetch device attributes
   const hostname = fetchHostname(fileContent);
   const serialNumbers = fetchSerialNumbers(fileContent);
   const modelAndSoftware = fetchModelAndSoftware(fileContent);
   // array to hold devices
   const deviceList = [];
   // fetchModelAndSoftware can return repeated results, whereas we know
   // fetch SerialNumbers returns the right number of results,
   // so we loop through the results of the fetch* functions and add
   // them to the deviceList array
   _.forEach(_.range(serialNumbers.length), i => {
     if (i === 0) {
       // create an immutable list with the relevant data
       const device = new Immutable.List([
         hostname,
         serialNumbers[i],
         modelAndSoftware[i][0], // model
         modelAndSoftware[i][1], // software version
         modelAndSoftware[i][2], // software image
       ]);
       // join the list into a comma separated string
       deviceList.push(device.join());
     } else {
       const device = new Immutable.List([
         // the hostname will be the same as the first hostname
         // so it can be blank as it will be referenced in the
         // preceding row of the csv file
         '',
         serialNumbers[i],
         modelAndSoftware[i][0],
         modelAndSoftware[i][1],
         modelAndSoftware[i][2],
       ]);
       deviceList.push(device.join());
     }
   });
   return deviceList;
 }

 /**
  * [build data from show files directory into the content for a csv file]
  * @param  {string} dir [path to show files directory]
  * @return {string}     [content for csv file as a single string]
  */
 function buildData(dir) {
   // we need to convert dir from an object to a string
   const dirString = String(dir);
   // define the csv headings as the first line of our csv content
   let output = 'Hostname,Serial Number,Model,Software Version,Software Image\n';
   // get array of filenames in directory
   const files = fs.readdirSync(dirString);
   // map over the files
   _.forEach(files, (file) => {
     // update the global count of the number of files processed
     processed.files += 1;
     // get array of devices from parsed file
     const devices = parseFile(file, dirString);
     // mapping over the devices, adding each to output string
     _.forEach(devices, (device) => {
       // update the global count of the number of devices processed
       processed.devices += 1;
       output += device;
       output += '\n';
     });
   });
   return output;
 }

 /**
  * [write the content to a csv file]
  * @param  {string} content   [csv ready device data]
  * @param  {string} outputDir [directory csv file to be created in]
  * @param  {string} filename  [csv filename]
  * no @return
  */
 function writeDataToCSV(content, outputDir, filename) {
   // if no outputDir specified use the current directory
   const outputPath = outputDir || __dirname;
   // create the full file path
   const fullPathFilename = path.resolve(outputPath, `${filename}.csv`);
   // write to file
   fs.writeFileSync(fullPathFilename, content);
 }

 // on 'build' trigger, receive input & output directories, & filename
 // build data and write to csv, then send back stats
 ipcMain.on('build', (event, showFilesDir, outputDir, inventoryFilename) => {
   const start = _.now();
   const result = buildData(showFilesDir);
   const fullFilePath = path.resolve(outputDir, inventoryFilename);
   writeDataToCSV(result, outputDir, inventoryFilename);
   const end = _.now();
   event.sender.send('stats', fullFilePath, processed.files, processed.devices, (end - start));
 });
