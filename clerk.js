 // *******************************************************
 // * Copyright (C) BT - All Rights Reservedrob.phoenix@bt.com
 // * Unauthorized copying of this file, via any medium is strictly prohibited
 // * Proprietary and confidential
 // * Written by Rob Phoenix <rob.phoenix@bt.com>, 2016
 // *******************************************************

 const fs = require('fs');
 const path = require('path');
 const Immutable = require('immutable');
 const map = require('lodash.map');
 const range = require('lodash.range');
 const forEach = require('lodash.forEach');

 /**
  * Fetches device hostname from fileContent
  * using a regular expression.
  * @param  {String} fileContent The show file contents
  * @return {String}             The device hostname
  */
 function fetchHostname(fileContent) {
   // assumes the hostname is the name of the device
   // before the #show version command, ie.
   // {{hostname}}# sh ver
   // we only need one occurrence of it
   const hostnameRegex = /(\S+)#sh[ow\s]+ver.*/;
   // the hostname is the second item in
   // the array returned by .exec
   const hostname = hostnameRegex.exec(fileContent)[1];
   return hostname;
 }

 /**
  * Fetches all device serial numbers from fileContent
  * using a regular expression.
  * @param  {String} fileContent The show file contents
  * @return {Array}              Device serial numbers
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
  * Fetches all model numbers, software versions and
  * software images from fileContent using a regular expression
  * @param  {String} fileContent Show file contents
  * @return {Array}              Array of one or more arrays,
  *                              containing model, software
  *                              version, software image
  */
 function fetchModelAndSoftware(fileContent) {
   // matches: WS-C2960C-8PC-L    15.0(2)SE5            C2960c405-UNIVERSALK9-M
   const modelSoftwareRegex =
     /([\w-]+)\s+(\d{2}\.[\w\.)?(?]+)\s+(\w+[-|_][\w-]+\-[\w]+)/g;
   // array to hold all occurences of modelSoftwareRegex,
   // itself split into an array accordingly
   const allModelSoftwareArray = [];
   // define match variable
   let modelSoftwareMatch;
   // find all occurences of modelSoftwareRegex
   while ((modelSoftwareMatch = modelSoftwareRegex.exec(fileContent))) {
     // array to hold results
     const eachModelSoftwareArray = Immutable.List([
       // modelSoftwareMatch is an array, with the first item is the match,
       // and the next three items are the groups within the match
       modelSoftwareMatch[1], // model
       modelSoftwareMatch[2], // software version
       modelSoftwareMatch[3] // software image
     ]);
     allModelSoftwareArray.push(eachModelSoftwareArray);
   }
   return allModelSoftwareArray;
 }

 /**
  * Parses `fin` for device attributes
  * @param  {String} fin      The filename
  * @param  {String} dir      The directory path
  * @return {List<Map<K, V>>} Array of one or more maps
  *                           of device attributes
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
   // fetchModelAndSoftware can return repeated results after intended results,
   // whereas we know fetch SerialNumbers returns the right number of results,
   // so mapping over a range, constrained by the length of SerialNumbers,
   // we loop through the results of the fetch* functions building up
   // a list of maps
   const devices = map(range(serialNumbers.length), (i) => {
     if (i === 0) {
       return buildDeviceMap(hostname, serialNumbers[i],
         modelAndSoftware[i].get(0), modelAndSoftware[i].get(1),
         modelAndSoftware[i].get(2));
     }
     return buildDeviceMap('', serialNumbers[i],
       modelAndSoftware[i].get(0), modelAndSoftware[i].get(1),
       modelAndSoftware[i].get(2));
   });
   return devices;
 }

 /**
  * Returns an Immutable Map of device attributes
  * @param  {String} hostname  The hostname
  * @param  {String} serial    The serial number
  * @param  {String} model     The model
  * @param  {String} swVersion The software version
  * @param  {String} swImage   The software image
  * @return {Map<K,V>}         Immutable Map of device attributes
  */
 function buildDeviceMap(hostname, serial, model, swVersion, swImage) {
   return new Immutable.Map({
     hostname, serial, model, swVersion, swImage
   });
 }

 /**
  * Builds data from show files directory into
  * content for csv file
  * @param  {String} dir The path to show files directory
  * @return {Map<K, V>}  An Immutable Map containing: content
  *                      for csv file as a single string,
  *                      number of files & number of devices
  */
 function buildContent(dir) {
   // we need to convert dir from an object to a string
   const dirString = String(dir);
   // define the csv headings as the first line of our csv content
   let output =
     'Hostname,Serial Number,Model,Software Version,Software Image\n';
   // get array of filenames in directory
   const files = fs.readdirSync(dirString);
   let noOfDevices = 0;
   // map over the files
   forEach(files, (file) => {
     // update the global count of the number of files processed
     // get array of devices from parsed file
     const devices = parseFile(file, dirString);
     noOfDevices += devices.length;
     // mapping over the devices, adding each to output string
     forEach(devices, (device) => {
       // update the global count of the number of devices processed
       output += `${device.join()}\n`;
     });
   });
   const content = new Immutable.Map({
     content: output,
     files: files.length,
     devices: noOfDevices
   });
   return content;
 }

 /**
  * Writes content to csv file
  * @param  {String} content          The csv ready content
  * @param  {String} outputDir        The directory the csv file is
  *                                   to be created in
  * @param  {String} filename         The csv filename
  * @return {String} fullPathFilename The full path and filename
  *                                   of written csv file
  */
 function writeDataToCSV(content, outputDir, filename) {
   // if no outputDir specified use the current directory
   // const outputPath = outputDir;
   // create the full file path
   const fullPathFilename = path.resolve(outputDir, `${filename}.csv`);
   // write to file
   fs.writeFileSync(fullPathFilename, content);
   return fullPathFilename;
 }

 module.exports.buildContent = buildContent;
 module.exports.writeDataToCSV = writeDataToCSV;
