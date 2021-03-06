/* Copyright 2017-present Samsung Electronics Co., Ltd. and other contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var assert = require('assert');
var http = require('http');
var net = require('net');

// Messages for further requests.
var message = 'Hello IoT.js';

// Options for further requests.
var options = {
  method: 'POST',
  port: 3005,
  path: '/',
  headers: { 'Content-Length': message.length }
};

var server1 = http.createServer(function(request, response) {
  var str = '';

  request.on('data', function(chunk) {
    str += chunk.toString();
  });

  request.on('end', function() {
    assert.equal(str, message);
    response.end();
  });
});
server1.listen(3005, 5);

// Simple request with valid utf-8 message.
var isRequest1Finished = false;
var request1 = http.request(options, function(response) {
  var str = '';

  response.on('data', function(chunk) {
    str += chunk.toString();
  });

  response.on('end', function() {
    isRequest1Finished = true;
    server1.close();
  });
});
request1.end(message, 'utf-8');


var server2 = http.createServer(function(request, response) {
  response.end();
});
server2.listen(3006, 5);

// Simple request with end callback.
var isRequest2Finished = false;
options.port = 3006;
var request2 = http.request(options);
request2.end(message, function() {
  server2.close();
  isRequest2Finished = true;
});

// Call the request2 end again to test the finish state.
request2.end(message, function() {
  // This clabback should never be called.
  assert.equal(isRequest2Finished, false);
});


var server3 = http.createServer(function(request, response) {
  var str = '';

  request.on('data', function(chunk) {
    str += chunk;
  });

  request.on('end', function() {
    // Check if we got the proper message.
    assert.equal(str, message);
    response.end();
  });
});
server3.listen(3007, 5);

// Simple request with buffer chunk as message parameter.
options.port = 3007;
var isRequest3Finished = false;
var request3 = http.request(options, function(response) {
  var str = '';

  response.on('data', function(chunk) {
    str += chunk;
  });

  response.on('end', function() {
    isRequest3Finished = true;
    server3.close();
  });
});
request3.end(new Buffer(message));


// This test is to make sure that when the HTTP server
// responds to a HEAD request, it does not send any body.
var server4 = http.createServer(function(request, response) {
  response.writeHead(200);
  response.end();
});
server4.listen(3008, 5);

var isRequest4Finished = false;
var request4 = http.request({
  method: 'HEAD',
  port: 3008,
  path: '/'
}, function(response) {
  response.on('end', function() {
    isRequest4Finished = true;
    assert.equal(response.statusCode, 200);
    server4.close();
  });
});
request4.end();


// Write a header twice in the server response.
var server5 = http.createServer(function(request, response) {
  var str = '';

  request.on('data', function(chunk) {
    str += chunk;
  });

  request.on('end', function() {
    response.writeHead(200, 'OK', { 'Connection': 'close1' });
    // Wrote the same head twice.
    response.writeHead(200, 'OK', { 'Connection': 'close2' });
    // Wrote a new head.
    response.writeHead(200, { 'Head': 'Value' });
    response.end();
  });
});
server5.listen(3009, 5);

options.port = 3009;
options.headers = null;
var isRequest5Finished = false;
var request5 = http.request(options, function(response) {
  response.on('end', function() {
    isRequest5Finished = true;
    assert.equal(response.headers.connection, 'close2');
    assert.equal(response.headers.head, 'Value');
    server5.close();
  });
});
request5.end();


// Test the IncomingMessage read function.
var server6 = http.createServer(function(request, response) {
  request.on('end', function() {
    response.end('ok');
    server6.close();
  });
}).listen(8080, 5);

var readRequest = http.request({
  host: '127.0.0.1',
  port: 8080,
  path: '/',
  method: 'GET'
});
readRequest.end();

readRequest.on('response', function(incomingMessage) {
  incomingMessage.on('readable', function() {
    var inc = incomingMessage.read();
    assert.equal(inc instanceof Buffer, true);
    assert.assert(inc.toString('utf8').length > 0);
  });
});


// Test the content length
var server7 = http.createServer(function(request, response) {
  request.on('end', function() {
    response.end('ok');
    server7.close();
  });
}).listen(3010);

var isRequest7Finished = false;
var readRequest = http.request({
  host: '127.0.0.1',
  port: 3010,
  path: '/',
  method: 'POST'
});
readRequest.end('foobar');
readRequest.on('response', function(incomingMessage) {
  assert.equal(incomingMessage.statusCode, 200);
  assert.equal(readRequest.getHeader('content-length'), 6);
  isRequest7Finished = true;
});


// Test the content length if set content-length
var server8 = http.createServer(function(request, response) {
  request.on('end', function() {
    response.end('ok');
    server8.close();
  });
}).listen(3011);

var isRequest8Finished = false;
var request8 = http.request({
  host: '127.0.0.1',
  port: 3011,
  path: '/',
  method: 'POST'
});
request8.setHeader('Content-Length', 10);
request8.end('foobar');
request8.on('response', function(incomingMessage) {
  assert.equal(incomingMessage.statusCode, 200);
  assert.equal(request8.getHeader('content-length'), 10);
  isRequest8Finished = true;
});


// Test the content-length not set if chunked
var server9 = http.createServer(function(request, response) {
  request.on('end', function() {
    response.end('ok');
    server9.close();
  });
}).listen(3012);

var isRequest9Finished = false;
var request9 = http.request({
  host: '127.0.0.1',
  port: 3012,
  path: '/',
  method: 'POST'
});
request9.setHeader('Transfer-Encoding', 'chunked');
request9.end('foobar');
request9.on('response', function(incomingMessage) {
  assert.equal(incomingMessage.statusCode, 200);
  assert.equal(request9.getHeader('content-length'), undefined);
  isRequest9Finished = true;
});


process.on('exit', function() {
  assert.equal(isRequest1Finished, true);
  assert.equal(isRequest2Finished, true);
  assert.equal(isRequest3Finished, true);
  assert.equal(isRequest4Finished, true);
  assert.equal(isRequest5Finished, true);
  assert.equal(isRequest7Finished, true);
  assert.equal(isRequest8Finished, true);
  assert.equal(isRequest9Finished, true);
});
