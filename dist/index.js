"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middlewares/errorHandler");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const routes_1 = __importDefault(require("./routes"));
const swagger_1 = require("./config/swagger");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiter
app.use(rateLimiter_1.basicRateLimiter);
// Routes
app.use('/api', routes_1.default);
// Setup Swagger
(0, swagger_1.setupSwagger)(app);
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Auth Service is running' });
});
// Error handling
app.use(errorHandler_1.errorHandler);
const PORT = env_1.env.PORT || 3000;
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Auth Service started on port ${PORT} (Listening on all interfaces / 0.0.0.0)`);
});
