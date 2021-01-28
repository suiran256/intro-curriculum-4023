/* eslint-env mocha */
//* eslint-disable no-unused-vars */
'use strict';
const request = require('supertest');
const passportStub = require('passport-stub');
const assert = require('assert');
const util = require('util');
const cheerio = require('cheerio');
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
  return util.promisify(resObj.end).bind(resObj);
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
    this.scheduleIdStack.map((s) => deleteScheduleAggregate(s, () => {}))
  )
    .then(() => {
      this.scheduleId = null;
      this.scheduleIdStack = [];
      console.log('********* afterEach finished');
      done();
    })
    .catch(done);
}

// function test(done) {
//   console.log('**************** test');
//   return done();
// }

function DescribeObj({
  fnBefore = fnBeforeDefault,
  fnAfter = fnAfterDefault,
  fnAfterEach = fnAfterEachDefault,
} = {}) {
  this.scheduleId = null;
  this.scheduleIdStack = [];
  this.fnBefore = fnBefore.bind(this);
  this.fnAfter = fnAfter.bind(this);
  this.fnAfterEach = fnAfterEach.bind(this);
}
function ItObj(describeObj = new DescribeObj()) {
  this.res = null;
  this.addScheduleId = (scheduleId) => {
    describeObj.scheduleIdStack.push(scheduleId);
    describeObj.scheduleId = scheduleId;
  };
  this.removeScheduleId = (scheduleId) => {
    describeObj.scheduleIdStack.splice(
      describeObj.scheduleIdStack.indexOf(scheduleId),
      1
    );
    describeObj.scheduleId =
      describeObj.scheduleIdStack[describeObj.scheduleIdStack.length - 1];
  };
  //scheduleId:最近に追加されたもの
  this.getScheduleId = () => {
    if (!describeObj.scheduleId) throw new Error('need scheduleId in obj');
    return describeObj.scheduleId;
  };
}

const getAsync = ({ path } = {}) => {
  if (!path) return () => Promise.reject(new Error('need path value'));
  return async function (obj) {
    if (!obj) throw new Error('need obj value');
    const resObj = request(app).get(path);
    const res = await promisifyResEnd(resObj)();
    assert.strictEqual(res.status, 200);
    obj.res = res;
    return obj;
  };
};
const postAjaxAsync = ({ path, data = {} }) => {
  if (!path) return () => Promise.reject(new Error('need path value'));
  return async function (obj) {
    if (!obj) throw new Error('need obj value');
    const resObj = request(app).post(path).send(data);
    const res = await promisifyResEnd(resObj)();
    assert.strictEqual(res.status, 200);
    obj.res = res;
    return obj;
  };
};

const postAsync = ({ path, data = {} }) => {
  if (!path) return () => Promise.reject(new Error('need path value'));
  return async function (obj) {
    if (!obj) throw new Error('need obj value');
    const setCookie = obj.res.headers['set-cookie'];
    const csrf = obj.res.text.match(/name="_csrf" value="(.*?)"/)[1];
    if (!csrf) throw new Error('need to contain _csrf');

    const resObj = request(app)
      .post(path)
      .set('cookie', setCookie)
      .send({ _csrf: csrf, ...data });

    const res = await promisifyResEnd(resObj)();
    //TODO: 302以外をどう扱うかは保留。
    assert.strictEqual(res.status, 302);
    obj.res = res;
    return obj;
  };
};

