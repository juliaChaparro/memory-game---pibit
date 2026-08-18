"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUsername = isValidUsername;
exports.containsProfanity = containsProfanity;
exports.generatePlayerTag = generatePlayerTag;
const crypto_1 = __importDefault(require("crypto"));
// Filtro de termos impróprios (expanda conforme necessário)
const PROFANITY_LIST = ['palavrao1', 'palavrao2', 'ofensa', 'admin', 'root'];
function isValidUsername(username) {
    // Regex: Entre 3 e 16 caracteres, apenas letras, números e underlines. Sem espaços.
    const regex = /^[a-zA-Z0-9_]{3,16}$/;
    return regex.test(username);
}
function containsProfanity(username) {
    const lowerUsername = username.toLowerCase();
    return PROFANITY_LIST.some(word => lowerUsername.includes(word));
}
function generatePlayerTag() {
    // Gera uma tag aleatória no formato #XXXXXX (Hexadecimal)
    return '#' + crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
}
//# sourceMappingURL=validation.js.map