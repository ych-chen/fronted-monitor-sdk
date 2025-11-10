class XMLHttpRequest {
  constructor() {
    this.readyState = 0;
    this.status = 200;
    this.statusText = 'OK';
    this.response = '{}';
    this.responseText = '{}';
    this.responseType = '';
    this.onreadystatechange = null;
  }

  open(method, url) {
    this._method = method;
    this._url = url;
    this.readyState = 1;
    this.onreadystatechange?.();
  }

  send(data) {
    this._data = data;
    this.readyState = 4;
    setTimeout(() => {
      this.onreadystatechange?.();
    }, 10);
  }

  setRequestHeader(name, value) {
    this._headers = this._headers || {};
    this._headers[name] = value;
  }

  addEventListener(event, handler) {
    this._listeners = this._listeners || {};
    this._listeners[event] = handler;
  }

  removeEventListener(event, handler) {
    if (this._listeners?.[event] === handler) {
      delete this._listeners[event];
    }
  }
}

module.exports = { XMLHttpRequest };