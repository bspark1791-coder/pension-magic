// Vercel Serverless Function — 구글 시트 서버사이드 프록시
// CORS 문제 완전 해결: 브라우저가 아닌 서버에서 구글 시트를 fetch

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url 파라미터가 필요합니다' });
  }

  // 구글 시트 URL만 허용 (보안)
  if (!url.includes('docs.google.com')) {
    return res.status(403).json({ error: '구글 시트 URL만 허용됩니다' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PensionMagic/1.0)',
        'Accept': 'text/csv, text/plain, */*',
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'fetch 실패: ' + response.status });
    }

    const csv = await response.text();

    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60'); // 60초 캐시

    return res.status(200).send(csv);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
