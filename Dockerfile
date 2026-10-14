FROM node:24-alpine
WORKDIR /app
COPY package.json localisation.mjs server.mjs ./
COPY public ./public
USER node
ENV HOST=0.0.0.0 PORT=4186
EXPOSE 4186
CMD ["node", "server.mjs"]
