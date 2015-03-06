## kizuna.js

kizuna.js is an experimental data binding thing for React. 
By including the kizuna mixin and specifying the `binding` prop, 
you can bind local state to a global store. It's a two-way binding. 

### Untested example code

```js
var React = require("react");
var KZ    = require("kizuna");

var ParentThing = React.createClass({
  mixins: [KZ.Mixin],
  getInitialState: function() {
    // here we initialize clickCounter
    // see: the React.render call at the bottom
    return {
      clicks: 0
    };
  },
  render: function() {
    // we bind the children state.clicks to the global "clickCounter" store
    return (
      <div>
        <ChildThing binding={clicks: "clickCounter"} />
        <SomeOtherThing binding={clicks: "clickCounter"} />
      </div>
    );
  }
})

var ChildThing = React.createClass({
  mixins: [KZ.Mixin],
  handleClick: function() {
    // setting the state here will be reflected in the parent and elsewhere too
    this.setState({clicks: this.state.clicks + 1});
  },
  render: function() {
    return <button onClick={this.handleClick}>{this.state.clicks}</button>
  }
 }

// we bind clicks in our root component to "clickCounter"
React.render(<ParentThing binding={clicks: "clickCounter"} />, document.getElementById('content'));
```