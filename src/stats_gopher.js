function StatsGopher (options) {
  options = options || {}

  if (typeof options.ajax !== 'function') {
    throw new Error("no 'ajax' function specified in options")
  }

  if (typeof options.Deferred !== 'function') {
    throw new Error("no 'Deferred' constructor specified in options")
  }

  if (typeof options.endpoint !== 'string') {
    throw new Error("no 'endpoint' option specified")
  }

  this.options = options
  this.buffer = []
  this.sid = StatsGopher.sid();
}

StatsGopher.prototype = {
  send: function (datum) {
    datum.sendTime = new Date().valueOf()
    datum.sid = this.sid
    datum.eventType = 'UserAction'
    this.startBuffer()
    this.buffer.push(datum)
    return this.deferred.promise()
  },
  startBuffer: function () {
    if ('timeout' in this) return
    this.timeout = setTimeout(this.onTimeout.bind(this), 100)
    this.deferred = new this.options.Deferred()
  },
  flush: function () {
    var buffer = this.buffer
    this.buffer = []
    return buffer
  },
  onTimeout: function () {
    var data = this.flush()
    var options = this.options
    var deferred = this.deferred

    delete this.deferred
    delete this.timeout

    return this.options.ajax({
      type: "POST",
      url: options.endpoint,
      data: JSON.stringify(data),
      // because CORS doesn't allow application/json
      dataType: 'text',
      cache: false
    }).done(function () {
      deferred.resolve()
    }.bind(this)).fail(function () {
      deferred.reject()
    }.bind(this));
  }
}

StatsGopher.generateSid = function () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

StatsGopher.sid = function () {
  if (this.docCookie.hasItem('sg-sid')) {
    return this.docCookie.getItem('sg-sid')
  }
  var sid = this.generateSid()
  this.docCookie.setItem('sg-sid', sid)
  return sid
}

// straight from https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
StatsGopher.docCookie = {
  getItem: function (sKey) {
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + ( sDomain ? "; domain=" + sDomain : "") + ( sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};
