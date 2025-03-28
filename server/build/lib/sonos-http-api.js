'use strict';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var requireDir = require('./helpers/require-dir');
var path = require('path');
var request = require('sonos-discovery/lib/helpers/request');
var logger = require('sonos-discovery/lib/helpers/logger');
var HttpEventServer = require('./helpers/http-event-server');
function HttpAPI(discovery, settings) {
  var _this = this;
  var port = settings.port;
  var webroot = settings.webroot;
  var actions = {};
  var events = new HttpEventServer();
  this.getWebRoot = function () {
    return webroot;
  };
  this.getPort = function () {
    return port;
  };
  this.discovery = discovery;
  discovery.on('transport-state', function (player) {
    invokeWebhook('transport-state', player);
  });
  discovery.on('topology-change', function (topology) {
    invokeWebhook('topology-change', topology);
  });
  discovery.on('volume-change', function (volumeChange) {
    invokeWebhook('volume-change', volumeChange);
  });
  discovery.on('mute-change', function (muteChange) {
    invokeWebhook('mute-change', muteChange);
  });

  // this handles registering of all actions
  this.registerAction = function (action, handler) {
    actions[action] = handler;
  };

  //load modularized actions
  requireDir(path.join(__dirname, './actions'), function (registerAction) {
    registerAction(_this);
  });
  this.requestHandler = function (req, res) {
    if (req.url === '/favicon.ico') {
      res.end();
      return;
    }
    if (req.url === '/events') {
      events.addClient(res);
      return;
    }
    if (discovery.zones.length === 0) {
      var msg = "No system has yet been discovered. Please see https://github.com/jishi/node-sonos-http-api/issues/77 if it doesn't resolve itself in a few seconds.";
      logger.error(msg);
      sendResponse(500, {
        status: 'error',
        error: msg
      });
      return;
    }
    var params = req.url.substring(1).split('/');

    // parse decode player name considering decode errors
    var player;
    try {
      player = discovery.getPlayer(decodeURIComponent(params[0]));
    } catch (error) {
      logger.error("Unable to parse supplied URI component (".concat(params[0], ")"), error);
      return sendResponse(500, {
        status: 'error',
        error: error.message,
        stack: error.stack
      });
    }
    var opt = {};
    if (player) {
      opt.action = (params[1] || '').toLowerCase();
      opt.values = params.splice(2);
    } else {
      player = discovery.getAnyPlayer();
      opt.action = (params[0] || '').toLowerCase();
      opt.values = params.splice(1);
    }
    function sendResponse(code, body) {
      var jsonResponse = JSON.stringify(body);
      res.statusCode = code;
      res.setHeader('Content-Length', Buffer.byteLength(jsonResponse));
      res.setHeader('Content-Type', 'application/json;charset=utf-8');
      res.write(new Buffer(jsonResponse));
      res.end();
    }
    opt.player = player;
    Promise.resolve(handleAction(opt)).then(function (response) {
      if (!response || response.constructor.name === 'IncomingMessage') {
        response = {
          status: 'success'
        };
      } else if (Array.isArray(response) && response.length > 0 && response[0].constructor.name === 'IncomingMessage') {
        response = {
          status: 'success'
        };
      }
      console.log(opt);
      sendResponse(200, response);
    })["catch"](function (error) {
      logger.error(error);
      sendResponse(500, {
        status: 'error',
        error: error.message,
        stack: error.stack
      });
    });
  };
  function handleAction(options) {
    var player = options.player;
    if (!actions[options.action]) {
      return Promise.reject({
        error: "action '" + options.action + "' not found"
      });
    }
    return actions[options.action](player, options.values);
  }
  function invokeWebhook(type, data) {
    var typeName = 'type';
    var dataName = 'data';
    if (settings.webhookType) {
      typeName = settings.webhookType;
    }
    if (settings.webhookData) {
      dataName = settings.webhookData;
    }
    var jsonBody = JSON.stringify(_defineProperty(_defineProperty({}, typeName, type), dataName, data));
    events.sendEvent(jsonBody);
    if (!settings.webhook) return;
    var body = new Buffer(jsonBody, 'utf8');
    var headers = {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    };
    if (settings.webhookHeaderName && settings.webhookHeaderContents) {
      headers[settings.webhookHeaderName] = settings.webhookHeaderContents;
    }
    request({
      method: 'POST',
      uri: settings.webhook,
      headers: headers,
      body: body
    })["catch"](function (err) {
      logger.error('Could not reach webhook endpoint', settings.webhook, 'for some reason. Verify that the receiving end is up and running.');
      logger.error(err);
    });
  }
}
module.exports = HttpAPI;