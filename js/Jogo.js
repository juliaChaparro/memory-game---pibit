import Tabuleiro from "./Tabuleiro.js";
import Cronometro from "./Cronometro.js";
import GerenciadorPontuacao from "./GerenciadorPontuacao.js";
import GerenciadorInterface from "./GerenciadorInterface.js";
import GerenciadorSom from "./GerenciadorSom.js";

export default class Jogo {
    constructor(colunas) {
        this.colunas = colunas;
        this.tabuleiro = new Tabuleiro();
        this.cronometro = new Cronometro();
        this.pontuacao = new GerenciadorPontuacao();
        this.interface = new GerenciadorInterface();
        this.som = new GerenciadorSom();

        this.primeiraCarta = null;
        this.segundaCarta = null;
        this.bloqueado = false;

        this.totalPares = 0;
        this.paresEncontrados = 0;
        this.erros = 0;

        // referência para guardar os pares (usada pelo menu jogar novamente)
        this._pares = 0;
    }

    iniciar(pares) {
        this.totalPares = pares;
        this.paresEncontrados = 0;
        this.erros = 0;
        this._pares = pares;

        this.tabuleiro.criarCartas(pares);

        // Cronômetro — atualiza a interface a cada segundo
        this.cronometro.iniciar((segundosAtuais) => {
            this.interface.atualizarTempo(segundosAtuais);
        });

        // Configura os cliques nas cartas
        this.interface.configurarEventosCartas((carta) => {
            this.lidarComClique(carta);
        });
    }

    lidarComClique(carta) {
        // Bloqueia cliques se o jogo estiver bloqueado ou se a carta já estiver encontrada/virada
        if (this.bloqueado) return;
        if (carta.classList.contains("virada")) return;
        if (carta.classList.contains("encontrado")) return;

        // Vira a carta visualmente
        this.interface.virarCarta(carta);

        if (!this.primeiraCarta) {
            this.primeiraCarta = carta;
            return;
        }

        // Impede clicar duas vezes na mesma carta
        if (this.primeiraCarta === carta) return;

        this.segundaCarta = carta;
        this.bloqueado = true;
        this.verificarPar();
    }

    verificarPar() {
        const acertou = this.primeiraCarta.dataset.animal === this.segundaCarta.dataset.animal;

        if (acertou) {
            // — Calcula pontos base (mais por dificuldade)
            const pontosBase = 100 + (this.colunas - 2) * 20;

            // — Bônus de velocidade: quanto mais rápido, mais pontos
            const segundosDecorridos = this.cronometro.segundos;
            const bonusVelocidade = Math.max(0, 30 - segundosDecorridos) * 2;

            const pontosGanhos = pontosBase + bonusVelocidade;

            this.pontuacao.adicionarPontos(pontosGanhos);
            this.paresEncontrados++;

            this.interface.atualizarPontuacao(this.pontuacao.getPontuacao());
            this.interface.atualizarParesEncontrados(this.paresEncontrados);

            // Marca cartas como encontradas
            this.primeiraCarta.classList.add("encontrado");
            this.segundaCarta.classList.add("encontrado");

            // Mostra pontos flutuantes na segunda carta
            this.interface.mostrarPontosFlutuantes(this.segundaCarta, `+${pontosGanhos}`, true);

            this.resetarSelecao();

            // Verifica se terminou
            if (this.paresEncontrados === this.totalPares) {
                // Pequeno delay para a animação da última carta terminar
                setTimeout(() => this.finalizar(), 600);
            }

        } else {
            // Erro: penalidade
            this.erros++;
            const penalidade = 10;
            this.pontuacao.removerPontos(penalidade);

            this.interface.atualizarPontuacao(this.pontuacao.getPontuacao());
            this.interface.atualizarErros(this.erros);
            this.interface.mostrarPontosFlutuantes(this.segundaCarta, `-${penalidade}`, false);

            this.desvirarCartas();
        }
    }

    desvirarCartas() {
        // Animação de "shake" visual
        this.primeiraCarta.classList.add("shake");
        this.segundaCarta.classList.add("shake");

        setTimeout(() => {
            this.interface.desvirarCarta(this.primeiraCarta);
            this.interface.desvirarCarta(this.segundaCarta);
            this.primeiraCarta.classList.remove("shake");
            this.segundaCarta.classList.remove("shake");
            this.resetarSelecao();
        }, 900);
    }

    resetarSelecao() {
        this.primeiraCarta = null;
        this.segundaCarta = null;
        this.bloqueado = false;
    }

    finalizar() {
        this.cronometro.parar(); // ← Para o tempo ao terminar

        const tempoFinal = this.cronometro.segundos;
        const pontosFinal = this.pontuacao.getPontuacao();

        this.som.tocarVitoria();
        this.interface.mostrarModalVitoria(tempoFinal, this.erros, pontosFinal);
    }

    destruir() {
        this.cronometro.parar();
    }
}