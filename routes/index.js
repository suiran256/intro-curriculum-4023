'use strict';
const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const { Schedule } = require('../models/index');
// const Schedule= require('../models/schedule');

router.get('/', (req, res, next) => {
  const title = 'title';
  if (req.user) {
    Schedule.findAll({
      where: {
        createdBy: req.user.id,
      },
      order: [['"updatedAt"', 'DESC']],
    }).then((schedules) => {
      schedules.forEach((schedule) => {
        schedule.formattedUpdatedAt = moment(schedule.updatedAt)
          .tz('Asia/Tokyo')
          .format('YYYY/MM/DD HH:mm');
      });
      res.render('index', {
        title: title,
        user: req.user,
        schedules: schedules,
      });
    });
  } else {
    res.render('index', { title: title, user: req.user });
  }
});

module.exports = router;
