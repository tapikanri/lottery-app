// Node.js + Express バックエンド実装（1000ユーザー自動生成・一括管理・本番対応版）

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ★管理者と一般ユーザーのパスワード設定
const ADMIN_PASSWORD = 'ADMIN_SECRET_PASSWORD_2026'; // 管理者専用パスワード
const COMMON_USER_PASSWORD = 'userpass2026';         // 一般ユーザー（1000名）共通初期パスワード

// ユーザー情報管理オブジェクト
let USERS = {
    'admin': { 
        id: 'admin', 
        name: '管理者', 
        password: ADMIN_PASSWORD, 
        role: 'admin', 
        lastStoreNoticeDate: '2026-07-28', 
        lastOpenInfoDate: '2026-07-28', 
        isBanned: false 
    }
};

// サーバー起動時に user1 〜 user1000 を一括生成
for (let i = 1; i <= 1000; i++) {
    const userId = `user${i}`;
    USERS[userId] = {
        id: userId,
        name: `user${i}`,
        password: COMMON_USER_PASSWORD,
        role: 'user',
        lastStoreNoticeDate: null,
        lastOpenInfoDate: null,
        isBanned: false
    };
}

let ITEMS = [];

// 簡易認証ミドルウェア
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: '認証が必要です。' });

    const userId = token.split('_')[1];
    req.user = USERS[userId];
    if (!req.user) return res.status(403).json({ message: '無効なトークンです。' });

    next();
}

// 管理者権限チェックミドルウェア
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: '管理者権限が必要です。' });
    }
    next();
}

// 1. ログイン API
app.post('/api/login', (req, res) => {
    const { userid, password } = req.body;
    const user = USERS[userid];

    if (user && user.password === password) {
        if (user.isBanned) {
            return res.status(403).json({ message: 'このアカウントは凍結されています。' });
        }
        const token = `token_${userid}_${Date.now()}`;
        return res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    }
    return res.status(400).json({ message: 'IDまたはパスワードが正しくありません。' });
});

// 2. ログイン中の自分のユーザー情報取得 API
app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// 3. 管理者用：全ユーザー一覧取得 API
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const userList = Object.values(USERS).map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        lastOpenInfoDate: u.lastOpenInfoDate,
        lastStoreNoticeDate: u.lastStoreNoticeDate,
        isBanned: u.isBanned
    }));
    res.json(userList);
});

// 4. 管理者用：ユーザーBAN / 解除切替 API
app.post('/api/admin/users/:userId/ban', authenticateToken, requireAdmin, (req, res) => {
    const { userId } = req.params;
    if (!USERS[userId]) return res.status(404).json({ message: 'ユーザーが見つかりません。' });
    if (USERS[userId].role === 'admin') return res.status(400).json({ message: '管理者はBANできません。' });

    USERS[userId].isBanned = !USERS[userId].isBanned;
    res.json({ message: 'ステータスを更新しました。', user: USERS[userId] });
});

// 5. 抽選一覧取得 API
app.get('/api/items', authenticateToken, (req, res) => {
    res.json(ITEMS);
});

// 6. 抽選情報投稿 API
app.post('/api/items', authenticateToken, (req, res) => {
    const item = { 
        ...req.body, 
        id: Date.now().toString(), 
        createdBy: req.user.name, 
        createdDate: new Date().toISOString().split('T')[0] 
    };
    ITEMS.unshift(item);

    const today = new Date().toISOString().split('T')[0];
    if (item.isStoreNotice) USERS[req.user.id].lastStoreNoticeDate = today;
    else USERS[req.user.id].lastOpenInfoDate = today;

    res.json({ message: '登録完了', item });
});

// 7. 抽選情報削除 API
app.delete('/api/items/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    ITEMS = ITEMS.filter(i => i.id !== id);
    res.json({ message: '削除完了' });
});

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`サーバーがポート ${PORT} で起動しました。`);
    console.log(`[一般ユーザー] user1 〜 user1000 自動生成完了`);
    console.log(`========================================`);
});