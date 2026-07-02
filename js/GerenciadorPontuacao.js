export default class GerenciadorPontuacao {
    constructor() {
        this.pontos = 0;
    }

    /**
     * Adiciona pontos. Pontos nunca ficam negativos.
     */
    adicionarPontos(valor = 100) {
        this.pontos += valor;
    }

    /**
     * Remove pontos por erro. Mínimo zero.
     */
    removerPontos(valor = 10) {
        this.pontos = Math.max(0, this.pontos - valor);
    }

    getPontuacao() {
        return this.pontos;
    }

    resetar() {
        this.pontos = 0;
    }
}