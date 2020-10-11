require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');
// モデルの読み込み
var User = require('./models/user');
var Schedule = require('./models/schedule');
var Availability = require('./models/availability');
var Candidate = require('./models/candidate');
var Comment = require('./models/comment');
//var modelExe = require('./models/modelExe');

User.sync().then(() => {
  Schedule.belongsTo(User, { foreignKey: 'createdBy' });
  Schedule.sync();
  Comment.belongsTo(User, { foreignKey: 'userId' });
  Comment.sync();
  Availability.belongsTo(User, { foreignKey: 'userId' });
  Candidate.sync().then(() => {
    Availability.belongsTo(Candidate, { foreignKey: 'candidateId' });
    Availability.sync();
  });
});

const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_SECURE,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
const mailData = {
  from: 'suiran256@gmail.com',
  to: 'suiran256@gmail.com',
  //cc: 'cc1@example.com,cc2@example.com,cc3@example.com',
  //bcc: 'bcc1@example.com,bcc2@example.com,bcc3@example.com',
  text: 'test1\ntest2\nテスト3',
  //html: 'HTMLメール本文<br>HTMLメール本文<br>HTMLメール本文',
  subject: 'test',
};

var GitHubStrategy = require('passport-github2').Strategy;
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '2f831cb3d4aac02393aa';
var GITHUB_CLIENT_SECRET =
  process.env.GITHUB_CLIENT_SECRET ||
  '9fbc340ac0175123695d2dedfbdf5a78df3b8067';

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: process.env.HEROKU_URL
        ? process.env.HEROKU_URL + 'auth/github/callback'
        : 'http://localhost:8000/auth/github/callback',
    },
    function (accessToken, refreshToken, profile, done) {
      process.nextTick(function () {
        User.upsert({
          userId: profile.id,
          username: profile.username,
        }).then(() => {
          done(null, profile);
        });
      });
    }
  )
);

var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var schedulesRouter = require('./routes/schedules');
var availabilitiesRouter = require('./routes/availabilities');
var commentsRouter = require('./routes/comments');

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//app.use(modelExe);

app.use(
  session({
    name: 'sessionId',
    secret: 'e55be81b307c1c09',
    resave: false,
    saveUninitialized: false,
    cookie: {
      //secure: true,
      //httpOnly: true,
      //expires: new Date(new Date().getTime() + 1000 * 60),
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/schedules', schedulesRouter);
app.use('/schedules', availabilitiesRouter);
app.use('/schedules', commentsRouter);

app.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  function (req, res) {}
);

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res) {
    transporter.sendMail(mailData, (error, info) => {
      if (error) {
        console.log(error); // エラー情報
      } else {
        console.log(info); // 送信したメールの情報
      }
    });

    var loginFrom = req.cookies.loginFrom;
    // オープンリダイレクタ脆弱性対策
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

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
