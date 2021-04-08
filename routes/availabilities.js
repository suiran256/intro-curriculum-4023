'use strict';

const authenticationEnsurer = require('./authentication-ensurer');
const express = require('express');
const { Availability } = require('../models/index');
const router = express.Router();

function fnUpsertAvailability(req, res, next) {
  (async () => {
    const scheduleId = req.params.scheduleId;
    const userId = req.params.userId;
    const candidateId = req.params.candidateId;
    let availability = req.body.availability;
    availability = availability ? parseInt(availability) : 0;
    await Availability.upsert({
      scheduleId: scheduleId,
      userId: userId,
      candidateId: candidateId,
      availability: availability,
    });
    res.json({ status: 'OK', availability: availability });
  })().catch(next);
}

router.post(
  '/:scheduleId/users/:userId/candidates/:candidateId',
  authenticationEnsurer,
  fnUpsertAvailability
);

module.exports = router;
