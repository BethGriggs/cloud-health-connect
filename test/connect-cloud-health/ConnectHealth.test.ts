/*
 * Copyright IBM Corporation 2018
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { should, expect } from 'chai';
import sinon from 'sinon'; 
import { ReadinessEndpoint, LivenessEndpoint, HealthChecker, LivenessCheck, ReadinessCheck, ShutdownCheck } from '../../index';
import {NextFunction} from 'connect';
import * as http from "http";
should();

describe('Connect Cloud Health test suite', function() {

  it('Liveness returns 200 OK and STARTING on readiness check starting', function(done) {

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 200;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
        let expectedBody = "{\"status\":\"STARTING\",\"checks\":[{\"name\":\"startup\",\"state\":\"STARTING\",\"data\":{\"reason\":\"\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };

    let cloudHealth = new HealthChecker();
    cloudHealth.registerReadinessCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new ReadinessCheck("startup", new Promise<null>(function(resolve, reject){
        resolve();
      }))
    )

    LivenessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
  });

  it('Liveness returns 200 OK and UP on liveness success', function(done) {
    let cloudHealth = new HealthChecker();
    cloudHealth.registerLivenessCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new LivenessCheck("test1", new Promise<null>(function(resolve, reject){
        resolve();
      }))
    )

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      //write: sinon.stub(),
      end: function () {
        let expectedStatus = 200;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
        let expectedBody = "{\"status\":\"UP\",\"checks\":[{\"name\":\"test1\",\"state\":\"UP\",\"data\":{\"reason\":\"\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };

    LivenessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
  });

  it('Liveness returns 503 Unavailable and DOWN on liveness fail', function(done) {
    let cloudHealth = new HealthChecker();
    cloudHealth.registerLivenessCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new LivenessCheck("test1", new Promise<null>(function(resolve, reject){
        throw new Error("Liveness Failure");
      }))
    )

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 503;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
  
        let expectedBody = "{\"status\":\"DOWN\",\"checks\":[{\"name\":\"test1\",\"state\":\"DOWN\",\"data\":{\"reason\":\"Liveness Failure\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };

    LivenessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
  });

  it('Liveness returns 503 OK and STOPPING on STOPPING', function(done) {
    process.removeAllListeners('SIGTERM');
    let cloudHealth = new HealthChecker();
    cloudHealth.registerShutdownCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new ShutdownCheck("test1", new Promise<null>(function(resolve, reject){
        // tslint:disable-next-line:no-shadowed-variable no-unused-expression
        new Promise(function(resolve, _reject){
          setTimeout(resolve, 1000, 'foo');
        })
      }))
    )

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 503;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
  
        let expectedBody = "{\"status\":\"STOPPING\",\"checks\":[{\"name\":\"test1\",\"state\":\"STOPPING\",\"data\":{\"reason\":\"\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };
    process.once('SIGTERM', () => { 
      LivenessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
    });
    process.kill(process.pid, 'SIGTERM')
  });

  it('Liveness returns 503 OK and STOPPED on STOPPED', function(done) {
    process.removeAllListeners('SIGTERM');
    let cloudHealth = new HealthChecker();
    cloudHealth.registerShutdownCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new ShutdownCheck("test1", new Promise<null>(function(resolve, reject){
        // tslint:disable-next-line:no-shadowed-variable no-unused-expression
        resolve()
      }))
    )

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 503;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
  
        let expectedBody = "{\"status\":\"STOPPED\",\"checks\":[{\"name\":\"test1\",\"state\":\"STOPPED\",\"data\":{\"reason\":\"\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };
    process.once('SIGTERM', () => { 
      LivenessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
    });
    process.kill(process.pid, 'SIGTERM')
  });

  it('Readiness returns 503 Unavailable and DOWN on readiness fail', function(done) {
    let cloudHealth = new HealthChecker();
    cloudHealth.registerReadinessCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new ReadinessCheck("test1", new Promise<null>(function(resolve, reject){
        throw new Error("Readiness Failure");
      }))
    )
    .then(() => {
      ReadinessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
    });

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 503;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
  
        let expectedBody = "{\"status\":\"DOWN\",\"checks\":[{\"name\":\"test1\",\"state\":\"DOWN\",\"data\":{\"reason\":\"Readiness Failure\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };
  });

  it('Readiness returns 503 Unavailable and STARTING on readiness check starting', function(done) {

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 503;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
        let expectedBody = "{\"status\":\"STARTING\",\"checks\":[{\"name\":\"startup\",\"state\":\"STARTING\",\"data\":{\"reason\":\"\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };

    let cloudHealth = new HealthChecker();
    cloudHealth.registerReadinessCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new ReadinessCheck("startup", new Promise<null>(function(resolve, reject){
        resolve();
      }))
    )

    ReadinessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
  });

  it('Readiness returns 200 OK and UP on readiness and liveness checks', function(done) {
    let cloudHealth = new HealthChecker();
    cloudHealth.registerReadinessCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new ReadinessCheck("startup", new Promise<null>(function(resolve, reject){
        resolve();
      }))
    )
    .then(() => {
      ReadinessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
    })
    cloudHealth.registerLivenessCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new LivenessCheck("liveness", new Promise<null>(function(resolve, reject){
        resolve();
      }))
    )

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 200;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
  
        let expectedBody = "{\"status\":\"UP\",\"checks\":[{\"name\":\"liveness\",\"state\":\"UP\",\"data\":{\"reason\":\"\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };
    //ConnectHealth(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
  });

  it('Readiness returns 503 OK and STOPPING on STOPPING', function(done) {
    process.removeAllListeners('SIGTERM');
    let cloudHealth = new HealthChecker();
    cloudHealth.registerShutdownCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new ShutdownCheck("test1", new Promise<null>(function(resolve, reject){
        // tslint:disable-next-line:no-shadowed-variable no-unused-expression
        new Promise(function(resolve, _reject){
          setTimeout(resolve, 1000, 'foo');
        })
      }))
    )

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 503;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
  
        let expectedBody = "{\"status\":\"STOPPING\",\"checks\":[{\"name\":\"test1\",\"state\":\"STOPPING\",\"data\":{\"reason\":\"\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };
    process.once('SIGTERM', () => { 
      ReadinessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
    });
    process.kill(process.pid, 'SIGTERM')
  });

  it('Readiness returns 503 OK and STOPPED on STOPPED', function(done) {
    process.removeAllListeners('SIGTERM');
    let cloudHealth = new HealthChecker();
    cloudHealth.registerShutdownCheck(
      // tslint:disable-next-line:no-shadowed-variable
      new ShutdownCheck("test1", new Promise<null>(function(resolve, reject){
        // tslint:disable-next-line:no-shadowed-variable no-unused-expression
        resolve()
      }))
    )

    const reqStub: Partial<http.IncomingMessage> = {};
    const nextStub: Partial<NextFunction> = {};
    const resStub: Partial<http.ServerResponse> = {
      write: sinon.stub(),
      end: function () {
        let expectedStatus = 503;
        let code = resStub.statusCode ? resStub.statusCode : 0
        code.should.equals(expectedStatus, `Should return: ${expectedStatus}, but returned: ${code}`);
  
        let expectedBody = "{\"status\":\"STOPPED\",\"checks\":[{\"name\":\"test1\",\"state\":\"STOPPED\",\"data\":{\"reason\":\"\"}}]}";
        sinon.assert.calledWith(resStub.write as sinon.SinonStub, expectedBody)
        done();
      }
    };
    process.once('SIGTERM', () => { 
      ReadinessEndpoint(cloudHealth)(<http.IncomingMessage>reqStub, <http.ServerResponse>resStub, <NextFunction>nextStub)
    });
    process.kill(process.pid, 'SIGTERM')
  });

});
