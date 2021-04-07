/* eslint-env jest */
/* eslint-disable no-unused-vars */
'use strict';

const request = require('supertest');
const passportStub = require('passport-stub');
const cheerio = require('cheerio');
const app = require('../app');
const { deleteScheduleAggregate } = require('../routes/schedules');
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
  sequelize,
} = require('../models/index');

const util = require('util');
const { post } = require('../app');
function promisifyResEnd(resObj) {
  return util.promisify(resObj.end).bind(resObj);
}

afterAll(() => {
  sequelize.close();
});

function fnBeforeDefault(done) {
  User.upsert({ userId: 0, username: 'testUser' })
    .then(() => {
      passportStub.install(app);
      passportStub.login({ id: 0, username: 'testUser' });
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
  Promise.all(this.scheduleIdStack.map((s) => deleteScheduleAggregate(s)))
    .then(() => {
      this.clearScheduleIdStack();
      console.log('********* afterEach finished');
      done();
    })
    .catch(done);
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
DescribeObj.prototype.addScheduleId = function (scheduleId) {
  this.scheduleIdStack.push(scheduleId);
  this.scheduleId = scheduleId;
};
DescribeObj.prototype.removeScheduleId = function (scheduleId) {
  this.scheduleIdStack.splice(this.scheduleIdStack.indexOf(scheduleId), 1);
  this.scheduleId = this.scheduleIdStack[this.scheduleIdStack.length - 1];
};
DescribeObj.prototype.clearScheduleIdStack = function () {
  this.scheduleId = null;
  this.scheduleIdStack = [];
};
//scheduleId:最近に追加されたもの
DescribeObj.prototype.getScheduleId = function () {
  if (!this.scheduleId) throw new Error('need scheduleId in obj');
  return this.scheduleId;
};

function ItObj(describeObj = new DescribeObj()) {
  this.res = null;
  this.addScheduleId = describeObj.addScheduleId.bind(describeObj);
  this.removeScheduleId = describeObj.removeScheduleId.bind(describeObj);
  this.getScheduleId = describeObj.getScheduleId.bind(describeObj);
}

const getAsync = ({ path } = {}) => {
  if (!path) return () => Promise.reject(new Error('need path value'));
  return async function (obj) {
    if (!obj) throw new Error('need obj value');

    const resObj = request(app).get(path);
    const res = await promisifyResEnd(resObj)();
    // expect(res.status).toBe(200);
    obj.res = res;
    return obj;
  };
};
const postAjaxAsync = ({ path, data = {} } = {}) => {
  if (!path) return () => Promise.reject(new Error('need path value'));
  return async function (obj) {
    if (!obj) throw new Error('need obj value');
    const resObj = request(app).post(path).send(data);
    const res = await promisifyResEnd(resObj)();
    // expect(res.status).toBe(200);
    obj.res = res;
    return obj;
  };
};

const postAsync = ({ path, data = {} } = {}) => {
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
    // TODO: 302以外をどう扱うかは保留。
    // expect(res.status).toBe(302);
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
  expect(!!schedule).toBe(true);
  expect(schedule.scheduleName).toBe('scheduleName1');
  expect(schedule.memo).toBe('memo1');
  const candidates = await Candidate.findAll({
    where: { scheduleId: scheduleId },
    order: [['"candidateId"', 'ASC']],
  });
  expect(candidates.length).toBe(1);
  expect(candidates[0].candidateName).toBe('can1');

  obj = await getAsync({
    path: schedulePath,
  })(obj);
  expect(obj.res.text).toMatch(/testUser/);
  expect(obj.res.text).toMatch(/>scheduleName1</);
  expect(obj.res.text).toMatch(/>memo1</);
  expect(obj.res.text).toMatch(/>can1</);

  return obj;
};

//createScheduleInitial後の状態を前提
const updateAvailabilityAsync = async (obj) => {
  const scheduleId = obj.getScheduleId();
  const candidate = await Candidate.findOne({
    where: { scheduleId: scheduleId },
    order: [['"candidateId"', 'ASC']],
  });
  // expect(
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
  expect(obj.res.text).toBe('{"status":"OK","availability":1}');
  const availabilities1 = await Availability.findAll({
    where: [{ userId: 0 }, { candidateId: candidate.candidateId }],
  });
  expect(availabilities1.length).toBe(1);
  expect(availabilities1[0].availability).toBe(1);

  obj = await postAjaxAsync({
    path: `/schedules/${scheduleId}/users/${0}/candidates/${
      candidate.candidateId
    }`,
    data: { availability: 2 },
  })(obj);
  expect(obj.res.text).toBe('{"status":"OK","availability":2}');
  const availabilities2 = await Availability.findAll({
    where: [{ userId: 0 }, { candidateId: candidate.candidateId }],
  });
  expect(availabilities2.length).toBe(1);
  expect(availabilities2[0].availability).toBe(2);

  obj = await getAsync({
    path: `/schedules/${scheduleId}`,
  })(obj);
  const $ = cheerio.load(obj.res.text);
  const nodes = $(
    `.availability-toggle-button[data-user-id="0"][data-candidate-id="${candidate.candidateId}"]`
  ).toArray();
  expect(
    nodes.filter((element) => $(element).attr('data-availability') === '1')
      .length
  ).toBe(0);
  expect(
    nodes.filter((element) => $(element).attr('data-availability') === '2')
      .length
  ).toBe(1);

  return obj;
};

const updateCommentAsync = async (obj) => {
  const scheduleId = obj.getScheduleId();

  obj = await postAjaxAsync({
    path: `/schedules/${scheduleId}/users/${0}/comments`,
    data: { comment: 'commentA' },
  })(obj);
  expect(obj.res.text).toBe('{"status":"OK","comment":"commentA"}');
  const comments1 = await Comment.findAll({
    where: { scheduleId: scheduleId },
  });
  expect(comments1.length).toBe(1);
  expect(comments1[0].comment).toBe('commentA');

  obj = await postAjaxAsync({
    path: `/schedules/${scheduleId}/users/${0}/comments`,
    data: { comment: 'commentB' },
  })(obj);
  expect(obj.res.text).toBe('{"status":"OK","comment":"commentB"}');
  const comments2 = await Comment.findAll({
    where: { scheduleId: scheduleId },
  });
  expect(comments2.length).toBe(1);
  expect(comments2[0].comment).toBe('commentB');

  obj = await getAsync({
    path: `/schedules/${scheduleId}`,
  })(obj);
  expect(obj.res.text).toMatch(/>commentB</);
  expect(obj.res.text).not.toMatch(/>commentA</);

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
  expect(!!schedule).toBe(true);
  expect(schedule.scheduleName).toBe('scheduleName2');
  expect(schedule.memo).toBe('memo2');
  const candidates = await Candidate.findAll({
    where: { scheduleId: scheduleId },
    order: [['"candidateId"', 'ASC']],
  });
  expect(candidates.length).toBe(3);
  expect(candidates[0].candidateName).toBe('can1');
  expect(candidates[1].candidateName).toBe('can2');
  expect(candidates[2].candidateName).toBe('can3');

  const schedulePath = obj.res.headers.location;
  obj = await getAsync({
    path: schedulePath,
  })(obj);
  //doesNotMatchは、createScheduleInitialAsyncへの適用が前提
  expect(obj.res.text).toMatch(/testUser/);
  expect(obj.res.text).toMatch(/>scheduleName2</);
  expect(obj.res.text).not.toMatch(/>scheduleName1</);
  expect(obj.res.text).not.toMatch(/>memo1</);
  expect(obj.res.text).toMatch(/>memo2</);
  expect(obj.res.text).toMatch(/>can1</);
  expect(obj.res.text).toMatch(/>can2</);
  expect(obj.res.text).toMatch(/>can3</);

  return obj;
};

const deleteScheduleAsync = async (obj) => {
  const scheduleId = obj.getScheduleId();

  obj = await getAsync({
    path: '/',
  })(obj);
  expect(obj.res.text).toMatch(new RegExp(scheduleId));
  // expect(obj.res.text).toMatch(new RegExp(scheduleId));

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
    expect(availabilities.length).toBe(0);
    return;
  });
  const p2 = Candidate.findAll({ where: { scheduleId: scheduleId } }).then(
    (candidates) => {
      expect(candidates.length).toBe(0);
      return;
    }
  );
  const p3 = Comment.findAll({ where: { scheduleId: scheduleId } }).then(
    (comments) => {
      expect(comments.length).toBe(0);
      return;
    }
  );
  const p4 = Schedule.findByPk(scheduleId).then((schedule) => {
    expect(!!schedule).toBe(false);
    return;
  });
  await Promise.all([p1, p2, p3, p4]);

  obj = await getAsync({
    path: '/',
  })(obj);
  expect(obj.res.text).not.toMatch(new RegExp(scheduleId));

  return obj;
};

describe('getPostToolErrorHandling', () => {
  const describeObj = new DescribeObj();
  beforeAll(describeObj.fnBefore);
  afterAll(describeObj.fnAfter);
  afterEach(describeObj.fnAfterEach);
  it('getAsyncDoError', () => {
    return expect(getAsync()).rejects.toThrow('path');
  });
  it('postAsyncDoError', () => {
    return expect(postAsync()).rejects.toThrow('path');
  });
  it('postAjaxAsyncDoError', () => {
    return expect(postAjaxAsync()).rejects.toThrow('path');
  });
});
describe('/:schedule/ ErrorHandling', () => {
  const describeObj = new DescribeObj();
  beforeAll(describeObj.fnBefore);
  afterAll(describeObj.fnAfter);
  afterEach(describeObj.fnAfterEach);

  it('post / notExistScheduleName', async () => {
    let obj = new ItObj(describeObj);
    obj = await getAsync({ path: '/schedules/new' })(obj);
    obj = await postAsync({
      path: '/schedules/',
      data: { memo: 'memo1' },
    })(obj);
    return expect(obj.res.status).toBe(500);
  });
  it('post / notExistMemo', async () => {
    let obj = new ItObj(describeObj);
    obj = await getAsync({ path: '/schedules/new' })(obj);
    obj = await postAsync({
      path: '/schedules/',
      data: { scheduleName: 'scheduleName1' },
    })(obj);
    return expect(obj.res.status).toBe(500);
  });
  it('post / scheduleNameは空文字でOK', async () => {
    let obj = new ItObj(describeObj);
    obj = await getAsync({ path: '/schedules/new' })(obj);
    obj = await postAsync({
      path: '/schedules/',
      data: { scheduleName: '', memo: 'memo1' },
    })(obj);
    return expect(obj.res.status).toBe(302);
  });
  it('post / memoは空文字列でOK', async () => {
    let obj = new ItObj(describeObj);
    obj = await getAsync({ path: '/schedules/new' })(obj);
    obj = await postAsync({
      path: '/schedules/',
      data: { scheduleName: 'scheduleName1', memo: '' },
    })(obj);
    return expect(obj.res.status).toBe(302);
  });
  it('post / scheduleNameオーバーフロー対策(10000文字まで確認)', async () => {
    let obj = new ItObj(describeObj);
    obj = await getAsync({ path: '/schedules/new' })(obj);
    obj = await postAsync({
      path: '/schedules/',
      data: { scheduleName: 'a'.repeat(1000000), memo: 'memo1' },
    })(obj);
    expect(obj.res.status).toBe(413);
  });
});
describe('/schedules', () => {
  const describeObj = new DescribeObj();
  beforeAll(describeObj.fnBefore);
  afterAll(describeObj.fnAfter);
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
  beforeAll(describeObj.fnBefore);
  afterAll(describeObj.fnAfter);
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
  beforeAll(describeObj.fnBefore);
  afterAll(describeObj.fnAfter);
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
