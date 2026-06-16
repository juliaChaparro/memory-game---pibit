export default class GerenciadorPontuacao {
    constructor() {
        this.pontos = 0;
    }

    adicionarPontos(valor = 10) {
        this.pontos += valor;
    }

    removerPontos(valor = 5) {
        this.pontos -= valor;
    }

    getPontuacao() {
        return this.pontos;
    }

    resetar() {
        this.pontos = 0;
    }
}