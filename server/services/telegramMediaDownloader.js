const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class TelegramMediaDownloader {
  constructor() {
    this.gramClient = null;
    this.gramInitializing = false;
  }

  /**
   * Ensure directory exists and has write permissions
   */
  ensureDirectory(dirPath) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      // Test write permission
      const testFile = path.join(dirPath, '.apex_write_test');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      return { success: true, path: dirPath };
    } catch (err) {
      console.warn(`[Downloader] Directory access warning for ${dirPath}:`, err.message);
      return {
        success: false,
        path: dirPath,
        error: err.message,
        hint: 'Please run `termux-setup-storage` in Termux and grant storage permission.'
      };
    }
  }

  /**
   * Format file size in readable MB / GB
   */
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Download via standard HTTP/HTTPS Stream (Used for Bot API <= 20MB or direct video URLs)
   */
  async downloadHttpStream(downloadUrl, targetPath, onProgress = null) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(downloadUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      const dirCheck = this.ensureDirectory(targetDir);
      if (!dirCheck.success) {
        return reject(new Error(`Folder access denied: ${dirCheck.error}. ${dirCheck.hint}`));
      }

      const fileStream = fs.createWriteStream(targetPath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      let lastReportTime = 0;

      const req = client.get(downloadUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fileStream.close();
          fs.unlinkSync(targetPath);
          return this.downloadHttpStream(res.headers.location, targetPath, onProgress)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          fileStream.close();
          if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
          return reject(new Error(`Download failed with HTTP status ${res.statusCode}`));
        }

        totalBytes = parseInt(res.headers['content-length'] || '0', 10);

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          if (onProgress && totalBytes > 0 && now - lastReportTime > 3500) {
            lastReportTime = now;
            const percent = Math.floor((downloadedBytes / totalBytes) * 100);
            onProgress({
              percent,
              downloadedBytes,
              totalBytes,
              downloadedStr: this.formatBytes(downloadedBytes),
              totalStr: this.formatBytes(totalBytes)
            });
          }
        });

        res.on('end', () => {
          fileStream.end(() => {
            if (onProgress && totalBytes > 0) {
              onProgress({
                percent: 100,
                downloadedBytes: totalBytes,
                totalBytes,
                downloadedStr: this.formatBytes(totalBytes),
                totalStr: this.formatBytes(totalBytes)
              });
            }
            resolve({
              path: targetPath,
              size: downloadedBytes,
              sizeStr: this.formatBytes(downloadedBytes)
            });
          });
        });

        res.on('error', (err) => {
          fileStream.close();
          if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
          reject(err);
        });
      });

      req.on('error', (err) => {
        fileStream.close();
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        reject(err);
      });

      req.setTimeout(120000, () => {
        req.destroy();
        fileStream.close();
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
        reject(new Error('Download connection timed out'));
      });
    });
  }

  /**
   * Check if GramJS (MTProto) is installed for 2GB large file downloading
   */
  hasGramJs() {
    try {
      require.resolve('telegram');
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Initialize GramJS MTProto client if available
   */
  async getGramClient(botToken) {
    if (!this.hasGramJs()) return null;
    if (this.gramClient) return this.gramClient;

    try {
      const { TelegramClient } = require('telegram');
      const { StringSession } = require('telegram/sessions');

      // Use standard public Telegram client credentials or env
      const apiId = parseInt(process.env.TELEGRAM_API_ID || '2040', 10);
      const apiHash = process.env.TELEGRAM_API_HASH || 'b18441a1ff607e10a989891a5462e627';

      const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
        connectionRetries: 5
      });

      await client.start({
        botAuthToken: botToken
      });

      this.gramClient = client;
      console.log('[Downloader] GramJS MTProto Bot client initialized for 2GB downloads.');
      return this.gramClient;
    } catch (err) {
      console.warn('[Downloader] Could not start GramJS MTProto client:', err.message);
      return null;
    }
  }

  /**
   * Download large media via GramJS MTProto (Up to 2GB)
   */
  async downloadViaGramJs(botToken, mediaObject, targetPath, onProgress = null) {
    const client = await this.getGramClient(botToken);
    if (!client) {
      throw new Error('GramJS is not installed. Run `npm install telegram` to enable 2GB downloads.');
    }

    const targetDir = path.dirname(targetPath);
    this.ensureDirectory(targetDir);

    let lastReport = 0;
    const result = await client.downloadMedia(mediaObject, {
      outputFile: targetPath,
      progressCallback: (downloaded, total) => {
        const now = Date.now();
        if (onProgress && total > 0 && now - lastReport > 3500) {
          lastReport = now;
          const percent = Math.floor((downloaded / total) * 100);
          onProgress({
            percent,
            downloadedBytes: downloaded,
            totalBytes: total,
            downloadedStr: this.formatBytes(downloaded),
            totalStr: this.formatBytes(total)
          });
        }
      }
    });

    const stats = fs.statSync(targetPath);
    return {
      path: targetPath,
      size: stats.size,
      sizeStr: this.formatBytes(stats.size)
    };
  }
}

const telegramMediaDownloader = new TelegramMediaDownloader();

module.exports = telegramMediaDownloader;
