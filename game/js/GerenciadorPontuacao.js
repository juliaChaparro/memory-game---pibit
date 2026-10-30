export default class GerenciadorPontuacao {
    constructor() {
        this.pontos = 0;
        this.streak = 0;
    }

    /**
     * Calcula os pontos de acordo com a regra:
     * - Sem streak (Single Player): sempre 100 pontos fixos por acerto.
     * - Com streak (Multiplayer 2 Jogadores / Online):
     *   Fórmula para N acertos consecutivos (N >= 1):
     *   Pontos = 100 + (N - 1) * 50
     *   (1º = 100, 2º = 150, 3º = 200, 4º = 250, ...)
     */
    static calcularPontos(streak = 1, usarStreak = false) {
        if (!usarStreak) {
            return 100;
        }
        const n = Math.max(1, streak);
        return 100 + (n - 1) * 50;
    }

    /**
     * Registra um acerto e retorna os detalhes da pontuação obtida.
     * @param {boolean} usarStreak - true para Modo 2 Jogadores / Online, false para 1 Jogador (Solo)
     */
    registrarAcerto(usarStreak = false) {
        if (usarStreak) {
            this.streak += 1;
        } else {
            this.streak = 1;
        }

        const pontosGanhos = GerenciadorPontuacao.calcularPontos(this.streak, usarStreak);
        this.pontos += pontosGanhos;

        return {
            pontosGanhos,
            streak: this.streak,
            total: this.pontos
        };
    }

    /**
     * Em caso de erro, o contador de acertos consecutivos (streak) é zerado (N = 0).
     */
    registrarErro() {
        this.streak = 0;
    }

    /**
     * Compatibilidade direta caso seja chamado manualmente.
     */
    adicionarPontos(valor = 100) {
        this.pontos += valor;
    }

    getPontuacao() {
        return this.pontos;
    }

    getStreak() {
        return this.streak;
    }

    resetar() {
        this.pontos = 0;
        this.streak = 0;
    }
}
