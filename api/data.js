// Vercel Serverless Function — RSS 뉴스 자동 수집
// 네이버 금융·연합뉴스 RSS → JSON으로 변환해서 브라우저에 전달

const RSS_FEEDS = [
  {
    name: '네이버 금융',
    url: 'https://finance.naver.com/rss/news.nhn',
    category: '📈 시장',
  },
  {
    name: '연합뉴스 경제',
    url: 'https://www.yonhapnewstv.co.kr/category/news/economy/feed/',
    category: '🌏 글로벌',
  },
  {
    name: '연합뉴스 금융',
    url: 'https://feeds.yonhapnews.co.kr/rss/0200000000',
    category: '📈 시장',
  },
];

// RSS XML → 뉴스 배열로 파싱
function parseRSS(xml, category) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const title = extractTag(item, 'title');
    const link  = extractTag(item, 'link');
    const desc  = extractTag(item, 'description');
    const pubDate = extractTag(item, 'pubDate');

    if (!title || !link) continue;

    // 광고·무의미한 항목 필터
    if (title.length < 5) continue;

    items.push({
      title:    cleanText(title),
      link:     cleanText(link),
      summary:  cleanText(desc).substring(0, 120),
      date:     formatDate(pubDate),
      category,
      importance: '🟡',
    });
  }

  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function cleanText(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = d.getMonth() + 1;
    const day   = d.getDate();
    const hour  = d.getHours().toString().padStart(2, '0');
    const min   = d.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hour}:${min}`;
  } catch(e) {
    return '';
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600'); // 10분 캐시

  const allNews = [];

  // 모든 RSS 피드 병렬 fetch
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PensionMagic/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const xml = await response.text();
      const items = parseRSS(xml, feed.category);
      return items;
    })
  );

  // 성공한 피드만 합치기
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
    }
  }

  // 최신순 정렬 + 중복 제거 + 최대 20개
  const seen = new Set();
  const unique = allNews.filter(item => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  }).slice(0, 20);

  if (unique.length === 0) {
    return res.status(200).json({
      ok: false,
      message: 'RSS 수집 실패 — 기본 뉴스를 표시합니다',
      news: [],
    });
  }

  return res.status(200).json({
    ok: true,
    count: unique.length,
    updated: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    news: unique,
  });
}
