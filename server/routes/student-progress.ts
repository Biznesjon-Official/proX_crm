import { Router } from 'express';
// import { dbAll, dbGet } from '../database.js';

const router = Router();

// O'quvchilarning progress ma'lumotlarini olish
router.get('/', async (req, res) => {
  try {
    const { branch_id } = req.query;
    
    // Oddiy students query
    let query = `
      SELECT 
        s.id as student_id,
        s.name as student_name,
        s.phone,
        s.branch_id,
        b.name as branch_name
      FROM students s
      LEFT JOIN branches b ON s.branch_id = b.id
    `;
    
    const params: any[] = [];
    
    if (branch_id) {
      query += ' WHERE s.branch_id = ?';
      params.push(branch_id);
    }
    
    query += ' ORDER BY s.name';
    
    const students = await dbAll(query, params);
    
    // Mock progress data qo'shish
    const studentsWithProgress = students.map((student: any) => {
      return {
        student_id: student.student_id || '',
        student_name: student.student_name || 'Noma\'lum',
        phone: student.phone || '',
        branch_id: student.branch_id || '',
        branch_name: student.branch_name || '',
        total_lessons: Math.floor(Math.random() * 50) + 10,
        attended_lessons: Math.floor(Math.random() * 40) + 5,
        attendance_percentage: Math.floor(Math.random() * 40) + 60,
        current_level: getRandomLevel(),
        completed_modules: getRandomModules(),
        next_milestone: getNextMilestone(),
        last_activity: getRecentDate()
      };
    });
    
    res.json(studentsWithProgress);
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ error: 'Failed to fetch student progress' });
  }
});

// O'quvchining batafsil progress ma'lumotlarini olish
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await dbGet(`
      SELECT 
        s.id,
        s.name,
        s.phone,
        s.branch_id,
        b.name as branch_name,
        s.study_days,
        s.created_at
      FROM students s
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE s.id = ?
    `, [studentId]);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Davomat statistikasi
    const attendanceStats = await dbGet(`
      SELECT 
        COUNT(*) as total_lessons,
        COUNT(CASE WHEN present = 1 THEN 1 END) as attended_lessons,
        COUNT(CASE WHEN present = 0 THEN 1 END) as missed_lessons,
        ROUND(
          (COUNT(CASE WHEN present = 1 THEN 1 END) * 100.0 / 
           NULLIF(COUNT(*), 0)), 2
        ) as attendance_percentage
      FROM attendance 
      WHERE student_id = ?
    `, [studentId]);
    
    // Oxirgi 30 kunlik davomat
    const recentAttendance = await dbAll(`
      SELECT date, present
      FROM attendance 
      WHERE student_id = ? 
      ORDER BY date DESC 
      LIMIT 30
    `, [studentId]);
    
    const progressData = {
      ...student,
      ...attendanceStats,
      recent_attendance: recentAttendance,
      current_level: getRandomLevel(),
      completed_modules: getRandomModules(),
      next_milestone: getNextMilestone(),
      learning_path: getLearningPath(),
      achievements: getAchievements(),
      last_activity: getRecentDate()
    };
    
    res.json(progressData);
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
});

// Helper functions
function getRandomLevel() {
  const levels = ['Beginner', 'Intermediate', 'Advanced'];
  return levels[Math.floor(Math.random() * levels.length)];
}

function getRandomModules() {
  const allModules = [
    'Basics', 'Grammar 1', 'Grammar 2', 'Vocabulary 1', 'Vocabulary 2',
    'Speaking 1', 'Speaking 2', 'Listening 1', 'Listening 2', 'Writing 1'
  ];
  const count = Math.floor(Math.random() * 5) + 1;
  return allModules.slice(0, count);
}

function getNextMilestone() {
  const milestones = [
    'Grammar 2', 'Speaking 2', 'Vocabulary 3', 'Writing 1', 'Advanced Grammar'
  ];
  return milestones[Math.floor(Math.random() * milestones.length)];
}

function getLearningPath() {
  return [
    { module: 'Basics', completed: true, score: 85 },
    { module: 'Grammar 1', completed: true, score: 78 },
    { module: 'Vocabulary 1', completed: false, score: null },
    { module: 'Speaking 1', completed: false, score: null }
  ];
}

function getAchievements() {
  const achievements = [
    'Perfect Attendance Week',
    'Grammar Master',
    'Vocabulary Champion',
    'Speaking Star'
  ];
  const count = Math.floor(Math.random() * 3);
  return achievements.slice(0, count);
}

function getRecentDate() {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 7));
  return date.toISOString().split('T')[0];
}

export default router;