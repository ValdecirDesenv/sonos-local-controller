"use strict";

function HttpEventServer() {
  var clients = [];
  var removeClient = function removeClient(client) {
    return clients = clients.filter(function (value) {
      return value !== client;
    });
  };
  this.addClient = function (res) {
    return clients.push(new HttpEventSource(res, removeClient));
  };
  this.sendEvent = function (event) {
    return clients.forEach(function (client) {
      return client.sendEvent(event);
    });
  };
}
function HttpEventSource(res, done) {
  var _this = this;
  this.sendEvent = function (event) {
    return res.write('data: ' + event + '\n\n');
  };
  res.on('close', function () {
    return done(_this);
  });
  res.setHeader('Content-Type', 'text/event-stream');
}
module.exports = HttpEventServer;