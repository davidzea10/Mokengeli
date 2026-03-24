const express = require('express');
const cors = require('cors');

const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

const corsOptions = {
  credentials: true,
  origin:
    config.corsOrigins.length > 0
      ? config.corsOrigins
      : true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
