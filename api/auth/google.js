// STEP 1: 구글 로그인 페이지로 리디렉션
export default function handler(req, res) {
  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = 'https://pension-magic.vercel.app/api/auth/callback';

  const scope = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/spreadsheets',
  ].join(' ');

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + [
    'client_id='     + encodeURIComponent(clientId),
    'redirect_uri='  + encodeURIComponent(redirectUri),
    'response_type=code',
    'scope='         + encodeURIComponent(scope),
    'access_type=offline',
    'prompt=consent',
  ].join('&');

  res.setHeader('Location', authUrl);
  res.status(302).end();
}
