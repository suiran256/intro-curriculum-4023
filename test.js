require('dotenv').config();
var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');
var app = express();
const nodemailer = require('nodemailer');
