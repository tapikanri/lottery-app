// Node.js + Express + SQLite バックエンド実装例
// このファイルを server.js として保存し、`node server.js` で起動できます。

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DBメモリ／データ構造例 (本番では SQLite / PostgreSQL を使用)
let USERS = {
    'admin': { id: 'admin', name: '管理者', role: 'admin', lastStoreNoticeDate: '2026-07-25', lastOpenInfoDate: '2026-07-25', isBanned: false },
    'user1': { id: 'user1', name: 'ユーザーA', role: 'user', lastStoreNoticeDate: null, lastOpenInfoDate: '2026-07-24', isBanned: false },
};

let ITEMS = [];

// 認証ミドルウェア例
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: '認証が必要です。' });

    // トークン検証（実際には JWT 検証）
    const userId = token.split('_')[1];
    req.user = USERS[userId];
    if (!req.user) return res.status(403).json({ message: '無効なトークンです。' });

    next();
}

// 1. ログイン API
app.post('/api/login', (req, res) => {
    const { userid, password } = req.body;
    const user = USERS[userid];

    if (user && password === 'pass123') {
        const token = `token_${userid}_${Date.now()}`;
        return res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    }
    return res.status(400).json({ message: 'IDまたはパスワードが違います。' });
});

// 2. 抽選一覧取得 API (認証必須)
app.get('/api/items', authenticateToken, (req, res) => {
    res.json(ITEMS);
});

// 3. 抽選情報投稿 API
app.post('/api/items', authenticateToken, (req, res) => {
    const item = { ...req.body, id: Date.now().toString(), createdBy: req.user.name };
    ITEMS.unshift(item);

    // ユーザーの最終投稿日時を更新
    const today = new Date().toISOString().split('T')[0];
    if (item.isStoreNotice) USERS[req.user.id].lastStoreNoticeDate = today;
    else USERS[req.user.id].lastOpenInfoDate = today;

    res.json({ message: '登録完了', item });
});

app.listen(PORT, () => {
    console.log(`サーバーがポート ${PORT} で起動しました。`);
});