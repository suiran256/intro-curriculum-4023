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

function test(done) {
  console.log('**************** test');
  return done();
}

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
  this.describeObj = describeObj;
}

const getAsync = ({ url }) => {
  return async function (obj) {
    if (!url) throw new Error('need url value');
    let res = null;
    let resObj = null;
    resObj = request(app).get(url);
    res = await promisifyResEnd(resObj);
    assert.strictEqual(res.status, 200);
    obj.res = res;
    return obj;
  };
};
const postAjaxAsync = ({ url, objData = {} }) => {
  return async function (obj) {
    if (!url) throw new Error('need url value');
    let res = null;
    let resObj = null;
    resObj = request(app).post(url).send(objData);
    res = await promisifyResEnd(resObj);
    assert.strictEqual(res.status, 200);
    obj.res = res;
    return obj;
  };
};
const postAsync = ({ url, objData = {} }) => {
  return async function (obj) {
    if (!url) throw new Error('need url value');
    let res = null;
    let resObj = null;
    const setCookie = obj.res.headers['set-cookie'];
    const csrf = obj.res.text.match(/name="_csrf" value="(.*?)"/)[1];
    resObj = request(app)
      .post(url)
      .set('cookie', setCookie)
      .send({ _csrf: csrf, ...objData });

    res = await promisifyResEnd(resObj);
    //TODO: 302以外をどう扱うかは保留。
    assert.strictEqual(res.status, 302);
    obj.res = res;
    return obj;
  };
};

const createScheduleInitialAsync = async (obj) => {
  obj = await getAsync({
    url: '/schedules/new',
  })(obj);
  obj = await postAsync({
    url: '/schedules',
    objData: {
      scheduleName: 'scheduleName1',
      memo: 'memo1',
      candidates: 'can1',
    },
  })(obj);
  const schedulePath = obj.res.headers.location;
  const scheduleId = schedulePath.match(/schedules\/(.*?)(\/|$)/)[1];

  obj.describeObj.scheduleId = scheduleId;
  obj.describeObj.scheduleIdStack.push(scheduleId);

  obj = await getAsync({
    url: schedulePath,
  })(obj);
  assert.match(obj.res.text, /testuser/);
  assert.match(obj.res.text, />scheduleName1</);
  assert.match(obj.res.text, />memo1</);
  assert.match(obj.res.text, />can1</);

  return obj;
};

const updateAvailabilityAsync = async (obj) => {
  const { scheduleId } = obj.describeObj;
  if (!scheduleId) throw new Error('need scheduleId in obj');

  const candidate = await Candidate.findOne({
    where: { scheduleId: scheduleId },
  });
  assert.strictEqual(
    !!candidate,
    true,
    'need more 1 candidates before this test'
  );

  obj = await postAjaxAsync({
    url: `/schedules/${scheduleId}/users/${0}/candidates/${
      candidate.candidateId
    }`,
    objData: { availability: 2 },
  })(obj);
  assert.strictEqual(obj.res.text, '{"status":"OK","availability":2}');
  let availabilities = await Availability.findAll({
    where: [{ userId: 0 }, { candidateId: candidate.candidateId }],
  });
  assert.strictEqual(availabilities.length, 1);
  assert.strictEqual(availabilities[0].availability, 2);
  obj = await postAjaxAsync({
    url: `/schedules/${scheduleId}/users/${0}/candidates/${
      candidate.candidateId
    }`,
    objData: { availability: 1 },
  })(obj);
  assert.strictEqual(obj.res.text, '{"status":"OK","availability":1}');
  availabilities = await Availability.findAll({
    where: [{ userId: 0 }, { candidateId: candidate.candidateId }],
  });
  assert.strictEqual(availabilities.length, 1);
  assert.strictEqual(availabilities[0].availability, 1);

  obj = await getAsync({
    url: `/schedules/${scheduleId}`,
  })(obj);
  assert.match(
    obj.res.text,
    new RegExp(
      `data-user-id=\\"0\\" data-candidate-id=\\"${candidate.candidateId}\\" data-availability=\\"1\\"`
    )
  );
  assert.doesNotMatch(
    obj.res.text,
    new RegExp(
      `data-user-id=\\"0\\" data-candidate-id=\\"${candidate.candidateId}\\" data-availability=\\"2\\"`
    )
  );

  return obj;
};