const createScheduleInitialAsync = async (obj) => {
  obj = await getAsync({
    path: '/schedules/new',
  })(obj);
  obj = await postAsync({
    path: '/schedules',
    data: {
      scheduleName: 'scheduleName1',
      memo: 'memo1',
      candidates: 'can1',
    },
  })(obj);
  const schedulePath = obj.res.headers.location;
  const scheduleId = schedulePath.match(/schedules\/(.*?)(\/|$)/)[1];

  obj.addScheduleId(scheduleId);

  const schedule = await Schedule.findByPk(scheduleId);
  assert.strictEqual(!!schedule, true);
  assert.strictEqual(schedule.scheduleName, 'scheduleName1');
  assert.strictEqual(schedule.memo, 'memo1');
  const candidates = await Candidate.findAll({
    where: { scheduleId: scheduleId },
    order: [['"candidateId"', 'ASC']],
  });
  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].candidateName, 'can1');

  obj = await getAsync({
    path: schedulePath,
  })(obj);
  assert.match(obj.res.text, /testuser/);
  assert.match(obj.res.text, />scheduleName1</);
  assert.match(obj.res.text, />memo1</);
  assert.match(obj.res.text, />can1</);

  return obj;
};

//createScheduleInitial後の状態を前提
const updateAvailabilityAsync = async (obj) => {
  const scheduleId = obj.getScheduleId();
  const candidate = await Candidate.findOne({
    where: { scheduleId: scheduleId },
    order: [['"candidateId"', 'ASC']],
  });
  // assert.strictEqual(
  //   !!candidate,
  //   true,
  //   'need more 1 candidates before this test'
  // );

  obj = await postAjaxAsync({
    path: `/schedules/${scheduleId}/users/${0}/candidates/${
      candidate.candidateId
    }`,
    data: { availability: 1 },
  })(obj);
  assert.strictEqual(obj.res.text, '{"status":"OK","availability":1}');
  const availabilities1 = await Availability.findAll({
    where: [{ userId: 0 }, { candidateId: candidate.candidateId }],
  });
  assert.strictEqual(availabilities1.length, 1);
  assert.strictEqual(availabilities1[0].availability, 1);

  obj = await postAjaxAsync({
    path: `/schedules/${scheduleId}/users/${0}/candidates/${
      candidate.candidateId
    }`,
    data: { availability: 2 },
  })(obj);
  assert.strictEqual(obj.res.text, '{"status":"OK","availability":2}');
  const availabilities2 = await Availability.findAll({
    where: [{ userId: 0 }, { candidateId: candidate.candidateId }],
  });
  assert.strictEqual(availabilities2.length, 1);
  assert.strictEqual(availabilities2[0].availability, 2);

  obj = await getAsync({
    path: `/schedules/${scheduleId}`,
  })(obj);
  const $ = cheerio.load(obj.res.text);
  const nodes = $(
    `.availability-toggle-button[data-user-id="0"][data-candidate-id="${candidate.candidateId}"]`
  ).toArray();
  assert.strictEqual(
    nodes.filter((element) => $(element).attr('data-availability') === '1')
      .length,
    0
  );
  assert.strictEqual(
    nodes.filter((element) => $(element).attr('data-availability') === '2')
      .length,
    1
  );

  return obj;
};

const updateCommentAsync = async (obj) => {
  const scheduleId = obj.getScheduleId();

  obj = await postAjaxAsync({
    path: `/schedules/${scheduleId}/users/${0}/comments`,
    data: { comment: 'commentA' },
  })(obj);
  assert.strictEqual(obj.res.text, '{"status":"OK","comment":"commentA"}');
  const comments1 = await Comment.findAll({
    where: { scheduleId: scheduleId },
  });
  assert.strictEqual(comments1.length, 1);
  assert.strictEqual(comments1[0].comment, 'commentA');

  obj = await postAjaxAsync({
    path: `/schedules/${scheduleId}/users/${0}/comments`,
    data: { comment: 'commentB' },
  })(obj);
  assert.strictEqual(obj.res.text, '{"status":"OK","comment":"commentB"}');
  const comments2 = await Comment.findAll({
    where: { scheduleId: scheduleId },
  });
  assert.strictEqual(comments2.length, 1);
  assert.strictEqual(comments2[0].comment, 'commentB');

  obj = await getAsync({
    path: `/schedules/${scheduleId}`,
  })(obj);
  assert.match(obj.res.text, />commentB</);
  assert.doesNotMatch(obj.res.text, />commentA</);

  return obj;
};

