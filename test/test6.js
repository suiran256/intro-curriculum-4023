/* eslint-env mocha */
/* eslint-disable no-unused-vars */
// 決め打ち : userId:0,username:'testuser'
'use strict';
const request = require('supertest');
const passportStub = require('passport-stub');
const assert = require('assert');
const util = require('util');
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');
const app = require('../app');
const deleteScheduleAggregate = require('../routes/schedules')
  .deleteScheduleAggregate;

function promisifyResEnd(resObj) {
  return util.promisify(resObj.end).bind(resObj)();
}
function fnBefore(done) {
  User.upsert({ userId: 0, username: 'testuser' }).then(() => {
    passportStub.install(app);
    passportStub.login({ id: 0, username: 'testuser' });
    done();
  });
}
function fnAfter(done) {
  User.findByPk(0)
    .then((u) => u.destroy())
    .then(() => {
      passportStub.logout();
      passportStub.uninstall(app);
      done();
    });
}
function fnAfterEach(obj) {
  return function (done) {
    if (this.scheduleIdForDelete) {
      const scheduleId = this.scheduleIdForDelete;
      this.scheduleIdForDelete = null;
      deleteScheduleAggregate(scheduleId, done);
    } else {
      done();
    }
  }.bind(obj);
}

const promiseCreateSchedule = async () => {
  let res = null;
  let resObj = null;
  resObj = request(app).get('/schedules/new');
  res = await promisifyResEnd(resObj);
  const setCookie = res.headers['set-cookie'];
  const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
  resObj = request(app).post('/schedules').set('cookie', setCookie).send({
    scheduleName: 'scheduleName1',
    memo: 'memo1',
    candidates: 'can1',
    _csrf: csrf,
  });
  res = await promisifyResEnd(resObj);
  const schedulePath = res.headers.location;
  const scheduleId = schedulePath.match(/schedules\/(.*?)(\/|$)/)[1];
  resObj = request(app).get(schedulePath);
  res = await promisifyResEnd(resObj);
  assert.match(res.text, /testuser/);
  assert.match(res.text, /scheduleName1/);
  assert.match(res.text, /memo1/);
  assert.match(res.text, /can1/);
  assert.strictEqual(res.status, 200);
  return { scheduleId };
};
const wrapPromiseUpdateAvailability = ({ scheduleId }) => {
  return (async () => {
    let res = null;
    let resObj = null;
    const candidate = await Candidate.findOne({
      where: { scheduleId: scheduleId },
    });
    resObj = request(app)
      .post(
        `/schedules/${scheduleId}/users/${0}/candidates/${
          candidate.candidateId
        }`
      )
      .send({ availability: 2 });
    res = await promisifyResEnd(resObj);
    assert.match(res.text, /{"status":"OK","availability":2}/);
    const availabilities = await Availability.findAll({
      where: { scheduleId: scheduleId },
    });
    assert.strictEqual(availabilities.length, 1);
    assert.strictEqual(availabilities[0].availability, 2);
    return { scheduleId };
  })();
};

describe('/schedules', () => {
  const storedObj = { scheduleIdForDelete: null };
  before(fnBefore);
  after(fnAfter);
  afterEach(fnAfterEach(storedObj));

  it('createSchedule', (done) => {
    promiseCreateSchedule()
      .then(({ scheduleId }) => {
        storedObj.scheduleIdForDelete = scheduleId;
        done();
      })
      .catch(done);
  });
  it('updateAvailability', (done) => {
    promiseCreateSchedule()
      .then(wrapPromiseUpdateAvailability)
      .then(({ scheduleId }) => {
        storedObj.scheduleIdForDelete = scheduleId;
        done();
      })
      .catch(done);
  });
});
