import Script from "next/script";
import { META_PIXEL_ID_RE } from "@/lib/site-settings";

/**
 * Renders the Meta (Facebook) Pixel snippet and the no-JS fallback image
 * when a Pixel id is configured in the admin settings. Renders nothing
 * otherwise.
 *
 * `pixelId` is validated upstream to be 1–32 digits, so it's safe to inline
 * into the script body and image URL without further escaping.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  if (!pixelId || !META_PIXEL_ID_RE.test(pixelId)) return null;
  const init = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{init}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
