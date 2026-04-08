import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Este middleware solo servirá si despliegas en Vercel. 
// Captura las peticiones de WhatsApp/Facebook y les da el logo correcto.

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname.replace(/^\/|\/$/g, '');

  // 1. Ignorar archivos estáticos (imágenes, js, css, etc.)
  if (
    path.includes('.') || 
    path.startsWith('_') || 
    path === '' || 
    path === 'barber' || 
    path === 'superadmin'
  ) {
    return NextResponse.next();
  }

  // 2. Si llegamos aquí, es probable que sea un slug de un negocio (ej: abner-barber-shop)
  // Intentamos obtener los datos del negocio desde Supabase
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return NextResponse.next();

    // Consultamos solo los metadatos necesarios
    const response = await fetch(
      `${supabaseUrl}/rest/v1/tenants?slug=eq.${path}&select=name,logo,slogan`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const tenants = await response.json();
    
    if (tenants && tenants.length > 0) {
      const tenant = tenants[0];
      const businessName = tenant.name;
      const businessLogo = tenant.logo || 'https://myturn-sigma.vercel.app/logo-myturn.png';
      const businessSlogan = tenant.slogan || `Reserva tu turno en ${tenant.name}`;

      // Si es un bot de redes sociales, le entregamos un HTML modificado
      const userAgent = request.headers.get('user-agent') || '';
      const isSocialBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot/i.test(userAgent);

      if (isSocialBot) {
        // Generamos un HTML mínimo con los metatags para el bot
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${businessName} | MyTurn</title>
              <meta property="og:title" content="${businessName}">
              <meta property="og:description" content="${businessSlogan}">
              <meta property="og:image" content="${businessLogo}">
              <meta property="og:url" content="${url.href}">
              <meta property="og:type" content="website">
              <meta name="twitter:card" content="summary_large_image">
              <meta name="twitter:image" content="${businessLogo}">
            </head>
            <body>
              <script>window.location.href = "${url.href}";</script>
            </body>
          </html>
        `;
        return new NextResponse(html, {
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }
  } catch (e) {
    console.error('Middleware error:', e);
  }

  return NextResponse.next();
}

// Configuramos qué rutas debe vigilar el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
