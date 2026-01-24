import express from 'express';
import { LoginRequest, LoginResponse } from "../../shared/types";
import { User, Session, Student, Branch } from '../mongodb.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Demo users with role-based access
const users = [
    {
        id: "1",
        username: "superadmin",
        password: "prox2024",
        name: "Prox Kompaniyasi Boshlig'i",
        role: "super_admin" as const,
        branch_id: null, // Super admin barcha filiallarni ko'radi
        created_at: new Date(),
    },
    {
        id: "2", 
        username: "gijduvan_manager",
        password: "gijduvan123",
        name: "G'ijduvon Filiali Rahbari",
        role: "manager" as const,
        branch_id: null, // MongoDB'dan dinamik ravishda topiladi
        created_at: new Date(),
    },
    {
        id: "3", 
        username: "vobkent_manager",
        password: "vobkent123",
        name: "Vobkent Filiali Rahbari",
        role: "manager" as const,
        branch_id: "branch_vobkent", // Faqat Vobkent filialini ko'radi
        created_at: new Date(),
    },
    {
        id: "4",
        username: "tashkent_manager", 
        password: "tashkent123",
        name: "Toshkent Filiali Rahbari",
        role: "manager" as const,
        branch_id: "branch_tashkent", // Faqat Toshkent filialini ko'radi
        created_at: new Date(),
    }
];

// Login endpoint
router.post("/login", async (req, res) => {
    try {
        const { username, password }: LoginRequest = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: "Login va parol talab qilinadi" });
        }

        // Try hardcoded users first (for super admin)
        const hardcodedUser = users.find(u => u.username === username && u.password === password);
        
        if (hardcodedUser) {
            const token = `token_${hardcodedUser.id}_${Date.now()}`;
            
            // G'ijduvon manager uchun branch_id ni MongoDB'dan topish
            let actualBranchId = hardcodedUser.branch_id;
            if (hardcodedUser.username === 'gijduvan_manager') {
                try {
                    const gijduvonBranch = await Branch.findOne({ 
                        name: { $regex: /g.ijduvan/i } 
                    });
                    if (gijduvonBranch) {
                        actualBranchId = gijduvonBranch._id.toString();
                        // Last login yangilash
                        await Branch.findByIdAndUpdate(gijduvonBranch._id, {
                            last_login: new Date()
                        });
                    }
                } catch (e) {
                    console.log('G\'ijduvon filialini topishda xatolik:', e);
                }
            } else if (hardcodedUser.branch_id) {
                // Boshqa hardcoded userlar uchun
                try {
                    await Branch.findByIdAndUpdate(hardcodedUser.branch_id, {
                        last_login: new Date()
                    });
                } catch (e) {
                    console.log('Branch last_login yangilashda xatolik:', e);
                }
            }
            
            const { password: _, ...userWithoutPassword } = hardcodedUser;
            const response: LoginResponse = {
                token,
                user: {
                    ...userWithoutPassword,
                    branch_id: actualBranchId
                }
            };
            return res.json(response);
        }

        // Try MongoDB users (for branch managers and students)
        try {
            // First try User collection (branch managers)
            const mongoUser = await User.findOne({ username }).populate('branch_id', 'name');
            
            if (mongoUser) {
                // Check password
                const isPasswordValid = await bcrypt.compare(password, mongoUser.password);
                
                if (isPasswordValid) {
                    // Generate token
                    const token = uuidv4();

                    // Save session to MongoDB
                    await Session.create({
                        token,
                        user_id: mongoUser._id
                    });

                    // Filialning last_login vaqtini yangilash
                    if (mongoUser.branch_id) {
                        await Branch.findByIdAndUpdate(mongoUser.branch_id, {
                            last_login: new Date()
                        });
                    }

                    // Return user data
                    const response: LoginResponse = {
                        token,
                        user: {
                            id: mongoUser._id.toString(),
                            username: mongoUser.username,
                            name: (mongoUser.branch_id as any)?.name || 'Branch Manager',
                            role: mongoUser.role,
                            branch_id: mongoUser.branch_id?.toString() || null,
                            created_at: mongoUser.created_at
                        }
                    };

                    return res.json(response);
                }
            }

            // If not found in User collection, try Student collection
            const studentUser = await Student.findOne({ username }).populate('branch_id', 'name');
            
            if (studentUser && studentUser.password) {
                // Check password
                const isPasswordValid = await bcrypt.compare(password, studentUser.password);
                
                if (isPasswordValid) {
                    // Generate token for student
                    const token = `student_${studentUser._id}_${Date.now()}`;

                    // Return student data with 'student' role
                    const response: LoginResponse = {
                        token,
                        user: {
                            id: studentUser._id.toString(),
                            username: studentUser.username,
                            name: studentUser.name,
                            role: 'student' as any, // O'quvchi roli
                            branch_id: studentUser.branch_id?.toString() || null,
                            created_at: studentUser.created_at
                        }
                    };

                    return res.json(response);
                }
            }
        } catch (mongoError) {
            console.log('MongoDB not available, using hardcoded users only');
        }

        // If MongoDB user not found or MongoDB not available
        return res.status(401).json({ message: "Login yoki parol noto'g'ri" });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Server xatoligi" });
    }
});

