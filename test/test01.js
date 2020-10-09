/* eslint-env mocha */
/* eslint-disable no-unused-vars */
'use strict';

const request = require('supertest');
const passportStub = require('passport-stub');
const assert = require('assert');
const app = require('../app');
const User = require('../models/user');
const Schedule = require('../models/schedule');
const Candidate = require('../models/candidate');
const Availability = require('../models/availability');
const Comment = require('../models/comment');
const deleteScheduleAggregate = require('../routes/schedules')
  .deleteScheduleAggregate;

describe('/', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('includeHeader', (done) => {
    request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect(200, done);
  });
  it('includeUserName', (done) => {
    request(app)
      .get('/')
      .expect(/testuser/)
      .expect(200, done);
  });
});

describe('/login', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('includeLink', (done) => {
    request(app)
      .get('/login')
      .expect(/href="\/auth\/github"/)
      .expect(200, done);
  });
});

describe('/logout', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('redirectTo"/"', (done) => {
    request(app).get('/logout').expect('Location', '/').expect(302, done);
  });
});

describe('/schedules', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  const promiseGetScheduleNew = function () {
    return new Promise((resolve, reject) => {
      request(app)
        .get('/schedules/new')
        .end((err, res) => {
          const csrf = res.text.match(
            /<input type="hidden" name="_csrf" value="(.*?)">/
          )[1];
          const setCookie = res.headers['set-cookie'];
          if (err) return reject(err);
          resolve({ csrf: csrf, setCookie: setCookie });
        });
    });
  };

  const promiseCreateSchedule = function (vars) {
    return new Promise((resolve, reject) => {
      request(app)
        .post('/schedules')
        .set('cookie', vars.setCookie)
        .send({
          scheduleName: 'scheduleName1',
          memo: 'memo1',
          candidates: 'can11can12',
          _csrf: vars.csrf,
        })
        .expect('Location', /schedules/)
        .expect(302)
        .end((err, res) => {
          if (err) reject(err);
          resolve();
        });
    });
  };

  it('createSchedule', (done) => {
    promiseGetScheduleNew().then(promiseCreateSchedule).then(done).catch(done);
  });
});
