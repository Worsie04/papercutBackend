# Əsas image olaraq Node.js istifadə edirik. Puppeteer üçün daha stabil bir Node.js versiyası
FROM node:20

# Konteyner daxilində iş qovluğunu təyin edirik
WORKDIR /app

# package.json və package-lock.json fayllarını konteynerə kopyalayırıq
COPY package*.json ./

# Chrome quraşdırılması üçün önəmli dəyişənlər
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Google Chrome-un repositoriyasını əlavə edirik və sistemin asılılıqlarını quraşdırırıq
RUN apt-get update && apt-get install -y gnupg wget && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' && \
    apt-get update && apt-get install -y \
    google-chrome-stable \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
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
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    lsb-release \
    xdg-utils \
    # Render.com üçün əlavə asılılıqlar
    libgbm1 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libatk-bridge2.0-0 \
    # Şrift paketləri PDF yaradılması üçün
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    # Performans üçün əlavə paketlər
    zlib1g \
    fontconfig \
    locales \
    --no-install-recommends && \
    # Locale konfiqurasiyası (Unicode dəstəyi üçün)
    echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen && \
    # Təmizləmə
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Node.js asılılıqlarını quraşdırırıq
RUN npm install

# Qalan tətbiq kodunu konteynerə kopyalayırıq
COPY . .

# dist qovluğunu təmizləyib yenidən build edirik
RUN rm -rf dist || true && npm run build

# Server portunu ifşa edirik
EXPOSE 4000

# Lazımi qovluqları yaradırıq
RUN mkdir -p /app/uploads /app/logs

# Volume təyin edirik (dayanıqlı data saxlaması üçün)
VOLUME ["/app/uploads", "/app/logs"]

# Nümunə sənəd üçün qovluq yaradırıq
RUN mkdir -p /app/temp && chmod 777 /app/temp

# Tətbiqi işə salırıq
CMD ["npm", "start"]