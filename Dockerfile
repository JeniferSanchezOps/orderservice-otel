FROM node:18-alpine
WORKDIR /app

# copy package files (package-lock.json if present will be copied by the glob)
COPY package*.json ./

# use npm ci if lockfile exists, otherwise npm install
RUN if [ -f package-lock.json ]; then \
      npm ci --only=production; \
    else \
      npm install --only=production; \
    fi

# copy app source
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "-r", "./tracing.js", "orderservice.js"]
