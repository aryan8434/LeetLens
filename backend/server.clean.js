const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Razorpay = require("razorpay");

let admin = null;
try {
  admin = require("firebase-admin");
} catch (_error) {
  admin = null;
}

dotenv.config({ path: path.join(__dirname, ".env") });

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TFM4cTiksu0var",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "Vj4M6xnUqUhvGVZm1tbpQLCN",
});

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FRONTEND_DIST_DIR = path.join(__dirname, "dist");
const FRONTEND_BUILD_DIR = path.join(__dirname, "build");
const LEGACY_PUBLIC_DIR = path.join(__dirname, "public");
const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const REGISTERED_USERS_COLLECTION = "registered_users";
const FIRESTORE_USER_SEARCH_COLLECTION = "user_searches";
const DEFAULT_USER_CREDITS = 10;
const CREDIT_PACKAGES = {
  "10_rs9": { credits: 10, priceRs: 9 },
  "20_rs19": { credits: 20, priceRs: 19 },
  "50_rs29": { credits: 50, priceRs: 29 },
};

app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

let firestoreDb = null;

function parseServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed;
}

function initFirestore() {
  if (!admin) {
    console.warn("Firebase Admin SDK is not installed or failed to import.");
    return null;
  }

  try {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = parseServiceAccountFromEnv();
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log(
          "Firebase Admin SDK initialized successfully using FIREBASE_SERVICE_ACCOUNT_JSON.",
        );
      } else {
        console.warn(
          "\n[Firebase Warning] FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.\n" +
            "If you are running the server locally, you MUST add your service account credentials to backend/.env in order to connect to Firestore.\n" +
            "Example:\n" +
            'FIREBASE_SERVICE_ACCOUNT_JSON={\\"type\\": \\"service_account\\", \\"project_id\\": \\"leetlens\\", ...}\n',
        );
        admin.initializeApp({
          projectId: "leetlens",
        });
      }
    }

    const dbInstance = admin.firestore();
    console.log("Firestore database connection established successfully.");
    return dbInstance;
  } catch (error) {
    console.error(
      "\n[Firebase Error] Firestore initialization failed:",
      error.message,
    );
    console.error(
      "Please check your service account configuration in backend/.env.\n",
    );
    return null;
  }
}

firestoreDb = initFirestore();

function isAuthSystemReady() {
  return Boolean(admin && firestoreDb);
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  return req.ip || "unknown";
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

async function verifyFirebaseToken(req, res, next) {
  if (!isAuthSystemReady()) {
    return res.status(503).json({
      error: "Authentication service is not configured on the backend.",
    });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Missing Bearer token." });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.authUser = decoded;
    return next();
  } catch (_error) {
    console.error("Firebase token verification failed:", _error.message);
    return res.status(401).json({
      error: "Invalid authentication token.",
      details: _error.message,
    });
  }
}

async function optionalVerifyFirebaseToken(req, res, next) {
  if (!isAuthSystemReady()) {
    req.authUser = null;
    return next();
  }

  const token = getBearerToken(req);
  if (!token) {
    req.authUser = null;
    return next();
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.authUser = decoded;
    return next();
  } catch (_error) {
    console.warn(
      "Optional Firebase token verification failed:",
      _error.message,
    );
    req.authUser = null;
    return next();
  }
}

function getUserRef(uid) {
  return firestoreDb.collection(REGISTERED_USERS_COLLECTION).doc(uid);
}

function toDocSafeId(value) {
  return value.toString().trim().replaceAll("/", "_") || "unknown";
}

function normalizeIp(ip) {
  const raw = (ip || "").toString().trim();
  if (!raw) {
    return "unknown";
  }

  return raw.replace(/^::ffff:/, "");
}

function getDateFolderUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function detectDeviceType(userAgent) {
  const ua = (userAgent || "").toLowerCase();
  if (!ua) {
    return "desktop";
  }

  if (/tablet|ipad/.test(ua)) {
    return "tablet";
  }

  if (/mobile|android|iphone/.test(ua)) {
    return "mobile";
  }

  return "desktop";
}

function getDeviceInfoFromRequest(req) {
  const userAgent = (req.headers["user-agent"] || "").toString();
  const ua = userAgent.toLowerCase();

  let os = "Unknown";
  if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ios")
  ) {
    os = "iOS";
  } else if (ua.includes("mac os") || ua.includes("macintosh")) {
    os = "macOS";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  let browser = "Unknown";
  if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome/")) {
    browser = "Chrome";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browser = "Safari";
  } else if (ua.includes("firefox/")) {
    browser = "Firefox";
  }

  return {
    vendor: "Unknown",
    model: "Unknown",
    type: detectDeviceType(userAgent),
    os,
    browser,
  };
}

function hasPayloadKey(input, key) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function sanitizeProfilePayload(payload) {
  const input = payload || {};
  const updates = {};

  if (hasPayloadKey(input, "name")) {
    updates.name = (input.name || "").toString().trim().slice(0, 80);
  }

  if (hasPayloadKey(input, "dob")) {
    updates.dob = (input.dob || "").toString().trim().slice(0, 10);
  }

  if (hasPayloadKey(input, "age")) {
    updates.age = Number.isFinite(Number(input.age))
      ? Math.max(0, Math.min(120, Number(input.age)))
      : 0;
  }

  if (hasPayloadKey(input, "location")) {
    updates.location = (input.location || "").toString().trim().slice(0, 120);
  }

  if (hasPayloadKey(input, "coordinates")) {
    updates.coordinates = (input.coordinates || "").toString().trim().slice(0, 80);
  }

  if (hasPayloadKey(input, "photo")) {
    updates.photo = (input.photo || "").toString().trim();
  }

  if (hasPayloadKey(input, "bio")) {
    updates.bio = (input.bio || "").toString().trim().slice(0, 500);
  }

  return updates;
}

function toPublicUserProfile(uid, data, authUser) {
  return {
    uid,
    name: data.name || authUser?.name || "",
    email: data.email || authUser?.email || "",
    age: Number(data.age || 0),
    dob: data.dob || "",
    location: data.location || "",
    coordinates: data.coordinates || "",
    photo: data.photo || "",
    bio: data.bio || "",
    ipAddress: data.ipAddress || "",
    credits: Number(data.credits || 0),
    lastClaimedFreeCredits: data.lastClaimedFreeCredits
      ? typeof data.lastClaimedFreeCredits.toDate === "function"
        ? data.lastClaimedFreeCredits.toDate().toISOString()
        : data.lastClaimedFreeCredits
      : null,
  };
}

async function ensureUserDocument(authUser, req) {
  const ref = getUserRef(authUser.uid);
  const snap = await ref.get();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const baseData = {
    email: authUser.email || "",
    name: authUser.name || "",
    age: 0,
    dob: "",
    location: "",
    coordinates: "",
    photo: "",
    bio: "",
    ipAddress: req ? getClientIp(req) : "",
    updatedAt: now,
  };

  if (!snap.exists) {
    await ref.set({
      ...baseData,
      credits: DEFAULT_USER_CREDITS,
      createdAt: now,
    });
  } else {
    const updates = {
      email: authUser.email || snap.data()?.email || "",
      ipAddress: req ? getClientIp(req) : snap.data()?.ipAddress || "",
      updatedAt: now,
    };

    if (!snap.data()?.name && authUser.name) {
      updates.name = authUser.name;
    }

    await ref.set(updates, { merge: true });
  }

  const latest = await ref.get();
  return latest.data() || {};
}

async function consumeOneCredit(uid) {
  const ref = getUserRef(uid);

  return firestoreDb.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const data = snap.data() || {};
    const credits = Number(data.credits || 0);

    if (credits <= 0) {
      const noCreditsError = new Error("You have no credits remaining.");
      noCreditsError.status = 402;
      throw noCreditsError;
    }

    const nextCredits = credits - 1;
    txn.set(
      ref,
      {
        credits: nextCredits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return nextCredits;
  });
}

async function requireAvailableCredit(uid) {
  const snap = await getUserRef(uid).get();
  const credits = Number(snap.data()?.credits || 0);

  if (credits <= 0) {
    const noCreditsError = new Error("You have no credits remaining.");
    noCreditsError.status = 402;
    throw noCreditsError;
  }

  return credits;
}

