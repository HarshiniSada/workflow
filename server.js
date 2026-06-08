const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5050;
const DB_PATH = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Helpers
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [], tasks: [], work_logs: [], audit_logs: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Live Gemini API Helper
async function callGemini(apiKey, prompt, systemInstruction = "") {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    
    // Add JSON response schema configuration if prompt expects JSON
    if (prompt.toLowerCase().includes("json") || prompt.toLowerCase().includes("return only a json")) {
      payload.generationConfig = { responseMimeType: "application/json" };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const resJson = await response.json();
    return resJson.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini live call failed, falling back to mock:", error);
    throw error;
  }
}

// REST Endpoints

// Authentication API (Mock profile selection & sign-in)
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: 'User not found. Try john@workflow.ai or sarah@workflow.ai.' });
  }
  
  res.json({ user });
});

// Users list
app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

// Audit Logs list
app.get('/api/audits', (req, res) => {
  const db = readDB();
  res.json(db.audit_logs);
});

// Tasks List (with Overdue Calculations)
app.get('/api/tasks', (req, res) => {
  const db = readDB();
  const now = new Date();
  
  // Dynamic overdue status update before serving tasks
  let updated = false;
  db.tasks = db.tasks.map(task => {
    if (task.status !== 'Completed' && task.status !== 'Overdue') {
      const deadline = new Date(task.deadline);
      if (now > deadline) {
        task.status = 'Overdue';
        updated = true;
        
        // Log to audit log
        db.audit_logs.push({
          id: `a_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          taskId: task.id,
          userId: 'system',
          action: 'OVERDUE_ALERT',
          details: `Task '${task.title}' went overdue. Deadline was ${deadline.toLocaleString()}`,
          timestamp: now.toISOString()
        });
      }
    }
    return task;
  });
  
  if (updated) {
    writeDB(db);
  }
  
  res.json(db.tasks);
});

// Create Task
app.post('/api/tasks', (req, res) => {
  const { title, description, assignedTo, priority, deadline, createdBy } = req.body;
  
  if (!title || !description || !assignedTo || !priority || !deadline || !createdBy) {
    return res.status(400).json({ error: 'Missing required task fields.' });
  }

  const db = readDB();
  const creator = db.users.find(u => u.id === createdBy);
  const assignee = db.users.find(u => u.id === assignedTo);

  const newTask = {
    id: `t_${Date.now()}`,
    title,
    description,
    assignedTo,
    priority,
    status: 'Pending',
    deadline,
    createdBy,
    createdAt: new Date().toISOString()
  };

  db.tasks.push(newTask);

  // Add audit log
  db.audit_logs.push({
    id: `a_${Date.now()}`,
    taskId: newTask.id,
    userId: createdBy,
    action: 'TASK_CREATED',
    details: `${creator ? creator.name : 'Manager'} created task '${title}' and assigned it to ${assignee ? assignee.name : 'Employee'}.`,
    timestamp: new Date().toISOString()
  });

  writeDB(db);
  res.status(201).json(newTask);
});

// Update Task Status
app.patch('/api/tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, userId } = req.body;

  if (!status || !userId) {
    return res.status(400).json({ error: 'Missing status or userId' });
  }

  const db = readDB();
  const taskIndex = db.tasks.findIndex(t => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = db.tasks[taskIndex];
  const oldStatus = task.status;
  task.status = status;

  const user = db.users.find(u => u.id === userId);

  // Add audit log
  db.audit_logs.push({
    id: `a_${Date.now()}`,
    taskId: id,
    userId,
    action: 'STATUS_CHANGED',
    details: `${user ? user.name : 'User'} updated status from '${oldStatus}' to '${status}'.`,
    timestamp: new Date().toISOString()
  });

  writeDB(db);
  res.json(task);
});

// Submit Daily Work Log & Trigger AI Verification
app.post('/api/work-logs', async (req, res) => {
  const { taskId, userId, logText, rawNotes } = req.body;
  const apiKey = req.headers['x-gemini-key'];

  if (!taskId || !userId || !logText) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const db = readDB();
  const task = db.tasks.find(t => t.id === taskId);
  const user = db.users.find(u => u.id === userId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  let aiResult;

  if (apiKey) {
    // Live Gemini path
    try {
      const prompt = `
      Compare the employee's work log against the assigned task.
      Task Title: "${task.title}"
      Task Description: "${task.description}"
      Employee Work Log: "${logText}"
      Employee Raw Notes (if any): "${rawNotes || ''}"

      Evaluate:
      1. Specificity (Detailed and technical vs low-effort/empty/vague claims like "done database").
      2. Relevance (Does it actually match what was asked in the task description?).
      3. Completeness (Are claims of progress or completion supported by descriptive details?).

      Return ONLY a JSON object:
      {
        "status": "GENUINE" | "WARNING" | "FLAGGED",
        "confidenceScore": number (0 to 100),
        "reasoning": "Give clear explanation of your verdict, outlining what was done or why it is suspicious, and specific suggestions on how the employee can improve this log."
      }
      `;
      const systemInstruction = "You are an objective enterprise operations audit assistant. Your job is to catch employee task bluffing and ensure clear technical communication in work logs. Be encouraging but firm.";
      const geminiResponse = await callGemini(apiKey, prompt, systemInstruction);
      aiResult = JSON.parse(geminiResponse.trim());
    } catch (error) {
      console.warn("Live Gemini API call failed. Using mock parser.", error);
      aiResult = runLocalWorkLogMock(task, logText);
    }
  } else {
    // High-fidelity dynamic mock path
    aiResult = runLocalWorkLogMock(task, logText);
  }

  // Save work log
  const newLog = {
    id: `w_${Date.now()}`,
    taskId,
    userId,
    logText,
    rawNotes: rawNotes || '',
    aiVerification: aiResult,
    createdAt: new Date().toISOString()
  };

  db.work_logs.push(newLog);

  // System-wide accountability audit
  db.audit_logs.push({
    id: `a_${Date.now()}`,
    taskId,
    userId,
    action: 'LOG_SUBMITTED',
    details: `${user ? user.name : 'Employee'} submitted daily log. AI Rating: ${aiResult.status} (Score: ${aiResult.confidenceScore}%).`,
    timestamp: new Date().toISOString()
  });

  // If AI flags it as Genuine, let's automatically mark the task Completed to delight the user,
  // but keep it editable so manager/employee can override if they wish.
  if (aiResult.status === 'GENUINE') {
    task.status = 'Completed';
    db.audit_logs.push({
      id: `a_auto_${Date.now()}`,
      taskId,
      userId: 'system',
      action: 'STATUS_CHANGED',
      details: `System automatically completed task based on GENUINE AI Work Log Verification.`,
      timestamp: new Date().toISOString()
    });
  }

  writeDB(db);
  res.status(201).json({ log: newLog, task });
});

// AI Work-Log Mock Verification Engine (Deterministic & Smart Fallback)
function runLocalWorkLogMock(task, logText) {
  const cleanLog = logText.toLowerCase().trim();
  
  // 1. Check for extreme low effort / vagueness
  if (cleanLog.length < 18) {
    return {
      status: "FLAGGED",
      confidenceScore: 20,
      reasoning: "The submission is extremely short and contains zero details about technical tasks, outcomes, or verification. This appears to be a high-risk bluff."
    };
  }

  const vagueWords = ["did it", "done", "finished", "working fine", "all ok", "resolved", "completed it", "yes", "i did it", "checked everything"];
  const isExtremelyVague = vagueWords.some(w => cleanLog === w || cleanLog === w + ".");
  if (isExtremelyVague) {
    return {
      status: "FLAGGED",
      confidenceScore: 15,
      reasoning: "The entry consists entirely of vague status declarations without any technical substance. Please outline what changes were made, where, and how you verified them."
    };
  }

  // 2. Semantic matching
  const taskKeywords = getKeywords(task.title + " " + task.description);
  const logKeywords = getKeywords(logText);
  
  // Find overlaps
  const matches = taskKeywords.filter(w => logKeywords.includes(w));
  const overlapRatio = matches.length / Math.min(taskKeywords.length, 8);

  // Check if there are technical verbs/nouns in the log (e.g. endpoint, configure, setup, install, postman, git, database, code, migrate)
  const techTerms = [
    "api", "route", "endpoints", "query", "database", "sql", "postgres", "rds", "aws", "deploy", "server", "socket", "gateway",
    "migration", "test", "verification", "check", "config", "setup", "hash", "bcrypt", "jwt", "token", "context", "state", "react",
    "disconnect", "listener", "heap", "memory", "leak", "fix", "code", "file", "function", "pull", "dump", "connection", "pool"
  ];
  
  const matchesTech = techTerms.filter(w => cleanLog.includes(w));
  
  // 3. Formulate verdict
  if (matchesTech.length === 0 && overlapRatio < 0.1) {
    return {
      status: "FLAGGED",
      confidenceScore: 35,
      reasoning: `No relevance detected. The task is about '${task.title}', but your log does not mention any related technical details. Please provide proof of work that aligns with the task scope.`
    };
  }

  if (matchesTech.length < 2 || cleanLog.length < 40) {
    return {
      status: "WARNING",
      confidenceScore: 65,
      reasoning: "Task relevance is acceptable, but the description is thin. Please include specific technical details (e.g. tools used, exact routes modified, or tests performed) to raise confidence."
    };
  }

  // Default to genuine if it's long and has tech keywords
  const score = Math.min(85 + Math.floor(overlapRatio * 15) + Math.min(matchesTech.length * 2, 8), 98);
  return {
    status: "GENUINE",
    confidenceScore: score,
    reasoning: `Highly relevant and structured work log. Accurately describes tasks aligned with the scope of '${task.title}', and includes proof of technical verification.`
  };
}

function getKeywords(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !["with", "this", "that", "from", "your", "were", "been", "have", "some", "more", "then"].includes(w));
}

// AI Manager Summary — "Where's My Team?"
app.post('/api/ai/manager-summary', async (req, res) => {
  const apiKey = req.headers['x-gemini-key'];
  const db = readDB();
  const now = new Date();

  // Pre-calculate overdue items
  const overdueTasks = db.tasks.filter(t => t.status === 'Overdue');
  const activeTasks = db.tasks.filter(t => t.status === 'In-Progress');
  const flaggedLogs = db.work_logs.filter(wl => wl.aiVerification.status === 'FLAGGED');

  if (apiKey) {
    try {
      const prompt = `
      You are a senior workforce operations consultant. Provide a comprehensive, professional, highly actionable "Where's My Team?" executive report for the manager Sarah Connor.
      
      Review this live database snapshot:
      - Users: ${JSON.stringify(db.users)}
      - Tasks: ${JSON.stringify(db.tasks)}
      - Work Logs: ${JSON.stringify(db.work_logs)}
      - System Audit Trail: ${JSON.stringify(db.audit_logs.slice(-15))}
      
      Ensure your report uses beautiful, clean Markdown and is extremely thorough:
      1. **Executive Snapshot**: Total tasks, overdue, healthy progress.
      2. **Critical Slippage (Red Flags)**: Specific employees behind on high-priority tasks (e.g., John Doe on 'Fix memory leak').
      3. **Bluff/Accountability Alert**: Highlight flagged/low-effort daily logs (e.g. John's flagged memory leak log).
      4. **Quiet Overperformers**: Employees consistently getting green "Genuine" ratings early (e.g., Ellen Ripley).
      5. **Recommended Manager Actions**: Immediate, specific text drafts or touchpoints Sarah Connor should have with the team.
      `;
      
      const systemInstruction = "You are a professional enterprise productivity and project accountability advisor. Deliver premium-grade summaries.";
      const geminiSummary = await callGemini(apiKey, prompt, systemInstruction);
      return res.json({ summary: geminiSummary });
    } catch (error) {
      console.warn("Live Gemini Manager Summary failed. Falling back to mock generator.", error);
    }
  }

  // Dynamic local generator
  const report = `# Executive Operations Briefing
**Generated:** ${now.toLocaleString()} | **Scope:** Active Projects & Employee Accountability

---

## 📊 Executive Snapshot
*   **Total Tasks Enrolled:** **${db.tasks.length}**
*   **Active (In-Progress) Items:** **${activeTasks.length}**
*   **Slipping/Overdue Deadlines:** 🚨 **${overdueTasks.length}**
*   **AI Log Audits:** Green **Genuine (${db.work_logs.filter(wl => wl.aiVerification.status === 'GENUINE').length})** | Amber **Warning (${db.work_logs.filter(wl => wl.aiVerification.status === 'WARNING').length})** | Red **Flagged (${flaggedLogs.length})**

---

## 🚨 Critical Slippage & Risk Areas
${overdueTasks.length > 0 ? overdueTasks.map(t => {
  const assignee = db.users.find(u => u.id === t.assignedTo);
  const diffDays = Math.ceil((now - new Date(t.deadline)) / (1000 * 60 * 60 * 24));
  return `*   **${t.title}** (High Priority)
    *   **Assigned to:** ${assignee ? assignee.name : 'Unassigned'}
    *   **Slippage:** Overdue by **${diffDays} day(s)** (Deadline: ${new Date(t.deadline).toLocaleDateString()})
    *   **Status:** In-progress, but needs immediate escalation.`;
}).join('\n') : '*   *No overdue tasks currently detected. Workflows are operating within target deadlines.*'}

---

## ⚠️ Accountability & Bluff Alerts
${flaggedLogs.length > 0 ? flaggedLogs.map(wl => {
  const task = db.tasks.find(t => t.id === wl.taskId);
  const user = db.users.find(u => u.id === wl.userId);
  return `*   **Low-Detail Submission** on **"${task ? task.title : 'Unknown Task'}"**
    *   **Submitted by:** ${user ? user.name : 'Employee'} on ${new Date(wl.createdAt).toLocaleDateString()}
    *   **AI Verdict:** 🔴 **FLAGGED** (Confidence Score: **${wl.aiVerification.confidenceScore}%**)
    *   **Audit Reason:** *"${wl.aiVerification.reasoning}"*`;
}).join('\n') : '*   *Zero flagged work logs in the current review window. All logs verified genuine.*'}

---

## 🏆 Quiet Overperformers
*   **Ellen Ripley**: Completed "**Create User Authentication flow**" early. AI validated log with **96% GENUINE** confidence. Outstanding detail and technical verification reported.
*   **Sarah Connor (System Note)**: Team operational health is generally strong, but John Doe is struggling with WS memory leak complexity and needs engineering assistance.

---

## 💡 Operational Recommendations for Sarah Connor
1.  **Escalate Task 'Fix memory leak'**: John Doe's work log is highly vague. Schedule a quick 10-minute technical review to verify event listener cleanups.
2.  **Acknowledge Ellen Ripley**: Commend Ellen during the sync for excellent documentation and early delivery on the Authentication module.
3.  **Refactor React Context**: Task is currently Pending. Suggest assign to Marcus Wright to keep backend specialists focused on API refactoring.`;

  res.json({ summary: report });
});

// AI Helper: Smart Assistance (Auto-suggest priority & deadline)
app.post('/api/ai/suggest-task', async (req, res) => {
  const { description } = req.body;
  const apiKey = req.headers['x-gemini-key'];

  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }

  if (apiKey) {
    try {
      const prompt = `
      Based on the following task description: "${description}"
      Suggest a Priority (Low, Medium, High) and a realistic, standard software development Deadline in days (number of days from now, e.g. 3).
      Return ONLY a JSON response:
      {
        "priority": "Low" | "Medium" | "High",
        "deadlineDays": number
      }
      `;
      const geminiResponse = await callGemini(apiKey, prompt);
      const parsed = JSON.parse(geminiResponse.trim());
      return res.json(parsed);
    } catch (e) {
      console.warn("Live suggestion failed. Using local engine.", e);
    }
  }

  // Local helper
  const clean = description.toLowerCase();
  let priority = 'Medium';
  let deadlineDays = 5;

  if (clean.includes('urgent') || clean.includes('prod') || clean.includes('crash') || clean.includes('leak') || clean.includes('critical') || clean.includes('fix')) {
    priority = 'High';
    deadlineDays = 2;
  } else if (clean.includes('refactor') || clean.includes('design') || clean.includes('low') || clean.includes('documentation')) {
    priority = 'Low';
    deadlineDays = 8;
  }

  res.json({ priority, deadlineDays });
});

// AI Helper: Log Draft Polisher
app.post('/api/ai/polish-log', async (req, res) => {
  const { taskId, roughNotes } = req.body;
  const apiKey = req.headers['x-gemini-key'];

  if (!taskId || !roughNotes) {
    return res.status(400).json({ error: 'TaskId and roughNotes are required.' });
  }

  const db = readDB();
  const task = db.tasks.find(t => t.id === taskId);

  if (apiKey) {
    try {
      const prompt = `
      You are an elite technical writer. Draft a highly professional, polished, technical daily work log based on the employee's short rough notes and the target task details.
      
      Task Details:
      - Title: "${task ? task.title : 'General Task'}"
      - Description: "${task ? task.description : ''}"
      
      Employee's Rough Notes:
      "${roughNotes}"
      
      Format the draft so it clearly details *what* was done, *how* it was structured/configured, and *what* was verified. Do not make up fake completions if notes say incomplete. Return ONLY a JSON object:
      {
        "polishedText": "string"
      }
      `;
      const geminiResponse = await callGemini(apiKey, prompt);
      const parsed = JSON.parse(geminiResponse.trim());
      return res.json(parsed);
    } catch (e) {
      console.warn("Live polish failed. Using local builder.", e);
    }
  }

  // Local polisher
  let polishedText = `Successfully worked on task "${task ? task.title : 'General Dev'}". Developed and implemented solutions based on rough outline: "${roughNotes}". Checked all local test branches and verified code integrity.`;

  if (roughNotes.length > 5) {
    polishedText = `Refactored key code blocks associated with "${task ? task.title : 'System Features'}". Translated raw field points ("${roughNotes}") into structured methods. Completed unit-level integration testing and verified standard connection pools to secure operations.`;
  }

  res.json({ polishedText });
});

// AI Helper: Stale Task Detector
app.get('/api/ai/stale-tasks', (req, res) => {
  const db = readDB();
  const now = new Date();
  
  // Find in-progress/pending tasks created > 2 days ago or overdue tasks
  const stale = db.tasks
    .filter(t => t.status !== 'Completed')
    .map(t => {
      const created = new Date(t.createdAt);
      const diffDays = Math.ceil((now - created) / (1000 * 60 * 60 * 24));
      
      if (t.status === 'Overdue') {
        return {
          id: t.id,
          title: t.title,
          reason: "Task has passed its deadline and is currently flagged Overdue.",
          action: "Recommend Sarah Connor send a direct follow-up message to reassess resource blocks."
        };
      } else if (diffDays > 2) {
        return {
          id: t.id,
          title: t.title,
          reason: `Task has been active for ${diffDays} days without completion.`,
          action: "Verify if dependencies are blocking assignee progress or if context API is prop-drilled."
        };
      }
      return null;
    })
    .filter(t => t !== null);

  res.json(stale);
});

// Serve Frontend index.html for all SPA routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Boot Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` WORKFLOW ACCOUNTABILITY ENGINE RUNNING AT PORT ${PORT}`);
  console.log(` Local App URL: http://localhost:${PORT}`);
  console.log(` Database Path: ${DB_PATH}`);
  console.log(`===================================================`);
});
