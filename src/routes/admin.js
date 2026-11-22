import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { requireAuth, log } from '../lib.js';

const router = Router();
router.use(requireAuth);

// Middleware: restrict admin endpoints so 'yetkili' cannot access them
router.use((req, res, next) => {
  if (req.user?.role === 'yetkili') {
    return res.status(403).json({ error: 'Bu alana erisim yetkiniz yok.' });
  }
  next();
});

// Website admin/staff accounts (never expose secrets/hashes).
router.get('/website-users', (req, res) => {
  const { q = '' } = req.query;
  let rows = db
    .prepare('SELECT id, username, role, totp_enabled, created_at FROM website_users ORDER BY id ASC')
    .all();
  const term = String(q).toLowerCase().trim();
  if (term) rows = rows.filter((u) => u.username.toLowerCase().includes(term));
  res.json({ users: rows.map((u) => ({ ...u, totp_enabled: !!u.totp_enabled })) });
});

// Update a user's role
router.put('/website-users/:id/role', (req, res) => {
  const targetId = Number(req.params.id);
  const newRole = String(req.body.role || '').trim().toLowerCase();
  const validRoles = ['owner', 'developer', 'admin', 'yetkili'];

  if (!validRoles.includes(newRole)) {
    return res.status(400).json({ error: 'Gecersiz rol.' });
  }

  const target = db.prepare('SELECT * FROM website_users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Kullanici bulunamadi.' });

  // Only owner or developer can assign or revoke owner/developer
  if ((target.role === 'owner' || newRole === 'owner') && req.user.role !== 'owner' && !req.user.ghost) {
    return res.status(403).json({ error: 'Owner rolunu sadece Owner duzenleyebilir.' });
  }

  db.prepare('UPDATE website_users SET role = ? WHERE id = ?').run(newRole, targetId);
  log({ actor: req.user.username, action: 'Role updated', target: target.username, detail: `Rol degisti: ${newRole}`, level: 'info' });

  res.json({ success: true, id: targetId, role: newRole });
});

// Delete a website user
router.delete('/website-users/:id', (req, res) => {
  const targetId = Number(req.params.id);
  const target = db.prepare('SELECT * FROM website_users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Kullanici bulunamadi.' });

  if (target.role === 'owner' && req.user.role !== 'owner' && !req.user.ghost) {
    return res.status(403).json({ error: 'Owner hesabi silinemez.' });
  }

  db.prepare('DELETE FROM website_users WHERE id = ?').run(targetId);
  log({ actor: req.user.username, action: 'User deleted', target: target.username, level: 'warning' });

  res.json({ success: true });
});

// Generate registration key for a specific role
router.post('/generate-key', (req, res) => {
  const targetRole = String(req.body.role || 'yetkili').trim().toLowerCase();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  const prefix = targetRole === 'yetkili' ? 'SUPERONLINE-YETKILI' : 'SUPERONLINE-REG';
  const keyValue = `${prefix}-${seg()}-${seg()}`;

  db.prepare('INSERT INTO register_keys (key_value, role) VALUES (?, ?)').run(keyValue, targetRole);
  log({ actor: req.user.username, action: 'Register key created', target: keyValue, detail: `Rol: ${targetRole}`, level: 'info' });

  res.json({ success: true, key: keyValue, role: targetRole });
});

export default router;
