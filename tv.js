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
  this.data      = null;
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
    var watches = parseWatchExpr(this.props.watch);
    this.setupWatches(watches);
  },
  componentWillReceiveProps: function(nextProps) {
    var watches = parseWatchExpr(nextProps);
    this.setupWatches(watches);
  },
  setupWatches: function(watches) {
    // TODO: instead of removing everything, only remove what we need to
    if (this.watches && this.watches.length > 0) {
      this.componentWillUnmount(); // TODO: split this?
    }

    this.watches = [];
    var state    = {};
    var watches  = parseWatchExpr(this.props.watch);
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
    if (this.props.onTV) {
      callback = function() {
        this.props.onTV(ref, data, metadata)
      }.bind(this);
    }
    this.setState(state, callback);
  },
  componentWillUnmount: function() {
    var watches = this.watches;
    watches.forEach(function (watch) {
      var store = GetStore(watch.id);
      store.off(watch.callback);
    });
  },
  componentWillUpdate: function(nextProps, nextState) {
    var watches = this.watches;
    watches.forEach(function (watch) {
      if (typeof this.state[watch.ref] !== "undefined" &&
         this.state[watch.ref] !== nextState[watch.ref] &&
         watch.store.get() !== nextState[watch.ref]) {
        watch.store.set(nextState[watch.ref], {src: "componentWillUpdate"});
      }
    }.bind(this));
  }
} 

function parseWatchExpr(watchExpr) {
  if (!watchExpr) {
    return {};
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
      throw "TV: invalid watch expression";
    }
    watches.push({id: id, ref: ref});
  });
  return watches;
}

module.exports = {
  Store: Store,
  Mixin: Mixin,
  get:   GetStore
}