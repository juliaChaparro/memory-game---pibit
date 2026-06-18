export default class GerenciadorInterface {
    constructor() {
        this.pontuacaoElemento = document.getElementById("pontuacao");
        this.tempoElemento = document.getElementById("tempo");
    }

    // Agora recebemos um callback (função) do Jogo.js
    configurarEventosCartas(callback) {
        const cartas = document.querySelectorAll(".carta");

        cartas.forEach(carta => {
            carta.addEventListener("click", () => {
                // Apenas avisamos o Jogo que houve um clique nesta carta
                if (callback) {
                    callback(carta);
                }
            });
        });
    }

    atualizarPontuacao(pontos) {
        if (this.pontuacaoElemento) {
            this.pontuacaoElemento.textContent = pontos;
        }
    }

    atualizarTempo(segundos) {
        if (this.tempoElemento) {
            const minutos = Math.floor(segundos / 60);
            const segundosRestantes = segundos % 60;
            this.tempoElemento.textContent = 
                `${String(minutos).padStart(2, "0")}:${String(segundosRestantes).padStart(2, "0")}`;
        }
    }

    mostrarMensagem(mensagem) {
        alert(mensagem);
    }

    // Métodos para o Jogo controlar visualmente
    virarCarta(carta) {
        carta.classList.add("virada");
    }

    desvirarCarta(carta) {
        carta.classList.remove("virada");
    }

    resetarCartas() {
        document.querySelectorAll(".carta").forEach(carta => {
            carta.classList.remove("virada");
        });
    }
}