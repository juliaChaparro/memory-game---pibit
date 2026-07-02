import Carta from "./Carta.js";

export default class Tabuleiro {
    constructor() {
        this.cartas = [];
    }

    criarCartas(pares) {
        const tabuleiroElemento = document.getElementById("tabuleiro");
        if (!tabuleiroElemento) return;

        tabuleiroElemento.innerHTML = "";

        // Todas as imagens disponíveis (18 animais únicos)
        const todasImagens = [
            "ANTA.png", "CABEÇUDO.png", "CAITITU.png", "CARANGUEJO-VERMELHO.png",
            "CARANGUEJO.png", "CUTIA.png", "INABÚ.png", "JABUTI.png",
            "JACARETINGA.png", "JACU.png", "MATAMATÁ.png", "PERDIZ.png",
            "PREGUIÇA.png", "QUEIXADA.png", "TAMANDUÁ.png", "TATU-CANASTRA.png",
            "TATU.png", "VEADO VERMELHO.png"
        ];

        // Embaralha e seleciona a quantidade de pares necessária
        const embaralhadas = [...todasImagens].sort(() => Math.random() - 0.5);
        const selecionadas = embaralhadas.slice(0, pares);

        // Duplica para formar pares e embaralha novamente
        const nomesImagens = [...selecionadas, ...selecionadas].sort(() => Math.random() - 0.5);

        // Transforma em objetos Carta
        this.cartas = nomesImagens.map((nome, index) => new Carta(index, nome));

        // Renderiza no HTML
        this.cartas.forEach(cartaObj => {
            const cartaElemento = document.createElement("div");
            cartaElemento.classList.add("carta");
            cartaElemento.dataset.animal = cartaObj.imagem;

            cartaElemento.innerHTML = `
                <div class="carta-interna">
                    <div class="frente">
                        <img src="assets/cartas/${cartaObj.imagem}" alt="${cartaObj.imagem.replace('.png', '')}">
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