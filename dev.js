'use strict';

const clerk = require('./app/lib/clerk');
const fs = require('fs');

const dir = 'C:\\Users\\robertph\\code\\js\\clerk\\ref\\test_data\\';

function fetchHostname(fileContent) {
  const hnre1 = /hostname\s(.*)/i;
  const hnre2 = /(\S+)#sho?w?\s+ver.*/i;
  const hn1 = hnre1.exec(fileContent);
  const hn2 = hnre2.exec(fileContent);
  if (hn1 != null) {
    return hn1[1];
  } else if (hn2 != null) {
    return hn2[1];
  } else {
    return 'No Hostname Found'
  }
}


const fileContent = fs.readFileSync('C:\\Users\\robertph\\code\\js\\clerk\\ref\\test_data\\sister_rosetta_tharpe.txt',
  'utf8');


// const hostnameRegex = /(\S+)#sho?w?\s+ver.*/i;
// console.log(hostnameRegex.exec(content));
// const res = clerk.buildContent(dir);
const res = fetchHostname(fileContent)
console.log(`RESULT:\n${res}`);
