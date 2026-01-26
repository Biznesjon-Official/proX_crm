import { Router } from 'express';
import { Branch, User, Student } from '../mongodb.js';
import { authenticateToken, requireSuperAdmin } from './auth.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const router = Router();

// Get all users (for admin assignment dropdown)
router.get('/users', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['manager'] } })
      .select('username role branch_id')
      .populate('branch_id', 'name');
    
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      branch_id: user.branch_id?._id?.toString() || null,
      branch_name: (user.branch_id as any)?.name || null
    }));
    
    res.json(formattedUsers);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all branches from MongoDB (faqat branches collection'dan, aggregation bilan)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Agar MongoDB ulanmagan bo'lsa, darhol bo'sh massiv qaytaramiz
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️  MongoDB ulanmagan. Bo\'sh ma\'lumot qaytarilmoqda.');
      return res.json([]);
    }

    // Faqat branches collection'dan ma'lumot olish, aggregation bilan student_count hisoblash
    const branches = await Branch.aggregate([
      {
        $lookup: {
          from: 'students', // Student collection nomi
          localField: '_id',
          foreignField: 'branch_id',
          as: 'students'
        }
      },
      {
        $addFields: {
          student_count: { $size: '$students' }
        }
      },
      {
        $project: {
          students: 0 // students array'ni olib tashlash
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);
    
    const formattedBranches = branches.map(branch => ({
      ...branch,
      id: branch._id.toString(),
      student_count: branch.student_count || 0
    }));
    
    res.json(formattedBranches);
  } catch (error: any) {
    console.error('Error fetching branches from MongoDB:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single branch
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json(branch);
  } catch (error: any) {
    console.error('Error fetching branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new branch (Super Admin only)
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, district, address, phone, branch_type, mentor_name, mentor_username, mentor_password, manager_name, manager_username, manager_password } = req.body;

    if (!name || !district || !address || !phone) {
      return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
    }

    // Create branch
    const branch = new Branch({
      name,
      district,
      address,
      phone,
      branch_type: branch_type || 'manager',
      // Mentor ma'lumotlari (username va ochiq parol)
      mentor_name: mentor_name || '',
      mentor_username: mentor_username || '',
      mentor_password: mentor_password || '', // Ochiq parol
      // Manager ma'lumotlari (username va ochiq parol)
      manager_user_name: manager_name || '',
      manager_username: manager_username || '',
      manager_user_password: manager_password || '' // Ochiq parol
    });

    await branch.save();

    // Mentor uchun User yaratish
    if (mentor_username && mentor_password) {
      const existingMentor = await User.findOne({ username: mentor_username });
      if (!existingMentor) {
        const hashedPassword = await bcrypt.hash(mentor_password, 10);
        const mentorUser = new User({
          username: mentor_username,
          password: hashedPassword,
          role: 'mentor',
          branch_id: branch._id
        });
        await mentorUser.save();
      }
    }

    // Manager uchun User yaratish
    if (manager_username && manager_password) {
      const existingManager = await User.findOne({ username: manager_username });
      if (!existingManager) {
        const hashedPassword = await bcrypt.hash(manager_password, 10);
        const managerUser = new User({
          username: manager_username,
          password: hashedPassword,
          role: 'manager',
          branch_id: branch._id
        });
        await managerUser.save();
      }
    }

    const formattedBranch = {
      ...branch.toObject(),
      id: branch._id.toString()
    };
    res.status(201).json(formattedBranch);
  } catch (error: any) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update branch (Super Admin only)
router.put('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { name, district, address, phone, branch_type, mentor_name, mentor_username, mentor_password, manager_name, manager_username, manager_password } = req.body;

    const updateData: any = { 
      name, 
      district, 
      address, 
      phone, 
      updated_at: new Date() 
    };
    
    if (branch_type) updateData.branch_type = branch_type;

    // Mentor ma'lumotlarini yangilash (username va ochiq parol)
    if (mentor_name !== undefined) updateData.mentor_name = mentor_name;
    if (mentor_username !== undefined) updateData.mentor_username = mentor_username;
    if (mentor_password !== undefined) updateData.mentor_password = mentor_password;

    // Manager ma'lumotlarini yangilash (username va ochiq parol)
    if (manager_name !== undefined) updateData.manager_user_name = manager_name;
    if (manager_username !== undefined) updateData.manager_username = manager_username;
    if (manager_password !== undefined) updateData.manager_user_password = manager_password;

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    // Mentor User'ni yangilash yoki yaratish
    if (mentor_username && mentor_password) {
      let mentorUser = await User.findOne({ branch_id: branch._id, role: 'mentor' });
      if (mentorUser) {
        mentorUser.username = mentor_username;
        mentorUser.password = await bcrypt.hash(mentor_password, 10);
        await mentorUser.save();
      } else {
        const existingUser = await User.findOne({ username: mentor_username });
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(mentor_password, 10);
          const newMentor = new User({
            username: mentor_username,
            password: hashedPassword,
            role: 'mentor',
            branch_id: branch._id
          });
          await newMentor.save();
        }
      }
    }

    // Manager User'ni yangilash yoki yaratish
    if (manager_username && manager_password) {
      let managerUser = await User.findOne({ branch_id: branch._id, role: 'manager' });
      if (managerUser) {
        managerUser.username = manager_username;
        managerUser.password = await bcrypt.hash(manager_password, 10);
        await managerUser.save();
      } else {
        const existingUser = await User.findOne({ username: manager_username });
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(manager_password, 10);
          const newManager = new User({
            username: manager_username,
            password: hashedPassword,
            role: 'manager',
            branch_id: branch._id
          });
          await newManager.save();
        }
      }
    }

    const formattedBranch = {
      ...branch.toObject(),
      id: branch._id.toString()
    };
    res.json(formattedBranch);
  } catch (error: any) {
    console.error('Error updating branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete branch (Super Admin only)
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json({ message: 'Branch deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
