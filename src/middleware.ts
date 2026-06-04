import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // アクセス先が /staff 以下のパスかどうかを確認
  if (request.nextUrl.pathname.startsWith('/staff')) {
    // クッキーに認証情報（__session）があるかチェック
    const isAuth = request.cookies.has('__session');

    // 認証情報がない場合（未ログイン）は、/login へリダイレクト（突き返し）
    if (!isAuth) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 認証済み、または /staff 以外のページへのアクセスはそのまま通過
  return NextResponse.next();
}

// どのパスでこのmiddlewareを動作させるかの設定
export const config = {
  matcher: ['/staff/:path*', '/staff'],
};


