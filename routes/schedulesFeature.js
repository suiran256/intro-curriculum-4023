//* eslint-disable no-unused-vars */
'use strict';

const express = require('express');
const router = express.Router();
const uuid = require('uuid');
const createError = require('http-errors');
const authenticationEnsurer = require('./authentication-ensurer');
const csrfProtection = require('csurf')({ cookie: true });
const {
  User,
  Schedule,
  Candidate,
  Availability,
  Comment,
} = require('../models/index');

router.get('/new', authenticationEnsurer, csrfProtection, (req, res) => {
  res.render('new', { user: req.user, csrfToken: req.csrfToken() });
});

router.post('/', authenticationEnsurer, csrfProtection, (req, res, next) => {
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
      createCandidates(req, scheduleId).then(() => {
        res.redirect(`/schedules/${scheduleId}`);
      });
    })
    .catch(next);
});

router.get('/:scheduleId', authenticationEnsurer, (req, res, next) => {
  return (async () => {
    const scheduleId = req.params.scheduleId;
    const schedule = await Schedule.findByPk(scheduleId, {
      include: { model: User, attributes: ['userId', 'username'] },
    });
    if (!schedule) throw createError(404, 'scheduleId notFound');

    const candidates = Candidate.findAll({
      where: { scheduleId: scheduleId },
      order: [['"candidateId"', 'ASC']],
    });
    const createAvailabilityMapMapUserMap = Availability.findAll({
      include: { model: User, attributes: ['userId', 'username'] },
      where: { scheduleId: scheduleId },
      order: [[User, '"username"', 'ASC']],
    }).then((availabilities) => {
      const availabilityMapMap = new Map();
      const userMapWork = new Map();
      const userIdMe = Number(req.user.id);

      availabilities.forEach((a) => {
        userMapWork.set(a.User);
        const userId = a.User.userId;
        const map = availabilityMapMap.get(userId) || new Map();
        map.set(a.candidateId, a.availability);
        availabilityMapMap.set(userId, map);
      });
      const userMe = userMapWork.get(userIdMe) || {
        userId: userIdMe,
        username: req.user.username,
      };
      const userMap = userMapWork.delete(userIdMe);
      return { userMe, userMap, availabilityMapMap };
    });
    const createCommentMap = Comment.findAll({
      where: { scheduleId: scheduleId },
    }).then((comments) => {
      const commentMap = new Map();
      comments.forEach((c) => {
        commentMap.set(c.userId, c.comment);
      });
      return { commentMap };
    });
    const [
      { userMe, userMap, availabilityMapMap },
      commentMap,
    ] = await Promise.all([createAvailabilityMapMapUserMap, createCommentMap]);
    res.render('schedule', {
      user: req.user,
      schedule,
      candidates,
      userMe,
      userMap,
      availabilityMapMap,
      commentMap,
    });
  })().catch(next);
});

router.get(
  '/:scheduleId/edit',
  authenticationEnsurer,
  csrfProtection,
  (req, res, next) => {
    (async () => {
      const scheduleId = req.params.scheduleId;
      const schedule = await Schedule.findByPk(scheduleId);
      if (!isUpdatable(req, schedule))
        throw createError(
          404,
          '(scheduleId not Found) or (you cant authenticate)'
        );
      const candidates = await Candidate.findAll({
        where: { scheduleId: scheduleId },
        order: [['"candidateId"', 'ASC']],
      });
      res.render('edit', {
        user: req.user,
        schedule,
        candidates,
        csrfToken: req.csrfToken(),
      });
    })().catch(next);
  }
);

router.post(
  '/:scheduleId',
  authenticationEnsurer,
  csrfProtection,
  (req, res, next) => {
    (async () => {
      const scheduleId = req.params.scheduleId;
      const schedule = await Schedule.findByPk(scheduleId);
      if (!isUpdatable(req, schedule)) throw createError(404, 'notFound');
      let retAsync = null;
      if (Number(req.query.edit) === 1) {
        retAsync = async () => {
          const updatedAt = new Date();
          await schedule.update({
            scheduleName: req.body.scheduleName.slice(0, 255) || 'noname',
            memo: req.body.memo,
            updatedAt: updatedAt,
          });
          await createCandidates(req, scheduleId);
          res.redirect(`/schedules/${scheduleId}`);
        };
      } else if (Number(req.query.delete) === 1) {
        retAsync = async () => {
          await deleteScheduleAggregate(scheduleId);
          res.redirect('/');
        };
      }
      await retAsync();
    })().catch(next);
  }
);

function createCandidates(req, scheduleId) {
  const candidateNamesRaw = req.body.candidates || '';
  const candidates = candidateNamesRaw
    .slice('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map((name) => ({ candidateName: name, scheduleId: scheduleId }));
  return Candidate.bulkCreate(candidates);
}
function isUpdatable(req, schedule) {
  return schedule && Number(req.user.id) === schedule.createdBy;
}

function deleteScheduleAggregate(scheduleId) {
  return (async () => {
    const asyncDeleteInstances = async (Model) => {
      const promises = Model.findAll({
        where: { scheduleId: scheduleId },
      }).then((instances) => instances.map((instance) => instance.destroy()));
      await Promise.all(promises);
      return;
    };
    await Promise.all([
      asyncDeleteInstances(Availability)().then(
        asyncDeleteInstances(Candidate)()
      ),
      asyncDeleteInstances(Comment)(),
    ]);
    await asyncDeleteInstances(Schedule)();
  })();
}

module.exports = router;
