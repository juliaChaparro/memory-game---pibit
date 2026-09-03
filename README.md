# 🐾 Jogo da Memória - Fauna Amazônica (PIBIT)

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-green)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white)

Um projeto interativo e educacional focado em apresentar a fauna da região amazônica através de um clássico Jogo da Memória. O jogo conta com um modo single-player e um divertido modo multiplayer em tempo real!

Projeto desenvolvido no âmbito do **PIBIT** (Programa Institucional de Bolsas de Iniciação em Desenvolvimento Tecnológico).

---

## 🎮 Funcionalidades

- **Fauna Amazônica**: Cartas com animais nativos como Anta, Jabuti, Preguiça, Tamanduá, entre outros.
- **Modo Solo (Treino)**: Pratique sua memória localmente e tente bater o seu recorde de tempo e cliques.
- **Modo Multiplayer (Tempo Real)**: Crie ou entre em salas privadas e jogue contra seus amigos online.
- **Autenticação**: Sistema de login seguro.
- **Placar Global**: Salva o histórico das partidas para visualizar sua evolução.
- **Design Responsivo**: Adaptado para computadores e dispositivos móveis.

---

## 🛠️ Tecnologias Utilizadas

**Front-end (`/game`)**:
- HTML5, CSS3 (Vanilla)
- JavaScript Interativo
- WebSockets (Client) para multiplayer

**Back-end (`/ExpTs`)**:
- **Node.js** & **Express** para rotas e servidor de arquivos
- **TypeScript** para um código mais seguro e limpo
- **Socket.io** para comunicação bidirecional em tempo real (Modo Multiplayer)
- **Prisma ORM** e **PostgreSQL** para persistência de dados (salvamento de partidas)
- **JWT (JSON Web Tokens)** para autenticação

---

## 📂 Estrutura do Projeto

A arquitetura foi projetada para manter o código limpo e escalável:

```bash
/
├── game/             # Código-fonte do Front-end (UI)
│   ├── assets/       # Imagens e cartas do jogo
│   ├── css/          # Estilos
│   ├── js/           # Lógica do jogo, cronômetro e cliente Socket.io
│   └── index.html    # Página principal
├── ExpTs/            # Código-fonte do Back-end (Servidor)
│   ├── src/          # Rotas (Express) e controladores do WebSocket
│   └── prisma/       # Banco de dados temporário e schema (se local)
├── prisma/           # Configuração e esquemas do banco PostgreSQL
├── docs/             # Guias e manuais (ex: Deploy com Docker)
├── package.json      # Dependências e scripts npm
└── tsconfig.json     # Configuração do compilador TypeScript
```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/en/) (versão 18+)
- Uma string de conexão com um banco de dados PostgreSQL (ou SQLite para testes)

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/juliaChaparro/memory-game---pibit.git
   cd memory-game---pibit
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente**
   - Crie um arquivo `.env` na raiz do projeto.
   - Adicione sua URL de conexão (veja o `.env.example` se existir):
     ```env
     DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
     JWT_SECRET="sua_chave_secreta"
     ```

4. **Sincronize o Banco de Dados**
   ```bash
   npx prisma generate
   npm run db:push
   ```

5. **Inicie o Servidor**
   ```bash
   npm run dev
   ```
   > O servidor estará rodando! Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🐳 Executando com Docker

Se preferir usar containeres, este projeto já vem com suporte ao Docker!

```bash
docker-compose up --build
```
Para mais detalhes sobre as configurações do container ou deploy no Render, consulte nosso guia na pasta `/docs`.

---

## 👩‍💻 Contribuidores

- Desenvolvido por **Julia Chaparro** e colaboradores para o PIBIT.

---

Feito com 💚 e muita tecnologia para a valorização da Amazônia!
