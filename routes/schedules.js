//* eslint-disable no-unused-vars */
'use strict';
const uuid = require('uuid');
const createError = require('http-errors');
const express = require('express');
const router = express.Router();
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');
const authenticationEnsure = require('../routes/authentication-ensurer');
const csrfProtection = require('csurf')({ cookie: true });

router.get('/new', authenticationEnsure, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsure, csrfProtection, (req, res, next) => {
  const scheduleId = uuid.v4();
  const updatedAt = new Date();
  Schedule.create({
    scheduleId: scheduleId,
    scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
    memo: req.body.memo,
    createdBy: req.user.id,
    updatedAt: updatedAt,
  })
    .then(() => {
      return createCandidates(parseCandidateNames(req), scheduleId);
    })
    .then(() => {
      res.redirect(`/schedules/${scheduleId}`);
    })
    .catch(next);
});

router.get('/:scheduleId', authenticationEnsure, (req, res, next) => {
  const scheduleId = req.params.scheduleId;
  (async () => {
    const schedule = await Schedule.findByPk(scheduleId, {
      include: [
        {
          model: User,
          attributes: ['userId', 'username'],
        },
      ],
    });
    if (!schedule) return next(createError(404, 'notFound'));

    const promiseCandidate = Candidate.findAll({
      where: { scheduleId: scheduleId },
      order: [['"candidateId"', 'ASC']],
    });
    const promiseAvailability = Availability.findAll({
      include: [
        {
          model: User,
          attributes: ['userId', 'username'],
        },
      ],
      where: { scheduleId: scheduleId },
      order: [
        [User, '"username"', 'ASC'],
        ['"candidateId"', 'ASC'],
      ],
    });
    const promiseComment = Comment.findAll({
      where: { scheduleId: scheduleId },
    });

    const promiseMakeAvailabilityMapMap = (async () => {
      const [candidates, availabilities] = await Promise.all([
        promiseCandidate,
        promiseAvailability,
      ]);

      const availabilityMapMap = new Map();
      const userMap = new Map();
      const userIdMe = Number(req.user.id);
      const userMe = {
        isSelf: true,
        userId: userIdMe,
        username: req.user.username,
      };
      userMap.set(userIdMe, userMe);
      let prevUserId = null;
      availabilities.forEach((a) => {
        const userId = a.User.userId;
        if (prevUserId !== userId) {
          userMap.set(userId, {
            isSelf: userId === userIdMe,
            userId: userId,
            username: a.User.username,
          });
          prevUserId = userId;
        }
        const map = availabilityMapMap.get(userId) || new Map();
        map.set(a.candidateId, a.availability);
        availabilityMapMap.set(userId, map);
        // const map = availabilityMapMap.get(userId);
        // if (map) {
        //   map.set(a.candidateId, a.availability);
        // } else {
        //   availabilityMapMap.set(
        //     userId,
        //     new Map([[a.candidateId, a.availability]])
        //   );
        // }
      });

      const users = Array.from(userMap.values());
      users.forEach((u) => {
        candidates.forEach((c) => {
          const userId = u.userId;
          const candidateId = c.candidateId;
          const map = availabilityMapMap.get(userId) || new Map();
          const a = map.get(candidateId) || 0;
          map.set(candidateId, a);
          availabilityMapMap.set(userId, map);
        });
      });

      return { candidates, availabilityMapMap, users /*,userMap*/ };
    })();

    const promiseMakeCommentMap = (async () => {
      const comments = await promiseComment;
      const commentMap = new Map();
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return { commentMap };
    })();

    //分けるのはやりすぎだと思うが練習として実施
    const [
      { candidates, availabilityMapMap, users /*,userMap*/ },
      { commentMap },
    ] = await Promise.all([
      promiseMakeAvailabilityMapMap,
      promiseMakeCommentMap,
    ]);

    res.render('schedule', {
      user: req.user,
      schedule: schedule,
      //userMap: userMap,
      candidates: candidates,
      availabilityMapMap: availabilityMapMap,
      commentMap: commentMap,
      users: users,
    });
  })().catch(next);
});

