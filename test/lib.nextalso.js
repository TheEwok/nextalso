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
        it("should return itself when also() is called",function(done) {
            expect(nextalso.also(fake_function,["FAKE PARAMETER"])).to.be.an('object');
			done();
        });
        it("should call the parallel function",function(done) {
            nextalso.also(fake_function,"FAKE PARAMETER");
            nextalso.start();
            expect(fake_function).to.have.been.called;
            expect(fake_function).to.have.been.calledWith("FAKE PARAMETER");
			done();
        });
        it("should call the parallel function with all arguments",function(done) {
            nextalso.also(fake_function,"FAKE PARAMETER 1","FAKE PARAMETER 2");
            nextalso.start();
            expect(fake_function).to.have.been.called;
            expect(fake_function).to.have.been.calledWith("FAKE PARAMETER 1","FAKE PARAMETER 2");
			done();
        });
        it("should emit parallel_success when done",function(done) {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_success",emit_spy);
            nextalso.also(fake_callback_function);
            nextalso.start();
            expect(emit_spy).to.have.been.called;
			done();
        });
        it("should return an array when done",function(done) {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_success",emit_spy);
            nextalso.also(fake_callback_function);
            nextalso.start();
            expect(emit_spy).to.have.been.called;
            expect(emit_spy).to.have.been.calledWithExactly(["FAKE_FN_PARAM"]);
			done();
        });
        it("should have two results for two calls",function(done) {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_success",emit_spy);
            nextalso.also(fake_callback_function);
            nextalso.also(fake_callback_function);
            nextalso.start();
            expect(emit_spy).to.have.been.called;
            expect(emit_spy).to.have.been.calledWithExactly(["FAKE_FN_PARAM","FAKE_FN_PARAM"]);
			done();
        });
        it("should emit parallel_step once and step twice",function(done) {
            var emit_spy = sinon.spy();
            var emit_spy2 = sinon.spy();
            nextalso.on("parallel_step",emit_spy);
            nextalso.on("step",emit_spy2);
            nextalso.also(fake_callback_function);
            nextalso.also(fake_callback_function);
            nextalso.start();
            expect(emit_spy).to.have.been.calledOnce;
            expect(emit_spy2).to.have.been.calledTwice;
			done();
        });
        it("should emit parallel_error",function(done) {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_error",emit_spy);
            nextalso.also(fake_callback_function_err);
            nextalso.start();
            expect(emit_spy).to.have.been.called;
			done();
        });
        it("should emit with an error",function(done) {
            var emit_spy = sinon.spy();
            nextalso.on("parallel_error",emit_spy);
            nextalso.also(fake_callback_function_err);
            nextalso.start();
            expect(emit_spy).to.have.been.calledWithExactly("ERROR",[]);
			done();
        });
        it("should not emit success if there was an error",function(done) {
            var emit_spy = sinon.spy();
            var emit_spy2 = sinon.spy();
            nextalso.on("parallel_error",emit_spy);
            nextalso.also(fake_callback_function_err);
            nextalso.also(fake_callback_function);
            nextalso.start();
            expect(emit_spy).to.have.been.calledWithExactly("ERROR",["FAKE_FN_PARAM"]);
            expect(emit_spy2).to.not.have.been.called;
			done();
        });

    });
    context("Series calls",function() {
        it("should return itself when next is called",function(done) {
            expect(nextalso.next(fake_function)).to.be.an("object");
			done();
        }); 
        it("should emit success when complete",function(done) {
            var emit_spy = sinon.spy();
            nextalso.on("series_success",emit_spy);
            nextalso.next(fake_callback_function);
            nextalso.start();
            expect(emit_spy).to.have.been.called;
            expect(emit_spy).to.have.been.calledWith(["FAKE_FN_PARAM"]);
			done();
        });
        it("should emit series_step between series functions",function(done) {
            var emit_spy = sinon.spy();
            nextalso.on("series_step",emit_spy);
            nextalso.next(fake_step_function,[1]);
            nextalso.next(fake_step_function,[2]);
            nextalso.start();
            expect(emit_spy).to.have.been.called;
			done();
        });
        it("should emit step between series functions",function(done) {
            var emit_spy = sinon.spy();
            nextalso.on("step",emit_spy);
            nextalso.next(fake_step_function,[1]);
            nextalso.next(fake_step_function,[2]);
            nextalso.start();
            expect(emit_spy).to.have.been.calledTwice;
			done();
        });
        it("should emit series_step with results in correct order",function(done) {
            var emit_spy = sinon.spy();
            var spy_emit_mess_one,spy_emit_mess_two;
            nextalso.on("series_step",emit_spy);
            nextalso.on("series_success",emit_spy);
            nextalso.next(fake_step_function,"SHOULD BE FIRST");
            nextalso.next(fake_step_function,"SHOULD BE SECOND");
            nextalso.start();
            spy_emit_mess_one = emit_spy.getCall(0);
            spy_emit_mess_two = emit_spy.getCall(1);
            expect(emit_spy).to.have.been.calledTwice;
            expect(Array.isArray(spy_emit_mess_one.args[0])).to.be.true;
            expect(Array.isArray(spy_emit_mess_two.args[0])).to.be.true;
            expect(spy_emit_mess_one.args[0][0]).to.equal("SHOULD BE FIRST");
            expect(spy_emit_mess_two.args[0][1]).to.equal("SHOULD BE SECOND");
			done();
        });
		it("should emit series_error",function(done) {
			var emit_spy = sinon.spy();
			nextalso.on("series_error",emit_spy);
			nextalso.next(fake_callback_function_err);
			nextalso.start();
			expect(emit_spy).to.have.been.calledOnce;
            expect(emit_spy).to.have.been.calledWithExactly("ERROR",[]);
			done();
		});
		it("should emit series_error and not call success",function(done) {
			var emit_spy = sinon.spy();
			var emit_spy_success = sinon.spy();
			nextalso.on("series_error",emit_spy);
			nextalso.on("series_success",emit_spy_success);
			nextalso.next(fake_callback_function_err);
			nextalso.start();
			expect(emit_spy).to.have.been.calledOnce;
			expect(emit_spy_success).to.not.have.been.called;
			done();
		});
    });
});
