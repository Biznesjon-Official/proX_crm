import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';

const execAsync = promisify(exec);

// Backup directory
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const BACKUP_RETENTION_DAYS = 7;

// MongoDB connection details from environment
const MONGO_URI = process.env.MONGO_URI || '';

/**
 * Create backup directory if it doesn't exist
 */
async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log('📁 Backup directory yaratildi:', BACKUP_DIR);
  }
}

/**
 * Get database name from MongoDB URI
 */
function getDatabaseName(): string {
  try {
    const url = new URL(MONGO_URI);
    const dbName = url.pathname.split('/')[1]?.split('?')[0];
    return dbName || 'crmprox';
  } catch {
    return 'crmprox';
  }
}

/**
 * Create MongoDB backup using mongodump
 */
export async function createBackup(): Promise<{ success: boolean; message: string; filePath?: string }> {
  try {
    console.log('🔄 Backup boshlanmoqda...');

    if (!MONGO_URI) {
      return { success: false, message: 'MongoDB URI topilmadi' };
    }

    await ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                      new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const dbName = getDatabaseName();
    const backupName = `backup_${dbName}_${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // mongodump command
    const command = `mongodump --uri="${MONGO_URI}" --out="${backupPath}"`;

    console.log('📦 Backup yaratilmoqda:', backupName);

    try {
      const { stdout, stderr } = await execAsync(command, { 
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      if (stderr && !stderr.includes('done dumping')) {
        console.warn('⚠️  Backup warning:', stderr);
      }

      console.log('✅ Backup muvaffaqiyatli yaratildi:', backupPath);

      // Clean old backups
      await cleanOldBackups();

      return {
        success: true,
        message: `Backup muvaffaqiyatli yaratildi: ${backupName}`,
        filePath: backupPath
      };
    } catch (error: any) {
      // Check if mongodump is not installed
      if (error.message.includes('mongodump') && error.message.includes('not found')) {
        console.error('❌ mongodump topilmadi. MongoDB Database Tools o\'rnatilmagan.');
        return {
          success: false,
          message: 'mongodump topilmadi. MongoDB Database Tools o\'rnatish kerak: https://www.mongodb.com/try/download/database-tools'
        };
      }
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Backup xatolik:', error.message);
    return {
      success: false,
      message: `Backup xatolik: ${error.message}`
    };
  }
}

/**
 * Restore MongoDB from backup
 */
export async function restoreBackup(backupName: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔄 Restore boshlanmoqda...');

    if (!MONGO_URI) {
      return { success: false, message: 'MongoDB URI topilmadi' };
    }

    const backupPath = path.join(BACKUP_DIR, backupName);

    // Check if backup exists
    try {
      await fs.access(backupPath);
    } catch {
      return { success: false, message: `Backup topilmadi: ${backupName}` };
    }

    const dbName = getDatabaseName();
    const dbBackupPath = path.join(backupPath, dbName);

    // mongorestore command
    const command = `mongorestore --uri="${MONGO_URI}" --drop "${dbBackupPath}"`;

    console.log('📥 Restore qilinmoqda:', backupName);

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      if (stderr && !stderr.includes('done')) {
        console.warn('⚠️  Restore warning:', stderr);
      }

      console.log('✅ Restore muvaffaqiyatli:', backupName);

      return {
        success: true,
        message: `Restore muvaffaqiyatli: ${backupName}`
      };
    } catch (error: any) {
      // Check if mongorestore is not installed
      if (error.message.includes('mongorestore') && error.message.includes('not found')) {
        console.error('❌ mongorestore topilmadi. MongoDB Database Tools o\'rnatilmagan.');
        return {
          success: false,
          message: 'mongorestore topilmadi. MongoDB Database Tools o\'rnatish kerak'
        };
      }
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Restore xatolik:', error.message);
    return {
      success: false,
      message: `Restore xatolik: ${error.message}`
    };
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<{ name: string; size: string; date: Date }[]> {
  try {
    await ensureBackupDir();

    const files = await fs.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files) {
      if (file.startsWith('backup_')) {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        // Calculate directory size
        let totalSize = 0;
        if (stats.isDirectory()) {
          const getSize = async (dir: string): Promise<number> => {
            let size = 0;
            const items = await fs.readdir(dir);
            for (const item of items) {
              const itemPath = path.join(dir, item);
              const itemStats = await fs.stat(itemPath);
              if (itemStats.isDirectory()) {
                size += await getSize(itemPath);
              } else {
                size += itemStats.size;
              }
            }
            return size;
          };
          totalSize = await getSize(filePath);
        } else {
          totalSize = stats.size;
        }

        backups.push({
          name: file,
          size: formatBytes(totalSize),
          date: stats.mtime
        });
      }
    }

    // Sort by date (newest first)
    backups.sort((a, b) => b.date.getTime() - a.date.getTime());

    return backups;
  } catch (error: any) {
    console.error('❌ Backup list xatolik:', error.message);
    return [];
  }
}

/**
 * Delete a specific backup
 */
export async function deleteBackup(backupName: string): Promise<{ success: boolean; message: string }> {
  try {
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Check if backup exists
    try {
      await fs.access(backupPath);
    } catch {
      return { success: false, message: `Backup topilmadi: ${backupName}` };
    }

    // Delete backup directory
    await fs.rm(backupPath, { recursive: true, force: true });

    console.log('🗑️  Backup o\'chirildi:', backupName);

    return {
      success: true,
      message: `Backup o'chirildi: ${backupName}`
    };
  } catch (error: any) {
    console.error('❌ Backup o\'chirish xatolik:', error.message);
    return {
      success: false,
      message: `Backup o'chirish xatolik: ${error.message}`
    };
  }
}

