import Tabuleiro from "./Tabuleiro.js";
import Cronometro from "./Cronometro.js";
import GerenciadorPontuacao from "./GerenciadorPontuacao.js";
import GerenciadorInterface from "./GerenciadorInterface.js";
import GerenciadorSom from "./GerenciadorSom.js";

export default class Jogo {
    constructor(colunas, modo = 1) {
        this.colunas = colunas;
        this.modo = modo; // 1: Single, 2: Local, 3: Online
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
        
        this.socketClient = null;
        this.turnTimerInterval = null;
    }

    iniciar(pares) {
        console.log(`[Jogo] Iniciando jogo com ${pares} pares. Modo: ${this.modo}`);
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
            this.interface.atualizarTurno(this.turnoAtual, false);
            this.interface.atualizarPontuacaoMulti(0, 0);
            this.interface.atualizarParesMulti(0, 0);
        }

        this.tabuleiro.criarCartas(pares);

        this.cronometro.iniciar((segundosAtuais) => {
            this.interface.atualizarTempo(segundosAtuais, this.modo);
        });

        this.bloqueado = true;
        setTimeout(() => {
            this.bloqueado = false;
        }, 600);

        this.interface.configurarEventosCartas((carta) => {
            this.lidarComClique(carta);
        });
    }

    iniciarOnline(state) {
        console.log(`[Jogo] Iniciando modo online`);
        this.totalPares = state.pairs;
        this.estadoOnline = state; // Guardar o estado no Jogo para não perder a referência na closure
        this.tabuleiro.renderizarCartasServidor(state.board);
        
        this.interface.atualizarTurno(state.turnIndex + 1, false);
        this.interface.atualizarPontuacaoMulti(0, 0);
        this.interface.atualizarParesMulti(0, 0);

        this.cronometro.iniciar((segundosAtuais) => {
            this.interface.atualizarTempo(segundosAtuais, this.modo);
        });

        this.interface.configurarEventosCartas((carta) => {
            if (this.bloqueado) return;
            
            // Verifica se é a minha vez com o estado mais atual
            if (this.estadoOnline.currentTurn !== this.socketClient.role) {
                console.log("[Jogo] Clique ignorado: não é sua vez.");
                return;
            }
            
            const index = parseInt(carta.dataset.index);
            if (!carta.classList.contains("virada") && !carta.classList.contains("encontrado")) {
                const nomeAnimal = carta.dataset.animal && carta.dataset.animal !== 'desconhecida.png' ? carta.dataset.animal.replace('.png', '') : 'Uma carta secreta';
                console.log(`Jogador ${this.socketClient.role} escolheu ${nomeAnimal} (Online)`);
                // Renderização Otimista Opcional (Front-end fake flip): 
                // this.interface.virarCarta(carta);
                this.socketClient.virarCarta(index);
            }
        });
        
        this.iniciarLoopTimerTurno();
        this.atualizarEstadoOnline(state);
    }

    atualizarEstadoOnline(state) {
        this.estadoOnline = state; // Atualiza a referência global
        
        const cartasElementos = document.querySelectorAll(".carta");
        state.board.forEach((cardState, index) => {
            const cartaEl = cartasElementos[index];
            
            // Atualiza a imagem dinamicamente caso o servidor revele o valor
            if (cardState.value) {
                 const imgFront = cartaEl.querySelector('.frente img');
                 if (imgFront && imgFront.src.includes('desconhecida.png')) {
                     imgFront.src = `assets/cartas/${cardState.value}`;
                     imgFront.alt = cardState.value.replace('.png', '');
                     cartaEl.dataset.animal = cardState.value;
                 }
            }

            if (cardState.isMatched) {
                this.interface.virarCarta(cartaEl);
                cartaEl.classList.add("encontrado");
            } else if (cardState.isFlipped) {
                this.interface.virarCarta(cartaEl);
            } else {
                this.interface.desvirarCarta(cartaEl);
            }
        });

        // Configura a identificação visual baseado no role
        const myPlayer = state.players.find(p => p.role === this.socketClient.role) || { score: 0, matches: 0 };
        const otherPlayer = state.players.find(p => p.role !== this.socketClient.role) || { score: 0, matches: 0 };

        this.interface.atualizarPontuacaoMulti(myPlayer.score, otherPlayer.score);
        this.interface.atualizarParesMulti(myPlayer.matches, otherPlayer.matches);
        
        const isMyTurn = state.currentTurn === this.socketClient.role;
        const visualTurn = isMyTurn ? 1 : 2; 
        this.interface.atualizarTurno(visualTurn, true);
        
        const labelP1 = document.getElementById("label-p1");
        const labelP2 = document.getElementById("label-p2");
        if (labelP1 && labelP2) {
            labelP1.textContent = this.socketClient.role === 'PLAYER_1' ? "Você (P1)" : "Oponente (P1)";
            labelP2.textContent = this.socketClient.role === 'PLAYER_2' ? "Você (P2)" : "Oponente (P2)";
        }
        
        // Bloqueio visual impenetrável do tabuleiro
        const areaTabuleiro = document.getElementById("tabuleiro");
        if (isMyTurn && !state.isAnimating) {
            this.bloqueado = false;
            if (areaTabuleiro) {
                areaTabuleiro.style.pointerEvents = "auto";
                areaTabuleiro.style.opacity = "1";
            }
        } else {
            this.bloqueado = true;
            if (areaTabuleiro) {
                areaTabuleiro.style.pointerEvents = "none";
                areaTabuleiro.style.opacity = isMyTurn ? "1" : "0.7";
            }
        }
    }

    iniciarLoopTimerTurno() {
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
        
        const turnoTempoEl = document.getElementById("turno-tempo");
        if (!turnoTempoEl) return;

        this.turnTimerInterval = setInterval(() => {
            if (!this.estadoOnline) return;
            
            if (this.estadoOnline.isAnimating) {
                turnoTempoEl.textContent = "...";
                return;
            }

            if (this.estadoOnline.turnEndsAt) {
                const restantes = Math.max(0, Math.ceil((this.estadoOnline.turnEndsAt - Date.now()) / 1000));
                turnoTempoEl.textContent = `${restantes}s`;
            } else {
                turnoTempoEl.textContent = "20s";
            }
        }, 100);
    }

    finalizarOnline(data) {
        this.cronometro.parar();
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
        
        const tempoFinal = this.cronometro.segundos;
        this.som.tocarVitoria();
        
        this.som.tocarVitoria();
        
        // Determina pts
        const myPlayer = data.players.find(p => p.socketId === this.socketClient.socket.id) || { score: 0, id: '' };
        const otherPlayer = data.players.find(p => p.socketId !== this.socketClient.socket.id) || { score: 0 };
        const isWinner = data.winner === myPlayer.id;
        
        this.interface.mostrarModalVitoria(tempoFinal, 0, 0, this.modo, myPlayer.score, otherPlayer.score);
        const mensagem = document.getElementById("modal-mensagem-vitoria");
        if (data.reason === 'disconnect') {
            mensagem.textContent = "O oponente desconectou. Você venceu!";
        } else {
            mensagem.textContent = isWinner ? "Você venceu!" : "Você perdeu!";
        }
    }

    lidarComClique(carta) {
        if (this.modo === 3) return; // Modo online não usa essa lógica local

        if (this.bloqueado) return;
        if (carta.classList.contains("virada")) return;
        if (carta.classList.contains("encontrado")) return;

        const index = carta.dataset.index;
        const nomeAnimal = carta.dataset.animal ? carta.dataset.animal.replace('.png', '') : 'Desconhecido';
        if (this.modo === 2) {
            console.log(`Jogador ${this.turnoAtual} escolheu a carta: ${nomeAnimal} (Local)`);
        } else {
            console.log(`Você escolheu a carta: ${nomeAnimal} (Solo)`);
        }

        this.interface.virarCarta(carta);

        if (!this.primeiraCarta) {
            this.primeiraCarta = carta;
            return;
        }

        if (this.primeiraCarta === carta) return;

        this.segundaCarta = carta;
        this.bloqueado = true;
        this.verificarPar();
    }

    verificarPar() {
        const nomeCarta1 = this.primeiraCarta.dataset.animal.replace('.png', '');
        const nomeCarta2 = this.segundaCarta.dataset.animal.replace('.png', '');
        const acertou = nomeCarta1 === nomeCarta2;

        if (acertou) {
            console.log(`✨ Você acertou o par de: ${nomeCarta1}!`);
            const pontosBase = 100 + (this.colunas - 2) * 20;
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
            }

            this.primeiraCarta.classList.add("encontrado");
            this.segundaCarta.classList.add("encontrado");

            this.interface.mostrarPontosFlutuantes(this.segundaCarta, `+${pontosGanhos}`, true);

            this.resetarSelecao();

            if (this.paresEncontrados === this.totalPares) {
                setTimeout(() => this.finalizar(), 600);
            }

        } else {
            console.log(`❌ Que pena! Você errou: tentou juntar ${nomeCarta1} com ${nomeCarta2}`);
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
                this.turnoAtual = this.turnoAtual === 1 ? 2 : 1;
                this.interface.atualizarTurno(this.turnoAtual);
            }

            this.interface.mostrarPontosFlutuantes(this.segundaCarta, `-${penalidade}`, false);
            this.desvirarCartas();
        }
    }

    desvirarCartas() {
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
        this.cronometro.parar();

        const tempoFinal = this.cronometro.segundos;
        const pontosFinal = this.pontuacao.getPontuacao();
        const ptsP1 = this.pontuacaoP1.getPontuacao();
        const ptsP2 = this.pontuacaoP2.getPontuacao();

        let gameModeStr = 'SOLO';
        if (this.modo === 2) gameModeStr = 'LOCAL_DUO';
        if (this.modo === 3) gameModeStr = 'MULTIPLAYER_ONLINE';

        fetch('/api/game-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameMode: gameModeStr,
                score: this.modo === 1 ? pontosFinal : Math.max(ptsP1, ptsP2),
                hits: this._pares,
                misses: this.erros,
                totalMoves: this._pares + this.erros,
                timeSpent: tempoFinal
            })
        }).then(res => {
            if (res.ok) console.log('Partida salva com sucesso no banco de dados!');
        }).catch(err => console.error('Erro de conexão', err));

        this.som.tocarVitoria();
        this.interface.mostrarModalVitoria(tempoFinal, this.erros, pontosFinal, this.modo, ptsP1, ptsP2);
    }

    destruir() {
        this.cronometro.parar();
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
    }
}