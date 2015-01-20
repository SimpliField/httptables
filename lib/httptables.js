/**
*  Parse rules for each HTTP headers and apply matching policy
*
*  Example : a rule could be represented as such
*  rule = {
*    policy : policies.DROP,
*    conditions : {
*      'METHOD' : ['POST', 'GET'],
*      'HTTP-USER-AGENT' : /Android/,
*      'URL' : "/api/v2/users/1"
*    }
*  }
*
*  In this case it will drop EVERY POST OR GET requests from android
*  on /api/v2/users/1 url
*
*  USAGE :
*    var httptables = require('httptables')({defaultPolicy : 'DROP'});
*
*  IN Express
*    var httptables = require('httptables')({defaultPolicy : 'DROP'});
*    ...
*    app.use(function (req, res, next) {
*      req.mySetOfRules = [rule];
*      next();
*    })
*    app.use(httptables.toExpressMiddleware({rulesPropertyName : 'mySetOfRules'}))
*
**/
var debug = require('debug')('HTTPTables');

function HTTPTables(options) {
  options = options || {};
  this.policies = {
    'DROP' : 0,
    'ACCEPT' : 1,
  };
  this.defaultPolicy = (options.defaultPolicy && Object.keys(this.policies).indexOf(options.defaultPolicy) > -1) ?
    this.policies[options.defaultPolicy] : this.policies.ACCEPT;
  this.accessField = function (req, field) {
    var _field = (field || "").toUpperCase();
    return (req.headers) ? req.headers[_field] : undefined;
  };
}

/*
**** H E L P E R S ****
*/
HTTPTables.prototype.setAccessFieldFunction = function setAccessFieldFunction (accessFieldFunction) {
  if(!(accessFieldFunction instanceof Function)) {
    throw new Error('accessor is not a function');
  }
  debug('Setting custom field access function');
  this.accessField = accessFieldFunction;
  return;
};

HTTPTables.prototype.check = function check(compareTo, value) {
  var _this = this;
  if(value === null || value === undefined) {
    console.log('value is null');
    return false;
  }
  if((compareTo instanceof Array)) {
    debug('We have an array, let s check for each element if one is truthy');
    return compareTo.reduce(function (total, val) {
      return (total || _this.check(val, value));
    }, false);
  } else if((compareTo instanceof Function)) {
    debug('We have a function');
    return _this.check(compareTo.call(null, value), value);
  } else if((compareTo instanceof RegExp)) {
    debug('We have a regexp');
    return compareTo.test(value);
  } else if((compareTo instanceof Object) && (compareTo.instruction instanceof Function)) {
    debug('We have an instruction');
    return _this.check(compareTo.instruction.apply(null, compareTo.args || []), value);
  } else if('boolean' === typeof compareTo) {
    debug('We have a boolean');
    return compareTo;
  } else {
    debug('We have a pure value');
    return (compareTo === value);
  }
};

/*
**** C O R E ****
*/

// Check if a request matches every conditions
HTTPTables.prototype.isMatching = function isMatching(req, rule) {
  var _this = this;
  var fields = [];
  var i = 0, _len = 0;
  try {
    fields = Object.keys(rule.conditions);
    _len = fields.length;
  } catch (err) {
    throw new Error('Incorrect rule conditions format');
  }
  for (i = 0; i < _len; i++) {
    debug('Checking Field ' + fields[i]);
    if(!_this.check(rule.conditions[fields[i]], _this.accessField(req, fields[i]))) {
      debug('Field ' + fields[i] + ' is NOT matching');
      return false; // No MATCH :(
    }
    debug('Field ' + fields[i] + ' is matching');
  }
  return true; // MATCH \o/
};

// Scans each rules and apply corresponding policy if matching
HTTPTables.prototype.applyRules = function applyRules(req, rules) {
  if(!(rules instanceof Array)) {
    throw new Error('Rules must be passed as an array');
  }
  if(!req) {
    throw new Error('Req must not be falsy');
  }
  var i = 0, _len = rules.length;
  for(i = 0 ; i < _len ; i++) {
    if('object' !== typeof rules[i] || (rules[i] instanceof Array)) {
      throw new Error('Incorrect rule format');
    }
    debug('Analysing rule ' + i + ' ' + (rules[i].name || ""));
    if(this.isMatching(req, rules[i])) {
      debug('Rule ' + ((rules[i].name) ? rules[i].name : i) + ' is Matching');
      return (this.policies[rules[i].policy] !== undefined) ?
        this.policies[rules[i].policy] : this.defaultPolicy;
    }
    debug('Rule ' + ((rules[i].name) ? rules[i].name : i) + ' is NOT Matching');
  }
  return this.defaultPolicy;
};

// Configurable Express middleware;

/*
HTTPTables.prototype.toExpressMiddleware = function toExpressMiddleware(options) {
  options = options || {};
  var _this = this;
  var prop = options.rulesPropertyName || '_rules';
  var errorConstructor = options.errorConstructor || Error;
  debug('Express HTTPTables initialized');
  return function (req, res, next) {
    var policy = _this.applyRules(req, req[prop] || []);
    debug('Policy is : ' + policy);
    if(policy === _this.policies.DROP) {
      debug('YOU SHALL NOT PASS !!!');
      return next(new (errorConstructor)('Droping request on url : ' + req.url));
    } else {
      debug('Ok you shall pass');
      return next();
    }
  };
};
*/

module.exports = function (options) { return new HTTPTables(options); };