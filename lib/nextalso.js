//This file is part of NextAlso
//
//NextAlso is a flow control library from Node.js
//
//The MIT License (MIT)
//
//Copyright (c) 2015 Barry "Baz" O'Mahony
//
//Permission is hereby granted, free of charge, to any person obtaining a copy
//of this software and associated documentation files (the "Software"), to deal
//in the Software without restriction, including without limitation the rights
//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//copies of the Software, and to permit persons to whom the Software is
//furnished to do so, subject to the following conditions:
//
//The above copyright notice and this permission notice shall be included in
//all copies or substantial portions of the Software.
//
//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//THE SOFTWARE.

var events = require('events');
var fs = require('fs');
var util = require('util');

var NextAlso = function() {
    this.parallel_fns = [];
    this.series_fns = [];
    this.groupings = [];
    this.ignore_function_params = false;
    this.last_chain = null;

    events.EventEmitter.call(this);
};

util.inherits(NextAlso,events.EventEmitter);

NextAlso.prototype.start = function start() {
    var instance = this;
    var fns = {
            "series":instance.series,
            "parallel":instance.parallel
        };

    this.groupings.forEach(function(group) {
        //Extract type
        var type = Object.keys(group).shift();
        var function_stack = group[type];

		if(function_stack.length===0) {
			return;
		}

        fns[type].call(instance,function_stack);
    });
};

/** 
 ## Execute functions in parallel
 Iterates through registered parallel functions and emits messages

 ### Parameters
 * None

 ### Returns
 * Nothing
 
 ### Emits
 * parallel_error
 * parallel_step
 * step
 * parallel_success
 
 ### Throws
 * Nothing
*/
NextAlso.prototype.parallel = function parallel(function_stack) {
    var instance = this;
    var parallel_results = [];
    var parallel_count = function_stack.length;

    function parallel_callback(error,result) {
        if(error) {
            instance.emit("parallel_error",error,parallel_results);
            parallel_count = 0;
            instance.parallel_fns = [];
            return;
        }
        parallel_results.push(result);
        instance.emit("step");
        if(parallel_results.length===parallel_count) {
            return instance.emit("parallel_success",parallel_results);
        }
        //We only want to emit this if we haven't finished
        //Otherwise there will be duplicate results
        instance.emit("parallel_step",parallel_results);
    }

    //Do Calls
	function start_parallel(count) {
        var curr_fn = function_stack[count].fn;
        var curr_params = function_stack[count].params;
        curr_params.push(parallel_callback);
        curr_fn.apply(null,curr_params);
		if(count!==0) {
			start_parallel(count-1);
		}
    }

	start_parallel(function_stack.length-1);
};

/** 
 ## Execute functions in series 
 Iterates through registered series functions and emits messages

 ### Parameters
 * None

 ### Returns
 * Nothing
 
 ### Emits
 * series_error
 * series_step
 * step
 * series_success
 
 ### Throws
 * Nothing
*/
NextAlso.prototype.series = function series(function_stack) {
    var instance = this;
    var series_results = [];

    function series_callback(error,result) {
        if(error) {
            instance.emit("series_error",error,series_results);
            instance.series_fns = [];
            return;
        }
        series_results.push(result);
        instance.emit("step");
        if(function_stack.length===0) {
            return instance.emit("series_success",series_results);
        }
        //We only want to emit this if we haven't finished
        //Otherwise there will be duplicate results
        instance.emit("series_step",series_results);
        series_next(function_stack.shift());
    }

    function series_next(series_fn) {
        var curr_params = series_fn.params;
        curr_params.push(series_callback);
        series_fn.fn.apply(null,curr_params);
    }

    series_next(function_stack.shift());
};

/**
 ### Add parallel function to stack
 Pushes a function and it's parameters onto the stck for parallel execution

 ### Parameters
 * fn - Function to call
 * [params] - Optional parameters to apply to function

 ### Returns
 * this - This object
 
 ### Emits
 * Nothing
 
 ### Throws
 * Nothing

*/
NextAlso.prototype.also = function also(fn) {
    var params = [];
    if(arguments.length > 1) {
        for(var arg_count=1;arg_count<arguments.length;arg_count++) {
            params.push(arguments[arg_count]);
        }
    }

    this.insertIntoGroup("parallel",{"fn":fn,"params":params});

    return this;
};

/**
 ### Add series function to stack
 Pushes a function and it's parameters onto the stck for parallel execution

 ### Parameters
 * fn - Function to call
 * params - Parameters to apply to function

 ### Returns
 * this - This object
 
 ### Emits
 * Nothing
 
 ### Throws
 * Nothing

*/
NextAlso.prototype.next = function next(fn) {
    var params = [];
    if(arguments.length > 1) {
        for(var arg_count=1;arg_count<arguments.length;arg_count++) {
            params.push(arguments[arg_count]);
        }
    }
    this.insertIntoGroup("series",{"fn":fn,"params":params});
    return this;
};

NextAlso.prototype.insertIntoGroup = function insertIntoGroup(type,call) {
    //If we chain a different type from last time
    //OR this is the first method pushed
    if(this.last_chain!==type || this.last_chain===null) {
        var tmp_obj = {};
        tmp_obj[type]=[];
        tmp_obj[type].push(call);
        this.groupings.push(tmp_obj);
        //Change last registerd type
        this.last_chain = type;
		return;
	}

    //We're chaining the same type
    if(this.last_chain===type) {
        this.groupings[this.groupings.length-1][type].push(call);
    }
};

module.exports = NextAlso;

