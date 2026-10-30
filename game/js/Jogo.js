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
        this.pontuacao = new GerenciadorPontuacao(); // Usado para Single Player (fixo 100 pts)
        this.interface = new GerenciadorInterface();
        this.som = new GerenciadorSom();

        // Estados Multiplayer (com bônus de sequência / streak)
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
        this.turnoExpiraEm = 0;
        this.lastMatchesCount = 0;
    }

    reiniciarTimerTurno(duracaoMs = 20000) {
        this.turnoExpiraEm = Date.now() + duracaoMs;
        const turnoTempoEl = document.getElementById("turno-tempo");
        if (turnoTempoEl) {
            const segs = Math.ceil(duracaoMs / 1000);
            turnoTempoEl.textContent = `${segs}s`;
        }
    }

    iniciar(pares) {
        console.log(`[Jogo] Iniciando jogo com ${pares} pares. Modo: ${this.modo}`);
        this.totalPares = pares;
        this.paresEncontrados = 0;
        this.erros = 0;
        this._pares = pares;

        // Reset pontuações e streaks
        this.paresP1 = 0;
        this.paresP2 = 0;
        this.pontuacaoP1.resetar();
        this.pontuacaoP2.resetar();
        this.pontuacao.resetar();
        this.turnoAtual = 1;

        this.tabuleiro.criarCartas(pares);

        this.cronometro.iniciar((segundosAtuais) => {
            this.interface.atualizarTempo(segundosAtuais, this.modo);
        });

        this.bloqueado = true;
        setTimeout(() => {
            this.bloqueado = false;
            if (this.modo === 2) {
                this.reiniciarTimerTurno(20000);
                this.iniciarLoopTimerTurno();
            }
        }, 600);

        if (this.modo === 2) {
            this.interface.atualizarTurno(this.turnoAtual, false);
            this.interface.atualizarPontuacaoMulti(0, 0);
            this.interface.atualizarParesMulti(0, 0);
            this.reiniciarTimerTurno(20000);
        }

        this.interface.configurarEventosCartas((carta) => {
            this.lidarComClique(carta);
        });
    }

    iniciarOnline(state) {
        console.log(`[Jogo] Iniciando modo online`);
        this.totalPares = state.pairs;
        this.estadoOnline = state;
        this.lastMatchesCount = state.matches || 0;
        this.tabuleiro.renderizarCartasServidor(state.board);
        
        this.interface.atualizarTurno(1, false);
        this.interface.atualizarPontuacaoMulti(0, 0);
        this.interface.atualizarParesMulti(0, 0);

        this.cronometro.iniciar((segundosAtuais) => {
            this.interface.atualizarTempo(segundosAtuais, 2);
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
                const nomeAnimal = carta.dataset.animal && carta.dataset.animal !== 'desconhecida.png'
                    ? carta.dataset.animal.replace('.png', '')
                    : 'Uma carta secreta';
                console.log(`Jogador ${this.socketClient.role} escolheu ${nomeAnimal} (Online)`);
                this.socketClient.virarCarta(index);
            }
        });
        
        this.atualizarEstadoOnline(state);
        this.iniciarLoopTimerTurno();
    }

    atualizarEstadoOnline(state) {
        const mudouTurno = !this.estadoOnline || this.estadoOnline.currentTurn !== state.currentTurn;
        const houveAcerto = state.matches > this.lastMatchesCount;
        this.estadoOnline = state;
        
        // Sincroniza o cronômetro de turno de 20s usando o tempo restante relativo (imune a diferença de relógio)
        if ( typeof state.turnTimeRemainingMs === 'number' && (mudouTurno || houveAcerto || !this.turnoExpiraEm) ) {
            this.reiniciarTimerTurno(state.turnTimeRemainingMs);
        } else if (state.turnEndsAt && (mudouTurno || houveAcerto || !this.turnoExpiraEm)) {
            const restanteMs = Math.max(0, state.turnEndsAt - Date.now());
            this.reiniciarTimerTurno(restanteMs || 20000);
        }

        const cartasElementos = document.querySelectorAll(".carta");
        state.board.forEach((cardState, index) => {
            const cartaEl = cartasElementos[index];
            if (!cartaEl) return;
            
            // Atualiza a imagem e o nome dinamicamente caso o servidor revele o valor
            if (cardState.value) {
                const nomeAnimal = cardState.value.replace(/\.png$/i, '').replace(/-/g, ' ');
                const imgFront = cartaEl.querySelector('.frente img');
                if (imgFront && imgFront.src.includes('desconhecida.png')) {
                    imgFront.src = `assets/cartas/${cardState.value}`;
                    imgFront.alt = nomeAnimal;
                    cartaEl.dataset.animal = cardState.value;
                }
                const nomeEl = cartaEl.querySelector('.nome-animal');
                if (nomeEl && (nomeEl.textContent === 'DESCONHECIDA' || !nomeEl.textContent)) {
                    nomeEl.textContent = nomeAnimal;
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
        const myPlayer = state.players.find(p => p.role === this.socketClient.role) || { score: 0, matches: 0, streak: 0 };
        const otherPlayer = state.players.find(p => p.role !== this.socketClient.role) || { score: 0, matches: 0, streak: 0 };

        this.interface.atualizarPontuacaoMulti(myPlayer.score, otherPlayer.score);
        this.interface.atualizarParesMulti(myPlayer.matches, otherPlayer.matches);
        
        const isMyTurn = state.currentTurn === this.socketClient.role;
        const visualTurn = isMyTurn ? 1 : 2; 
        this.interface.atualizarTurno(visualTurn, true);
        
        const labelP1 = document.getElementById("label-p1");
        const labelP2 = document.getElementById("label-p2");
        if (labelP1 && labelP2) {
            labelP1.textContent = this.socketClient.role === 'PLAYER_1' ? "Você (P1)" : "Você (P2)";
            labelP2.textContent = this.socketClient.role === 'PLAYER_1' ? "Oponente (P2)" : "Oponente (P1)";
        }
        
        // Bloqueio do tabuleiro fora do turno ou durante animação
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
                areaTabuleiro.style.opacity = isMyTurn ? "1" : "0.75";
            }
        }
        
        // Toast e Efeitos Sonoros com base no lastMove e Streak
        if (state.lastMove === 'MATCH' && houveAcerto) {
            const pts = state.lastPointsEarned || 100;
            const streak = state.lastStreak || 1;
            const sufixoStreak = streak > 1 ? ` (${streak}x Seguido! +${pts} pts)` : ` (+${pts} pts)`;
            const msg = isMyTurn
                ? `Par encontrado!${sufixoStreak} Jogue novamente!`
                : `Oponente encontrou um par!${sufixoStreak}`;
            this.interface.exibirToast(msg, isMyTurn ? "#4f854d" : "#3b82f6");
            this.som.tocarAcerto();
        } else if (state.lastMove === 'MISMATCH' && this.lastMoveState !== 'MISMATCH') {
            this.som.tocarErro();
        }
        this.lastMoveState = state.lastMove;
        this.lastMatchesCount = state.matches || 0;
    }

    tratarTempoEsgotadoLocal() {
        // Caso o jogador tenha virado apenas 1 carta antes do tempo acabar, desvira ela
        if (this.primeiraCarta) {
            this.interface.desvirarCarta(this.primeiraCarta);
            this.primeiraCarta = null;
        }
        this.segundaCarta = null;

        // Zera a sequência (streak) do jogador que perdeu a vez por tempo
        if (this.turnoAtual === 1) {
            this.pontuacaoP1.registrarErro();
        } else {
            this.pontuacaoP2.registrarErro();
        }

        // Alterna o turno para o outro jogador
        this.turnoAtual = this.turnoAtual === 1 ? 2 : 1;
        this.interface.atualizarTurno(this.turnoAtual);
        this.som.tocarErro();
        this.interface.exibirToast(`⏳ Tempo esgotado! Vez do Jogador ${this.turnoAtual}`, "#d97706");

        // Reinicia os 20 segundos para o próximo jogador
        this.reiniciarTimerTurno(20000);
    }

    iniciarLoopTimerTurno() {
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
        
        const turnoTempoEl = document.getElementById("turno-tempo");
        if (!turnoTempoEl) return;

        this.turnTimerInterval = setInterval(() => {
            // Modo 2 Jogadores Local
            if (this.modo === 2) {
                if (this.bloqueado) {
                    turnoTempoEl.textContent = "...";
                    return;
                }
                const restantes = Math.max(0, Math.ceil((this.turnoExpiraEm - Date.now()) / 1000));
                turnoTempoEl.textContent = `${restantes}s`;
                turnoTempoEl.style.color = restantes <= 5 ? "#ef4444" : "#d97706";

                if (restantes <= 0) {
                    this.tratarTempoEsgotadoLocal();
                }
                return;
            }

            // Modo 3 Online
            if (this.modo === 3 && this.estadoOnline) {
                if (this.estadoOnline.isAnimating) {
                    turnoTempoEl.textContent = "...";
                    return;
                }
                const restantes = Math.max(0, Math.ceil((this.turnoExpiraEm - Date.now()) / 1000));
                turnoTempoEl.textContent = `${restantes}s`;
                turnoTempoEl.style.color = restantes <= 5 ? "#ef4444" : "#d97706";
            }
        }, 100);
    }

    finalizarOnline(data) {
        this.cronometro.parar();
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
        
        const tempoFinal = this.cronometro.segundos;
        this.som.tocarVitoria();
        
        const myPlayer = data.players.find(p => p.socketId === this.socketClient.socket.id) || { score: 0, id: '', misses: 0 };
        const otherPlayer = data.players.find(p => p.socketId !== this.socketClient.socket.id) || { score: 0, misses: 0 };
        const isWinner = data.winner === myPlayer.id;
        
        this.interface.mostrarModalVitoria(tempoFinal, myPlayer.misses || 0, myPlayer.score, this.modo, myPlayer.score, otherPlayer.score);
        const mensagem = document.getElementById("modal-mensagem-vitoria");
        if (data.reason === 'disconnect') {
            mensagem.textContent = "O oponente desconectou. Você venceu!";
        } else if (myPlayer.score === otherPlayer.score && !data.winner) {
            mensagem.textContent = "Deu Empate!";
        } else {
            mensagem.textContent = isWinner ? "Você venceu a partida online!" : "O oponente venceu!";
        }
    }

    lidarComClique(carta) {
        if (this.modo === 3) return; // Modo online usa WebSocket

        if (this.bloqueado) return;
        if (carta.classList.contains("virada")) return;
        if (carta.classList.contains("encontrado")) return;

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
            console.log(`✨ Par encontrado: ${nomeCarta1}!`);
            this.paresEncontrados++;
            this.som.tocarAcerto();

            let pontosGanhos = 100;
            let streakAtual = 1;

            if (this.modo === 1) {
                // Modo 1 Jogador (Single Player): Pontuação fixa de 100 pontos por acerto, sem bônus de sequência
                const resultado = this.pontuacao.registrarAcerto(false);
                pontosGanhos = resultado.pontosGanhos;
                this.interface.atualizarPontuacao(this.pontuacao.getPontuacao());
                this.interface.atualizarParesEncontrados(this.paresEncontrados);
            } else {
                // Modo 2 Jogadores: Pontuação com bônus por sequência (streak): 100 + (N - 1) * 50
                if (this.turnoAtual === 1) {
                    const resultado = this.pontuacaoP1.registrarAcerto(true);
                    pontosGanhos = resultado.pontosGanhos;
                    streakAtual = resultado.streak;
                    this.paresP1++;
                } else {
                    const resultado = this.pontuacaoP2.registrarAcerto(true);
                    pontosGanhos = resultado.pontosGanhos;
                    streakAtual = resultado.streak;
                    this.paresP2++;
                }
                this.interface.atualizarPontuacaoMulti(this.pontuacaoP1.getPontuacao(), this.pontuacaoP2.getPontuacao());
                this.interface.atualizarParesMulti(this.paresP1, this.paresP2);
                // Reinicia os 20s do turno para a nova jogada do mesmo jogador
                this.reiniciarTimerTurno(20000);
            }

            this.primeiraCarta.classList.add("encontrado");
            this.segundaCarta.classList.add("encontrado");

            const textoFlutuante = (this.modo !== 1 && streakAtual > 1)
                ? `+${pontosGanhos} (${streakAtual}x)`
                : `+${pontosGanhos}`;
            this.interface.mostrarPontosFlutuantes(this.segundaCarta, textoFlutuante, true);

            this.resetarSelecao();

            if (this.paresEncontrados === this.totalPares) {
                if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);
                setTimeout(() => this.finalizar(), 600);
            }

        } else {
            console.log(`❌ Erro: ${nomeCarta1} e ${nomeCarta2} não formam par.`);
            this.erros++;
            this.som.tocarErro();

            if (this.modo === 1) {
                // No modo 1 Jogador, registra o erro e zera qualquer contador sem descontar pontos
                this.pontuacao.registrarErro();
                this.interface.atualizarErros(this.erros);
            } else {
                // No modo 2 Jogadores, o erro zera a sequência (streak = 0) do jogador atual e passa a vez
                if (this.turnoAtual === 1) {
                    this.pontuacaoP1.registrarErro();
                } else {
                    this.pontuacaoP2.registrarErro();
                }
                this.turnoAtual = this.turnoAtual === 1 ? 2 : 1;
                this.interface.atualizarTurno(this.turnoAtual);
            }

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
            // Inicia os 20 segundos do próximo jogador assim que as cartas terminam de desvirar
            if (this.modo === 2) {
                this.reiniciarTimerTurno(20000);
            }
        }, 900);
    }

    resetarSelecao() {
        this.primeiraCarta = null;
        this.segundaCarta = null;
        this.bloqueado = false;
    }

    finalizar() {
        this.cronometro.parar();
        if (this.turnTimerInterval) clearInterval(this.turnTimerInterval);

        const tempoFinal = this.cronometro.segundos;
        const pontosFinal = this.pontuacao.getPontuacao();
        const ptsP1 = this.pontuacaoP1.getPontuacao();
        const ptsP2 = this.pontuacaoP2.getPontuacao();

        let gameModeStr = 'SOLO';
        if (this.modo === 2) gameModeStr = 'LOCAL_DUO';
        if (this.modo === 3) gameModeStr = 'MULTIPLAYER_ONLINE';

        fetch(window.API_URL + '/api/game-sessions', {
            method: 'POST',
            credentials: 'include',
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
