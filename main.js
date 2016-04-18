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
 const ipcMain = require('electron').ipcMain;
 const fs = require('fs');
 const path = require('path');
 const Immutable = require('immutable');

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
   const serialNumberRegex = /[Ss]ystem\s+[Ss]erial\s+[Nn]umber\s+:\s([\w]+)/g;
   const serialNumberArray = [];
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
   const modelSoftwareRegex = /([\w-]+)\s+(\d{2}\.[\w\.)?(?]+)\s+(\w+[-|_][\w-]+\-[\w]+)/g;
   const allModelSoftwareArray = [];
   let modelSoftwareMatch;

   while ((modelSoftwareMatch = modelSoftwareRegex.exec(fileContent))) {
     const eachModelSoftwareArray = [];
     eachModelSoftwareArray.push(modelSoftwareMatch[1]); // model
     eachModelSoftwareArray.push(modelSoftwareMatch[2]); // software version
     eachModelSoftwareArray.push(modelSoftwareMatch[3]); // software image
     allModelSoftwareArray.push(eachModelSoftwareArray);
   }
   return allModelSoftwareArray;
 }

 function parseFile(fin, dir) {
   const fileName = path.join(dir, fin);
   const fileContent = fs.readFileSync(fileName, 'utf8');

   const hostname = fetchHostname(fileContent);
   const serialNumbers = fetchSerialNumbers(fileContent);
   const modelAndSoftware = fetchModelAndSoftware(fileContent);

   const deviceList = [];


   let i = 0;
   while (i < serialNumbers.length) {
     const device = new Immutable.List([
       hostname,
       serialNumbers[i],
       modelAndSoftware[i][0],
       modelAndSoftware[i][1],
       modelAndSoftware[i][2],
     ]);

     deviceList.push(device.join());
     i++;
   }

   return deviceList;
 }

 // Loop through test Data directory
 function buildData(dir) {
   const start = new Date().getTime();
   const files = [];
   noOfDevices = 0;
   const dirString = String(dir);
   let output = 'Hostname,Serial Number,Model,Software Version,Software Image\n';
   fs.readdirSync(dirString).map((file) => {
     files.push(file);
     parseFile(file, dirString).map((device) => {
       processed.devices += 1;
       output += device;
       output += '\n';
     });
   });
   processed.files = files.length;
   const end = new Date().getTime();
   const timeTaken = end - start;
   mainWindow.webContents.send('stats', processed.files, processed.devices, timeTaken);
   return output;
 }

 function writeDataToCSV(content, outputDir, filename) {
   const outputPath = outputDir || __dirname;
   const fullPathFilename = path.resolve(outputPath, filename + '.csv');
   fs.writeFileSync(fullPathFilename, content);
 }

 ipcMain.on('build', (event, showFilesDir, outputDir, inventoryFilename) => {
   const result = buildData(showFilesDir);
   const fullFilePath = path.resolve(outputDir, inventoryFilename);
   writeDataToCSV(result, outputDir, inventoryFilename);
   console.log(typeof processed.files);
   event.sender.send('result', result, fullFilePath, processed.files, processed.devices);
 });
