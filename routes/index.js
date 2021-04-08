'use strict';
const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const { Schedule } = require('../models/index');

function showIndex(req, res, next) {
  (async () => {
    const title = 'title';
    let fetchSchedules = async () => [];
    if (req.user) {
      fetchSchedules = async () => {
        const schedules = await Schedule.findAll({
          order: [['"updatedAt"', 'DESC']],
        });
        schedules.forEach((schedule) => {
          schedule.formattedUpdatedAt = moment(schedule.updatedAt)
            .tz('Asia/Tokyo')
            .format('YYYY/MM/DD HH:mm');
        });
        return schedules;
      };
    }
    const schedules = await fetchSchedules();
    res.render('index', {
      title: title,
      user: req.user,
      schedules: schedules,
    });
  })().catch(next);
}

router.get('/', showIndex);

module.exports = router;