// Verify token endpoint (for future use)
router.get("/verify", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token topilmadi" });
    }

    const token = authHeader.substring(7);

    // Simple token validation (in production, verify JWT)
    if (token.startsWith("token_")) {
        const userId = token.split("_")[1];
        const user = users.find(u => u.id === userId);

        if (user) {
            const { password: _, ...userWithoutPassword } = user;
            return res.json({ user: userWithoutPassword });
        }
    }

    return res.status(401).json({ message: "Noto'g'ri token" });
});

// Middleware funksiyalar
export const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Token topilmadi" });
    }

    const token = authHeader.substring(7);

    try {
        // Check hardcoded users first (for super admin)
        if (token.startsWith("token_")) {
            const userId = token.split("_")[1];
            const user = users.find(u => u.id === userId);

            if (user) {
                const { password: _, ...userWithoutPassword } = user;
                
                // G'ijduvon manager uchun branch_id ni MongoDB'dan topish
                let actualBranchId = user.branch_id;
                if (user.username === 'gijduvan_manager') {
                    try {
                        const gijduvonBranch = await Branch.findOne({ 
                            name: { $regex: /g.ijduvan/i } 
                        });
                        if (gijduvonBranch) {
                            actualBranchId = gijduvonBranch._id.toString();
                        }
                    } catch (e) {
                        console.log('G\'ijduvon filialini topishda xatolik:', e);
                    }
                }
                
                req.user = {
                    ...userWithoutPassword,
                    branch_id: actualBranchId
                };
                return next();
            }
        }

        // Check student token
        if (token.startsWith("student_")) {
            try {
                const studentId = token.split("_")[1];
                const student = await Student.findById(studentId).populate('branch_id', 'name');

                if (student) {
                    req.user = {
                        id: student._id.toString(),
                        username: student.username,
                        name: student.name,
                        role: 'student',
                        branch_id: student.branch_id?.toString() || null,
                        created_at: student.created_at
                    };
                    return next();
                }
            } catch (error) {
                console.log('Student token validation failed');
            }
        }

        // Check MongoDB session
        try {
            const session = await Session.findOne({ token }).populate({
                path: 'user_id',
                populate: { path: 'branch_id', select: 'name' }
            });

            if (session) {
                const mongoUser = session.user_id as any;
                req.user = {
                    id: mongoUser._id.toString(),
                    username: mongoUser.username,
                    name: mongoUser.branch_id?.name || 'Branch Manager',
                    role: mongoUser.role,
                    branch_id: mongoUser.branch_id?._id?.toString() || null,
                    created_at: mongoUser.created_at
                };

                return next();
            }
        } catch (mongoError) {
            console.log('MongoDB not available for session check');
        }

        // If no valid session found
        return res.status(401).json({ message: "Noto'g'ri token" });
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ message: "Noto'g'ri token" });
    }
};

// Super admin huquqini tekshirish
export const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Faqat super admin ruxsati bor" });
    }
    next();
};

// Manager yoki super admin huquqini tekshirish
export const requireManagerOrSuperAdmin = (req: any, res: any, next: any) => {
    if (!['super_admin', 'manager'].includes(req.user?.role)) {
        return res.status(403).json({ message: "Ruxsat yo'q" });
    }
    next();
};

// Filial filtri - foydalanuvchi faqat o'z filialini ko'rishi uchun
export const applyBranchFilter = (req: any, _res: any, next: any) => {
    // Super admin barcha filiallarni ko'radi
    if (req.user?.role === 'super_admin') {
        req.branchFilter = {}; // Hech qanday filtr yo'q
    } else {
        // Boshqa rollar faqat o'z filialini ko'radi
        req.branchFilter = { branch_id: req.user?.branch_id };
    }
    next();
};

// Username unique ekanligini tekshirish
export const isUsernameUnique = (username: string): boolean => {
  return !users.find(user => user.username === username);
};

// Yangi filial rahbari qo'shish funksiyasi
export const addBranchManager = (userData: {
  username: string;
  password: string;
  name: string;
  branch_id: string;
}) => {
  // Username unique ekanligini tekshirish
  if (!isUsernameUnique(userData.username)) {
    throw new Error('Bu login allaqachon ishlatilmoqda');
  }

  const newUser = {
    id: (users.length + 1).toString(),
    username: userData.username,
    password: userData.password,
    name: userData.name,
    role: "manager" as const,
    branch_id: userData.branch_id,
    created_at: new Date(),
  };
  
  users.push(newUser);
  console.log('✅ Yangi filial rahbari qo\'shildi:', userData.username);
  return newUser;
};

export default router;