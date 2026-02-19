FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# Copy package files
COPY package.json package-lock.json* ./

# Install npm packages
RUN npm install

# Copy application code
COPY . .

EXPOSE 3002

CMD ["node", "index.js"]
