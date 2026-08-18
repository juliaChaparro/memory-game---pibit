# Imagem base oficial do Node.js
FROM node:20-alpine

# Cria e define o diretório de trabalho no container
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências do projeto
RUN npm install

# Copia o restante do código da aplicação
COPY . .

# Gera o client do Prisma e compila o TypeScript
RUN npx prisma generate
RUN npm run build

# Expõe a porta que o servidor Node/Express utiliza
EXPOSE 3000

# Comando para iniciar o servidor correto
CMD ["node", "dist/server.js"]
