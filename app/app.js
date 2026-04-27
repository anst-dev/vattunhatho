const express = require('express');
const path = require('path');
const morgan = require('morgan');

const webRoutes = require('./routes/webRoutes');
const materialRoutes = require('./routes/materialRoutes');
const supplyRoutes = require('./routes/supplyRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', webRoutes);
app.use('/materials', materialRoutes);
app.use('/supplies', supplyRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;
