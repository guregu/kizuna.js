var Stores = {};

function GetStore(id) {
  var store = Stores[id];
  if (!store) {
    store = new Store(id);
    Stores[id] = store;
  }
  return store;
}

function Store(id) {
  this.id        = id;
  this.data      = undefined;
  this.callbacks = [];

  this.get = function() {
    return this.data;
  }

  this.set = function(data, metadata) {
    this.data = data;
    this.notify(data, metadata);
  }

  this.notify = function(data, metadata) {
    this.callbacks.forEach(function (callback) {
      callback(data, metadata);
    });
  }

  this.on = function(callback) {
    console.log(this.id, "on", callback);
    this.callbacks.push(callback);
  }

  this.off = function(callback) {
    console.log(this.id, "off", callback);
    var idx = this.callbacks.indexOf(callback);
    if (idx == -1) {
      return;
    }
    this.callbacks.splice(idx, 1);
  }
}

var Mixin = {
  componentWillMount: function() {
    var watches = parseBindExpr(this.props.binding);
    this.setupWatches(watches);
    if (!this.state) { 
      return;
    }
    this.watches.forEach(function (watch) {
      if (watch.store.get() !== this.state[watch.ref]) {
        watch.store.set(this.state[watch.ref]);
      }
    }.bind(this));
  },
  componentWillReceiveProps: function(nextProps) {
    var watches = parseBindExpr(nextProps.watch);
    this.setupWatches(watches);
  },
  setupWatches: function(watches) {
    this.removeWatches(); 

    this.watches = [];
    var state    = {};
    var watches  = parseBindExpr(this.props.binding);
    watches.forEach(function (watch) {
      watch.store = GetStore(watch.id);
      state[watch.ref] = watch.store.get();
      watch.callback = this.receiveUpdate.bind(this, watch.ref);
      this.watches.push(watch); 
      watch.store.on(watch.callback);
    }.bind(this));
    this.setState(state);
  },
  receiveUpdate: function(ref, data, metadata) {
    var state = {};
    state[ref] = data;
    var callback = null;
    if (this.props.onKizuna) {
      callback = function() {
        this.props.onKizuna(ref, data, metadata)
      }.bind(this);
    }
    this.setState(state, callback);
  },
  componentWillUpdate: function(nextProps, nextState) {
    var watches = this.watches;
    watches.forEach(function (watch) {
      if (this.state[watch.ref] !== nextState[watch.ref] &&
          watch.store.get() !== nextState[watch.ref]) {
        watch.store.set(nextState[watch.ref], {src: "componentWillUpdate"});
      }
    }.bind(this));
  },
  componentWillUnmount: function() {
    this.removeWatches();
  },
  removeWatches: function() {
    var watches = this.watches;
    if (!watches) {
      return;
    }
    watches.forEach(function (watch) {
      var store = GetStore(watch.id);
      store.off(watch.callback);
    });
  }
} 

function parseBindExpr(watchExpr) {
  if (!watchExpr) {
    return [];
  }

  if (Object.prototype.toString.call(watchExpr) != "[object Array]") {
    return parseBindObject(watchExpr);
  }

  var watches = [];
  watchExpr.forEach(function (watch) {
    var id, ref;
    if (typeof watch == "string") {
      id  = watch;
      ref = watch;
    } else if (Object.prototype.toString.call(watch) == "[object Array]") {
      id  = watch[1];
      ref = watch[0];
    } else {
      throw "Kizuna: invalid watch expression";
    }
    watches.push({id: id, ref: ref});
  });
  return watches;
}

function parseBindObject(watchExpr) {
  var watches = [];
  Object.keys(watchExpr).forEach(function (ref) {
    var id = watchExpr[ref];
    watches.push({id: id, ref: ref});
  });
  return watches;
}

module.exports = {
  Store: Store,
  Mixin: Mixin,

  getStore: GetStore
}