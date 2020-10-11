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
    request(app)
      .get('/logout')
      .expect('Location', '/')
      .expect(302, done)
      .end((err, res) => {
        assert.doesNotMatch(res.text, /testuser/);

        if (err) done(err);
        done();
      });
  });
});

const promiseCreateSchedule = function (done) {
  return new Promise((resolve, refuse) => {
    User.upsert({ userId: 0, username: 'testuser' }).then(() => {
      request(app)
        .get('/schedules/new')
        .end((err, res) => {
          const setCookie = res.headers['set-cookie'];
          const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
          request(app)
            .post('/schedules')
            .set('cookie', setCookie)
            .send({
              scheduleName: 'scheduleName1',
              memo: 'memo1',
              candidates: 'can1a',
              _csrf: csrf,
            })
            .expect('Location', /schedules/)
            .expect(302)
            .end((err, res) => {
              const schedulePath = res.headers.location;
              const scheduleId = schedulePath.match(
                /schedules\/(.*?)(\/|$)/
              )[1];
              request(app)
                .get(schedulePath)
                .expect(/testuser/)
                .expect(/scheduleName1/)
                .expect(/memo1/)
                .expect(/can1a/)
                .expect(200)
                .end((err) => {
                  if (err) refuse(err);
                  resolve({ scheduleId: scheduleId, done: done });
                });
            });
        });
    });
  });
};

const promiseUpdateAvailability = function ({ scheduleId, done }) {
  return new Promise((resolve, refuse) => {
    Candidate.findOne({ where: { scheduleId: scheduleId } }).then(
      (candidate) => {
        request(app)
          .post(
            `/schedules/${scheduleId}/users/${0}/candidates/${
              candidate.candidateId
            }`
          )
          .send({ availability: 2 })
          .expect('{"status":"OK","availability":2}')
          .end((err) => {
            Availability.findAll({ where: { scheduleId: scheduleId } }).then(
              (availabilities) => {
                assert.strictEqual(availabilities.length, 1);
                assert.strictEqual(availabilities[0].availability, 2);

                if (err) refuse(err);
                resolve({ scheduleId: scheduleId, done: done });
              }
            );
          });
      }
    );
  });
};

describe('/schedules', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('createSchedule', (done) => {
    promiseCreateSchedule(done)
      .then(({ scheduleId, done }) => {
        deleteScheduleAggregate(scheduleId, done);
      })
      .catch(done);
  });

  it('updateAvailability', (done) => {
    promiseCreateSchedule(done)
      .then(promiseUpdateAvailability)
      .then(({ scheduleId, done }) => {
        deleteScheduleAggregate(scheduleId, done);
      })
      .catch(done);
  });
});
