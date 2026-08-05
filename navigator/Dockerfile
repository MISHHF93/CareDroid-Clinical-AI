FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY data ./data
ENV HOST=0.0.0.0 PORT=4178
EXPOSE 4178
CMD ["npm", "start"]
