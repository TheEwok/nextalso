var chai = require('chai');
var sinon = require('sinon');
var fs = require('fs');
var util = require('util');
var NextAlso = require('../lib/nextalso');

chai.use(require('sinon-chai'));
var expect = chai.expect;
var should = chai.should();


describe("NextAlso Flow Control",function(){
    var nextalso;
    var fake_function;
    var fake_callback_function,fake_callback_function_err;

    beforeEach(function() {
        nextalso = new NextAlso();
        fake_function = sinon.spy();
        fake_callback_function = function(cb) { cb(null,"FAKE_FN_PARAM"); };
        fake_callback_function_err = function(cb) { cb("ERROR",null); };
        fake_step_function = function(step,cb) { cb(null,step); };
    });
    context("Parallel calls",function() {
        it("should return itself when also() is called",function() {
            expect(nextalso.also(fake_function,["FAKE PARAMETER"])).to.be.an('object');
        });

        it("should register a new parallel step when also is called",function() {
            nextalso.also(fake_function,["FAKE PARAMETER"]);
            expect(nextalso.getParallelSteps()).to.have.length(1);
            expect(nextalso.getParallelSteps()[0].params[0]).to.equal("FAKE PARAMETER");
        });
        it("should register two steps when also is called twice",function() {
            nextalso.also(fake_function,["FAKE PARAMETER"]);
            nextalso.also(fake_function,["FAKE PARAMETER"]);
            expect(nextalso.getParallelSteps()).to.have.length(2);
        });
        it("should call the parallel function",function() {
            nextalso.also(fake_function,["FAKE PARAMETER"]);
            nextalso.parallel();
            expect(fake_function).to.have.been.called;
            expect(fake_function).to.have.been.calledWith("FAKE PARAMETER");
        });
        it("should call the parallel function with all arguments",function() {
            nextalso.also(fake_function,["FAKE PARAMETER 1","FAKE PARAMETER 2"]);
            nextalso.parallel();
            expect(fake_function).to.have.been.called;
            expect(fake_function).to.have.been.calledWith("FAKE PARAMETER 1","FAKE PARAMETER 2");
        });
        it("should emit parallel_success when done",function() {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_success",emit_spy);
            nextalso.also(fake_callback_function);
            nextalso.parallel();
            expect(emit_spy).to.have.been.called;
        });
        it("should return an array when done",function() {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_success",emit_spy);
            nextalso.also(fake_callback_function);
            nextalso.parallel();
            expect(emit_spy).to.have.been.called;
            expect(emit_spy).to.have.been.calledWithExactly(["FAKE_FN_PARAM"]);
        });
        it("should have two results for two calls",function() {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_success",emit_spy);
            nextalso.also(fake_callback_function);
            nextalso.also(fake_callback_function);
            nextalso.parallel();
            expect(emit_spy).to.have.been.called;
            expect(emit_spy).to.have.been.calledWithExactly(["FAKE_FN_PARAM","FAKE_FN_PARAM"]);
        });
        it("should emit parallel_step and step once",function() {
            var emit_spy = sinon.spy();
            var emit_spy2 = sinon.spy();
            nextalso.on("parallel_step",emit_spy);
            nextalso.on("step",emit_spy2);
            nextalso.also(fake_callback_function);
            nextalso.also(fake_callback_function);
            nextalso.parallel();
            expect(emit_spy).to.have.been.called;
            expect(emit_spy2).to.have.been.called;
        });
        it("should emit parallel_error",function() {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_error",emit_spy);
            nextalso.also(fake_callback_function_err);
            nextalso.parallel();
            expect(emit_spy).to.have.been.called;
        });
        it("should emit with an error",function() {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_error",emit_spy);
            nextalso.also(fake_callback_function_err);
            nextalso.parallel();
            expect(emit_spy).to.have.been.calledWithExactly("ERROR");
        });
        it("should not emit success if there was an error",function() {
            var emit_spy = sinon.spy();
            var emit_spy2 = sinon.spy();
            nextalso.on("parallel_error",emit_spy);
            nextalso.also(fake_callback_function_err);
            nextalso.also(fake_callback_function);
            nextalso.parallel();
            expect(emit_spy).to.have.been.calledWithExactly("ERROR");
            expect(emit_spy2).to.not.have.been.called;
        });

    });
    context("Series calls",function() {
        it("should return itself when next is called",function() {
            expect(nextalso.next(fake_function)).to.be.an("object");
        }); 
        it("should emit success when complete",function() {
            var emit_spy = sinon.spy();
            nextalso.on("series_success",emit_spy);
            nextalso.next(fake_callback_function);
            nextalso.series();
            expect(emit_spy).to.have.been.called;
            expect(emit_spy).to.have.been.calledWith(["FAKE_FN_PARAM"]);
        });
        it("should emit series_step between series functions",function() {
            var emit_spy = sinon.spy();
            nextalso.on("series_step",emit_spy);
            nextalso.next(fake_step_function,[1]);
            nextalso.next(fake_step_function,[2]);
            nextalso.series();
            expect(emit_spy).to.have.been.calledTwice;
        });
        it("should emit step between series functions",function() {
            var emit_spy = sinon.spy();
            nextalso.on("step",emit_spy);
            nextalso.next(fake_step_function,[1]);
            nextalso.next(fake_step_function,[2]);
            nextalso.series();
            expect(emit_spy).to.have.been.calledTwice;
        });
        it("should emit series_step with results in correct order",function() {
            var emit_spy = sinon.spy();
            var spy_emit_mess_one,spy_emit_mess_two;
            nextalso.on("series_step",emit_spy);
            nextalso.next(fake_step_function,["SHOULD BE FIRST"]);
            nextalso.next(fake_step_function,["SHOULD BE SECOND"]);
            nextalso.series();
            spy_emit_mess_one = emit_spy.getCall(0);
            spy_emit_mess_two = emit_spy.getCall(1);
            expect(emit_spy).to.have.been.calledTwice;
            expect(Array.isArray(spy_emit_mess_one.args[0])).to.be.true;
            expect(Array.isArray(spy_emit_mess_two.args[0])).to.be.true;
            expect(spy_emit_mess_one.args[0][0]).to.equal("SHOULD BE FIRST");
            expect(spy_emit_mess_two.args[0][1]).to.equal("SHOULD BE SECOND");
        });

    });
});
