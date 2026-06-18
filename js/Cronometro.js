export default class Cronometro {
    constructor() {
        this.segundos = 0;
        this.intervalo = null;
    }

    // Recebemos uma função que será chamada a cada segundo
    iniciar(aoMudarTempo) {
        // Garante que não existem dois cronômetros rodando juntos
        this.parar(); 

        this.segundos = 0;

        this.intervalo = setInterval(() => {
            this.segundos++;
            
            // Avisa o jogo que o tempo mudou e passa os segundos atuais
            if (aoMudarTempo) {
                aoMudarTempo(this.segundos);
            }
        }, 1000);
    }

    parar() {
        if (this.intervalo) {
            clearInterval(this.intervalo);
            this.intervalo = null;
        }
    }

    resetar() {
        this.parar();
        this.segundos = 0;
    }
}