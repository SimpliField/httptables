# HTTPTables

##### Important Note

Do not use yet in production
This module won't probably be heavily maintained.
Fork at will or claim ownership ! Okay now you can keep reading :)

##### Module Status

[![NPM version](https://badge.fury.io/js/httptables.png)](https://npmjs.org/package/httptables) [![Build status](https://secure.travis-ci.org/SimpliField/httptables.png)](https://travis-ci.org/SimpliField/httptables) [![Dependency Status](https://david-dm.org/SimpliField/httptables.png)](https://david-dm.org/SimpliField/httptables) [![devDependency Status](https://david-dm.org/SimpliField/httptables/dev-status.png)](https://david-dm.org/SimpliField/httptables#info=devDependencies) [![Coverage Status](https://coveralls.io/repos/SimpliField/httptables/badge.svg)](https://coveralls.io/r/SimpliField/httptables) [![Code Climate](https://codeclimate.com/github/SimpliField/httptables.png)](https://codeclimate.com/github/SimpliField/httptables)

##### Description

Kind of a firewall for http requests based on headers.
It parses a set of rules for each HTTP header and apply the matching policy

##### Usage

**NB:** This module makes the assumption your request object looks like this

```javascript
req = {
  headers : {
    'method' : 'PUT',
    'url' : '/kung/foo/panda/',
    'any-other-header' : 'of_any_value'
  }
}
```

If it does not, use the setAccessFieldFunction (look around the end of this readme to see an example)

**Example 1**: a rule could be represented as such

```javascript
rule = {
  policy : HTTPTables.policies.DROP,
  conditions : {
    'method' : ['POST', 'GET'],
    'user-agent' : /Android/,
    'url' : "/api/v2/users/1"
  }
}
```

In this case it will drop **every POST or GET** requests from android
on /api/v2/users/1 url

```javascript
var HTTPTables = require('httptables');
var httptables = HTTPTables({
  defaultPolicy : HTTPTables.policies.DROP // Drop all not matching requests
})
```

**Example 2:** In Express

```javascript
var HTTPTables = require('httptables');
var httptables = HTTPTables({
  defaultPolicy : HTTPTables.policies.DROP // Drop all not matching requests
})
// Override the way to access a header field for an express request object
httptables.setAccessFieldFunction = function (req, field) {
  var _field = (field || "").toUpperCase();
  if(field === 'URL') {
    return req.url;
  } else if(field === 'METHOD') {
    return req.method;
  } else {
    return req.get(field);
  }
}
//...
//...
//...
app.use(function (req, res, next) {
  req.mySetOfRules = [
    {
      policy : HTTPTables.policies.ACCEPT,
      conditions : {
        'method' : ['POST', 'GET'],
        'user-agent' : /Android/,
        'url' : "/api/v2/users/1"
      }
    },
    {
      policy : HTTPTables.policies.ACCEPT,
      conditions : {
        'method' : ['POST', 'GET', 'PUT', 'DELETE'],
        'url' : "/api/v2/organizations/1/billing"
      }
    }
  ];
  next();
})

// Comming Soon, see commented code in source to implement yourself
// only if you want/need
app.use(httptables.toExpressMiddleware({rulesPropertyName : 'mySetOfRules'}))

```