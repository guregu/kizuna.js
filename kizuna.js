var Stores = {};

function getStore(id) {
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
    this.callbacks.push(callback);
  }

  this.off = function(callback) {
    var idx = this.callbacks.indexOf(callback);
    if (idx == -1) {
      return;
    }
    this.callbacks.splice(idx, 1);
  }
}

var Mixin = {
  componentWillMount: function() {
    this.setupWatches();
    if (!this.state) { 
      return;
    }

    // reflect values given in getInitialState()
    this.watches.forEach(function (watch) {
      if (watch.store.get() !== this.state[watch.ref]) {
        watch.store.set(this.state[watch.ref]);
      }
    }.bind(this));
  },
  componentWillReceiveProps: function(nextProps) {
    this.setupWatches();
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
    this.watches.forEach(function (watch) {
      if (this.state[watch.ref] !== nextState[watch.ref] &&
          watch.store.get() !== nextState[watch.ref]) {
        watch.store.set(nextState[watch.ref], {src: "componentWillUpdate"});
      }
    }, this);
  },
  componentWillUnmount: function() {
    this.removeWatches();
  },
  setupWatches: function() {
    this.removeWatches(); 

    this.watches = [];
    var state    = {};
    var watches  = parseBindExpr(this.props.binding);
    watches.forEach(function (watch) {
      watch.store = getStore(watch.id);
      state[watch.ref] = watch.store.get();
      watch.callback = this.receiveUpdate.bind(this, watch.ref);
      this.watches.push(watch); 
      watch.store.on(watch.callback);
    }, this);
    this.setState(state);
  },
  removeWatches: function() {
    var watches = this.watches;
    if (!watches) {
      return;
    }
    watches.forEach(function (watch) {
      var store = getStore(watch.id);
      store.off(watch.callback);
    });
  }
} 

function parseBindExpr(bindExpr) {
  if (!bindExpr) {
    return [];
  }

  if (Object.prototype.toString.call(bindExpr) != "[object Array]") {
    return parseBindObject(bindExpr);
  }

  var watches = [];
  bindExpr.forEach(function (watch) {
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

function parseBindObject(bindExpr) {
  var watches = [];
  Object.keys(bindExpr).forEach(function (ref) {
    var id = bindExpr[ref];
    watches.push({id: id, ref: ref});
  });
  return watches;
}

module.exports = {
  Store: Store,
  Mixin: Mixin,

  getStore: getStore
}