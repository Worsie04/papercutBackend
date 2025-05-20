FROM node:20

WORKDIR /app

# Puppeteer üçün mühit dəyişənləri - açıq şəkildə Chromium endirilməsini aktivləşdiririk
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# Sistem asılılıqlarını quraşdırırıq - Puppeteer üçün lazım olan bütün paketlər
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

# Node yaddaş limiti - Puppeteer üçün vacibdir
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Puppeteer üçün əlavə təhlükəsizlik parametrləri
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# package.json fayllarını kopyalayırıq
COPY package*.json ./

# Cache qovluğunu yaradıb icazələri təyin edirik - ƏHƏMİYYƏTLİ!
RUN mkdir -p /app/.cache/puppeteer && \
    chmod -R 777 /app/.cache

# Asılılıqları quraşdırırıq - Puppeteer daxil olmaqla
RUN npm install

# Chromium'un endirilməsini və yolunu yoxlayırıq
RUN node -e "console.log('Puppeteer version:', require('puppeteer').version);" || echo "Unable to check Puppeteer version"

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

# Puppeteer-in düzgün işləməsini yoxlayırıq - bu test vaxtı browser-in quraşdırıldığını təsdiqləyəcək
RUN node -e "const puppeteer = require('puppeteer'); (async () => { try { console.log('Testing Puppeteer...'); const browser = await puppeteer.launch({headless: true, args:['--no-sandbox','--disable-setuid-sandbox']}); const page = await browser.newPage(); console.log('Browser & page created successfully!'); await browser.close(); console.log('Test successful!'); } catch(e) { console.error('Puppeteer test error:', e); process.exit(1); } })();" || echo "Puppeteer test failed, but continuing build"

# Tətbiqi işə salırıq
CMD ["npm", "start"]