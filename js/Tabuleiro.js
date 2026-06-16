export default class Tabuleiro {

    constructor() {
        this.cartas = [];
    }

    criarCartas() {

        const tabuleiro = document.getElementById("tabuleiro");

        if (!tabuleiro) return;

        tabuleiro.innerHTML = "";

        const imagens = [
            "anta.png",
            "CUTIA.png",
            "anta.png",
            "CUTIA.png"
        ];

        imagens.forEach(imagem => {

            const carta = document.createElement("div");
            carta.classList.add("carta");

            carta.innerHTML = `
                <div class="carta-interna">

                    <div class="frente">
                        <img src="assets/cartas/${imagem}" alt="">
                    </div>

                    <div class="verso">
                        <img src="assets/background/ufam_logo.jpg" alt="UFAM">
                    </div>

                </div>
            `;

            tabuleiro.appendChild(carta);
        });

    }

}