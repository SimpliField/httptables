var express = require('express');
var app = null;
var httptables = require('./lib/httptables')();
var params = {};

httptables.setAccessFieldFunction(function (req, field) {
  console.log('Custom access Function');
  return req[field];
});

app = express();
app.set('port', params.port || 3000);
app.use(function (req, res, next) {
  req._rules = [
    {
      policy : 'DROP',
      // conditions : {
      //   'url' : /test[0-9]?$/
      // }
    }
  ];
  next();
});
app.use(httptables.toExpressMiddleware({rulesPropertyName : '_rules'}));
app.get('/test', function(req, res, next) {
  res.send('OK');
});
app.use(function (err, req, res, next) {
  var msg = 'Default error message';
  if(err) {
    msg = err.message;
    console.error(err.message);
  }
  res.status(500).json({message : msg});
});
var server = app.listen(app.get('port'), function () {
  console.log(server.address().port);
});
