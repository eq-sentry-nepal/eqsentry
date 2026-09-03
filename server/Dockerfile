FROM node:22-alpine
WORKDIR /app

# Install backend dependencies from the reviewed lockfile.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Backend code
COPY . ./

# The server can also serve the static website mounted one level up.
# If you only deploy the backend, that's fine — the static site is hosted separately.
ENV PORT=8787
EXPOSE 8787
CMD ["node", "server.js"]
