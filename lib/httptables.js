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

  function isPolicySupported(policy) {
    function compareToProviedPolicies(policyToCompare) {
      return HTTPTables.policies[policyToCompare] === policy;
    }
    return !!(Object.keys(HTTPTables.policies).some(compareToProviedPolicies));
  }

  function httpTables(options) {
    options = options || {};
    this._rules = options.rules || null;
    this.defaultPolicy = (isPolicySupported(options.defaultPolicy)) ?
      options.defaultPolicy : HTTPTables.policies.ACCEPT;
    debug('Defaul policy set to ' + this.defaultPolicy);
    this.accessField = function (req, field) {
      return (req.headers) ? req.headers[field] : undefined;
    };
  }

  /*
  **** H E L P E R S ****
  */
  httpTables.prototype.isPolicySupported = isPolicySupported;

  httpTables.prototype.setAccessFieldFunction = function setAccessFieldFunction (accessFieldFunction) {
    if(!(accessFieldFunction instanceof Function)) {
      throw new Error('accessor is not a function');
    }
    debug('Setting custom field access function');
    this.accessField = accessFieldFunction;
    return;
  };

  httpTables.prototype.check = function check(compareTo, value) {
    var _this = this;
    if(value === null || value === undefined) {
      debug('Provided header value is null or undefined');
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
  httpTables.prototype.isMatching = function isMatching(req, rule) {
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
  httpTables.prototype.applyRules = function applyRules(req, rules) {
    if(!(rules instanceof Array)) {
      throw new Error('Rules must be passed as an array');
    }
    if(req === null || req === undefined) {
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
        return (this.isPolicySupported(rules[i].policy)) ?
          rules[i].policy : this.defaultPolicy;
      }
      debug('Rule ' + ((rules[i].name) ? rules[i].name : i) + ' is NOT Matching');
    }
    return this.defaultPolicy;
  };

  // Run tests against local rules
  httpTables.prototype.test = function testRules(req) {
    return this.applyRules.call(this, req, this._rules);
  };

  // Configurable Express middleware;
  /*
  httpTables.prototype.toExpressMiddleware = function toExpressMiddleware(options) {
    options = options || {};
    var _this = this;
    var prop = options.rulesPropertyName || '_rules';
    var errorConstructor = options.errorConstructor || Error;
    _this.setAccessFieldFunction = function (req, field) {
      var _field = (field || "").toUpperCase();
      if(field === 'URL') {
        return req.url;
      } else if(field === 'METHOD') {
        return req.method;
      } else {
        return req.get(field);
      }
    };
    debug('Express httpTables initialized');
    return function (req, res, next) {
      var policy = _this.applyRules(req, req[prop] || []);
      debug('Policy is : ' + policy);
      if(policy === _HTTPTables.policies.DROP) {
        debug('YOU SHALL NOT PASS !!!');
        return next(new (errorConstructor)('Droping request on url : ' + req.url));
      } else {
        debug('Ok you shall pass');
        return next();
      }
    };
  };
  */

  return new httpTables(options);
}

HTTPTables.policies = {
  'DROP' : 0,
  'ACCEPT' : 1,
};

module.exports = HTTPTables;