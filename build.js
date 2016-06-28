var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
  appDirectory: 'C:\\Users\\robertph\\code\\js\\clerk\\build\\clerk-win32-x64',
  outputDirectory: 'C:\\Users\\robertph\\code\\js\\clerk\\dist',
  authors: 'Rob Phoenix',
  exe: 'clerk.exe',
  setupExe: 'clerk_setup.exe',
});

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e}`));
