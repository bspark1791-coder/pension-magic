// STEP 2: 구글에서 돌아온 후 토큰 교환 + 유저 정보 추출
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/?auth=error&msg=' + encodeURIComponent(error || '로그인 취소'));
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = 'https://pension-magic.vercel.app/api/auth/callback';

  try {
    // 1) code → access_token + refresh_token 교환
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('토큰 발급 실패: ' + JSON.stringify(tokens));

    // 2) 유저 정보 가져오기
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = await userRes.json();

    // 3) 유저 정보 + 토큰을 URL 파라미터로 전달 (세션 저장용)
    const params = new URLSearchParams({
      auth:          'success',
      name:          user.name  || '',
      email:         user.email || '',
      picture:       user.picture || '',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token || '',
    });

    return res.redirect('/?' + params.toString());

  } catch (err) {
    console.error('Auth callback error:', err);
    return res.redirect('/?auth=error&msg=' + encodeURIComponent(err.message));
  }
}
