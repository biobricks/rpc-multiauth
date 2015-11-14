#!/usr/bin/env nodejs 

var http = require('http');
var path = require('path');

// server static files
var ecstatic = require('ecstatic')({
    root: path.join(__dirname)
});

var auth = require('../../index.js');

var settings = {
  port: 3000,
  host: 'localhost',
  secret: 'my_unique_secret_string' // the token secret
}

var myAuth = auth({
  secret: settings.secret,
  allowHeaderToken: false, // don't allow auth via custom header (for LocalStorage)
  cookie: {
      httpOnly: true // use httpOnly cookies (client has no access to cookies)
  }
});

function checkLogin(req, callback) {
    var body = '';

    req.on('data', function(data) {
        body += data;
    });

    req.on('end', function() {
        if(!body) {
            return callback("No login data supplied");
        }
        var o = JSON.parse(body);
        if(!o || o.username != 'cookie' || o.password != 'cat') {
            return callback("Invalid username or password");
        }
        callback(null, {
            id: '1234',
            name: 'cookiecat',
            desc: 'A treat for your tummy!'
        })
    });
}

var server = http.createServer(function(req, res) {

    if(req.url == '/login') {
        console.log("Attempting to log in");

        res.setHeader("Content-Type", "text/plain");

        checkLogin(req, function(err, userData) {
            if(err) {
                res.statusCode = 400;
                res.end("Login error: " + err);
                return;
            }

            // IMPORTANT: You must send res as first argument
            // otherwise server side setting of cookies won't work.
            // If you don't need server side setting of cookies then
            // you can just skip res.
            myAuth.login(res, userData.id, userData, function(err, token) {
                if(err) {
                    console.log("multiauth login failed: " + err);
                    res.statusCode = 400;
                    res.end("Login error: " + err);
                    return;
                }
                console.log("User logged in!");
                res.end(token);
            });
        })
    } else if(req.url == '/' || req.url == '/bundle.js') {
        return ecstatic(req, res);

    } else if(req.url == '/public') {
        res.setHeader("Content-Type", "text/plain");
        res.end("You got some public content");
    } else {
        res.setHeader("Content-Type", "text/plain");

        myAuth(req, function(err, tokenData) {
            if(err) {
                res.statusCode = 401;
                res.end("Unauthorized: " + err);
                return;
            }
            res.end("Yay you are authorized!");
        });
    }
});

server.listen(settings.port, settings.host);

console.log("Server listening on: http://"+settings.host+":"+settings.port+"/");
