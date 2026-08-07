export default class GerenciadorInterface {
    constructor() {
        this.pontuacaoElemento = document.getElementById("pontuacao");
        this.tempoElemento = document.getElementById("tempo");
        this.tempoMultiElemento = document.getElementById("tempo-multi");
        this.paresEncontradosElemento = document.getElementById("pares-encontrados");
        this.errosElemento = document.getElementById("erros");

        // Multiplayer elements
        this.pontuacaoP1Elemento = document.getElementById("pontuacao-p1");
        this.pontuacaoP2Elemento = document.getElementById("pontuacao-p2");
        this.paresP1Elemento = document.getElementById("pares-p1");
        this.paresP2Elemento = document.getElementById("pares-p2");
        this.boxP1 = document.getElementById("box-p1");
        this.boxP2 = document.getElementById("box-p2");
    }

    configurarEventosCartas(callback) {
        const cartas = document.querySelectorAll(".carta");
        cartas.forEach(carta => {
            carta.addEventListener("click", () => {
                if (callback) callback(carta);
            });
        });
    }

    atualizarPontuacao(pontos) {
        if (this.pontuacaoElemento) {
            this.pontuacaoElemento.textContent = Math.max(0, pontos);
        }
    }

    atualizarTempo(segundos, modo = 1) {
        const m = Math.floor(segundos / 60);
        const s = segundos % 60;
        const texto = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        
        if (modo === 1 && this.tempoElemento) {
            this.tempoElemento.textContent = texto;
        } else if (modo === 2 && this.tempoMultiElemento) {
            this.tempoMultiElemento.textContent = texto;
        }
    }

    atualizarParesEncontrados(pares) {
        if (this.paresEncontradosElemento) {
            this.paresEncontradosElemento.textContent = pares;
        }
    }

    atualizarErros(erros) {
        if (this.errosElemento) {
            this.errosElemento.textContent = erros;
        }
    }

    // --- MÉTODOS DO MULTIPLAYER ---
    atualizarPontuacaoMulti(pontosP1, pontosP2) {
        if (this.pontuacaoP1Elemento) this.pontuacaoP1Elemento.textContent = Math.max(0, pontosP1);
        if (this.pontuacaoP2Elemento) this.pontuacaoP2Elemento.textContent = Math.max(0, pontosP2);
    }

    atualizarParesMulti(paresP1, paresP2) {
        if (this.paresP1Elemento) this.paresP1Elemento.textContent = `${paresP1} pares`;
        if (this.paresP2Elemento) this.paresP2Elemento.textContent = `${paresP2} pares`;
    }

    atualizarTurno(turno, mostrarPopup = true) {
        if (this.boxP1 && this.boxP2) {
            if (turno === 1) {
                this.boxP1.classList.add("turno-ativo");
                this.boxP2.classList.remove("turno-ativo");
            } else {
                this.boxP2.classList.add("turno-ativo");
                this.boxP1.classList.remove("turno-ativo");
            }
        }

        const alerta = document.getElementById("alerta-turno");
        if (!alerta) return;

        if (!mostrarPopup) {
            alerta.classList.add("oculto");
            return;
        }

        // Exibir aviso flutuante gigante de turno
        // Remove as classes para reiniciar a animação e reflow
        alerta.classList.remove("animacao-alerta", "p1", "p2", "oculto");
        void alerta.offsetWidth; // Força o reflow para a animação CSS reiniciar
        
        if (turno === 1) {
            alerta.innerHTML = `Vez do <br><span>Jogador 1</span>`;
            alerta.classList.add("p1");
        } else {
            alerta.innerHTML = `Vez do <br><span>Jogador 2</span>`;
            alerta.classList.add("p2");
        }
        
        alerta.classList.add("animacao-alerta");
    }
    // ------------------------------

    virarCarta(carta) {
        carta.classList.add("virada");
    }

    desvirarCarta(carta) {
        carta.classList.remove("virada");
    }

    resetarCartas() {
        document.querySelectorAll(".carta").forEach(carta => {
            carta.classList.remove("virada", "encontrado");
        });
    }

    /** Exibe pontos flutuantes sobre a carta */
    mostrarPontosFlutuantes(cartaEl, texto, positivo) {
        const el = document.createElement("div");
        el.classList.add("pontos-flutuantes", positivo ? "positivo" : "negativo");
        el.textContent = texto;
        cartaEl.style.position = "relative";
        cartaEl.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    }

    /** Modal de vitória */
    mostrarModalVitoria(segundos, erros, pontos, modo = 1, ptsP1 = 0, ptsP2 = 0) {
        const m = Math.floor(segundos / 60);
        const s = segundos % 60;
        const tempoFormatado = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        document.getElementById("modal-tempo").textContent = tempoFormatado;
        document.getElementById("modal-erros").textContent = erros;
        
        const mensagemEl = document.getElementById("modal-mensagem-vitoria");

        if (modo === 1) {
            document.getElementById("modal-pontos").textContent = Math.max(0, pontos);
            if (mensagemEl) mensagemEl.textContent = "Você encontrou todos os pares!";
        } else {
            // Modo Multiplayer
            if (ptsP1 > ptsP2) {
                if (mensagemEl) mensagemEl.textContent = "Jogador 1 Venceu!";
                document.getElementById("modal-pontos").textContent = ptsP1;
            } else if (ptsP2 > ptsP1) {
                if (mensagemEl) mensagemEl.textContent = "Jogador 2 Venceu!";
                document.getElementById("modal-pontos").textContent = ptsP2;
            } else {
                if (mensagemEl) mensagemEl.textContent = "Deu Empate!";
                document.getElementById("modal-pontos").textContent = ptsP1;
            }
        }

        document.getElementById("modal-vitoria").classList.remove("oculto");
    }

    mostrarMensagem(mensagem) {
        alert(mensagem);
    }
}