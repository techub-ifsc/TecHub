require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const routes = require('./routes');
const swaggerSpec = require('./config/swagger');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// A interface do Swagger renderiza scripts e estilos embutidos, bloqueados pela
// política de segurança padrão do Helmet. Por isso, ela é desativada apenas na documentação.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/docs')) return next();
  return helmet()(req, res, next);
});

// FRONTEND_URL aceita várias origens separadas por vírgula; barras finais são ignoradas,
// pois o navegador envia a origem sem elas.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Requisições sem Origin (curl, server-to-server) não passam por CORS.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'E-commerce API Docs' }));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
