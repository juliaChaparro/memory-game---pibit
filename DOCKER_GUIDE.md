# 🐳 Guia de Uso: Docker & Banco de Dados no Jogo da Memória

Este guia explica como a arquitetura do projeto foi containerizada com **Docker** e **Docker Compose**, utilizando o **Prisma ORM** com **SQLite** para persistir as sessões de jogo, e como você pode gerenciar tudo passo a passo.

---

## 🛠️ Como Funciona a Estrutura do Docker no Projeto

O projeto utiliza três pilares principais para rodar de forma isolada:

1. **[Dockerfile](file:///c:/Users/Usuário/Documents/PIBIT/memory-game---pibit/Dockerfile)**: 
   - Define a imagem do sistema (Node.js no Alpine Linux).
   - Instala as dependências de produção do `package.json`.
   - Executa a geração do cliente do Prisma (`npx prisma generate`).
   - Expõe a porta do servidor (`3333`).
2. **[docker-compose.yml](file:///c:/Users/Usuário/Documents/PIBIT/memory-game---pibit/docker-compose.yml)**:
   - Configura o serviço da aplicação web na porta `3333`.
   - **Banco de Dados Persistente**: Cria um volume chamado `sqlite_data` montado na pasta `/usr/src/app/db` dentro do container. Isso evita a perda do banco de dados ao recriar o container.
   - Define a variável de ambiente `DATABASE_URL=file:/usr/src/app/db/dev.db`.
3. **[server.js](file:///c:/Users/Usuário/Documents/PIBIT/memory-game---pibit/server.js)**:
   - Configurado para detectar se está rodando no Docker e criar o diretório `/usr/src/app/db` automaticamente antes de inicializar o servidor de banco de dados SQLite.

---

## 📋 Passo a Passo para Executar e Validar o Funcionamento

Siga estes comandos no terminal da pasta do seu projeto:

### Passo 1: Construir e Iniciar os Containers
Esse comando baixa as imagens necessárias, instala os pacotes dentro do container e inicia a aplicação na porta `3333`.
```powershell
docker-compose up -d --build
```
> O parâmetro `-d` roda o container em segundo plano (detached mode).

### Passo 2: Sincronizar o Banco de Dados (Apenas na Primeira Execução)
Como o banco de dados no container inicia zerado, precisamos enviar o Schema do Prisma para o arquivo de banco criado no volume Docker:
```powershell
docker-compose exec web npx prisma db push
```
*Saída esperada:* Uma mensagem confirmando que o banco de dados está em sincronia com o schema.

### Passo 3: Testar e Visualizar os Logs
Abra o monitor de logs em tempo real para verificar as mensagens do seu servidor Express:
```powershell
docker-compose logs -f
```
*Saída esperada ao carregar e salvar partidas:*
```text
memory-game-app | Servidor rodando na porta 3333
memory-game-app | Pasta /db criada para o SQLite.
memory-game-app | Nova partida salva! Modo: 1, Pontos: 150
```

### Passo 4: Verificar se está rodando no Navegador
Acesse:
- **Interface/API**: [http://localhost:3333](http://localhost:3333) (onde seu `index.html` e endpoints do Express estão expostos).

---

## 🛑 Parando a Aplicação
Para desligar o container sem perder seus dados:
```powershell
docker-compose down
```
