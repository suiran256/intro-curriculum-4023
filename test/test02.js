/* eslint-env mocha */
//* eslint-disable no-unused-vars */
'use strict';
const db = require('../models/index');
const { User, Schedule, Candidate, Availability, Comment } = db;
const app = require('../app');
const deleteScheduleAggregate = require('../routes/schedules')
  .deleteScheduleAggregate;
db.sequelize.sync();
const request = require('supertest');
const passportStub = require('passport-stub');
const assert = require('assert');

const promiseSequelizeSync = db.sequelize.sync();

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

//const PostWithCsrfTest = {
const createTet = {
  showPath: 'schedules/new',
  postPath: '/schedules',
  postData: {
    scheduleName: 'scheduleName1',
    memo: 'memo1',
    candidates: 'can1',
  },
  fnValidate: function (err, res) {
    const schedulePath = res.headers.location;
    const scheduleId = schedulePath.match(/schedules\/(.*?)(\/|$)/)[1];
    request(app)
      .get(schedulePath)
      .expect(/testuser/)
      .expect(/scheduleName1/)
      .expect(/memo1/)
      .expect(/can1/)
      .expect(200);
    return { scheduleId: scheduleId };
  },
};

const promiseCreateSchedule = function (test) {
  return new Promise((resolve, reject) => {
    User.upsert({ userId: 0, username: 'testuser' })
      .then(() => {
        request(app)
          .get('/schedules/new')
          .end((err, res) => {
            if (err) reject(err);
            const setCookie = res.headers['set-cookie'];
            const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
            request(app)
              .post(test.postPath)
              .set('cookie', setCookie)
              .send({
                scheduleName: 'scheduleName1',
                memo: 'memo1',
                candidates: 'can1',
                _csrf: csrf,
              })
              .end((err, res) => {
                if (err) reject(err);
                const ret = test.fnValidate(err, res);
                if (err) reject(err);
                resolve(ret);
              });
          });
      })
      .catch(reject);
  });
};

const promiseUpdateAvailability = function ({ scheduleId }) {
  return new Promise((resolve, reject) => {
    Candidate.findOne({ where: { scheduleId: scheduleId } })
      .then((candidate) => {
        request(app)
          .post(
            `/schedules/${scheduleId}/users/${0}/candidates/${
              candidate.candidateId
            }`
          )
          .send({ availability: 2 })
          .expect('{"status":"OK","availability":2}')
          .end((err) => {
            if (err) reject(err);
            Availability.findAll({ where: { scheduleId: scheduleId } })
              .then((availabilities) => {
                assert.strictEqual(availabilities.length, 1);
                assert.strictEqual(availabilities[0].availability, 2);

                if (err) reject(err);
                resolve({ scheduleId: scheduleId });
              })
              .catch(reject);
          });
      })
      .catch(reject);
  });
};

const promiseUpdateComment = ({ scheduleId }) => {
  return new Promise((resolve, reject) => {
    request(app)
      .post(`/schedules/${scheduleId}/users/${0}/comments`)
      .send({ comment: 'comment1' })
      .expect('{"status":"OK","comment":"comment1"}')
      .end((err) => {
        if (err) reject(err);
        Comment.findAll({ where: { scheduleId: scheduleId } })
          .then((comments) => {
            assert.strictEqual(comments.length, 1);
            assert.strictEqual(comments[0].comment, 'comment1');

            if (err) reject(err);
            resolve({ scheduleId: scheduleId });
          })
          .catch(reject);
      });
  });
};

describe('/schedules', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    return promiseSequelizeSync;
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('createSchedule', (done) => {
    promiseCreateSchedule(createTet)
      .then(({ scheduleId }) => {
        deleteScheduleAggregate(scheduleId, done);
      })
      .catch(done);
  });

  it('updateAvailability', (done) => {
    promiseCreateSchedule(createTet)
      .then(promiseUpdateAvailability)
      .then(({ scheduleId }) => {
        deleteScheduleAggregate(scheduleId, done);
      })
      .catch(done);
  });

  it('updateComment', (done) => {
    promiseCreateSchedule(createTet)
      .then(promiseUpdateComment)
      .then(({ scheduleId }) => {
        deleteScheduleAggregate(scheduleId, done);
      })
      .catch(done);
  });
});

const promiseEditSchedule = ({ scheduleId }) => {
  return new Promise((resolve, reject) => {
    request(app)
      .get(`/schedules/${scheduleId}/edit`)
      .end((err, res) => {
        if (err) reject(err);
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
          .end((err) => {
            if (err) reject(err);
            Schedule.findByPk(scheduleId)
              .then((schedule) => {
                assert.strictEqual(schedule.scheduleName, 'scheduleName1kai');
                assert.strictEqual(schedule.memo, 'memo1kai');
                Candidate.findAll({
                  where: { scheduleId: scheduleId },
                  order: [['"candidateId"', 'ASC']],
                })
                  .then((candidates) => {
                    assert.strictEqual(candidates.length, 2);
                    assert.strictEqual(candidates[0].candidateName, 'can1');
                    assert.strictEqual(candidates[1].candidateName, 'can2');

                    if (err) reject(err);
                    resolve({ scheduleId: scheduleId });
                  })
                  .catch(reject);
              })
              .catch(reject);
          });
      });
  });
};

describe('/schedules/:scheduleId?edit=1', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    return promiseSequelizeSync;
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('editSchedule', (done) => {
    promiseCreateSchedule(createTet)
      .then(promiseEditSchedule)
      .then(({ scheduleId }) => {
        deleteScheduleAggregate(scheduleId, done);
      })
      .catch(done);
  });
});

const promiseDeleteSchedule = ({ scheduleId: scheduleId }) => {
  return new Promise((resolve, reject) => {
    request(app)
      .get(`/schedules/${scheduleId}/edit`)
      .end((err, res) => {
        if (err) reject(err);
        const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
        request(app)
          .post(`/schedules/${scheduleId}?delete=1`)
          .set('cookie', res.headers['set-cookie'])
          .send({ _csrf: csrf })
          .end((err) => {
            if (err) reject(err);
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
            Promise.all([p1, p2, p3, p4])
              .then(() => {
                if (err) reject(err);
                resolve();
              })
              .catch(reject);
          });
      });
  });
};

describe('/schedules/:scheduleId?delete=1', () => {
  before(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    return promiseSequelizeSync;
  });
  after(() => {
    passportStub.logout();
    passportStub.uninstall(app);
  });

  it('deleteSchedule', (done) => {
    promiseCreateSchedule(createTet)
      .then(promiseUpdateAvailability)
      .then(promiseUpdateComment)
      .then(promiseDeleteSchedule)
      .then(() => done())
      .catch(done);
  });
});
