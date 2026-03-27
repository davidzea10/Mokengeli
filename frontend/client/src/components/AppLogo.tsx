type AppLogoVariant = 'header' | 'login';

const src: Record<AppLogoVariant, string> = {
  header: '/brand/mokengeli-logo.svg',
  login: '/brand/mokengeli-logo-square.svg',
};

export function AppLogo({
  variant,
  className = '',
}: {
  variant: AppLogoVariant;
  className?: string;
}) {
  return (
    <img
      src={src[variant]}
      alt="Mokengeli"
      width={variant === 'login' ? 512 : 320}
      height={variant === 'login' ? 512 : 96}
      className={className}
      decoding="async"
    />
  );
}
