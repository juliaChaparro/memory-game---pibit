import crypto from 'crypto';

// Filtro de termos impróprios (expanda conforme necessário)
const PROFANITY_LIST = ['palavrao1', 'palavrao2', 'ofensa', 'admin', 'root'];

export function isValidUsername(username: string): boolean {
  // Regex: Entre 3 e 16 caracteres, apenas letras, números e underlines. Sem espaços.
  const regex = /^[a-zA-Z0-9_]{3,16}$/;
  return regex.test(username);
}

export function containsProfanity(username: string): boolean {
  const lowerUsername = username.toLowerCase();
  return PROFANITY_LIST.some(word => lowerUsername.includes(word));
}

export function generatePlayerTag(): string {
  // Gera uma tag aleatória no formato #XXXXXX (Hexadecimal)
  return '#' + crypto.randomBytes(3).toString('hex').toUpperCase();
}
