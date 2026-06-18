import Tabuleiro from "./Tabuleiro.js";
import Cronometro from "./Cronometro.js";
import GerenciadorPontuacao from "./GerenciadorPontuacao.js";
import GerenciadorInterface from "./GerenciadorInterface.js";
import GerenciadorSom from "./GerenciadorSom.js";

export default class Jogo {
    constructor() {
        this.tabuleiro = new Tabuleiro();
        this.cronometro = new Cronometro();
        this.pontuacao = new GerenciadorPontuacao();
        this.interface = new GerenciadorInterface();
        this.som = new GerenciadorSom();
        
        this.primeiraCarta = null;
        this.segundaCarta = null;
        this.bloqueado = false;
    }

    iniciar() {
        this.tabuleiro.criarCartas();

        // Iniciamos o cronômetro passando a função de atualizar a tela
        this.cronometro.iniciar((segundosAtuais) => {
            this.interface.atualizarTempo(segundosAtuais);
        });

        // Passamos a função para lidar com o clique
        this.interface.configurarEventosCartas((carta) => {
            this.lidarComClique(carta);
        });

    }

    lidarComClique(carta) {
        // Bloqueia cliques se o jogo estiver bloqueado ou se a carta já estiver virada
        if (this.bloqueado || carta.classList.contains("virada")) return;

        // Usa a interface para virar a carta visualmente
        this.interface.virarCarta(carta);

        if (!this.primeiraCarta) {
            this.primeiraCarta = carta;
            return;
        }

        this.segundaCarta = carta;
        this.bloqueado = true; // Bloqueia novos cliques até a verificação terminar
        this.verificarPar();
    }

    verificarPar() {
        if (this.primeiraCarta.dataset.animal === this.segundaCarta.dataset.animal) {
            // Lógica de acerto:
            this.pontuacao.adicionarPontos(10); // 1. Adiciona os pontos no gerenciador
            
            // 2. Atualiza o número de pontos visualmente na tela
            this.interface.atualizarPontuacao(this.pontuacao.getPontuacao()); 
            
            this.resetarSelecao();
            
            // Opcional: Verificar aqui se o jogo acabou para chamar o this.finalizar()
        } else {
           
            // 3. Atualiza a tela com a nova pontuação menor
            this.interface.atualizarPontuacao(this.pontuacao.getPontuacao()); 
            
            this.desvirarCartas();
        }
    }

    desvirarCartas() {
        setTimeout(() => {
            this.interface.desvirarCarta(this.primeiraCarta);
            this.interface.desvirarCarta(this.segundaCarta);
            this.resetarSelecao();
        }, 1000);
    }

    resetarSelecao() {
        this.primeiraCarta = null;
        this.segundaCarta = null;
        this.bloqueado = false;
    }

    finalizar() {
        this.cronometro.parar()
        this.som.tocarVitoria();
        this.interface.mostrarMensagem("Parabéns! Você venceu!");
        
    }
}