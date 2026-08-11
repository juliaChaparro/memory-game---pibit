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

        // Função para embaralhar array (Fisher-Yates)
        const embaralhar = (array) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 5));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        // Embaralha e seleciona a quantidade de pares necessária
        const embaralhadas = embaralhar(todasImagens);
        const selecionadas = embaralhadas.slice(0, pares);

        // Duplica para formar pares e embaralha novamente
        let nomesImagens = embaralhar([...selecionadas, ...selecionadas]);

        // As vezes o Fisher-Yates ainda deixa pares próximos (sorte), 
        // mas é o método estatisticamente ideal. 
        // Podemos dar mais uma embaralhada por segurança
        nomesImagens = embaralhar(nomesImagens);

        // Transforma em objetos Carta
        this.cartas = nomesImagens.map((nome, index) => new Carta(index, nome));

        const logosFundo = [
            { src: "assets/background/logo_ufam.png", alt: "UFAM" },
            { src: "assets/background/logo_icomp.png", alt: "ICOMP" },
            { src: "assets/background/Logo do museu amazonico.PNG", alt: "Museu Amazônico" }
        ];

        // Renderiza no HTML
        this.cartas.forEach(cartaObj => {
            const cartaElemento = document.createElement("div");
            cartaElemento.classList.add("carta");
            cartaElemento.dataset.animal = cartaObj.imagem;

            // Escolhe uma logo aleatória para as costas desta carta
            const logoEscolhida = logosFundo[Math.floor(Math.random() * logosFundo.length)];

            cartaElemento.innerHTML = `
                <div class="carta-interna">
                    <div class="frente">
                        <img src="assets/cartas/${cartaObj.imagem}" alt="${cartaObj.imagem.replace('.png', '')}">
                    </div>
                    <div class="verso">
                        <img src="${logoEscolhida.src}" alt="${logoEscolhida.alt}">
                    </div>
                </div>
            `;

            tabuleiroElemento.appendChild(cartaElemento);
        });
    }
}