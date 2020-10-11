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
              candidates: 'can1',
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
                .expect(/can1/)
                .expect(200)
                .end((err) => {
                  if (err) refuse(err);
                  resolve({
                    scheduleId: scheduleId,
                    done: done,
                  });
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

const promiseUpdateComment = ({ scheduleId, done }) => {
  return new Promise((resolve, refuse) => {
    request(app)
      .post(`/schedules/${scheduleId}/users/${0}/comments`)
      .send({ comment: 'comment1' })
      .expect('{"status":"OK","comment":"comment1"}')
      .end((err, res) => {
        Comment.findAll({ where: { scheduleId: scheduleId } }).then(
          (comments) => {
            assert.strictEqual(comments.length, 1);
            assert.strictEqual(comments[0].comment, 'comment1');

            if (err) refuse(err);
            resolve({ scheduleId: scheduleId, done: done });
          }
        );
      });
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

  it('updateComment', (done) => {
    promiseCreateSchedule(done)
      .then(promiseUpdateComment)
      .then(({ scheduleId, done }) => {
        deleteScheduleAggregate(scheduleId, done);
      })
      .catch(done);
  });
});

const promiseEditSchedule = ({ scheduleId, done }) => {
  return new Promise((resolve, refuse) => {
    request(app)
      .get(`/schedules/${scheduleId}/edit`)
      .end((err, res) => {
        const setCookie = res.headers['set-cookie'];
        const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
        request(app)
          .post(`/schedules/${scheduleId}?edit=1`)
          .set('cookie', setCookie)
          .send({
            scheduleName: 'scheduleName1kai',
            memo: 'memo1kai',
            candidates: 'can2',
            _csrf: csrf,
          })
          .end((err, res) => {
            Schedule.findByPk(scheduleId).then((schedule) => {
              assert.strictEqual(schedule.scheduleName, 'scheduleName1kai');
              assert.strictEqual(schedule.memo, 'memo1kai');
              Candidate.findAll({
                where: { scheduleId: scheduleId },
                order: [['"candidateId"', 'ASC']],
              }).then((candidates) => {
                assert.strictEqual(candidates.length, 2);
                assert.strictEqual(candidates[0].candidateName, 'can1');
                assert.strictEqual(candidates[1].candidateName, 'can2');

                if (err) refuse(err);
                resolve({ scheduleId: scheduleId, done: done });
              });
            });
          });
      });
  });
};

describe('/schedules/:scheduleId?edit=1', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('editSchedule', (done) => {
    promiseCreateSchedule(done)
      .then(promiseEditSchedule)
      .then(({ scheduleId }) => {
        deleteScheduleAggregate(scheduleId, done);
      })
      .catch(done);
  });
});

const promiseDeleteSchedule = ({ scheduleId: scheduleId, done: done }) => {
  return new Promise((resolve, refuse) => {
    request(app)
      .get(`/schedules/${scheduleId}/edit`)
      .end((err, res) => {
        const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
        request(app)
          .post(`/schedules/${scheduleId}?delete=1`)
          .set('cookie', res.headers['set-cookie'])
          .send({ _csrf: csrf })
          .end((err, res) => {
            const p1 = Schedule.findByPk(scheduleId).then((schedule) => {
              assert.strictEqual(!schedule, true);
            });
            const p2 = Candidate.findAll({
              where: { scheduleId: scheduleId },
            }).then((candidates) => {
              assert.strictEqual(candidates.length, 0);
            });
            const p3 = Availability.findAll({
              where: { scheduleId: scheduleId },
            }).then((availabilities) => {
              assert.strictEqual(availabilities.length, 0);
            });
            const p4 = Comment.findAll({
              where: { scheduleId: scheduleId },
            }).then((comments) => {
              assert.strictEqual(comments.length, 0);
            });
            Promise.all([p1, p2, p3, p4]).then(() => {
              resolve({ done: done });
            });
          });
      });
  });
};

describe('/schedules/:scheduleId?delete=1', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('deleteSchedule', (done) => {
    promiseCreateSchedule(done)
      .then(promiseUpdateAvailability)
      .then(promiseUpdateComment)
      .then(promiseDeleteSchedule)
      .then(({ done }) => {
        done();
      })
      .catch(done);
  });
});
