import Tabuleiro from "./Tabuleiro.js";
import Cronometro from "./Cronometro.js";
import GerenciadorPontuacao from "./GerenciadorPontuacao.js";
import GerenciadorInterface from "./GerenciadorInterface.js";
import GerenciadorSom from "./GerenciadorSom.js";

export default class Jogo {

    constructor() {
        this.tabuleiro = new Tabuleiro();
        this.cronometro = new Cronometro();
        this.pontuacao = new GerenciadorPontuacao();
        this.interface = new GerenciadorInterface();
        this.som = new GerenciadorSom();
    }

    iniciar() {

       this.tabuleiro.criarCartas();

        this.cronometro.iniciar();

        this.interface.configurarEventosCartas();
    }

    finalizar() {

        this.cronometro.parar();

        this.som.tocarVitoria();

        this.interface.mostrarMensagem(
            "Parabéns! Você venceu!"
        );
    }
}