const updateCommentAsync = async (obj) => {
  const { scheduleId } = obj.describeObj;
  if (!scheduleId) throw new Error('need scheduleId in obj');
  let comments = await Comment.findAll({
    where: { scheduleId: scheduleId },
  });
  assert.strictEqual(
    comments.length,
    0,
    'need to empty comments before this test'
  );

  obj = await postAjaxAsync({
    url: `/schedules/${scheduleId}/users/${0}/comments`,
    objData: { comment: 'comment1' },
  })(obj);
  assert.strictEqual(obj.res.text, '{"status":"OK","comment":"comment1"}');
  comments = await Comment.findAll({
    where: { scheduleId: scheduleId },
  });
  assert.strictEqual(comments.length, 1);
  assert.strictEqual(comments[0].comment, 'comment1');
  obj = await postAjaxAsync({
    url: `/schedules/${scheduleId}/users/${0}/comments`,
    objData: { comment: 'commentkai' },
  })(obj);
  assert.strictEqual(obj.res.text, '{"status":"OK","comment":"commentkai"}');
  comments = await Comment.findAll({
    where: { scheduleId: scheduleId },
  });
  assert.strictEqual(comments.length, 1);
  assert.strictEqual(comments[0].comment, 'commentkai');
  obj = await getAsync({
    url: `/schedules/${scheduleId}`,
  })(obj);
  assert.match(obj.res.text, />commentkai</);
  assert.doesNotMatch(obj.res.text, />comment1</);

  return obj;
};

const editScheduleAsync = async (obj) => {
  const { scheduleId } = obj.describeObj;
  if (!scheduleId) throw new Error('need scheduleId in obj');
  obj = await getAsync({
    url: `/schedules/${scheduleId}/edit`,
  })(obj);
  obj = await postAsync({
    url: `/schedules/${scheduleId}?edit=1`,
    objData: {
      scheduleName: 'scheduleName1kai',
      memo: 'memo1kai',
      candidates: 'can2\ncan3',
    },
  })(obj);
  const schedulePath = obj.res.headers.location;
  obj = await getAsync({
    url: schedulePath,
  })(obj);
  //doesNotMatchは、createScheduleInitialAsyncへの適用が前提
  assert.match(obj.res.text, /testuser/);
  assert.match(obj.res.text, />scheduleName1kai</);
  assert.doesNotMatch(obj.res.text, />scheduleName1</);
  assert.match(obj.res.text, />memo1kai</);
  assert.doesNotMatch(obj.res.text, />memo1</);
  assert.match(obj.res.text, />can1</);
  assert.match(obj.res.text, />can2</);
  assert.match(obj.res.text, />can3</);

  return obj;
};

const deleteScheduleAsync = async (obj) => {
  const { scheduleId } = obj.describeObj;
  if (!scheduleId) throw new Error('need scheduleId in obj');

  obj = await getAsync({
    url: '/',
  })(obj);
  assert.match(obj.res.text, new RegExp(scheduleId));

  obj = await getAsync({
    url: `/schedules/${scheduleId}/edit`,
  })(obj);
  obj = await postAsync({
    url: `/schedules/${scheduleId}?delete=1`,
    //objData: {},
  })(obj);
  const scheduleIdStack = obj.describeObj.scheduleIdStack;
  scheduleIdStack.splice(scheduleIdStack.indexOf(scheduleId), 1);
  obj.describeObj.scheduleId = scheduleIdStack[scheduleIdStack.length - 1];
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
    url: '/',
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
    const itObj = new ItObj(describeObj);
    createScheduleInitialAsync(itObj)
      .then(() => done())
      .catch(done);
  });
  it('updateAvailability', (done) => {
    const itObj = new ItObj(describeObj);
    createScheduleInitialAsync(itObj)
      .then(updateAvailabilityAsync)
      .then(() => done())
      .catch(done);
  });
  it('updateComment', (done) => {
    const itObj = new ItObj(describeObj);
    createScheduleInitialAsync(itObj)
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
    const itObj = new ItObj(describeObj);
    createScheduleInitialAsync(itObj)
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
    const itObj = new ItObj(describeObj);
    createScheduleInitialAsync(itObj)
      .then(updateAvailabilityAsync)
      .then(updateCommentAsync)
      .then(deleteScheduleAsync)
      .then(() => done())
      .catch(done);
  });
});
