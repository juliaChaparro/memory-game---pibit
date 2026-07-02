export default class GerenciadorInterface {
    constructor() {
        this.pontuacaoElemento = document.getElementById("pontuacao");
        this.tempoElemento = document.getElementById("tempo");
        this.paresEncontradosElemento = document.getElementById("pares-encontrados");
        this.errosElemento = document.getElementById("erros");
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

    atualizarTempo(segundos) {
        if (this.tempoElemento) {
            const m = Math.floor(segundos / 60);
            const s = segundos % 60;
            this.tempoElemento.textContent =
                `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
    mostrarModalVitoria(segundos, erros, pontos) {
        const m = Math.floor(segundos / 60);
        const s = segundos % 60;
        const tempoFormatado = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        document.getElementById("modal-tempo").textContent = tempoFormatado;
        document.getElementById("modal-erros").textContent = erros;
        document.getElementById("modal-pontos").textContent = Math.max(0, pontos);

        document.getElementById("modal-vitoria").classList.remove("oculto");
    }

    mostrarMensagem(mensagem) {
        alert(mensagem);
    }
}