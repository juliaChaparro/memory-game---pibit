# Imagem base oficial do Node.js (slim resolve problemas com a engine do Prisma em produ‡Æo) 
FROM node:20-slim 
 
# Instala o openssl que ‚ necess rio para o Prisma Client no debian slim 
RUN apt-get update -y && apt-get install -y openssl 
 
# Cria e define o diret¢rio de trabalho no container 
WORKDIR /usr/src/app 
 
# Copia os arquivos de dependˆncias 
COPY package*.json ./ 
COPY prisma ./prisma/ 
 
# Instala as dependˆncias do projeto 
RUN npm install 
 
# Copia o restante do c¢digo da aplica‡Æo 
COPY . . 
 
# Gera o client do Prisma e compila o TypeScript 
RUN npx prisma generate 
RUN npm run build 
 
# Expäe a porta que o servidor Node/Express utiliza 
EXPOSE 3000 
 
# Comando para iniciar o servidor correto 
CMD [" "node, dist/server.js]
