import { Router, Request } from "express";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { authenticateToken } from "./auth";

const router = Router();

// Extend Request type
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    branch_id?: string;
  };
}

// Exam result interface
interface ExamResult {
  studentId: string;
  studentName: string;
  stepNumber: number;
  stepTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: Array<{
    questionIndex: number;
    selectedAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
  }>;
  mentorId: string;
  mentorName: string;
  completedAt: Date;
  createdAt: Date;
}

// Create exam result
router.post("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "MongoDB ulanmagan" });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ error: "Database ulanmagan" });
    }

    const {
      studentId,
      studentName,
      stepNumber,
      stepTitle,
      score,
      totalQuestions,
      percentage,
      answers,
      mentorId,
      mentorName,
    } = req.body;

    // Validation
    if (!studentId || !stepNumber || score === undefined || !totalQuestions) {
      return res.status(400).json({ error: "Barcha maydonlar to'ldirilishi kerak" });
    }

    const examResult: ExamResult = {
      studentId,
      studentName: studentName || "",
      stepNumber,
      stepTitle: stepTitle || "",
      score,
      totalQuestions,
      percentage: percentage || Math.round((score / totalQuestions) * 100),
      answers: answers || [],
      mentorId: mentorId || req.user?.id || "",
      mentorName: mentorName || req.user?.username || "",
      completedAt: new Date(),
      createdAt: new Date(),
    };

    const result = await db.collection("exam_results").insertOne(examResult);

    res.json({
      success: true,
      id: result.insertedId,
      message: "Natija saqlandi",
    });
  } catch (error) {
    console.error("Exam result save error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Get student exam history
router.get("/student/:studentId", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.json([]);
    }

    const { studentId } = req.params;

    const results = await db
      .collection("exam_results")
      .find({ studentId })
      .sort({ completedAt: -1 })
      .toArray();

    res.json(results);
  } catch (error) {
    console.error("Get exam history error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Get exam statistics
router.get("/stats", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ total: 0, avgScore: 0, totalStudents: 0, byStep: [] });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.json({ total: 0, avgScore: 0, totalStudents: 0, byStep: [] });
    }

    const user = req.user;

    // Filter by branch for mentor/manager
    let matchStage: any = {};
    if (user?.role === "mentor" || user?.role === "manager") {
      matchStage.mentorId = user.id;
    }

    const stats = await db
      .collection("exam_results")
      .aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgScore: { $avg: "$percentage" },
            totalStudents: { $addToSet: "$studentId" },
          },
        },
      ])
      .toArray();

    const byStep = await db
      .collection("exam_results")
      .aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: "$stepNumber",
            count: { $sum: 1 },
            avgScore: { $avg: "$percentage" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const result = {
      total: stats[0]?.total || 0,
      avgScore: Math.round(stats[0]?.avgScore || 0),
      totalStudents: stats[0]?.totalStudents?.length || 0,
      byStep: byStep.map((s: any) => ({
        stepNumber: s._id,
        count: s.count,
        avgScore: Math.round(s.avgScore),
      })),
    };

    res.json(result);
  } catch (error) {
    console.error("Get exam stats error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Get recent exam results (for dashboard)
router.get("/recent", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.json([]);
    }

    const user = req.user;
    const limit = parseInt(req.query.limit as string) || 10;

    let matchStage: any = {};
    if (user?.role === "mentor" || user?.role === "manager") {
      matchStage.mentorId = user.id;
    }

    const results = await db
      .collection("exam_results")
      .find(matchStage)
      .sort({ completedAt: -1 })
      .limit(limit)
      .toArray();

    res.json(results);
  } catch (error) {
    console.error("Get recent exams error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Delete exam result (super_admin only)
router.delete("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (user?.role !== "super_admin") {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "MongoDB ulanmagan" });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ error: "Database ulanmagan" });
    }

    const { id } = req.params;

    await db.collection("exam_results").deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true, message: "O'chirildi" });
  } catch (error) {
    console.error("Delete exam result error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

export default router;
