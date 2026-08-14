# Imagem base oficial do Node.js
FROM node:20-alpine

# Cria e define o diretório de trabalho no container
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências do projeto
RUN npm install

# Gera o client do Prisma
RUN npx prisma generate

# Copia o restante do código da aplicação
COPY . .

# Expõe a porta que o servidor Node/Express utiliza
EXPOSE 3333

# Comando para iniciar o servidor
CMD ["node", "server.js"]
