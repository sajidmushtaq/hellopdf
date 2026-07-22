FROM node:22-bookworm

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/opt/render/project/src/.cache/puppeteer

RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-impress \
    ghostscript \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ara \
    tesseract-ocr-hin \
    fonts-dejavu \
    fonts-liberation \
    ca-certificates \
    wget \
    unzip \
    curl \
    xvfb \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .


ENV NODE_ENV=production

RUN npx puppeteer browsers install chrome --path=/opt/render/project/src/.cache/puppeteer
RUN ls -R /opt/render/project/src/.cache/puppeteer || true

EXPOSE 10000

CMD ["npm","start"]