/**
 * Clean old backups (older than BACKUP_RETENTION_DAYS)
 */
async function cleanOldBackups(): Promise<void> {
  try {
    const backups = await listBackups();
    const now = new Date();
    const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const backup of backups) {
      const age = now.getTime() - backup.date.getTime();
      if (age > retentionMs) {
        console.log(`🗑️  Eski backup o'chirilmoqda: ${backup.name} (${Math.floor(age / (24 * 60 * 60 * 1000))} kun)`);
        await deleteBackup(backup.name);
      }
    }
  } catch (error: any) {
    console.error('❌ Eski backuplarni o\'chirish xatolik:', error.message);
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Schedule automatic backups
 */
export function scheduleBackups(): void {
  // Run backup every day at 02:00
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Avtomatik backup boshlanmoqda (02:00)...');
    const result = await createBackup();
    if (result.success) {
      console.log('✅ Avtomatik backup muvaffaqiyatli');
    } else {
      console.error('❌ Avtomatik backup xatolik:', result.message);
    }
  }, {
    timezone: 'Asia/Tashkent'
  });

  console.log('⏰ Backup scheduler ishga tushdi (har kuni 02:00, Toshkent vaqti)');
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalBackups: number;
  totalSize: string;
  oldestBackup: Date | null;
  newestBackup: Date | null;
}> {
  try {
    const backups = await listBackups();
    
    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: '0 B',
        oldestBackup: null,
        newestBackup: null
      };
    }

    // Calculate total size
    let totalBytes = 0;
    for (const backup of backups) {
      const sizeMatch = backup.size.match(/^([\d.]+)\s*(\w+)$/);
      if (sizeMatch) {
        const value = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
        totalBytes += value * (multipliers[unit] || 1);
      }
    }

    return {
      totalBackups: backups.length,
      totalSize: formatBytes(totalBytes),
      oldestBackup: backups[backups.length - 1].date,
      newestBackup: backups[0].date
    };
  } catch (error: any) {
    console.error('❌ Backup stats xatolik:', error.message);
    return {
      totalBackups: 0,
      totalSize: '0 B',
      oldestBackup: null,
      newestBackup: null
    };
  }
}
