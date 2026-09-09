/**
 * config.js — Configuração central da URL da API do backend
 *
 * Em desenvolvimento (localhost): aponta para o servidor local.
 * Em produção (Vercel): aponta para o backend no Render.
 *
 * ⚠️  IMPORTANTE: Substitua a URL abaixo pela URL real do seu serviço no Render.
 *    Exemplo: 'https://jogo-da-memoria-multiplayer.onrender.com'
 */
(function () {
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  window.API_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://memory-game-pibit-1.onrender.com'; // Render backend
})();
