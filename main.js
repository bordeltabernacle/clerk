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
 const path = require('path');
 const ipcMain = electron.ipcMain;
 require('electron-reload')(__dirname);
 const now = require('lodash.now');
 const clerk = require('./lib/clerk');

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
     width: 1280,
     height: 720,
     center: true,
     resizable: false,
     autoHideMenuBar: true
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

 // on 'build' trigger, receive input & output directories & filename;
 // build data and write to csv, then send back stats
 ipcMain.on('build', (event, showFilesDir, outputDir, inventoryFilename) => {
   const start = now();
   let result = '';
   try {
     result = clerk.buildContent(showFilesDir);
   } catch (e) {
     event.sender.send('showFilesENOENT', e.path);
   }
   if (result !== '') {
     const fullFilePath =
       clerk.writeDataToCSV(
         result.get('content'),
         outputDir,
         inventoryFilename
       );
     const end = now();
     event.sender.send(
       'stats',
       fullFilePath,
       result.get('files'),
       result.get('devices'), (end - start));
   }
 });
