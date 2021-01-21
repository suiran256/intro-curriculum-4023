/* eslint-disable no-unused-vars */
'use strict';
require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const logger = require('morgan');
const session = require('express-session');
const passport = require('passport');
const User = require('./models/index').User;

const app = express();
app.use(logger('dev'));
app.use(helmet());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: 'aaa', resave: false, saveUninitialized: false }));

const GitHubStrategy = require('passport-github2').Strategy;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/github/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      process.nextTick(() => {
        User.upsert({
          userId: profile.id,
          username: profile.username,
        }).then(() => done(null, profile));
      });
    }
  )
);

app.use(passport.initialize());
app.use(passport.session());

const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const schedulesRouter = require('./routes/schedules');
const availabilitiesRouter = require('./routes/availabilities');
const commentsRouter = require('./routes/comments');
app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/schedules', schedulesRouter);
app.use('/schedules', availabilitiesRouter);
app.use('/schedules', commentsRouter);
app.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  () => {}
);
app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    const loginFrom = req.cookies.loginFrom;
    if (
      loginFrom &&
      !loginFrom.includes('http://') &&
      !loginFrom.includes('https://')
    ) {
      res.clearCookie('loginFrom');
      res.redirect(loginFrom);
    } else {
      res.redirect('/');
    }
  }
);

app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.err = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
