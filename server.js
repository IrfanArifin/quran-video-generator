// server.js

const express = require('express');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Impor CORS

const app = express();
const port = process.env.PORT || 3000; // Port untuk hosting

// Izinkan permintaan dari semua domain. Penting untuk menghubungkan frontend & backend.
app.use(cors());

// Siapkan folder untuk menyimpan file-file
const publicDir = path.join(__dirname, 'public');
const videosDir = path.join(publicDir, 'videos');
const audiosDir = path.join(publicDir, 'audios');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir);
if (!fs.existsSync(audiosDir)) fs.mkdirSync(audiosDir);

// Middleware agar folder 'public' bisa diakses dari luar
app.use('/public', express.static(publicDir));

// Endpoint utama untuk generate video
app.get('/generate-video', async (req, res) => {
    // Ambil data yang dikirim dari frontend
    const { surahName, ayatKe, ayahText, audioUrl } = req.query;

    if (!surahName || !ayatKe || !ayahText || !audioUrl) {
        return res.status(400).json({ error: 'Parameter tidak lengkap.' });
    }

    const sanitizedAyahText = ayahText.replace(/\s*\(\s*\d+\s*\)\s*$/, '').trim();
    const outputFileName = `video_${surahName.replace(/\s/g, '_')}_${ayatKe}.mp4`;
    const outputFilePath = path.join(videosDir, outputFileName);
    const audioFileName = `audio_${surahName.replace(/\s/g, '_')}_${ayatKe}.mp3`;
    const audioFilePath = path.join(audiosDir, audioFileName);

    // Cek jika video sudah ada (cache)
    if (fs.existsSync(outputFilePath)) {
        console.log('Video sudah ada, mengirim link...');
        return res.json({
            videoUrl: `https://NAMA-PROYEK-ANDA.onrender.com/public/videos/${outputFileName}`
        });
    }

    try {
        // 1. Download file audio dari URL
        console.log(`Mengunduh audio dari: ${audioUrl}`);
        const audioResponse = await axios({ method: 'get', url: audioUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(audioFilePath);
        audioResponse.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        console.log('Audio berhasil diunduh.');

        // 2. Buat video dengan FFmpeg
        console.log('Membuat video dengan FFmpeg...');
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input('color=c=black:s=1280x720:r=25')
                .inputFormat('lavfi')
                .input(audioFilePath)
                .complexFilter([
                    {
                        filter: 'drawtext',
                        options: {
                            text: sanitizedAyahText,
                            // PENTING: Ganti dengan path ke font Arab Anda saat diupload ke server nanti,
                            // atau pastikan buildpack FFmpeg menyediakan font.
                            fontfile: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Path font default di banyak sistem Linux
                            fontsize: 48,
                            fontcolor: 'white',
                            x: '(w-text_w)/2',
                            y: '(h-text_h)/2',
                            box: 1,
                            boxcolor: 'black@0.5',
                            boxborderw: 5,
                            text_align: 'M'
                        }
                    }
                ])
                .outputOptions(['-c:v libx264', '-c:a aac', '-pix_fmt yuv420p', '-shortest'])
                .save(outputFilePath)
                .on('end', () => {
                    console.log('Video berhasil dibuat!');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Error FFmpeg:', err.message);
                    reject(err);
                });
        });

        // 3. Kirim URL video yang sudah jadi ke frontend
        res.json({
            videoUrl: `https://quran-video-generator.onrender.com/public/videos/${outputFileName}`
        });

    } catch (error) {
        console.error('Terjadi kesalahan di server:', error.message);
        res.status(500).json({ error: 'Gagal memproses permintaan Anda.' });
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});