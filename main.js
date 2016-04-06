'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;
const ipcMain = require('electron').ipcMain;
var fs = require('fs');
var path = require('path');
var R = require('ramda');
var Immutable = require('immutable');

var hostnameRegex = /(\S+)\#sh[ow\s]+ver.*/;
var serialNumberRegex = /[Ss]ystem\s+[Ss]erial\s+[Nn]umber\s+:\s([\w]+)/g;
var modelSoftwareRegex = /([\w-]+)\s+(\d{2}\.[\w\.)?(?]+)\s+(\w+[-|_][\w-]+\-[\w]+)/g;

var noOfFiles;
var noOfDevices;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    resizable: false,
    autoHideMenuBar: true
  });

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // mainWindow.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

function fetchHostname(fileContent) {
  return hostnameRegex.exec(fileContent)[1];
};

function fetchSerialNumbers(fileContent) {
  var serialNumberArray = [];
  var serialNumberMatch;

  while (serialNumberMatch = serialNumberRegex.exec(fileContent)) {
    serialNumberArray.push(serialNumberMatch[1]);
  };

  return serialNumberArray;
};

function fetchModelAndSoftware(fileContent) {
  var allModelSoftwareArray = [];
  var modelSoftwareMatch;

  while (modelSoftwareMatch = modelSoftwareRegex.exec(fileContent)) {
    var eachModelSoftwareArray = [];
    eachModelSoftwareArray.push(modelSoftwareMatch[1]);
    eachModelSoftwareArray.push(modelSoftwareMatch[2]);
    eachModelSoftwareArray.push(modelSoftwareMatch[3]);
    allModelSoftwareArray.push(eachModelSoftwareArray);
  };

  return allModelSoftwareArray;
}

function parseFile(fileName, dir) {
  fileName = path.join(dir, fileName);
  var fileContent = fs.readFileSync(fileName, 'utf8');

  var hostname = fetchHostname(fileContent);
  var serialNumbers = fetchSerialNumbers(fileContent);
  var modelAndSoftware = fetchModelAndSoftware(fileContent);

  var deviceList = [];

  var i = 0;
  while (i < serialNumbers.length) {
    var device = Immutable.List([
      hostname,
      serialNumbers[i],
      modelAndSoftware[i][0],
      modelAndSoftware[i][1],
      modelAndSoftware[i][2]
    ]);

    deviceList.push(device.join());
    i++;
  }

  return deviceList;
}

// Loop through test Data directory
  function buildData(dir) {
    var start = new Date().getTime();
    var files = [];
    noOfDevices = 0;
    var dirString = String(dir);
    var output = "Hostname,Serial Number,Model,Software Version,Software Image\n";
    fs.readdirSync(dirString).map(function(file) {
      files.push(file);
      parseFile(file, dirString).map(function(device) {
        noOfDevices += 1;
        output += device;
        output += "\n"
      });
    });
    noOfFiles = files.length;
    //noOfDevices = noOfDevices;
    var end = new Date().getTime();
    var timeTaken = end - start;
    mainWindow.webContents.send('stats', noOfFiles, noOfDevices, timeTaken);
    return output;
  };

function writeDataToCSV(content, outputDir, filename) {
  var outputPath = outputDir || __dirname;
  var fullPathFilename = path.resolve(outputPath, filename) + ".csv";
  fs.writeFileSync(fullPathFilename, content);
}

ipcMain.on('build', function (event, showFilesDir, outputDir, inventoryFilename) {
  var result = buildData(showFilesDir);
  var fullFilePath = path.resolve(outputDir, inventoryFilename);
  writeDataToCSV(result, outputDir, inventoryFilename);
  event.sender.send('result', result, fullFilePath, noOfFiles, noOfDevices);
});
