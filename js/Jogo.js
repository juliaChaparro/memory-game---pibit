import Tabuleiro from "./Tabuleiro.js";
import Cronometro from "./Cronometro.js";
import GerenciadorPontuacao from "./GerenciadorPontuacao.js";
import GerenciadorInterface from "./GerenciadorInterface.js";
import GerenciadorSom from "./GerenciadorSom.js";

export default class Jogo {
    constructor(colunas, modo = 1) {
        this.colunas = colunas;
        this.modo = modo;
        this.tabuleiro = new Tabuleiro();
        this.cronometro = new Cronometro();
        this.pontuacao = new GerenciadorPontuacao(); // Usado para Single Player
        this.interface = new GerenciadorInterface();
        this.som = new GerenciadorSom();

        // Multiplayer states
        this.pontuacaoP1 = new GerenciadorPontuacao();
        this.pontuacaoP2 = new GerenciadorPontuacao();
        this.paresP1 = 0;
        this.paresP2 = 0;
        this.turnoAtual = 1; // 1 ou 2

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
        console.log(`[Jogo] Iniciando jogo com ${pares} pares. Modo: ${this.modo === 1 ? 'Single Player' : 'Multiplayer'}`);
        this.totalPares = pares;
        this.paresEncontrados = 0;
        this.erros = 0;
        this._pares = pares;

        // Reset multiplayer
        this.paresP1 = 0;
        this.paresP2 = 0;
        this.pontuacaoP1.resetar();
        this.pontuacaoP2.resetar();
        this.pontuacao.resetar();
        this.turnoAtual = 1;

        if (this.modo === 2) {
            this.interface.atualizarTurno(this.turnoAtual, false); // Não mostra popup no início
            this.interface.atualizarPontuacaoMulti(0, 0);
            this.interface.atualizarParesMulti(0, 0);
        }

        this.tabuleiro.criarCartas(pares);

        // Cronômetro — atualiza a interface a cada segundo
        this.cronometro.iniciar((segundosAtuais) => {
            this.interface.atualizarTempo(segundosAtuais, this.modo);
        });

        // Bloqueia cliques nos primeiros milissegundos para evitar toques duplos acidentais ao trocar de tela
        this.bloqueado = true;
        setTimeout(() => {
            this.bloqueado = false;
        }, 600);

        // Configura os cliques nas cartas
        this.interface.configurarEventosCartas((carta) => {
            this.lidarComClique(carta);
        });
    }

    lidarComClique(carta) {
        console.log(`[Jogo] Clique na carta: ${carta.dataset.animal || 'desconhecido'}`);
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
        console.log(`[Jogo] Verificando par: ${this.primeiraCarta.dataset.animal} e ${this.segundaCarta.dataset.animal} -> ${acertou ? 'ACERTO' : 'ERRO'}`);

        if (acertou) {
            // — Calcula pontos base (mais por dificuldade)
            const pontosBase = 100 + (this.colunas - 2) * 20;

            // — Bônus de velocidade: quanto mais rápido, mais pontos
            const segundosDecorridos = this.cronometro.segundos;
            const bonusVelocidade = Math.max(0, 30 - segundosDecorridos) * 2;

            const pontosGanhos = pontosBase + bonusVelocidade;

            this.paresEncontrados++;

            if (this.modo === 1) {
                this.pontuacao.adicionarPontos(pontosGanhos);
                this.interface.atualizarPontuacao(this.pontuacao.getPontuacao());
                this.interface.atualizarParesEncontrados(this.paresEncontrados);
            } else {
                if (this.turnoAtual === 1) {
                    this.pontuacaoP1.adicionarPontos(pontosGanhos);
                    this.paresP1++;
                } else {
                    this.pontuacaoP2.adicionarPontos(pontosGanhos);
                    this.paresP2++;
                }
                this.interface.atualizarPontuacaoMulti(this.pontuacaoP1.getPontuacao(), this.pontuacaoP2.getPontuacao());
                this.interface.atualizarParesMulti(this.paresP1, this.paresP2);
                // No acerto, o turno não muda (jogador joga novamente)
            }

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

            if (this.modo === 1) {
                this.pontuacao.removerPontos(penalidade);
                this.interface.atualizarPontuacao(this.pontuacao.getPontuacao());
                this.interface.atualizarErros(this.erros);
            } else {
                if (this.turnoAtual === 1) {
                    this.pontuacaoP1.removerPontos(penalidade);
                } else {
                    this.pontuacaoP2.removerPontos(penalidade);
                }
                this.interface.atualizarPontuacaoMulti(this.pontuacaoP1.getPontuacao(), this.pontuacaoP2.getPontuacao());
                // No erro, passa a vez
                this.turnoAtual = this.turnoAtual === 1 ? 2 : 1;
                this.interface.atualizarTurno(this.turnoAtual);
            }

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
        console.log('[Jogo] Jogo finalizado! Exibindo modal de vitória.');
        this.cronometro.parar(); // ← Para o tempo ao terminar

        const tempoFinal = this.cronometro.segundos;
        const pontosFinal = this.pontuacao.getPontuacao();
        const ptsP1 = this.pontuacaoP1.getPontuacao();
        const ptsP2 = this.pontuacaoP2.getPontuacao();

        // Envia dados para o backend (AJAX)
        fetch('http://localhost:3333/api/game-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                modo: this.modo,
                pares: this.totalPares,
                tempo: tempoFinal,
                pontuacao: this.modo === 1 ? pontosFinal : Math.max(ptsP1, ptsP2),
                erros: this.erros
            })
        }).then(res => {
            if (res.ok) console.log('Partida salva com sucesso no banco de dados!');
            else console.log('Erro ao salvar partida.');
        }).catch(err => console.error('Erro de conexão com o servidor', err));

        this.som.tocarVitoria();
        this.interface.mostrarModalVitoria(tempoFinal, this.erros, pontosFinal, this.modo, ptsP1, ptsP2);
    }

    destruir() {
        this.cronometro.parar();
    }
}