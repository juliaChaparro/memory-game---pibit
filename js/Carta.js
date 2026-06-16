export default class Carta {
    constructor(id, imagem) {
        this.id = id;
        this.imagem = imagem;
        this.virada = false;
        this.encontrada = false;
    }

    virar() {
        this.virada = !this.virada;
    }

    marcarComoEncontrada() {
        this.encontrada = true;
    }
}