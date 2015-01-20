var assert = require('assert');
var HTTPTables = require('../lib/httptables');
var httptables = null;

describe('HTTPTables', function () {

  beforeEach(function () {
    httptables = null;
  });

  afterEach(function () {
    httptables = null;
  });

  it('should be a function', function () {
    assert(HTTPTables instanceof Function);
  });

  it('should return an object', function () {
    httptables = HTTPTables();
    assert(httptables instanceof Object);
    assert.equal(typeof httptables, 'object');
  });

  it('ACCEPT should be the default policy', function () {
    httptables = HTTPTables();
    assert(httptables.defaultPolicy === httptables.policies.ACCEPT);
  });

  it('should fallback to default policy if the one provided does not exist', function () {
    httptables = HTTPTables({defaultPolicy : 'WAZA'});
    assert(httptables.defaultPolicy === httptables.policies.ACCEPT);
  });

  it('should allow to change default policy', function () {
    httptables = HTTPTables({defaultPolicy : 'DROP'});
    assert(httptables.defaultPolicy === httptables.policies.DROP);
  });

  it('should allow to change the field accessor method only if it is a function', function () {
    function dummy (req, field) {
      return req[field];
    }
    httptables = HTTPTables();
    httptables.setAccessFieldFunction(dummy);
    assert(httptables.accessField === dummy);
    assert.throws(function () {
      httptables.setAccessFieldFunction('Blop');
    });
  });

  it('should fail if rules are not an array', function () {
    httptables = HTTPTables();
    assert.throws(function () {
      httptables.applyRules({}, {});
    });
  });

  it('should fail if no container passed', function () {
    httptables = HTTPTables();
    assert.throws(function () {
      httptables.applyRules("", {});
    });
    assert.throws(function () {
      httptables.applyRules(null, {});
    });
  });

  it('should return default policy if rules are empty', function () {
    httptables = HTTPTables();
    var policy = httptables.applyRules({}, []);
    assert(policy === httptables.defaultPolicy);
  });

  it('should return the correct matching policy', function () {
    var rules = [{
      policy : 'DROP',
      conditions : {
        'url' : /test/,
        'method' : ['POST', 'GET'],
        'accept-encoding' : function (value) {
          return ['application/json', 'text/html'];
        },
        'x-sf-version' : '1.0',
        'x-sf-tpl' : {
          instruction : function (a1, a2) {
            return [a1, a2];
          },
          args : [ /test1/ , 'tpl']
        }
      }
    }];
    var req = {
      headers : {
        'url' : "/test",
        'method' : 'POST',
        'accept-encoding' : 'application/json',
        'x-sf-version' : '1.0',
        'x-sf-tpl' : 'test11'
      }
    };
    httptables = HTTPTables();
    var policy = httptables.applyRules(req, rules);
    assert(policy === httptables.policies[rules[0].policy]);
  });

  it('should return the correct matching policy in the right order', function () {
    var rules = [{
      policy : 'ACCEPT',
      conditions : {
        'url' : /blop/,
        'method' : ['POST', 'GET'],
        'accept-encoding' : function (value) {
          return ['application/json', 'text/html'];
        },
        'x-sf-version' : '1.0',
        'x-sf-tpl' : {
          instruction : function (a1, a2) {
            return [a1, a2];
          },
          args : [ /test1/ , 'tpl']
        }
      },
    },
    {
      policy : 'DROP',
      conditions : {
        'url' : /test/,
        'method' : ['POST', 'GET'],
        'accept-encoding' : function (value) {
          return ['application/json', 'text/html'];
        },
        'x-sf-version' : '1.0',
        'x-sf-tpl' : {
          instruction : function (a1, a2) {
            return [a1, a2];
          },
          args : [ /test1/ , 'tpl']
        }
      }
    }];
    var req = {
      headers : {
        'url' : "/test",
        'method' : 'POST',
        'accept-encoding' : 'application/json',
        'x-sf-version' : '1.0',
        'x-sf-tpl' : 'test11'
      }
    };
    httptables = HTTPTables();
    var policy = httptables.applyRules(req, rules);
    assert(policy === httptables.policies[rules[0].policy]);
  });

});