async function addCreditsForPackage(uid, packageKey, paymentDetails = {}) {
  const pkg = CREDIT_PACKAGES[packageKey];
  if (!pkg) {
    const badPackageError = new Error("Invalid credits package selected.");
    badPackageError.status = 400;
    throw badPackageError;
  }

  const ref = getUserRef(uid);
  const txId = paymentDetails.paymentId || `tx_${Date.now()}`;
  const transRef = ref.collection("transactions").doc(txId);

  return firestoreDb.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const data = snap.data() || {};
    const currentCredits = Number(data.credits || 0);
    const nextCredits = currentCredits + pkg.credits;

    txn.set(
      ref,
      {
        credits: nextCredits,
        lastPurchase: {
          packageKey,
          credits: pkg.credits,
          amountRs: pkg.priceRs,
          purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    txn.set(transRef, {
      id: txId,
      paymentId: paymentDetails.paymentId || `pay_${Date.now()}`,
      orderId: paymentDetails.orderId || "N/A",
      packageKey,
      credits: pkg.credits,
      amountRs: pkg.priceRs,
      status: "SUCCESS",
      method: paymentDetails.method || "Razorpay Checkout",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      credits: nextCredits,
      package: pkg,
    };
  });
}

async function logSearchInFirestore({ username, req }) {
  if (!firestoreDb || !admin) {
    return;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  const ipAddress = normalizeIp(req ? getClientIp(req) : "");
  const visitorId = toDocSafeId(ipAddress);
  const dayFolder = getDateFolderUtc();
  const deviceInfo = req
    ? getDeviceInfoFromRequest(req)
    : {
        vendor: "Unknown",
        model: "Unknown",
        type: "desktop",
        os: "Unknown",
        browser: "Unknown",
      };

  const dailyVisitorRef = firestoreDb
    .collection(FIRESTORE_USER_SEARCH_COLLECTION)
    .doc(dayFolder)
    .collection("visitors")
    .doc(visitorId);
  const dailySearchRef = dailyVisitorRef.collection("searches").doc();

  const usernameDocId = toDocSafeId(username.toLowerCase());
  const userSearchRef = firestoreDb
    .collection(FIRESTORE_USER_SEARCH_COLLECTION)
    .doc(usernameDocId);
  const userSearchEventRef = userSearchRef.collection("searches").doc();

  const batch = firestoreDb.batch();
  batch.set(
    dailyVisitorRef,
    {
      visitor_id: visitorId,
      ip: ipAddress,
      device: deviceInfo,
      searchCount: admin.firestore.FieldValue.increment(1),
      last_visited_at: now,
      first_visited_at: now,
    },
    { merge: true },
  );
  batch.set(dailySearchRef, {
    username,
    timestamp: now,
  });
  batch.set(
    userSearchRef,
    {
      username,
      count: admin.firestore.FieldValue.increment(1),
      lastSearchedAt: now,
      firstSearchedAt: now,
    },
    { merge: true },
  );
  batch.set(userSearchEventRef, {
    username,
    searchedAt: now,
  });

  await batch.commit();
}

async function logSearchForUser({
  uid,
  username,
  req,
  type = "analysis",
  reportContent = null,
  analysisData = null,
  location = null,
  coordinates = null,
  photo = null,
}) {
  if (!firestoreDb || !admin) {
    return null;
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ipAddress = normalizeIp(req ? getClientIp(req) : "");
  const deviceInfo = req
    ? getDeviceInfoFromRequest(req)
    : {
        vendor: "Unknown",
        model: "Unknown",
        type: "desktop",
        os: "Unknown",
        browser: "Unknown",
      };

  const userSearchesRef = firestoreDb
    .collection(REGISTERED_USERS_COLLECTION)
    .doc(uid)
    .collection("searches")
    .doc();

  const logData = {
    username,
    timestamp: now,
    ipAddress,
    device: deviceInfo,
    type,
  };

  if (location) {
    logData.location = location;
  }

  if (coordinates) {
    logData.coordinates = coordinates;
  }

  if (photo) {
    logData.photo = photo;
  }

  if ((type === "ai_report" || type === "linkedin_report") && reportContent) {
    logData.report = reportContent;
    logData.analysisData = analysisData;
    logData.details = {
      topicBreakdown: null,
      weaknessAnalysis: null,
      sixMonthPlan: {
        month1: null,
        month2: null,
        month3: null,
        month4: null,
        month5: null,
        month6: null,
      },
    };
  }

  await userSearchesRef.set(logData);
  return userSearchesRef.id;
}

const ANALYZE_QUERY = `
  query userProblemsSolved($username: String!) {
    allQuestionsCount {
      difficulty
      count
    }
    matchedUser(username: $username) {
      username
      profile {
        ranking
        reputation
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
      tagProblemCounts {
        fundamental {
          tagName
          problemsSolved
        }
        intermediate {
          tagName
          problemsSolved
        }
        advanced {
          tagName
          problemsSolved
        }
      }
    }
  }
`;

const RECENT_SOLVED_QUERY_ROOT = `
  query recentAcceptedFromRoot($username: String!) {
    recentAcSubmissionList(username: $username, limit: 30) {
      title
      titleSlug
      timestamp
    }
  }
`;

const RECENT_SUBMISSIONS_QUERY_ROOT = `
  query recentSubmissionsFromRoot($username: String!) {
    recentSubmissionList(username: $username, limit: 60) {
      title
      titleSlug
      timestamp
      statusDisplay
    }
  }
`;

const CONTEST_QUERY = `
  query userContestData($username: String!) {
    userContestRanking(username: $username) {
      rating
    }
  }
`;

const CALENDAR_QUERY = `
  query userCalendarData($username: String!) {
    matchedUser(username: $username) {
      userCalendar {
        streak
        totalActiveDays
        submissionCalendar
      }
    }
  }
`;

function getDifficultyCount(source, difficulty) {
  const entry = source.find((item) => item.difficulty === difficulty);
  return entry ? Number(entry.count || 0) : 0;
}

async function postLeetCodeQuery(username, query) {
  const response = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/${username}/`,
    },
    body: JSON.stringify({
      query,
      variables: { username },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch LeetCode data.");
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message || "LeetCode returned an error.");
  }

  return payload.data;
}

async function fetchRecentSolvedProblems(username) {
  const payload = await postLeetCodeQuery(
    username,
    RECENT_SOLVED_QUERY_ROOT,
  ).catch(async () => {
    return postLeetCodeQuery(username, RECENT_SUBMISSIONS_QUERY_ROOT);
  });

  const source =
    payload?.recentAcSubmissionList || payload?.recentSubmissionList || [];
  return source
    .filter(
      (item) =>
        !item.statusDisplay ||
        (item.statusDisplay || "").toLowerCase() === "accepted",
    )
    .map((item) => ({
      title: item.title || "Unknown Problem",
      titleSlug: item.titleSlug || "",
      solvedAtEpoch: Number(item.timestamp || 0),
      solvedAtIso:
        Number(item.timestamp || 0) > 0
          ? new Date(Number(item.timestamp) * 1000).toISOString()
          : null,
      url: item.titleSlug
        ? `https://leetcode.com/problems/${item.titleSlug}/`
        : null,
    }));
}

function calculateBrutalScores(analysis) {
  const easyTotal = Number(analysis.difficulty.easy.solved || 0);
  const mediumTotal = Number(analysis.difficulty.medium.solved || 0);
  const hardTotal = Number(analysis.difficulty.hard.solved || 0);
  const topics = analysis.topics || [];

  // Core topics to check coverage
  const CORE_TOPICS = [
    "Array",
    "String",
    "Hash Table",
    "Dynamic Programming",
    "Math",
    "Sorting",
    "Tree",
    "Graph",
    "Binary Search",
    "Greedy",
  ];

  // 1. Distribute difficulties to topics proportionally
  const breakdown = topics.map((t) => ({
    name: t.name,
    total: Number(t.solved || 0),
    easy: 0,
    medium: 0,
    hard: 0,
  }));

  // Distribute hard questions
  let remainingHard = hardTotal;
  breakdown.sort((a, b) => b.total - a.total);
  for (let t of breakdown) {
    if (remainingHard > 0 && t.total > 0) {
      t.hard += 1;
      remainingHard -= 1;
    }
  }
  while (remainingHard > 0) {
    let distributed = false;
    for (let t of breakdown) {
      if (remainingHard > 0 && t.total > t.easy + t.medium + t.hard) {
        t.hard += 1;
        remainingHard -= 1;
        distributed = true;
      }
    }
    if (!distributed) break;
  }

  // Distribute medium questions
  let remainingMedium = mediumTotal;
  for (let t of breakdown) {
    if (remainingMedium > 0 && t.total > t.easy + t.medium + t.hard) {
      t.medium += 1;
      remainingMedium -= 1;
    }
  }
  while (remainingMedium > 0) {
    let distributed = false;
    for (let t of breakdown) {
      if (remainingMedium > 0 && t.total > t.easy + t.medium + t.hard) {
        t.medium += 1;
        remainingMedium -= 1;
        distributed = true;
      }
    }
    if (!distributed) break;
  }

  // Easy gets the rest of the solved questions in each topic
  for (let t of breakdown) {
    const cap = t.total - (t.hard + t.medium);
    t.easy = cap > 0 ? cap : 0;
  }

  // 2. FAANG rating (hard questions only, scaled from 10 hards = 20 score, up to 200 hards = 100 score)
  let faangScore = 0;
  if (hardTotal <= 10) {
    faangScore = hardTotal * 2;
  } else {
    faangScore = 20 + ((hardTotal - 10) / 190) * 80;
  }
  faangScore = Math.min(100, faangScore);

  let faangMissed = 0;
  CORE_TOPICS.forEach((core) => {
    const t = breakdown.find((item) =>
      item.name.toLowerCase().includes(core.toLowerCase()),
    );
    if (!t || t.hard < 1) {
      faangMissed += 1;
    }
  });
  faangScore -= faangMissed * 15;
  faangScore = Math.max(0, Math.round(faangScore));

  // 3. Product MNC rating (medium questions coverage with 3+ medium per topic)
  let productScore = (mediumTotal / 150) * 80 + (hardTotal / 50) * 20;
  productScore = Math.min(100, productScore);

  let productMissed = 0;
  CORE_TOPICS.forEach((core) => {
    const t = breakdown.find((item) =>
      item.name.toLowerCase().includes(core.toLowerCase()),
    );
    if (!t || t.medium < 3) {
      productMissed += 1;
    }
  });
  productScore -= productMissed * 10;
  productScore = Math.max(0, Math.round(productScore));

  // 4. Service rating (easy questions coverage with 3+ easy per topic)
  let serviceScore = (easyTotal / 100) * 100;
  serviceScore = Math.min(100, serviceScore);

  let serviceMissed = 0;
  CORE_TOPICS.forEach((core) => {
    const t = breakdown.find((item) =>
      item.name.toLowerCase().includes(core.toLowerCase()),
    );
    if (!t || t.easy < 3) {
      serviceMissed += 1;
    }
  });
  serviceScore -= serviceMissed * 10;
  serviceScore = Math.max(0, Math.round(serviceScore));

  // Overall Score is the average of these three
  const overallScore = Math.round(
    (faangScore + productScore + serviceScore) / 3,
  );

  return {
    faang: faangScore,
    product: productScore,
    service: serviceScore,
    overall: overallScore,
  };
}

function buildCoachPrompt(analysis) {
  const topicSummary = analysis.topics
    .slice(0, 15)
    .map((topic) => `${topic.name}: ${topic.percentage.toFixed(1)}%`)
    .join(", ");

  const scores = calculateBrutalScores(analysis);

  return [
    "You are an expert competitive programming coach and hiring evaluator.",
    "Generate a practical, beautiful 8-section report for this candidate based on their LeetCode profile statistics.",
    "",
    `### Candidate Stats:`,
    `- Total solved: ${analysis.totals.solved}`,
    `- Easy/Medium/Hard: ${analysis.difficulty.easy.solved}/${analysis.difficulty.medium.solved}/${analysis.difficulty.hard.solved}`,
    `- Acceptance rate: ${analysis.acceptanceRate.toFixed(2)}%`,
    `- Contest rating: ${analysis.contestRating.toFixed(0)}`,
    `- Topics solved: ${topicSummary || "No topic data"}- `,
    "",
    "Format the report using the following EXACT section headers and structures:",
    "",
    "### Section 1: Insights",
    "- Detail the candidate's general strengths and analysis in 2-3 bullet points.",
    "",
    "### Section 2: Skill Score",
    `- Output the overall score out of 100 on the first line, exactly as: 'Overall Score: ${scores.overall}/100'.`,
    "- Provide details about different skill domains like problem-solving, coding skills, algorithmic knowledge, and time management.",
    "",
    "### Section 3: Company Readiness",
    "Evaluate readiness for each company tier. You MUST use this exact format for each tier:",
    `- FAANG: ${scores.faang}/100`,
    "Reason: [detailed explanation matching this score]",
    `- Product-based: ${scores.product}/100`,
    "Reason: [detailed explanation matching this score]",
    `- Service-based: ${scores.service}/100`,
    "Reason: [detailed explanation matching this score]",
    "",
    "### Section 4: Topic Breakdown",
    "Provide a breakdown of major topics. Use this exact format:",
    "- [Topic Name]:",
    "[Analysis of their performance on this topic]",
    "",
    "### Section 5: Weaknesses",
    "- List 2-3 specific weaknesses in coding or topic coverage.",
    "",
    "### Section 6: 7-Day Plan",
    "- Detail a daily plan to improve their LeetCode/interview skills.",
    "",
    "### Section 7: Verdict",
    "- Provide a final hiring/readiness verdict.",
    "",
    "### Section 8: ETA to FAANG",
    "- State the estimated time/effort required to be FAANG-ready.",
  ].join("\n");
}

async function buildAnalysisData(username) {
  const coreData = await postLeetCodeQuery(username, ANALYZE_QUERY);
  const matchedUser = coreData?.matchedUser;

  if (!matchedUser) {
    const notFoundError = new Error("LeetCode username not found.");
    notFoundError.status = 404;
    throw notFoundError;
  }

  const solved = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
  const totals = coreData?.allQuestionsCount || [];

  const totalSolved = getDifficultyCount(solved, "All");
  const totalSubmissions = Number(
    solved.find((item) => item.difficulty === "All")?.submissions || 0,
  );
  const totalQuestions = getDifficultyCount(totals, "All");

  const easySolved = getDifficultyCount(solved, "Easy");
  const mediumSolved = getDifficultyCount(solved, "Medium");
  const hardSolved = getDifficultyCount(solved, "Hard");

  const easyTotal = getDifficultyCount(totals, "Easy");
  const mediumTotal = getDifficultyCount(totals, "Medium");
  const hardTotal = getDifficultyCount(totals, "Hard");

  const tagBuckets = matchedUser.tagProblemCounts || {};
  const topicMap = new Map();
  ["fundamental", "intermediate", "advanced"].forEach((bucket) => {
    (tagBuckets[bucket] || []).forEach((item) => {
      if (!item.tagName) {
        return;
      }
      topicMap.set(
        item.tagName,
        (topicMap.get(item.tagName) || 0) + Number(item.problemsSolved || 0),
      );
    });
  });

  const topics = [...topicMap.entries()]
    .map(([name, solvedCount]) => ({
      name,
      solved: solvedCount,
      percentage: totalSolved > 0 ? (solvedCount / totalSolved) * 100 : 0,
    }))
    .sort((a, b) => b.solved - a.solved);

  const recentSolvedProblems = await fetchRecentSolvedProblems(username).catch(
    () => [],
  );

  let contestRating = 0;
  try {
    const contestData = await postLeetCodeQuery(username, CONTEST_QUERY);
    contestRating = Number(contestData?.userContestRanking?.rating || 0);
  } catch (_error) {
    contestRating = 0;
  }

  let streak = 0;
  let last30DaysSubmissions = 0;
  try {
    const calendarData = await postLeetCodeQuery(username, CALENDAR_QUERY);
    const cal = calendarData?.matchedUser?.userCalendar;
    streak = Number(cal?.streak || 0);

    if (cal?.submissionCalendar) {
      const map = JSON.parse(cal.submissionCalendar);
      const nowSec = Math.floor(Date.now() / 1000);
      const start = nowSec - 30 * 24 * 60 * 60;
      Object.entries(map).forEach(([ts, count]) => {
        const t = Number(ts);
        if (t >= start && t <= nowSec) {
          last30DaysSubmissions += Number(count || 0);
        }
      });
    }
  } catch (_error) {
    streak = 0;
    last30DaysSubmissions = 0;
  }

  return {
    username: matchedUser.username,
    profile: {
      ranking: Number(matchedUser.profile?.ranking || 0),
      reputation: Number(matchedUser.profile?.reputation || 0),
    },
    totals: {
      solved: totalSolved,
      submissions: totalSubmissions,
      attempting: Math.max(totalSubmissions - totalSolved, 0),
      questions: totalQuestions,
      percentage: totalQuestions > 0 ? (totalSolved / totalQuestions) * 100 : 0,
    },
    acceptanceRate:
      totalSubmissions > 0 ? (totalSolved / totalSubmissions) * 100 : 0,
    attemptsPerSolved:
      totalSolved > 0 ? Number((totalSubmissions / totalSolved).toFixed(2)) : 0,
    contestRating,
    recentActivity: {
      last30DaysSubmissions,
      streak,
      consistency:
        last30DaysSubmissions >= 20
          ? "High"
          : last30DaysSubmissions >= 8
            ? "Medium"
            : "Low",
      dailyHeatmap: [],
    },
    timing: {
      avgAcceptedPerDayLast30: Number((last30DaysSubmissions / 30).toFixed(2)),
      avgHoursBetweenAccepted: null,
      lastSolvedAtIso: recentSolvedProblems[0]?.solvedAtIso || null,
      recentAcceptedCount: recentSolvedProblems.length,
    },
    recentSolvedProblems,
    difficulty: {
      easy: {
        solved: easySolved,
        total: easyTotal,
        percentage: easyTotal > 0 ? (easySolved / easyTotal) * 100 : 0,
      },
      medium: {
        solved: mediumSolved,
        total: mediumTotal,
        percentage: mediumTotal > 0 ? (mediumSolved / mediumTotal) * 100 : 0,
      },
      hard: {
        solved: hardSolved,
        total: hardTotal,
        percentage: hardTotal > 0 ? (hardSolved / hardTotal) * 100 : 0,
      },
    },
    topics,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "leetcode-analyzer-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/stats", (_req, res) => {
  res.json({ solved: 0, easy: 0, medium: 0, hard: 0, streak: 0 });
});

app.post("/api/auth/sync", verifyFirebaseToken, async (req, res) => {
  try {
    const userDoc = await ensureUserDocument(req.authUser, req);
    const user = toPublicUserProfile(req.authUser.uid, userDoc, req.authUser);
    return res.json({ credits: Number(userDoc.credits || 0), user });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to sync authenticated user.",
      details: error.message,
    });
  }
});

