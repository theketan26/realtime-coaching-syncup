var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var port = 3000;

// Initialize database and Redis connections
var pool = require('./db');
var redisClient = require('./redis');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var feedRouter = require('./routes/feed');

var app = express();

// Make database and Redis accessible to routes
app.locals.db = pool;
app.locals.redis = redisClient;

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/feed', feedRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Check database and Redis connections before starting the server
Promise.all([
  pool.query('SELECT NOW()'),
  redisClient.connect(),
])
  .then(() => {
    console.log('Database connected successfully');
    console.log('Redis connected successfully');
    app.listen(port, () => {
      console.log(`Real time coaching app listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });

module.exports = app;
