# Menggunakan dasar image Node.js yang ringan
FROM node:18-slim

# Install FFmpeg di dalam "kotak" kita
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Menyiapkan direktori untuk aplikasi
WORKDIR /usr/src/app

# Salin file package.json dan install dependencies
COPY package*.json ./
RUN npm install

# Salin sisa kode aplikasi ke dalam direktori
COPY . .

# Beri tahu Docker port mana yang akan digunakan aplikasi
EXPOSE 3000

# Perintah untuk menjalankan aplikasi saat container dimulai
CMD [ "node", "server.js" ]