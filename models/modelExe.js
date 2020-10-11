'use strict';
var User = require('./user');
var Schedule = require('./schedule');
var Availability = require('./availability');
var Candidate = require('./candidate');
var Comment = require('./comment');

const modelExe = (req, res, next) => {
  User.sync()
    .then(() => {
      Schedule.belongsTo(User, { foreignKey: 'createdBy' });
      return Schedule.sync();
    })
    .then(() => {
      Comment.belongsTo(User, { foreignKey: 'userId' });
      return Comment.sync();
    })
    .then(() => {
      Availability.belongsTo(User, { foreignKey: 'userId' });
      return Candidate.sync();
    })
    .then(() => {
      Availability.belongsTo(Candidate, { foreignKey: 'candidateId' });
      return Availability.sync();
    })
    .then(() => {
      next();
    })
    .catch(next);
};

module.exports = modelExe;