const editScheduleAsync = async (obj) => {
  const scheduleId = obj.getScheduleId();

  obj = await getAsync({
    path: `/schedules/${scheduleId}/edit`,
  })(obj);
  obj = await postAsync({
    path: `/schedules/${scheduleId}?edit=1`,
    data: {
      scheduleName: 'scheduleName2',
      memo: 'memo2',
      candidates: 'can2\ncan3',
    },
  })(obj);

  const schedule = await Schedule.findByPk(scheduleId);
  assert.strictEqual(!!schedule, true);
  assert.strictEqual(schedule.scheduleName, 'scheduleName2');
  assert.strictEqual(schedule.memo, 'memo2');
  const candidates = await Candidate.findAll({
    where: { scheduleId: scheduleId },
    order: [['"candidateId"', 'ASC']],
  });
  assert.strictEqual(candidates.length, 3);
  assert.strictEqual(candidates[0].candidateName, 'can1');
  assert.strictEqual(candidates[1].candidateName, 'can2');
  assert.strictEqual(candidates[2].candidateName, 'can3');

  const schedulePath = obj.res.headers.location;
  obj = await getAsync({
    path: schedulePath,
  })(obj);
  //doesNotMatchは、createScheduleInitialAsyncへの適用が前提
  assert.match(obj.res.text, /testuser/);
  assert.match(obj.res.text, />scheduleName2</);
  assert.doesNotMatch(obj.res.text, />scheduleName1</);
  assert.match(obj.res.text, />memo2</);
  assert.doesNotMatch(obj.res.text, />memo1</);
  assert.match(obj.res.text, />can1</);
  assert.match(obj.res.text, />can2</);
  assert.match(obj.res.text, />can3</);

  return obj;
};

const deleteScheduleAsync = async (obj) => {
  const scheduleId = obj.getScheduleId();

  obj = await getAsync({
    path: '/',
  })(obj);
  assert.match(obj.res.text, new RegExp(scheduleId));

  obj = await getAsync({
    path: `/schedules/${scheduleId}/edit`,
  })(obj);
  obj = await postAsync({
    path: `/schedules/${scheduleId}?delete=1`,
    //data: {},
  })(obj);

  obj.removeScheduleId(scheduleId);

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

  obj = await getAsync({
    path: '/',
  })(obj);
  assert.doesNotMatch(obj.res.text, new RegExp(scheduleId));

  return obj;
};

describe('/schedules', () => {
  const describeObj = new DescribeObj();
  before(describeObj.fnBefore);
  after(describeObj.fnAfter);
  afterEach(describeObj.fnAfterEach);

  it('createSchedule', (done) => {
    createScheduleInitialAsync(new ItObj(describeObj))
      .then(() => done())
      .catch(done);
  });
  it('updateAvailability', (done) => {
    createScheduleInitialAsync(new ItObj(describeObj))
      .then(updateAvailabilityAsync)
      .then(() => done())
      .catch(done);
  });
  it('updateComment', (done) => {
    createScheduleInitialAsync(new ItObj(describeObj))
      .then(updateCommentAsync)
      .then(() => done())
      .catch(done);
  });
});

describe('/schedules/:scheduleId?edit=1', () => {
  const describeObj = new DescribeObj();
  before(describeObj.fnBefore);
  after(describeObj.fnAfter);
  afterEach(describeObj.fnAfterEach);

  it('editSchedule', (done) => {
    createScheduleInitialAsync(new ItObj(describeObj))
      .then(editScheduleAsync)
      .then(() => done())
      .catch(done);
  });
});

describe('/schedules/:scheduleId?delete=1', () => {
  const describeObj = new DescribeObj();
  before(describeObj.fnBefore);
  after(describeObj.fnAfter);
  afterEach(describeObj.fnAfterEach);

  it('deleteSchedule', (done) => {
    createScheduleInitialAsync(new ItObj(describeObj))
      .then(updateAvailabilityAsync)
      .then(updateCommentAsync)
      .then(deleteScheduleAsync)
      .then(() => done())
      .catch(done);
  });
});
