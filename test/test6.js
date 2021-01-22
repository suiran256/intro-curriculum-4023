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
function fnBeforeDefault(done) {
  User.upsert({ userId: 0, username: 'testuser' })
    .then(() => {
      passportStub.install(app);
      passportStub.login({ id: 0, username: 'testuser' });
      console.log('********* before finished');
      done();
    })
    .catch(done);
}
function fnAfterDefault(done) {
  User.findByPk(0)
    .then((u) => u.destroy())
    .then(() => {
      passportStub.logout();
      passportStub.uninstall(app);
      console.log('********* after finished');
      done();
    })
    .catch(done);
}
function fnAfterEachDefault(done) {
  Promise.all(
    this.arrayScheduleIdForDelete.map((s) =>
      deleteScheduleAggregate(s, (err) => {
        if (err) {
          throw err;
        } else {
          return;
        }
      })
    )
  )
    .then(() => {
      this.arrayScheduleIdForDelete = [];
      console.log('********* afterEach finished');
      done();
    })
    .catch(done);
}

// function test(done) {
//   console.log('********* testTuuka');
//   done();
// }

function SObj({
  fnBefore = fnBeforeDefault,
  fnAfter = fnAfterDefault,
  fnAfterEach = fnAfterEachDefault,
} = {}) {
  this.fnBefore = fnBefore;
  this.fnAfter = fnAfter;
  this.fnAfterEach = fnAfterEach;
  this.arrayScheduleIdForDelete = [];
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
  const sObj = new SObj();
  before(sObj.fnBefore.bind(sObj));
  after(sObj.fnAfter.bind(sObj));
  afterEach(sObj.fnAfterEach.bind(sObj));

  it('createSchedule', (done) => {
    promiseCreateSchedule()
      .then(({ scheduleId }) => {
        sObj.arrayScheduleIdForDelete.push(scheduleId);
      })
      .then(promiseCreateSchedule)
      .then(({ scheduleId }) => {
        sObj.arrayScheduleIdForDelete.push(scheduleId);
        done();
      })
      .catch(done);
  });
  it('updateAvailability', (done) => {
    promiseCreateSchedule()
      .then(wrapPromiseUpdateAvailability)
      .then(({ scheduleId }) => {
        sObj.arrayScheduleIdForDelete.push(scheduleId);
        done();
      })
      .catch(done);
  });
});
