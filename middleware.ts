// Este middleware solo servirá si despliegas en Vercel. 
// Captura las peticiones de WhatsApp/Facebook y les da el logo correcto.

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/|\/$/g, '');

  // 1. Ignorar archivos estáticos (imágenes, js, css, etc.)
  if (
    path.includes('.') || 
    path.startsWith('_') || 
    path === '' || 
    path === 'barber' || 
    path === 'superadmin'
  ) {
    return;
  }

  // 2. Si llegamos aquí, es probable que sea un slug de un negocio (ej: abner-barber-shop)
  // Intentamos obtener los datos del negocio desde Supabase
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return;

    // Consultamos solo los metadatos necesarios
    const response = await fetch(
      `${supabaseUrl}/rest/v1/tenants?or=(slug.eq.${path},id.eq.${path})&select=name,logo,slogan`,
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
          
          // Asegurarnos de que el logo sea una URL absoluta
          let businessLogo = tenant.logo;
          if (!businessLogo) {
            businessLogo = `${url.origin}/logo-minurno-5.png`;
          } else if (businessLogo.startsWith('/')) {
            businessLogo = `${url.origin}${businessLogo}`;
          }
          
          const businessSlogan = tenant.slogan || `Reserva tu turno en ${tenant.name}`;

          const userAgent = request.headers.get('user-agent') || '';
          const isSocialBot = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot/i.test(userAgent);

          if (isSocialBot) {
            const html = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <title>${businessName} | MyTurn</title>
                  <meta property="og:title" content="${businessName}">
                  <meta property="og:description" content="${businessSlogan}">
                  <meta property="og:image" content="${businessLogo}">
                  <meta property="og:url" content="${url.href}">
                  <meta property="og:type" content="website">
                  <meta property="og:site_name" content="MyTurn">
                  <meta name="twitter:card" content="summary_large_image">
                  <meta name="twitter:title" content="${businessName}">
                  <meta name="twitter:description" content="${businessSlogan}">
                  <meta name="twitter:image" content="${businessLogo}">
                </head>
                <body>
                  <script>window.location.href = "${url.href}";</script>
                </body>
              </html>
            `.trim();
            return new Response(html, {
              headers: { 
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=3600'
              },
            });
          }
        }
  } catch (e) {
    console.error('Middleware error:', e);
  }

  return;
}

// Configuramos qué rutas debe vigilar el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api
     * - static files
     * - favicon.ico
     */
    '/((?!api|favicon.ico).*)',
  ],
};
