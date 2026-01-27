import { Router } from 'express';
import { authenticateToken, requireSuperAdmin } from './auth.js';
import { 
  createBackup, 
  restoreBackup, 
  listBackups, 
  deleteBackup,
  getBackupStats
} from '../utils/backup.js';

const router = Router();

// Get all backups (Super Admin only)
router.get('/', authenticateToken, requireSuperAdmin, async (_req, res) => {
  try {
    const backups = await listBackups();
    res.json(backups);
  } catch (error: any) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get backup statistics (Super Admin only)
router.get('/stats', authenticateToken, requireSuperAdmin, async (_req, res) => {
  try {
    const stats = await getBackupStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting backup stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new backup (Super Admin only)
router.post('/create', authenticateToken, requireSuperAdmin, async (req: any, res) => {
  try {
    console.log('📦 Backup yaratish so\'rovi:', req.user?.username || 'unknown');
    const result = await createBackup();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Error creating backup:', error);
    res.status(500).json({ 
      success: false, 
      message: `Backup xatolik: ${error.message}` 
    });
  }
});

// Restore from backup (Super Admin only)
router.post('/restore/:backupName', authenticateToken, requireSuperAdmin, async (req: any, res) => {
  try {
    const { backupName } = req.params;
    console.log('📥 Restore so\'rovi:', backupName, 'by', req.user?.username || 'unknown');
    
    const result = await restoreBackup(backupName);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ 
      success: false, 
      message: `Restore xatolik: ${error.message}` 
    });
  }
});

// Delete backup (Super Admin only)
router.delete('/:backupName', authenticateToken, requireSuperAdmin, async (req: any, res) => {
  try {
    const { backupName } = req.params;
    console.log('🗑️  Backup o\'chirish so\'rovi:', backupName, 'by', req.user?.username || 'unknown');
    
    const result = await deleteBackup(backupName);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error: any) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ 
      success: false, 
      message: `O'chirish xatolik: ${error.message}` 
    });
  }
});

export default router;