router.get(
  '/:scheduleId/edit',
  authenticationEnsure,
  csrfProtection,
  (req, res, next) => {
    const scheduleId = req.params.scheduleId;
    Schedule.findByPk(scheduleId).then((schedule) => {
      if (!isUpdatable(req, schedule)) throw createError(404, 'notFound');
      return Candidate.findAll({
        where: { scheduleId: scheduleId },
        order: [['"candidateId"', 'ASC']],
      })
        .then((candidates) => {
          res.render('edit', {
            user: req.user,
            schedule: schedule,
            candidates: candidates,
            csrfToken: req.csrfToken(),
          });
        })
        .catch(next);
    });
  }
);

router.post(
  '/:scheduleId',
  authenticationEnsure,
  csrfProtection,
  (req, res, next) => {
    const scheduleId = req.params.scheduleId;
    Schedule.findByPk(scheduleId)
      .then((schedule) => {
        if (!isUpdatable(req, schedule)) throw createError(404, 'notFound');
        if (Number(req.query.edit) === 1) {
          const updatedAt = new Date();
          return (
            schedule
              .update({
                scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
                memo: req.body.memo,
                updatedAt: updatedAt,
              })
              .then(() => {
                return createCandidates(
                  parseCandidateNames(req),
                  scheduleId,
                  (err) => {
                    if (err) return next(err);
                    res.redirect(`/schedules/${scheduleId}`);
                  }
                );
              })
              // .then(() => {
              //   res.redirect(`/schedules/${scheduleId}`);
              // })
              .catch(next)
          );
        } else if (Number(req.query.delete) === 1) {
          // return deleteScheduleAggregate(scheduleId, (err) => {
          //   if (err) return next(err);
          //   res.redirect('/');
          // });
          return deleteScheduleAggregate(scheduleId)
            .then(() => {
              res.redirect('/');
            })
            .catch(next);
        }
      })
      .catch(next);
  }
);

//candidateNamesは[string]にparseされた状態
function createCandidates(candidateNames, scheduleId, done) {
  return (async function () {
    const candidates = candidateNames.map((c) => {
      return { candidateName: c, scheduleId: scheduleId };
    });
    await Candidate.bulkCreate(candidates);
    if (done) return done();
    return;
  })().catch((err) => {
    if (done) {
      return done(err);
    }
    throw err;
  });
}
function parseCandidateNames(req) {
  const candidateNameString = req.body.candidates || '';
  return candidateNameString
    .split('\n')
    .map((c) => c.trim())
    .filter((c) => c !== '');
}

function isUpdatable(req, schedule) {
  return schedule && schedule.createdBy === Number.parseInt(req.user.id);
}

function deleteScheduleAggregate(scheduleId, done) {
  const asyncDeleteAvailabilities = async () => {
    return Availability.findAll({
      where: { scheduleId: scheduleId },
    })
      .then((availabilities) => availabilities.map((a) => a.destroy()))
      .then((promises) => Promise.all(promises));
  };
  const asyncDeleteComments = async () => {
    return Comment.findAll({
      where: { scheduleId: scheduleId },
    })
      .then((comments) => comments.map((c) => c.destroy()))
      .then((promises) => Promise.all(promises));
  };

  const asyncDeleteCandidates = async () => {
    return Candidate.findAll({
      where: { scheduleId: scheduleId },
    })
      .then((candidates) => candidates.map((c) => c.destroy()))
      .then((promises) => Promise.all(promises));
  };
  const asyncDeleteSchedule = async () => {
    return Schedule.findByPk(scheduleId).then((s) => s.destroy());
  };
  return asyncDeleteAvailabilities()
    .then(Promise.all([asyncDeleteCandidates(), asyncDeleteComments()]))
    .then(asyncDeleteSchedule)
    .then(() => {
      //done();
      if (done) return done();
    })
    .catch((err) => {
      if (done) return done(err);
      //done(err);
      throw err;
    });
}
router.deleteScheduleAggregate = deleteScheduleAggregate;

module.exports = router;
