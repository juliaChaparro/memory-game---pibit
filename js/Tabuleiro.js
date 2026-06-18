import Carta from "./Carta.js";

export default class Tabuleiro {
    constructor() {
        this.cartas = [];
    }

    criarCartas() {
        const tabuleiroElemento = document.getElementById("tabuleiro");
        if (!tabuleiroElemento) return;

        tabuleiroElemento.innerHTML = "";

        // 1. Defina as imagens (pares)
        const nomesImagens = ["anta.png", "CUTIA.png", "anta.png", "CUTIA.png"];

        // 2. Transforme em objetos Carta
        this.cartas = nomesImagens.map((nome, index) => new Carta(index, nome));

        // 3. Embaralhe a lista de objetos Carta
        this.cartas.sort(() => Math.random() - 0.5);

        // 4. Renderize no HTML
        this.cartas.forEach(cartaObj => {
            const cartaElemento = document.createElement("div");
            cartaElemento.classList.add("carta");
            
            // Adicionamos o dataset para facilitar a comparação no Jogo.js
            cartaElemento.dataset.animal = cartaObj.imagem;

            cartaElemento.innerHTML = `
                <div class="carta-interna">
                    <div class="frente">
                        <img src="assets/cartas/${cartaObj.imagem}" alt="${cartaObj.imagem}">
                    </div>
                    <div class="verso">
                        <img src="assets/background/ufam.png" alt="UFAM">
                    </div>
                </div>
            `;

            tabuleiroElemento.appendChild(cartaElemento);
        });
    }
}