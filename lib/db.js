// Simple file-backed user store. Swap for Postgres/Prisma when scaling.
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

const DEFAULT_SETTINGS = { autoApproveSeekers: false };

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2));
  return next;
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(users) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function findUser(email) {
  return load().find((u) => u.email === email.toLowerCase()) || null;
}

export function listUsers() {
  return load().map(({ passwordHash, ...u }) => u);
}

export function createUser({ name, email, password, accountType = "seeker" }) {
  const users = load();
  email = email.toLowerCase();
  if (users.some((u) => u.email === email)) {
    throw new Error("An account with this email already exists.");
  }
  const isAdmin =
    email === (process.env.ADMIN_EMAIL || "").toLowerCase() && email !== "";
  // Job seekers can be auto-approved when the admin has enabled it;
  // employers/recruiters always wait for manual review.
  const autoApproved =
    accountType === "seeker" && getSettings().autoApproveSeekers;
  const user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: isAdmin ? "admin" : "user",
    accountType: isAdmin ? "admin" : accountType,
    status: isAdmin || autoApproved ? "approved" : "pending",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  save(users);
  return user;
}

export function verifyUser(email, password) {
  const users = load();
  const user = users.find((u) => u.email === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) return null;
  return user;
}

export function getUserById(id) {
  const u = load().find((x) => x.id === id);
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

export function updateProfile(id, { name, skills }) {
  const users = load();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("User not found");
  if (typeof name === "string" && name.trim()) user.name = name.trim().slice(0, 80);
  if (Array.isArray(skills)) {
    user.skills = [...new Set(skills.map((s) => String(s).trim()).filter(Boolean))].slice(0, 40);
  }
  save(users);
  const { passwordHash, ...rest } = user;
  return rest;
}

export function changePassword(id, currentPassword, newPassword) {
  const users = load();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("User not found");
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }
  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  save(users);
  return true;
}

export function setUserStatus(id, status) {
  const users = load();
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("User not found");
  user.status = status;
  save(users);
  return user;
}
