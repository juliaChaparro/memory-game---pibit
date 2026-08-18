# Imagem base oficial do Node.js (slim resolve problemas com a engine do Prisma em produção)
FROM node:20-slim

# Instala o openssl que é necessário para o Prisma Client no debian slim
RUN apt-get update -y && apt-get install -y openssl

# Cria e define o diretório de trabalho no container
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências do projeto
RUN npm install

# Copia o restante do código da aplicação
COPY . .

# Compila o projeto (O script build do package.json já roda prisma generate)
RUN npm run build

# Expõe a porta que o servidor Node/Express utiliza
EXPOSE 3000

# Comando para iniciar o servidor correto
CMD ["node", "dist/server.js"]
