import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { basicRateLimiter } from './middlewares/rateLimiter';
import apiRoutes from './routes';
import { setupSwagger } from './config/swagger';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter
app.use(basicRateLimiter);

// Routes
app.use('/api', apiRoutes);

// Setup Swagger
setupSwagger(app);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Auth Service is running' });
});

// Error handling
app.use(errorHandler);

const PORT = env.PORT || 3000;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Auth Service started on port ${PORT} (Listening on all interfaces / 0.0.0.0)`);
});
