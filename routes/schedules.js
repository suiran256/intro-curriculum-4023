/* eslint-disable no-unused-vars */
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
    .then((candidates) => {
      if (!candidates.length) {
        res.redirect('/');
      } else {
        res.redirect(`/schedules/${scheduleId}`);
      }
    })
    .catch(next);
});

router.get('/:scheduleId', authenticationEnsure, (req, res, next) => {
  const scheduleId = req.params.scheduleId;
  (async () => {
    const schedule = await Schedule.findOne({
      include: [
        {
          model: User,
          attributes: ['userId', 'username'],
        },
      ],
      where: { scheduleId: scheduleId },
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
      availabilities.forEach((a) => {
        const userId = a.User.userId;
        userMap.set(a.User.userId, {
          isSelf: userId === userIdMe,
          userId: a.User.userId,
          username: a.User.username,
        });
        const map = availabilityMapMap.get(a.User.userId) || new Map();
        map.set(a.candidateId, a.availability);
        availabilityMapMap.set(a.User.userId, map);
      });

      const users = Array.from(userMap).map((entry) => entry[1]);
      users.forEach((u) => {
        candidates.forEach((c) => {
          const map = availabilityMapMap.get(u.userId) || new Map();
          const a = map.get(c.candidateId) || 0;
          map.set(c.candidateId, a);
          availabilityMapMap.set(u.userId, map);
        });
      });

      return { candidates, userMap, availabilityMapMap, users };
    })();

    const promiseMakeCommentMap = (async () => {
      const comments = await promiseComment;
      const commentMap = new Map();
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return commentMap;
    })();

    const [r1, r2] = await Promise.all([
      promiseMakeAvailabilityMapMap,
      promiseMakeCommentMap,
    ]);
    const { candidates, userMap, availabilityMapMap, users } = r1;
    const commentMap = r2;

    res.render('schedule', {
      user: req.user,
      schedule: schedule,
      userMap: userMap,
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
          return schedule
            .update({
              scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
              memo: req.body.memo,
              updatedAt: updatedAt,
            })
            .then(() => {
              return createCandidates(parseCandidateNames(req), scheduleId);
            })
            .then(() => {
              res.redirect(`/schedules/${scheduleId}`);
            })
            .catch(next);
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
function createCandidates(candidateNames, scheduleId) {
  if (!candidateNames.length) {
    return Promise.resolve([]);
  }
  return (async function () {
    const candidates = candidateNames.map((c) => {
      return { candidateName: c, scheduleId: scheduleId };
    });
    return await Candidate.bulkCreate(candidates);
  })();
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
