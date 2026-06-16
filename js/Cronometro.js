export default class Cronometro {
    constructor() {
        this.segundos = 0;
        this.intervalo = null;
    }

    iniciar() {
        this.intervalo = setInterval(() => {
            this.segundos++;
        }, 1000);
    }

    parar() {
        clearInterval(this.intervalo);
    }

    resetar() {
        this.parar();
        this.segundos = 0;
    }

    getTempo() {
        return this.segundos;
    }
}