// 포트폴리오 데이터 저장/불러오기 — 구글 시트 API 사용
// GET  /api/data?email=xxx&token=xxx  → 포트폴리오 불러오기
// POST /api/data                       → 포트폴리오 저장

const SHEET_ID = process.env.PORTFOLIO_SHEET_ID; // Vercel 환경변수

// 구글 시트에서 이메일로 행 찾기
async function findUserRow(token, email) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Users!A:B`;
  const res  = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.values) return -1;
  return data.values.findIndex(row => row[0] === email);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: '인증 토큰 필요' });

  // ── GET: 포트폴리오 불러오기 ──
  if (req.method === 'GET') {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email 필요' });

    try {
      const rowIdx = await findUserRow(token, email);
      if (rowIdx === -1) {
        return res.status(200).json({ ok: true, data: null, message: '신규 사용자' });
      }

      // 해당 행의 데이터 열(C열) 읽기
      const row     = rowIdx + 1; // 1-indexed
      const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Users!C${row}`;
      const dataRes = await fetch(dataUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataJson = await dataRes.json();
      const raw      = dataJson.values?.[0]?.[0] || null;

      return res.status(200).json({
        ok:   true,
        data: raw ? JSON.parse(raw) : null,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: 포트폴리오 저장 ──
  if (req.method === 'POST') {
    const { email, name, portfolio } = req.body || {};
    if (!email || portfolio === undefined) {
      return res.status(400).json({ error: 'email, portfolio 필요' });
    }

    try {
      const rowIdx    = await findUserRow(token, email);
      const now       = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      const dataStr   = JSON.stringify(portfolio);

      if (rowIdx === -1) {
        // 신규 사용자 — 새 행 추가
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Users!A:D:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
        await fetch(appendUrl, {
          method: 'POST',
          headers: {
            Authorization:  `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[email, name || '', dataStr, now]],
          }),
        });
      } else {
        // 기존 사용자 — 해당 행 업데이트
        const row       = rowIdx + 1;
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Users!C${row}:D${row}?valueInputOption=RAW`;
        await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            Authorization:  `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [[dataStr, now]],
          }),
        });
      }

      return res.status(200).json({ ok: true, saved: now });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: '허용되지 않는 메서드' });
}