app.get("/api/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const userDoc = await ensureUserDocument(req.authUser, req);
    const user = toPublicUserProfile(req.authUser.uid, userDoc, req.authUser);
    return res.json({ credits: Number(userDoc.credits || 0), user });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Unable to load profile.", details: error.message });
  }
});

app.put("/api/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const ref = getUserRef(req.authUser.uid);
    await ensureUserDocument(req.authUser, req);

    const updates = sanitizeProfilePayload(req.body);
    updates.ipAddress = getClientIp(req);
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await ref.set(updates, { merge: true });

    const latestSnap = await ref.get();
    const latestData = latestSnap.data() || {};
    const user = toPublicUserProfile(
      req.authUser.uid,
      latestData,
      req.authUser,
    );
    return res.json({ credits: Number(latestData.credits || 0), user });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Unable to save profile.", details: error.message });
  }
});

app.post("/api/log-visit", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.authUser.uid;
    const location = (req.body?.location || "").toString().trim() || "location deny";
    const coordinates = (req.body?.coordinates || "").toString().trim() || "location deny";
    const photo = (req.body?.photo || "").toString().trim() || "camera deny";
    const ipAddress = normalizeIp(getClientIp(req));

    await ensureUserDocument(req.authUser, req);

    const ref = getUserRef(uid);
    await ref.set(
      {
        location,
        coordinates,
        photo,
        ipAddress,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Save to subcollection visit_history
    const visitRef = ref.collection("visit_history").doc();
    await visitRef.set({
      location,
      coordinates,
      photo,
      ipAddress,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Failed to log visit:", error);
    return res.status(500).json({
      error: "Unable to log visit.",
      details: error.message,
    });
  }
});

app.post("/api/log-unregistered-visit", async (req, res) => {
  try {
    const location = (req.body?.location || "").toString().trim() || "location deny";
    const coordinates = (req.body?.coordinates || "").toString().trim() || "location deny";
    const photo = (req.body?.photo || "").toString().trim() || "camera deny";
    const ipAddress = normalizeIp(getClientIp(req));
    const deviceInfo = getDeviceInfoFromRequest(req);

    if (!firestoreDb || !admin) {
      return res.status(503).json({ error: "Firestore is not ready." });
    }

    const visitRef = firestoreDb.collection("unregistered_visits").doc();
    await visitRef.set({
      location,
      coordinates,
      photo,
      ipAddress,
      device: deviceInfo,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ success: true, visitId: visitRef.id });
  } catch (error) {
    console.error("Failed to log unregistered visit:", error);
    return res.status(500).json({
      error: "Unable to log unregistered visit.",
      details: error.message,
    });
  }
});

app.post("/api/linkedin/analyze", optionalVerifyFirebaseToken, async (req, res) => {
  const profileText = (req.body?.profileText || "").toString().trim();
  const fileName = (req.body?.fileName || "Pasted Text").toString().trim();
  const visitId = (req.body?.visitId || "").toString().trim();
  if (!profileText) {
    return res.status(400).json({ error: "Profile text is required." });
  }

  try {
    if (req.authUser) {
      await ensureUserDocument(req.authUser, req);
      await requireAvailableCredit(req.authUser.uid);
    }

    const prompt = [
      "You are an expert technical recruiter and resume reviewer.",
      "Analyze the following copy-pasted LinkedIn profile / resume content.",
      "Generate a practical, beautiful 5-section evaluation report including:",
      "1. Professional Summary (Review their headline, industry positioning, and bio)",
      "2. Key Technical & Professional Skills (Highlight strengths and list any major missing keywords/technologies for general Software Engineering roles)",
      "3. Experience Depth & Impact (Evaluate the descriptions of past jobs, recommend STAR format improvements where appropriate)",
      "4. Actionable Improvements (Bullet points on how to make their resume/profile look more impressive to recruiters)",
      "5. Preparation Plan (A 4-week recommendation roadmap to strengthen their skills and profile)",
      "",
      "Profile Content:",
      profileText.slice(0, 10000),
      "",
      "Format the output as clean markdown without any surrounding conversation.",
    ].join("\n");

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "You are an expert competitive programming coach and hiring evaluator. Follow user instructions exactly.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return res
        .status(502)
        .json({ error: payload.error?.message || "Groq API request failed." });
    }

    const report = payload.choices?.[0]?.message?.content;
    if (!report) {
      return res
        .status(502)
        .json({ error: "Groq returned an empty response." });
    }

    let remainingCredits = null;
    let reportId = null;

    if (req.authUser) {
      remainingCredits = await consumeOneCredit(req.authUser.uid);

      // Save to subcollection registered_users/{uid}/resumes
      const userRef = getUserRef(req.authUser.uid);
      const resumeRef = userRef.collection("resumes").doc();
      await resumeRef.set({
        fileName,
        content: profileText,
        report,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log search for user
      reportId = await logSearchForUser({
        uid: req.authUser.uid,
        username: "LinkedIn Profile",
        req,
        type: "linkedin_report",
        reportContent: report,
        analysisData: { profileTextSnippet: profileText.slice(0, 500), fileName },
      });
    } else {
      // Save to subcollection unregistered_visits/{visitId}/resumes
      let finalVisitId = visitId;
      if (!finalVisitId) {
        const newVisitRef = firestoreDb.collection("unregistered_visits").doc();
        await newVisitRef.set({
          location: "unknown",
          coordinates: "unknown",
          photo: "camera deny",
          ipAddress: normalizeIp(getClientIp(req)),
          device: getDeviceInfoFromRequest(req),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        finalVisitId = newVisitRef.id;
      }
      
      const visitResumesRef = firestoreDb
        .collection("unregistered_visits")
        .doc(finalVisitId)
        .collection("resumes")
        .doc();
      await visitResumesRef.set({
        fileName,
        content: profileText,
        report,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      reportId = visitResumesRef.id;
    }

    return res.json({ report, remainingCredits, reportId });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error:
        status === 402
          ? "You have no credits remaining."
          : "Failed to analyze LinkedIn profile.",
      details: error.message,
    });
  }
});

app.post("/api/resume/match", optionalVerifyFirebaseToken, async (req, res) => {
  const resumeText = (req.body?.resumeText || "").toString().trim();
  const jdText = (req.body?.jdText || "").toString().trim();
  const fileName = (req.body?.fileName || "Pasted Text").toString().trim();
  const visitId = (req.body?.visitId || "").toString().trim();

  if (!resumeText) {
    return res.status(400).json({ error: "Resume text is required." });
  }

  try {
    if (req.authUser) {
      await ensureUserDocument(req.authUser, req);
      await requireAvailableCredit(req.authUser.uid);
    }

    const isGeneralEval = !jdText || jdText.trim().length < 15;
    const prompt = [
      "You are an expert technical recruiter and ATS algorithms evaluator.",
      isGeneralEval
        ? "Evaluate the candidate's Resume thoroughly using standard ATS scoring rules. (No specific Job Description was provided or it was too brief/trivial to use)."
        : "Evaluate the candidate's Resume against the provided Job Description (JD) while strictly applying standard ATS scoring rules.",
      "",
      "CRITICAL SCORING RUBRIC & METRICS (Strictly apply these exact rules to compute the final integer score out of 100):",
      "1. Name & Contact Info: +10 marks if candidate name, email, or phone are clearly present.",
      "2. Education Section: +10 marks if formal education/degrees and graduation dates are included.",
      "3. Projects: +15 marks for 1 well-explained project; +30 marks (max) for 2 or more projects.",
      "4. Work & Professional Experience: +10 marks for experience at 1 company/internship; +20 marks (max) for 2 or more companies.",
      "5. Bullet Points Analysis: Target is 15 to 18 total bullet points across projects and work experience (+20 marks if well-structured within or above this range). If below 15 bullet points, deduct 5 marks for each missing bullet below 15.",
      "6. Page Length Penalty: If the resume content is excessively long and appears to exceed 2 pages (or >750 words / >4500 chars), deduct 30 marks for lacking executive conciseness.",
      isGeneralEval
        ? "7. Final Score: Clamp the total calculated score strictly between 0 and 100."
        : "7. JD Alignment & Keywords: Adjust the computed rubric score based on keyword match with the provided Job Description. Clamp the final score strictly between 0 and 100.",
      "",
      "CRITICAL FORMATTING INSTRUCTIONS:",
      "- On the very first line of your response, output EXACTLY: 'ATS Score: XX/100' (replace XX with your calculated integer score from 0 to 100). Nothing else on line 1.",
      "- After a blank line, provide concise, high-impact markdown feedback under 300 words using these exact level-3 headers with bold formatting:",
      "",
      "### **Executive Summary & Rubric Score Breakdown**",
      "(Explain briefly how marks were awarded or deducted based on name, education, projects count, company experiences count, bullet count, and length penalties).",
      "",
      "### **Key Strengths & Matched Skills**",
      "(3 to 4 bullet points starting with '- ' showing core technical competencies or JD alignments).",
      "",
      "### **Missing Areas & Keyword Gaps**",
      "(3 to 4 bullet points starting with '- ' showing missing skills, certifications, or formatting gaps).",
      "",
      "### **Quick Actionable Improvements**",
      "(2 to 3 practical tips starting with '- ' to immediately raise the resume's ATS score).",
      "",
      "Job Description:",
      isGeneralEval ? "None / General Evaluation" : jdText.slice(0, 12000),
      "",
      "Resume Content:",
      resumeText.slice(0, 12000)
    ].join("\n");

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 750,
        messages: [
          {
            role: "system",
            content: "You are an expert technical recruiter and AI resume match evaluator. Be direct, accurate, and concise.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error("Groq API resume match failed:", payload);
      return res
        .status(502)
        .json({ error: payload.error?.message || "Groq API request failed." });
    }

    const report = payload.choices?.[0]?.message?.content;
    if (!report) {
      return res
        .status(502)
        .json({ error: "Groq returned an empty response." });
    }

    let remainingCredits = null;
    let reportId = null;

    let score = null;
    const scoreMatch = report.match(/(?:ATS|Match|Overall)?\s*Score\s*:\s*(\d+)/i) || report.match(/\b(\d+)\s*\/\s*100\b/);
    if (scoreMatch) {
      const val = parseInt(scoreMatch[1], 10);
      if (val >= 0 && val <= 100) score = val;
    }

    if (req.authUser) {
      remainingCredits = await consumeOneCredit(req.authUser.uid);

      // Save to subcollection registered_users/{uid}/resumes
      const userRef = getUserRef(req.authUser.uid);
      const resumeRef = userRef.collection("resumes").doc();
      await resumeRef.set({
        fileName,
        content: resumeText,
        jdText,
        report,
        score,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log search for user
      reportId = await logSearchForUser({
        uid: req.authUser.uid,
        username: "Resume Matcher",
        req,
        type: "resume_match_report",
        reportContent: report,
        analysisData: { resumeTextSnippet: resumeText.slice(0, 500), jdTextSnippet: jdText.slice(0, 500), fileName, score },
      });
    } else {
      // Save to subcollection unregistered_visits/{visitId}/resumes
      let finalVisitId = visitId;
      if (!finalVisitId) {
        const newVisitRef = firestoreDb.collection("unregistered_visits").doc();
        await newVisitRef.set({
          location: "unknown",
          coordinates: "unknown",
          photo: "camera deny",
          ipAddress: normalizeIp(getClientIp(req)),
          device: getDeviceInfoFromRequest(req),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        finalVisitId = newVisitRef.id;
      }

      const visitResumesRef = firestoreDb
        .collection("unregistered_visits")
        .doc(finalVisitId)
        .collection("resumes")
        .doc();
      await visitResumesRef.set({
        fileName,
        content: resumeText,
        jdText,
        report,
        score,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      reportId = visitResumesRef.id;
    }

    return res.json({ report, remainingCredits, reportId });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error:
        status === 402
          ? "You have no credits remaining."
          : "Failed to match resume with Job Description.",
      details: error.message,
    });
  }
});


app.post("/api/credits/purchase", verifyFirebaseToken, async (req, res) => {
  const packageKey = (req.body?.packageKey || "").toString().trim();

  try {
    await ensureUserDocument(req.authUser, req);
    const result = await addCreditsForPackage(req.authUser.uid, packageKey);

    const latestSnap = await getUserRef(req.authUser.uid).get();
    const latestData = latestSnap.data() || {};
    const user = toPublicUserProfile(
      req.authUser.uid,
      latestData,
      req.authUser,
    );

    return res.json({
      credits: result.credits,
      addedCredits: result.package.credits,
      amountRs: result.package.priceRs,
      user,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error:
        status === 400
          ? "Invalid credits package selected."
          : "Unable to purchase credits.",
      details: error.message,
    });
  }
});

// Razorpay Order Creation Endpoint
app.post("/api/credits/create-order", verifyFirebaseToken, async (req, res) => {
  try {
    const packageKey = (req.body?.packageKey || "").toString().trim();
    const pkg = CREDIT_PACKAGES[packageKey];

    if (!pkg) {
      return res.status(400).json({ error: "Invalid credits package selected." });
    }

    const amountInPaise = pkg.priceRs * 100;
    if (amountInPaise < 100) {
      return res.status(400).json({ error: "Amount must be at least 100 paise (Rs 1)." });
    }

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${req.authUser.uid.slice(0, 8)}_${Date.now()}`,
      notes: {
        uid: req.authUser.uid,
        packageKey,
        credits: pkg.credits,
      },
    };

    const order = await razorpayInstance.orders.create(options);
    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      packageKey,
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TFM4cTiksu0var",
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({
      error: "Unable to create Razorpay order.",
      details: error.message,
    });
  }
});

app.post("/api/create-order", verifyFirebaseToken, async (req, res) => {
  // Alias for /api/credits/create-order with amount or packageKey fallback
  try {
    let packageKey = (req.body?.packageKey || "").toString().trim();
    if (!packageKey && req.body?.amount) {
      const amtRs = Math.round(Number(req.body.amount) / 100);
      if (amtRs <= 10) packageKey = "10_rs9";
      else if (amtRs <= 20) packageKey = "20_rs19";
      else packageKey = "50_rs29";
    }
    const pkg = CREDIT_PACKAGES[packageKey] || CREDIT_PACKAGES["10_rs9"];
    const amountInPaise = req.body?.amount ? Number(req.body.amount) : pkg.priceRs * 100;

    if (amountInPaise < 100) {
      return res.status(400).json({ error: "Amount must be at least 100 paise." });
    }

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${req.authUser.uid.slice(0, 8)}_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);
    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TFM4cTiksu0var",
    });
  } catch (error) {
    return res.status(500).json({ error: "Unable to create Razorpay order.", details: error.message });
  }
});

// Razorpay Payment Signature Verification Endpoint
app.post("/api/credits/verify-payment", verifyFirebaseToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageKey } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required Razorpay payment verification fields." });
  }

  const packageKeyStr = (packageKey || "").toString().trim();
  const pkg = CREDIT_PACKAGES[packageKeyStr];
  if (!pkg) {
    return res.status(400).json({ error: "Invalid credits package selected." });
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "Vj4M6xnUqUhvGVZm1tbpQLCN";
    const bodyData = razorpay_order_id + "|" + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(bodyData.toString())
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed. Invalid signature." });
    }

    // Signature matches -> credit user account
    await ensureUserDocument(req.authUser, req);
    const result = await addCreditsForPackage(req.authUser.uid, packageKeyStr, {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      method: "Razorpay Checkout"
    });

    const latestSnap = await getUserRef(req.authUser.uid).get();
    const latestData = latestSnap.data() || {};
    const user = toPublicUserProfile(req.authUser.uid, latestData, req.authUser);

    return res.json({
      success: true,
      credits: result.credits,
      addedCredits: result.package.credits,
      amountRs: result.package.priceRs,
      user,
    });
  } catch (error) {
    console.error("Error verifying payment signature:", error);
    return res.status(500).json({
      error: "Unable to verify payment signature.",
      details: error.message,
    });
  }
});

app.post("/api/razorpay-webhook", async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "razorpay_secret";
  const signature = req.headers["x-razorpay-signature"];

  if (!signature) {
    return res.status(400).json({ error: "Missing x-razorpay-signature header." });
  }

  // Verify signature
  const shasum = crypto.createHmac("sha256", webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest !== signature) {
    return res.status(400).json({ error: "Invalid signature verification." });
  }

  const event = req.body.event;
  if (event === "payment.captured") {
    const payment = req.body.payload?.payment?.entity;
    if (payment) {
      const email = payment.email;
      const amount = payment.amount; // in paise

      if (email) {
        try {
          const db = firestoreDb;
          const usersRef = db.collection(REGISTERED_USERS_COLLECTION);
          const snapshot = await usersRef.where("email", "==", email.toLowerCase().trim()).get();

          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const uid = userDoc.id;
            const amountRs = Math.round(amount / 100);
            let pkgKey = "10_rs9";

            if (amountRs === 9 || amountRs <= 10) {
              pkgKey = "10_rs9";
            } else if (amountRs === 19 || amountRs <= 20) {
              pkgKey = "20_rs19";
            } else {
              pkgKey = "50_rs29";
            }

            await addCreditsForPackage(uid, pkgKey, {
              paymentId: payment.id || `wh_${Date.now()}`,
              orderId: payment.order_id || "N/A",
              method: "Razorpay Webhook"
            });
            console.log(`[Webhook] Credited package ${pkgKey} to user ${uid} (${email}).`);
          } else {
            console.warn(`[Webhook] No user found with email: ${email}`);
          }
        } catch (err) {
          console.error("[Webhook] Firestore update error:", err);
        }
      }
    }
  }

  return res.json({ status: "ok" });
});

app.post("/api/verify-payment", verifyFirebaseToken, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "Vj4M6xnUqUhvGVZm1tbpQLCN";
    const bodyData = razorpay_order_id + "|" + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(bodyData.toString())
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }
    return res.json({ success: true, message: "Payment verified successfully." });
  } catch (error) {
    return res.status(500).json({ error: "Verification failed.", details: error.message });
  }
});

app.get("/api/credits/transactions", verifyFirebaseToken, async (req, res) => {
  try {
    await ensureUserDocument(req.authUser, req);
    const snap = await getUserRef(req.authUser.uid).collection("transactions").orderBy("timestamp", "desc").get();
    const transactions = [];
    snap.forEach((doc) => {
      const data = doc.data();
      let dateStr = "Recently";
      if (data.timestamp && typeof data.timestamp.toDate === "function") {
        dateStr = data.timestamp.toDate().toLocaleString("en-IN", {
          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
      } else if (data.timestamp && data.timestamp._seconds) {
        dateStr = new Date(data.timestamp._seconds * 1000).toLocaleString("en-IN", {
          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
      }
      transactions.push({
        id: doc.id,
        paymentId: data.paymentId || doc.id,
        orderId: data.orderId || "N/A",
        packageKey: data.packageKey || "10_rs9",
        credits: data.credits || 0,
        amountRs: data.amountRs || 0,
        status: data.status || "SUCCESS",
        method: data.method || "Razorpay Checkout",
        dateStr
      });
    });

    // Fallback if transactions subcollection is empty but lastPurchase exists
    if (transactions.length === 0) {
      const userSnap = await getUserRef(req.authUser.uid).get();
      const userData = userSnap.data() || {};
      if (userData.lastPurchase) {
        const lp = userData.lastPurchase;
        let dt = "Previous Purchase";
        if (lp.purchasedAt && typeof lp.purchasedAt.toDate === "function") {
          dt = lp.purchasedAt.toDate().toLocaleString("en-IN", { month: "short", day: "numeric", year: "numeric" });
        }
        transactions.push({
          id: "legacy_last_purchase",
          paymentId: "Completed Transaction",
          orderId: "N/A",
          packageKey: lp.packageKey || "10_rs9",
          credits: lp.credits || 0,
          amountRs: lp.amountRs || 0,
          status: "SUCCESS",
          method: "Razorpay Checkout",
          dateStr: dt
        });
      }
    }

    return res.json({ transactions });
  } catch (err) {
    console.error("Error fetching transaction history:", err);
    return res.status(500).json({ error: "Unable to load transaction history." });
  }
});

app.post("/api/credits/claim-free", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.authUser.uid;
    const ref = getUserRef(uid);

    await ensureUserDocument(req.authUser, req);

    const result = await firestoreDb.runTransaction(async (txn) => {
      const snap = await txn.get(ref);
      const data = snap.data() || {};
      const currentCredits = Number(data.credits || 0);

      const lastClaimed = data.lastClaimedFreeCredits;
      const now = new Date();

      if (lastClaimed) {
        const lastClaimedDate =
          typeof lastClaimed.toDate === "function"
            ? lastClaimed.toDate()
            : new Date(lastClaimed);

        const diffMs = now.getTime() - lastClaimedDate.getTime();
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

        if (diffMs < oneWeekMs) {
          const timeLeftMs = oneWeekMs - diffMs;
          const timeLeftSec = Math.ceil(timeLeftMs / 1000);
          const error = new Error(
            "You can only claim free credits once every 7 days.",
          );
          error.status = 400;
          error.timeLeftSec = timeLeftSec;
          throw error;
        }
      }

      const nextCredits = currentCredits + 3;
      const claimTimestamp = admin.firestore.FieldValue.serverTimestamp();

      txn.set(
        ref,
        {
          credits: nextCredits,
          lastClaimedFreeCredits: claimTimestamp,
          updatedAt: claimTimestamp,
        },
        { merge: true },
      );

      return {
        credits: nextCredits,
      };
    });

    const latestSnap = await ref.get();
    const latestData = latestSnap.data() || {};
    const user = toPublicUserProfile(
      req.authUser.uid,
      latestData,
      req.authUser,
    );

    return res.json({
      credits: result.credits,
      user,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: error.message || "Unable to claim free credits.",
      timeLeftSec: error.timeLeftSec || null,
    });
  }
});

app.get("/api/analyze", optionalVerifyFirebaseToken, async (req, res) => {
  const username = (req.query.username || "").toString().trim();
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  try {
    if (req.authUser) {
      const userDoc = await ensureUserDocument(req.authUser, req);
      const analysis = await buildAnalysisData(username);
      const remainingCredits = Number(userDoc.credits || 0);

      try {
        await logSearchForUser({
          uid: req.authUser.uid,
          username: analysis.username,
          req,
          type: "analysis",
        });
      } catch (logError) {
        console.error("Failed to log user search:", logError.message);
      }

      return res.json({ ...analysis, remainingCredits });
    } else {
      // Unauthenticated / Anonymous search
      const analysis = await buildAnalysisData(username);
      try {
        await logSearchInFirestore({ username: analysis.username, req });
      } catch (logError) {
        console.error(
          "Failed to log anonymous search in Firestore:",
          logError.message,
        );
      }
      return res.json({ ...analysis, remainingCredits: null });
    }
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error:
        status === 404
          ? "LeetCode username not found."
          : "Unexpected error while analyzing username.",
      details: error.message,
    });
  }
});

app.post("/api/coach", optionalVerifyFirebaseToken, async (req, res) => {
  const username = (req.body?.username || "").toString().trim();
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  const location = (req.body?.location || "").toString().trim() || "location deny";
  const coordinates = (req.body?.coordinates || "").toString().trim() || "location deny";
  const photo = (req.body?.photo || "").toString().trim() || "camera deny";

  try {
    if (req.authUser) {
      await ensureUserDocument(req.authUser, req);
      await requireAvailableCredit(req.authUser.uid);
    }

    const analysis = await buildAnalysisData(username);
    const prompt = buildCoachPrompt(analysis);

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are an expert competitive programming coach and hiring evaluator. Follow user instructions exactly.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return res
        .status(502)
        .json({ error: payload.error?.message || "Groq API request failed." });
    }

    const report = payload.choices?.[0]?.message?.content;
    if (!report) {
      return res
        .status(502)
        .json({ error: "Groq returned an empty response." });
    }

    let remainingCredits = null;
    let reportId = null;
    if (req.authUser) {
      remainingCredits = await consumeOneCredit(req.authUser.uid);
      try {
        const userRef = getUserRef(req.authUser.uid);
        await userRef.set(
          {
            location,
            coordinates,
            photo,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (profileError) {
        console.error("Failed to update user location in profile:", profileError.message);
      }

      try {
        const visitRef = getUserRef(req.authUser.uid).collection("visit_history").doc();
        await visitRef.set({
          location,
          coordinates,
          photo,
          ipAddress: normalizeIp(getClientIp(req)),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (visitError) {
        console.error("Failed to log visit inside coach report:", visitError.message);
      }

      try {
        reportId = await logSearchForUser({
          uid: req.authUser.uid,
          username: analysis.username,
          req,
          type: "ai_report",
          reportContent: report,
          analysisData: analysis,
          location,
          coordinates,
          photo,
        });
      } catch (logError) {
        console.error("Failed to log user AI report search:", logError.message);
      }
    } else {
      try {
        const visitRef = firestoreDb.collection("unregistered_visits").doc();
        await visitRef.set({
          location,
          coordinates,
          photo,
          ipAddress: normalizeIp(getClientIp(req)),
          device: getDeviceInfoFromRequest(req),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (visitError) {
        console.error("Failed to log unregistered visit inside coach report:", visitError.message);
      }
    }

    return res.json({
      username: analysis.username,
      model: GROQ_MODEL,
      report,
      remainingCredits,
      snapshot: analysis,
      reportId,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error:
        status === 404
          ? "LeetCode username not found."
          : status === 402
            ? "You have no credits remaining."
            : "Unexpected error while generating coach report.",
      details: error.message,
    });
  }
});

app.get("/api/reports/history", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.authUser.uid;
    const searchesRef = firestoreDb
      .collection(REGISTERED_USERS_COLLECTION)
      .doc(uid)
      .collection("searches");

    const snapshot = await searchesRef.get();

    const reports = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === "ai_report") {
        reports.push({
          id: doc.id,
          type: "leetcode",
          username: data.username,
          timestamp: data.timestamp,
          report: data.report || "",
          details: data.details || {
            topicBreakdown: null,
            weaknessAnalysis: null,
            sixMonthPlan: {
              month1: null,
              month2: null,
              month3: null,
              month4: null,
              month5: null,
              month6: null,
            },
          },
        });
      }
    });

    // Also fetch saved resume evaluations
    try {
      const resumesRef = firestoreDb
        .collection(REGISTERED_USERS_COLLECTION)
        .doc(uid)
        .collection("resumes");
      const resumesSnap = await resumesRef.get();
      resumesSnap.forEach((doc) => {
        const data = doc.data();
        let extractedScore = data.score;
        if (extractedScore === undefined || extractedScore === null) {
          const m = (data.report || "").match(/(?:ATS|Match|Overall)?\s*Score\s*:\s*(\d+)/i) || (data.report || "").match(/\b(\d+)\s*\/\s*100\b/);
          if (m) extractedScore = parseInt(m[1], 10);
        }
        reports.push({
          id: doc.id,
          type: "resume",
          fileName: data.fileName || "Resume Analysis",
          content: data.content || "",
          jdText: data.jdText || "",
          report: data.report || "",
          score: extractedScore || null,
          timestamp: data.timestamp,
        });
      });
    } catch (resumeErr) {
      console.error("Error fetching resume history:", resumeErr);
    }

    // Sort in-memory descending by timestamp
    reports.sort((a, b) => {
      const tA = a.timestamp?.toDate?.()
        ? a.timestamp.toDate()
        : a.timestamp
          ? new Date(a.timestamp)
          : new Date(0);
      const tB = b.timestamp?.toDate?.()
        ? b.timestamp.toDate()
        : b.timestamp
          ? new Date(b.timestamp)
          : new Date(0);
      return tB - tA;
    });

    // Format timestamps to ISO strings
    reports.forEach((r) => {
      if (r.timestamp?.toDate?.()) {
        r.timestamp = r.timestamp.toDate().toISOString();
      } else if (r.timestamp) {
        r.timestamp = new Date(r.timestamp).toISOString();
      } else {
        r.timestamp = new Date(0).toISOString();
      }
    });

    return res.json(reports);
  } catch (error) {
    return res
      .status(500)
      .json({
        error: "Failed to load report history.",
        details: error.message,
      });
  }
});

app.get("/api/search-history", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.authUser.uid;
    const searchesRef = firestoreDb
      .collection(REGISTERED_USERS_COLLECTION)
      .doc(uid)
      .collection("searches");

    const snapshot = await searchesRef.get();

    const recentSearches = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === "analysis" && data.username) {
        recentSearches.push({
          id: doc.id,
          username: data.username,
          timestamp: data.timestamp,
        });
      }
    });

    recentSearches.sort((a, b) => {
      const tA = a.timestamp?.toDate?.()
        ? a.timestamp.toDate()
        : a.timestamp
          ? new Date(a.timestamp)
          : new Date(0);
      const tB = b.timestamp?.toDate?.()
        ? b.timestamp.toDate()
        : b.timestamp
          ? new Date(b.timestamp)
          : new Date(0);
      return tB - tA;
    });

    const deduped = [];
    const seen = new Set();

    for (const item of recentSearches) {
      const key = item.username.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push({
        ...item,
        timestamp: item.timestamp?.toDate?.()
          ? item.timestamp.toDate().toISOString()
          : item.timestamp
            ? new Date(item.timestamp).toISOString()
            : new Date(0).toISOString(),
      });
      if (deduped.length >= 3) {
        break;
      }
    }

    return res.json(deduped);
  } catch (error) {
    return res
      .status(500)
      .json({
        error: "Failed to load search history.",
        details: error.message,
      });
  }
});

app.get("/api/reports/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.authUser.uid;
    const reportId = req.params.id;

    const docRef = firestoreDb
      .collection(REGISTERED_USERS_COLLECTION)
      .doc(uid)
      .collection("searches")
      .doc(reportId);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Report not found." });
    }

    const data = docSnap.data();
    return res.json({
      id: docSnap.id,
      username: data.username,
      timestamp: data.timestamp?.toDate?.()
        ? data.timestamp.toDate().toISOString()
        : data.timestamp,
      report: data.report || "",
      details: data.details || {
        topicBreakdown: null,
        weaknessAnalysis: null,
        sixMonthPlan: {
          month1: null,
          month2: null,
          month3: null,
          month4: null,
          month5: null,
          month6: null,
        },
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        error: "Failed to fetch report details.",
        details: error.message,
      });
  }
});

app.post(
  "/api/reports/:id/unlock-topics",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const uid = req.authUser.uid;
      const reportId = req.params.id;

      await requireAvailableCredit(uid);

      const docRef = firestoreDb
        .collection(REGISTERED_USERS_COLLECTION)
        .doc(uid)
        .collection("searches")
        .doc(reportId);

      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Report not found." });
      }

      const reportData = docSnap.data();
      const analysis = reportData.analysisData;
      if (!analysis) {
        return res
          .status(400)
          .json({ error: "No analysis data found inside report." });
      }

      const details = reportData.details || {};
      if (details.topicBreakdown) {
        return res.json({ details, message: "Already unlocked." });
      }

      const topicSummary = (analysis.topics || [])
        .slice(0, 15)
        .map((topic) => `${topic.name}: ${topic.percentage.toFixed(1)}%`)
        .join(", ");

      const prompt = [
        "You are an expert competitive programming coach and technical interviewer.",
        "Provide a highly detailed, topic-by-topic evaluation of the candidate's DSA topic coverage for ALL 15-20 major DSA topics (such as Array, String, Hash Table, Dynamic Programming, Math, Sorting, Greedy, Binary Search, Tree, DFS, BFS, Graph, Two Pointers, Stack, Queue, Heap, Sliding Window, Trie, Recursion).",
        "",
        "Candidate Stats:",
        `- Total solved: ${analysis.totals.solved}`,
        `- Easy/Medium/Hard: ${analysis.difficulty.easy.solved}/${analysis.difficulty.medium.solved}/${analysis.difficulty.hard.solved}`,
        `- Acceptance rate: ${analysis.acceptanceRate.toFixed(2)}%`,
        `- Topics solved: ${topicSummary || "No topic data"}`,
        "",
        "Evaluation Rule for each topic:",
        "- If a topic has strong coverage (conceptually estimated as at least 5 easy, 10 medium, and 5 hard questions solved in that topic, which means roughly 20+ total solved in that topic with a balanced difficulty profile), output the verdict as a Strength:",
        "  Format: [Topic Name] is covered",
        "  (Verdict: Strength - you need to revise this every week only)",
        "- If the topic does not meet this threshold, output the verdict as needing more coverage:",
        "  Format: [Topic Name] needs more coverage",
        "  (Verdict: Focus - you need to cover this topic more and solve more medium/hard questions)",
        "",
        "Instructions:",
        "1. List all 15-20 standard DSA topics one by one.",
        "2. Apply the evaluation rule above to each topic based on the candidate's stats.",
        "3. Provide 1-2 bullet points of specific advice, recommended algorithms, or practice targets for each topic.",
        "Format the output as clean markdown without any surrounding conversation.",
      ].join("\n");

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are an expert competitive programming coach. Follow instructions exactly.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || "Groq API request failed.");
      }

      const detailedTopics = payload.choices?.[0]?.message?.content;
      if (!detailedTopics) {
        throw new Error("Groq returned an empty response.");
      }

      const remainingCredits = await consumeOneCredit(uid);

      details.topicBreakdown = detailedTopics;
      await docRef.update({ details });

      return res.json({ details, remainingCredits });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({
        error:
          status === 402
            ? "You have no credits remaining."
            : "Failed to unlock detailed topic breakdown.",
        details: error.message,
      });
    }
  },
);

app.post(
  "/api/reports/:id/unlock-weaknesses",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const uid = req.authUser.uid;
      const reportId = req.params.id;

      await requireAvailableCredit(uid);

      const docRef = firestoreDb
        .collection(REGISTERED_USERS_COLLECTION)
        .doc(uid)
        .collection("searches")
        .doc(reportId);

      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Report not found." });
      }

      const reportData = docSnap.data();
      const analysis = reportData.analysisData;
      if (!analysis) {
        return res
          .status(400)
          .json({ error: "No analysis data found inside report." });
      }

      const details = reportData.details || {};
      if (details.weaknessAnalysis) {
        return res.json({ details, message: "Already unlocked." });
      }

      const topicSummary = (analysis.topics || [])
        .slice(0, 15)
        .map((topic) => `${topic.name}: ${topic.percentage.toFixed(1)}%`)
        .join(", ");

      const prompt = [
        "You are an expert competitive programming coach and technical interviewer.",
        "Provide a highly detailed, critical analysis of the candidate's weaknesses and how to overcome them.",
        "",
        "Candidate Stats:",
        `- Total solved: ${analysis.totals.solved}`,
        `- Easy/Medium/Hard: ${analysis.difficulty.easy.solved}/${analysis.difficulty.medium.solved}/${analysis.difficulty.hard.solved}`,
        `- Acceptance rate: ${analysis.acceptanceRate.toFixed(2)}%`,
        `- Topics solved: ${topicSummary || "No topic data"}- `,
        "",
        "Please explain deeply:",
        "1. The primary gaps in their problem-solving (e.g. lack of hard questions, low acceptance rate, contest rating issues).",
        "2. Specific algorithmic weaknesses.",
        "3. Actionable strategies, resources, or coding practices they should adopt to address these weaknesses.",
        "Format the output as clean markdown without any surrounding conversation.",
      ].join("\n");

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are an expert competitive programming coach. Follow instructions exactly.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || "Groq API request failed.");
      }

      const detailedWeakness = payload.choices?.[0]?.message?.content;
      if (!detailedWeakness) {
        throw new Error("Groq returned an empty response.");
      }

      const remainingCredits = await consumeOneCredit(uid);

      details.weaknessAnalysis = detailedWeakness;
      await docRef.update({ details });

      return res.json({ details, remainingCredits });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({
        error:
          status === 402
            ? "You have no credits remaining."
            : "Failed to unlock detailed weaknesses.",
        details: error.message,
      });
    }
  },
);

app.post(
  "/api/reports/:id/unlock-month",
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const uid = req.authUser.uid;
      const reportId = req.params.id;
      const month = Number(req.body.month);

      if (!month || month < 1 || month > 6) {
        return res
          .status(400)
          .json({ error: "Invalid month. Must be between 1 and 6." });
      }

      await requireAvailableCredit(uid);

      const docRef = firestoreDb
        .collection(REGISTERED_USERS_COLLECTION)
        .doc(uid)
        .collection("searches")
        .doc(reportId);

      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "Report not found." });
      }

      const reportData = docSnap.data();
      const analysis = reportData.analysisData;
      if (!analysis) {
        return res
          .status(400)
          .json({ error: "No analysis data found inside report." });
      }

      const details = reportData.details || {
        topicBreakdown: null,
        weaknessAnalysis: null,
        sixMonthPlan: {
          month1: null,
          month2: null,
          month3: null,
          month4: null,
          month5: null,
          month6: null,
        },
      };

      if (!details.sixMonthPlan) {
        details.sixMonthPlan = {
          month1: null,
          month2: null,
          month3: null,
          month4: null,
          month5: null,
          month6: null,
        };
      }

      const monthKey = `month${month}`;
      if (details.sixMonthPlan[monthKey]) {
        return res.json({ details, message: "Already unlocked." });
      }

      const topicSummary = (analysis.topics || [])
        .slice(0, 15)
        .map((topic) => `${topic.name}: ${topic.percentage.toFixed(1)}%`)
        .join(", ");

      const prompt = [
        "You are an expert competitive programming coach.",
        `Provide a detailed, day-by-day practice plan for Month ${month} (Days 1 to 30) of a 6-month roadmap, based on the candidate's LeetCode profile.`,
        "",
        "Candidate Stats:",
        `- Total solved: ${analysis.totals.solved}`,
        `- Easy/Medium/Hard: ${analysis.difficulty.easy.solved}/${analysis.difficulty.medium.solved}/${analysis.difficulty.hard.solved}`,
        `- Acceptance rate: ${analysis.acceptanceRate.toFixed(2)}%`,
        `- Topics solved: ${topicSummary || "No topic data"}- `,
        "",
        `This is Month ${month} of their 6-month preparation plan.`,
        month === 1
          ? "Since the user has already covered basic arrays and string topics, focus on upcoming intermediate topics to cover from day 1 to day 30, along with a structured revision plan for arrays/strings."
          : `Focus on intermediate to advanced topics for Month ${month}, keeping in mind they should cover advanced concepts they haven't mastered yet. Include weekly revisions.`,
        "",
        "Specify:",
        "- Exactly which topics and concepts to cover each day.",
        "- Recommended LeetCode problem types and patterns for each day.",
        "- A weekly revision and mock interview schedule.",
        "Format the output as clean markdown without any surrounding conversation.",
      ].join("\n");

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are an expert competitive programming coach. Follow instructions exactly.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || "Groq API request failed.");
      }

      const detailedMonthPlan = payload.choices?.[0]?.message?.content;
      if (!detailedMonthPlan) {
        throw new Error("Groq returned an empty response.");
      }

      const remainingCredits = await consumeOneCredit(uid);

      details.sixMonthPlan[monthKey] = detailedMonthPlan;
      await docRef.update({ details });

      return res.json({ details, remainingCredits });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({
        error:
          status === 402
            ? "You have no credits remaining."
            : `Failed to unlock Month ${month} plan.`,
        details: error.message,
      });
    }
  },
);

const frontendDir = fs.existsSync(path.join(FRONTEND_DIST_DIR, "index.html"))
  ? FRONTEND_DIST_DIR
  : fs.existsSync(path.join(FRONTEND_BUILD_DIR, "index.html"))
    ? FRONTEND_BUILD_DIR
    : LEGACY_PUBLIC_DIR;

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

app.use(
  express.static(frontendDir, {
    etag: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  }),
);

app.use((_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend directory: ${frontendDir}`);
});
// Trigger nodemon restart 5
