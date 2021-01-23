/* eslint-env mocha */
//* eslint-disable no-unused-vars */
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
      return done();
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
      return done();
    })
    .catch(done);
}
function fnAfterEachDefault(done) {
  Promise.all(
    this.scheduleIdForDeleteArray.map((s) =>
      deleteScheduleAggregate(s, () => {})
    )
  )
    .then(() => {
      this.scheduleIdForDeleteArray = [];
      console.log('********* afterEach finished');
      return done();
    })
    .catch(done);
}

function SObj({
  fnBefore = fnBeforeDefault,
  fnAfter = fnAfterDefault,
  fnAfterEach = fnAfterEachDefault,
} = {}) {
  this.scheduleIdForDeleteArray = [];
  SObj.prototype.fnBefore = fnBefore.bind(this);
  SObj.prototype.fnAfter = fnAfter.bind(this);
  SObj.prototype.fnAfterEach = fnAfterEach.bind(this);
}

const createScheduleAsync = async () => {
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
    createdBy: 0,
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

const updateAvailabilityAsync = async ({ scheduleId }) => {
  let res = null;
  let resObj = null;
  const candidate = await Candidate.findOne({
    where: { scheduleId: scheduleId },
  });
  resObj = request(app)
    .post(
      `/schedules/${scheduleId}/users/${0}/candidates/${candidate.candidateId}`
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
};

const updateCommentAsync = ({ scheduleId }) => {
  return (async () => {
    let res = null;
    let resObj = null;
    resObj = request(app)
      .post(`/schedules/${scheduleId}/users/${0}/comments`)
      .send({ comment: 'comment1' });
    res = await promisifyResEnd(resObj);
    assert.match(res.text, /{"status":"OK","comment":"comment1"}/);
    const comments = await Comment.findAll({
      where: { scheduleId: scheduleId },
    });
    assert.strictEqual(comments.length, 1);
    assert.strictEqual(comments[0].comment, 'comment1');
    return { scheduleId };
  })();
};

const editScheduleAsync = async ({ scheduleId }) => {
  let res = null;
  let resObj = null;
  resObj = request(app).get(`/schedules/${scheduleId}/edit`);
  res = await promisifyResEnd(resObj);
  const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
  const setCookie = res.headers['set-cookie'];
  resObj = request(app)
    .post(`/schedules/${scheduleId}?edit=1`)
    .set('cookie', setCookie)
    .send({
      scheduleName: 'scheduleName1kai',
      memo: 'memo1kai',
      candidates: 'can2\ncan3',
      _csrf: csrf,
    });
  res = await promisifyResEnd(resObj);
  const schedulePath = res.headers.location;
  assert.strictEqual(schedulePath, `/schedules/${scheduleId}`);
  assert.strictEqual(res.status, 302);
  resObj = request(app).get(schedulePath);
  res = await promisifyResEnd(resObj);
  assert.match(res.text, /testuser/);
  assert.match(res.text, /scheduleName1kai/);
  assert.match(res.text, /memo1kai/);
  assert.match(res.text, /can1/);
  assert.match(res.text, /can2/);
  assert.match(res.text, /can3/);
  assert.strictEqual(res.status, 200);
  return { scheduleId };
};

const deleteScheduleAsync = async ({ scheduleId }) => {
  let res = null;
  let resObj = null;
  resObj = request(app).get(`/schedules/${scheduleId}/edit`);
  res = await promisifyResEnd(resObj);
  const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
  const setCookie = res.headers['set-cookie'];
  resObj = request(app)
    .post(`/schedules/${scheduleId}?delete=1`)
    .set('cookie', setCookie)
    .send({
      _csrf: csrf,
    });
  res = await promisifyResEnd(resObj);
  const p1 = Availability.findAll({
    where: { scheduleId: scheduleId },
  }).then((availabilities) => {
    assert.strictEqual(availabilities.length, 0);
    return;
  });
  const p2 = Candidate.findAll({ where: { scheduleId: scheduleId } }).then(
    (candidates) => {
      assert.strictEqual(candidates.length, 0);
      return;
    }
  );
  const p3 = Comment.findAll({ where: { scheduleId: scheduleId } }).then(
    (comments) => {
      assert.strictEqual(comments.length, 0);
      return;
    }
  );
  const p4 = Schedule.findByPk(scheduleId).then((schedule) => {
    assert.strictEqual(!!schedule, false);
    return;
  });
  await Promise.all([p1, p2, p3, p4]);
  return;
};

describe('/schedules', () => {
  const sObj = new SObj();
  before(sObj.fnBefore);
  after(sObj.fnAfter);
  afterEach(sObj.fnAfterEach);

  it('createSchedule', (done) => {
    createScheduleAsync()
      .then(({ scheduleId }) => {
        sObj.scheduleIdForDeleteArray.push(scheduleId);
      })
      .then(createScheduleAsync)
      .then(({ scheduleId }) => {
        sObj.scheduleIdForDeleteArray.push(scheduleId);
        return done();
      })
      .catch(done);
  });
  it('updateAvailability', (done) => {
    createScheduleAsync()
      .then(updateAvailabilityAsync)
      .then(({ scheduleId }) => {
        sObj.scheduleIdForDeleteArray.push(scheduleId);
        return done();
      })
      .catch(done);
  });
  it('updateComment', (done) => {
    createScheduleAsync()
      .then(updateCommentAsync)
      .then(({ scheduleId }) => {
        sObj.scheduleIdForDeleteArray.push(scheduleId);
        return done();
      })
      .catch(done);
  });
});

describe('/schedules/:scheduleId?edit=1', () => {
  const sObj = new SObj();
  before(sObj.fnBefore);
  after(sObj.fnAfter);
  afterEach(sObj.fnAfterEach);

  it('editSchedule', (done) => {
    createScheduleAsync()
      .then(editScheduleAsync)
      .then(({ scheduleId }) => {
        sObj.scheduleIdForDeleteArray.push(scheduleId);
        return done();
      })
      .catch(done);
  });
});

describe('/schedules/:scheduleId?delete=1', () => {
  const sObj = new SObj();
  before(sObj.fnBefore);
  after(sObj.fnAfter);
  afterEach(sObj.fnAfterEach);

  it('deleteSchedule', (done) => {
    createScheduleAsync()
      .then(updateAvailabilityAsync)
      .then(updateCommentAsync)
      .then(deleteScheduleAsync)
      .then(() => done())
      .catch(done);
  });
});
