export default class GerenciadorInterface {

    constructor() {
        this.pontuacaoElemento = document.getElementById("pontuacao");
        this.tempoElemento = document.getElementById("tempo");
    }

    configurarEventosCartas() {

        const cartas = document.querySelectorAll(".carta");

        cartas.forEach(carta => {

            carta.addEventListener("click", () => {

                // evita clicar na mesma carta várias vezes
                if (carta.classList.contains("virada")) {
                    return;
                }

                carta.classList.add("virada");

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

    resetarCartas() {

        document.querySelectorAll(".carta").forEach(carta => {
            carta.classList.remove("virada");
        });

    }

    virarCarta(carta) {

        if (!carta.classList.contains("virada")) {
            carta.classList.add("virada");
        }

    }

    desvirarCarta(carta) {

        if (carta.classList.contains("virada")) {
            carta.classList.remove("virada");
        }

    }

}