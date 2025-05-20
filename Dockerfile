FROM node:20

WORKDIR /app

# Chrome yerinə Puppeteer-in öz Chromium-unu istifadə edəcəyik
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_EXECUTABLE_PATH=""

# Sistem asılılıqlarını quraşdırırıq
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
    # Şriftlər
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Node yaddaş limiti 
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Puppeteer üçün əlavə dəyişənlər
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# package.json fayllarını kopyalayırıq
COPY package*.json ./

# Render.com üçün əlavə konfiqurasiya - Puppeteer 24.x versiyası ilə problemləri həll edir
RUN npm config set puppeteer_skip_chromium_download false

# Asılılıqları quraşdırırıq
RUN npm install

# Cache qovluğunu yaradırıq və icazələri veririk
RUN mkdir -p /app/.cache/puppeteer && \
    chmod -R 777 /app/.cache

# Qalan tətbiq kodunu kopyalayırıq
COPY . .

# Diqqət: Cache qovluğunu təmizləmək əvəzinə, daha sonra təyin edirik
RUN rm -rf dist || true && npm run build

# Lazımi qovluqları yaradırıq
RUN mkdir -p /app/uploads /app/logs /app/temp
RUN chmod -R 777 /app/uploads /app/logs /app/temp

# Server portunu ifşa edirik
EXPOSE 4000

# Volume təyin edirik
VOLUME ["/app/uploads", "/app/logs"]

# Puppeteer-in quraşdırıldığını və browser tapıldığını yoxlayırıq
RUN node -e "const puppeteer = require('puppeteer'); console.log('Puppeteer Version:', puppeteer.version); console.log('Puppeteer Installation Path:', require('puppeteer')._preferredRevision, require('puppeteer')._packageVersion);"

# Chromium yolunu yoxlayırıq
RUN ls -la $(npm root)/puppeteer/.local-chromium/ || echo "Chromium path not found in normal location"

# ƏN VACİB ADDIM: Puppeteer 24.x versiyası ilə render.com-da işləmək üçün xüsusi yoxlama skripti
RUN node -e "const puppeteer = require('puppeteer'); (async () => { console.log('Testing puppeteer browser launch...'); try { const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }); await browser.close(); console.log('Browser launched successfully!'); } catch (e) { console.error('Failed to launch browser:', e); process.exit(1); } })()"

# Tətbiqi işə salırıq
CMD ["npm", "start"]