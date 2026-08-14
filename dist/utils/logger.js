"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize } = winston_1.default.format;
// Mask sensitive data
const maskData = winston_1.default.format((info) => {
    if (info.message && typeof info.message === 'string') {
        // Basic redaction of JWTs (Header.Payload.Signature)
        info.message = info.message.replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[MASKED_JWT]');
    }
    return info;
});
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let metaStr = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
});
exports.logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), maskData(), winston_1.default.format.json() // Production structured logging
    ),
    transports: [
        new winston_1.default.transports.Console({
            format: combine(colorize(), customFormat)
        })
    ]
});
//# sourceMappingURL=logger.js.map