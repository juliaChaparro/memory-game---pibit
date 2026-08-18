export default class SocketClient {
    constructor() {
        this.socket = null;
        this.userId = 'user_' + Math.random().toString(36).substring(2, 9);
        this.roomId = null;
        this.playerNumber = null; // 1 ou 2
        this.onGameStart = null;
        this.onBoardUpdate = null;
        this.onGameOver = null;
        this.onError = null;
    }

    conectar() {
        if (this.socket) return; // Já conectado
        try {
            if (typeof io !== 'undefined') {
                this.socket = io({ withCredentials: true });
                this._configurarEventos();
            } else {
                console.warn('Socket.io não encontrado.');
            }
        } catch (e) {
            console.error('Erro ao conectar ao socket', e);
        }
    }

    _configurarEventos() {
        this.socket.on('player_assigned', (data) => {
            this.playerNumber = data.playerNumber;
            console.log('Papel recebido: Jogador ' + this.playerNumber);
        });

        this.socket.on('room_created', (data) => {
            this.roomId = data.roomId;
            console.log('Sala criada: ' + this.roomId);
        });

        this.socket.on('game_start', (state) => {
            if (this.onGameStart) this.onGameStart(state);
        });

        this.socket.on('board_update', (state) => {
            if (this.onBoardUpdate) this.onBoardUpdate(state);
        });

        this.socket.on('game_over', (data) => {
            if (this.onGameOver) this.onGameOver(data);
        });

        this.socket.on('error_message', (data) => {
            if (this.onError) this.onError(data.message);
        });
    }

    criarSala(pares, cols, callback) {
        if (!this.socket) return;
        this.socket.emit('create_room', { pares, cols });
        
        // Vamos escutar temporariamente o room_created para chamar o callback
        this.socket.once('room_created', (data) => {
            if (callback) callback(data.roomId);
        });
    }

    entrarSala(roomId) {
        if (!this.socket) return;
        this.roomId = roomId;
        this.socket.emit('join_room_code', { roomId });
    }

    virarCarta(cardIndex) {
        if (!this.socket || !this.roomId) return;
        this.socket.emit('flip_card', { roomId: this.roomId, cardIndex });
    }
}
