"use client";

export function SocialAuthButtons({ disabled }: { disabled?: boolean }) {
  const base =
    "flex-1 h-12 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:bg-white/[0.08] hover:border-white/25 hover:shadow-[0_4px_20px_rgba(255,255,255,0.06)] active:scale-[0.96] disabled:opacity-60 disabled:pointer-events-none";

  return (
    <div className="flex gap-3">
      <button type="button" disabled={disabled} className={base} aria-label="Continue with Google">
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      </button>
      <button type="button" disabled={disabled} className={base} aria-label="Continue with Facebook">
        <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>
      <button type="button" disabled={disabled} className={base} aria-label="Continue with Apple">
        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09.105.15.218.3.336.445.922 1.134 2.012 2.457 3.329 2.417 1.258-.04 1.73-.801 3.25-.801 1.52 0 1.95.801 3.287.76 1.378-.04 2.302-1.22 3.197-2.316.14-.173.277-.353.407-.54.912-1.328 1.288-2.617 1.309-2.686-.03-.012-2.518-.966-2.55-3.834-.027-2.392 1.95-3.535 2.042-3.593-1.12-1.637-2.863-1.859-3.486-1.89-1.564-.17-3.067.896-3.864.896-.797 0-2.036-.856-3.415-.882h-.4zm2.148-3.084c.664-.805 1.111-1.921.99-3.036-1.002.04-2.203.666-2.898 1.503-.615.74-1.144 1.884-.997 2.973 1.115.086 2.234-.619 2.905-1.44z" />
        </svg>
      </button>
    </div>
  );
}