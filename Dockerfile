FROM node:20

WORKDIR /app

# Puppeteer üçün açıq konfiqurasiya etmək
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# Sistem asılılıqlarını quraşdırırıq - Puppeteer 24.x+ üçün yenilənmiş siyahı
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    # Şrift faylları üçün əlavə paketlər
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Yaddaş limitini artırırıq - Puppeteer üçün vacibdir
ENV NODE_OPTIONS=--max_old_space_size=4096

# Puppeteer üçün əlavə səviyyə təhlükəsizlik konfiqurasiyası
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# package.json fayllarını kopyalayırıq
COPY package*.json ./

# Asılılıqları quraşdırırıq
RUN npm install

# Cache qovluğunu əvvəlcədən yaradıb icazələri düzəldirik
RUN mkdir -p /app/.cache/puppeteer && \
    chmod -R 777 /app/.cache

# Qalan tətbiq kodunu kopyalayırıq
COPY . .

# dist qovluğunu təmizləyib yenidən build edirik
RUN rm -rf dist || true && npm run build

# Lazımi qovluqları yaradırıq
RUN mkdir -p /app/uploads /app/logs /app/temp
RUN chmod -R 777 /app/uploads /app/logs /app/temp

# Server portunu ifşa edirik
EXPOSE 4000

# Volume təyin edirik
VOLUME ["/app/uploads", "/app/logs"]

# Puppeteer-in quraşdırıldığını yoxlamaq üçün
RUN node -e "console.log('Puppeteer version:', require('puppeteer').version)" && \
    echo "Browser paths:" && \
    ls -la $(npm list -g | head -n 1)/node_modules/puppeteer/.local-chromium/ 2>/dev/null || echo "No puppeteer chromium"

# Tətbiqi işə salırıq
CMD ["npm", "start"]