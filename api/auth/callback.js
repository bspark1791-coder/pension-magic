// STEP 2: 구글에서 돌아온 후 토큰 교환
export default async function handler(req, res) {
  const code  = req.query?.code;
  const error = req.query?.error;

  if (error || !code) {
    const msg = error || '로그인 취소';
    res.setHeader('Location', '/?auth=error&msg=' + encodeURIComponent(msg));
    return res.status(302).end();
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = 'https://pension-magic.vercel.app/api/auth/callback';

  try {
    // code → access_token 교환
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'code='          + encodeURIComponent(code)
             + '&client_id='   + encodeURIComponent(clientId)
             + '&client_secret=' + encodeURIComponent(clientSecret)
             + '&redirect_uri=' + encodeURIComponent(redirectUri)
             + '&grant_type=authorization_code',
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      throw new Error('토큰 없음: ' + JSON.stringify(tokens));
    }

    // 유저 정보 가져오기
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': 'Bearer ' + tokens.access_token },
    });
    const user = await userRes.json();

    // 성공 → 홈으로 리디렉션 (유저 정보 포함)
    const params = 'auth=success'
      + '&name='          + encodeURIComponent(user.name    || '')
      + '&email='         + encodeURIComponent(user.email   || '')
      + '&picture='       + encodeURIComponent(user.picture || '')
      + '&access_token='  + encodeURIComponent(tokens.access_token)
      + '&refresh_token=' + encodeURIComponent(tokens.refresh_token || '');

    res.setHeader('Location', '/?' + params);
    return res.status(302).end();

  } catch (err) {
    console.error('Callback error:', err.message);
    res.setHeader('Location', '/?auth=error&msg=' + encodeURIComponent(err.message));
    return res.status(302).end();
  }
}
