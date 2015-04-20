var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic("dist/")).listen(process.env.PORT || 3000);
