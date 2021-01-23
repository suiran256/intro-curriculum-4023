/* eslint-env mocha */
'use strict';
const util = require('util');
const request = require('supertest');
const passportStub = require('passport-stub');
const assert = require('assert');
const app = require('../app');
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');
const { deleteScheduleAggregate } = require('../routes/schedules');

const fnBefore = () => {
  passportStub.install(app);
  passportStub.login({ userId: 0, username: 'testuser' });
  User.upsert({ userId: 0, username: 'testuser' });
};
const fnAfter = () => {
  passportStub.logout();
  passportStub.uninstall(app);
};

describe('/login', () => {
  before(fnBefore);
  after(fnAfter);
  it('includeLink', (done) => {
    request(app)
      .get('/login')
      .expect(/href="\/auth\/github"/)
      .expect(200, done);
  });
});

describe('/logout', () => {
  before(fnBefore);
  after(fnAfter);
  it('redirectTo"/"', (done) => {
    request(app).get('/logout').expect('Location', '/').expect(302, done);
  });
});

console.log(util.promisify(request(app).end)());
//.end)((err, res) => {
//  return res;
//});
//const promise1 = util.promisify(req1)();
//console.log(promise1);
// promise1.then((res) => {
//   console.log(res);
//   return res;
// });
//console.log(promiseCreateScheduleTest);
// const promiseCreateSchedule = promisify(request(app).get('/schedules/new').end)
//   .then((res) => {
//     const setCookie = res.headers['set-cookie'];
//     const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
//     return promisify(
//       request(app).post('/schedules').set('cookie', setCookie).send({
//         scheduleName: 'scheduleName1',
//         memo: 'memo1',
//         candidates: 'can1',
//         _csrf: csrf,
//       }).end
//     );
//   })
//   .then((res) => {
//     const schedulePath = res.headers.location;
//     const scheduleId = schedulePath.match(/schedules\/(.*?)(\/|$)/)[1];
//     return promisify(
//       request(app)
//         .get(schedulePath)
//         .expect(/testuser/)
//         .expect(/scheduleName1/)
//         .expect(/memo1/)
//         .expect(/can1/)
//         .expect(200).end
//     ).then(() => {
//       return { scheduleId };
//     });
//   });

// describe('createSchedule', () => {
//   before(fnBefore);
//   after(fnAfter);
//   it('createSchedule', (done) => {
//     promiseCreateSchedule.then(({ scheduleId }) => {
//       deleteScheduleAggregate(scheduleId, done);
//     });
//   });
// });
//       (err, res) => {
//       const setCookie = res.headers['set-cookie'];
//       const csrf = res.text.match(/name="_csrf" value="(.*?)"/)[1];
//       return request(app)
//         .post('/schedules')
//         .set('cookie', setCookie)
//         .send({
//           scheduleName: 'scheduleName1',
//           memo: 'memo1',
//           candidates: 'can1',
//           _csrf: csrf,
//         })
//         .end((err, res) => {
//           const schedulePath = res.headers.location;
//           const scheduleId = schedulePath.match(/schedules\/(.*?)(\/|$)/)[1];
//           return request(app)
//             .get(schedulePath)
//             .expect(/testuser/)
//             .expect(/scheduleName1/)
//             .expect(/memo1/)
//             .expect(/can1/)
//             .expect(200)
//             .end(() => {
//               return { scheduleId };
//             });
//         });
//     });
// });
