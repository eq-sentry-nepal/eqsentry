FROM node:20-alpine
WORKDIR /app

# Install backend dependencies
COPY package.json ./
RUN npm install --omit=dev

# Backend code
COPY . ./

# The server can also serve the static website mounted one level up.
# If you only deploy the backend, that's fine — the static site is hosted separately.
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.js"]
