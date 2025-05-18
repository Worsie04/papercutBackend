# Əsas image olaraq Node.js istifadə edirik. Puppeteer üçün daha stabil bir Node.js versiyası (məsələn, 18 və ya 20) tövsiyə olunur.
FROM node:20

# Konteyner daxilində iş qovluğunu təyin edirik. Tətbiqimizin faylları bura köçürüləcək.
WORKDIR /app

# package.json və package-lock.json (və ya yarn.lock) fayllarını konteynerə kopyalayırıq.
# Bu, yalnız asılılıqları quraşdırarkən Docker-in cache-dən istifadə etməsinə imkan verir.
COPY package*.json ./

# Sistem asılılıqlarını quraşdırırıq. Bu hissə Puppeteer (və Chromium) üçün çox vacibdir.
# Render.com-da istifadə olunan Linux distribution-a uyğun olaraq bu paketlər fərqli ola bilər,
# lakin aşağıdakılar Debian/Ubuntu əsaslı sistemlər üçün ümumi lazım olanlardır.
# Puppeteer-in rəsmi GitHub reposunda daha dolğun bir siyahı tapa bilərsiniz:
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
RUN apt-get update && apt-get install -y \
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
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Node.js asılılıqlarını quraşdırırıq (npm install).
# Puppeteer burada öz Chromium versiyasını yükləyəcək.
RUN npm install

# Qalan tətbiq kodunu konteynerə kopyalayırıq.
COPY . .

# Əgər tətbiqiniz bir portda dinləyirsə (məsələn, Express server), həmin portu ifşa edin.
# Backend qovluğundakı koddan göründüyü kimi server 4000 portunda işləyir
EXPOSE 4000

# Uploads qovluğu üçün volume yaradın
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

# Logs qovluğu üçün volume yaradın
RUN mkdir -p /app/logs
VOLUME ["/app/logs"]

# Konteyner işə salındıqda çalışacaq əmri təyin edirik.
# Backend qovluğunda "start" scripti ilə işə salır
CMD ["npm", "start"]