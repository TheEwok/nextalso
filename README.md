# nextalso

### Flow control using event emitters.
NextAlso is an asynchronus flow control library for Node.js that uses event
emitters to signal when a particular group of functions have all completed.

Currently NextAlso handles series and parallel execution of asynchronous
functions. It also offers introspection into the current execution state by
emitting events as each step is completed.

NextAlso uses method chaining to build expressive and explicit code that is
easy to understand.

### Examples
##### Execute functions in series

```javascript
var fs = require("fs");
var NextAlso = require("nextalso");
var flow_control = new NextAlso();

flow_control.next(fs.readFile,['./test_file.txt'])
    .next(fs.readFile,['./test_file_2.txt'])
    .next(fs.readFile,['./test_file_3.txt'])
    .on("series_step",function(curr_results) {
        console.log("Series Step Fired -");
        console.log(curr_results);
    })
    .on("series_success",function(results) {
        console.log("Series completed successfully");
        console.log(resulte);
    });
```

# ToDo

* Add logging lib
* Run both types grouped as chained
* Add debug events
* Waterfall results array through series
* Documentation
* Bind apply
* Warn if last param provided is fn
