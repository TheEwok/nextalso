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
    this.halt_on_error = false;
    this.halt = false;

    events.EventEmitter.call(this);
};

util.inherits(NextAlso,events.EventEmitter);

NextAlso.prototype.callback = function callback() {
    var instance = this;
    return function (error,success) {
        if(error) {
            return instance.error(error);
        }
        return instance.success(success);
    };
};

NextAlso.prototype.start = function start() {
    var instance = this;
    instance.method.apply(null,instance.params);
    return instance;
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
NextAlso.prototype.parallel = function parallel() {
    var instance = this;
    var parallel_results = [];
    var parallel_count = instance.parallel_fns.length;

    function parallel_callback(error,result) {
        if(error) {
            instance.emit("parallel_error",error);
            parallel_count = 0;
            instance.parallel_fns = [];
            return;
        }
        parallel_results.push(result);
        instance.emit("parallel_step");
        instance.emit("step");
        if(parallel_results.length===parallel_count) {
            return instance.emit("parallel_success",parallel_results);
        }
    }

    //Do Calls
    for(var count=0;count<parallel_count;count++) {
        var curr_fn = instance.parallel_fns[count].fn;
        var curr_params = instance.parallel_fns[count].params;
        curr_params.push(parallel_callback);
        curr_fn.apply(null,curr_params);
    }
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
NextAlso.prototype.series = function series() {
    var instance = this;
    var series_results = [];

    function series_callback(error,result) {
        if(error) {
            instance.emit("series_error",error);
            instance.series_fns = [];
            return;
        }
        series_results.push(result);
        instance.emit("series_step",series_results);
        instance.emit("step");
        if(instance.series_fns.length===0) {
            return instance.emit("series_success",series_results);
        }
        series_next(instance.series_fns.shift());
    }

    function series_next(series_fn) {
        var curr_params = series_fn.params;
        curr_params.push(series_callback);
        series_fn.fn.apply(null,curr_params);
    }

    series_next(instance.series_fns.shift());
};

/**
 ### Add parallel function to stack
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
NextAlso.prototype.also = function also(fn,params) {
    if(!params) {
        params = [];
    }

    this.parallel_fns.push({fn:fn,params:params});
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

NextAlso.prototype.next = function next(fn,params) {
    if(!params) {
        params = [];
    }

    this.series_fns.push({fn:fn,params:params});
    return this;
};

NextAlso.prototype.getParallelSteps = function getParallelSteps() {
    return this.parallel_fns;
};

module.exports = NextAlso;

