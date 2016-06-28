 const clerk = require('./app/lib/clerk');

 const dir = 'C:\\Users\\robertph\\code\\js\\clerk\\ref\\test_data'

 const res = clerk.buildContent(dir)

 console.log(`RESULT:\n${res}`);
