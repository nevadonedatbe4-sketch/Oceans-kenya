interface PageLoaderProps {
  size?: number;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function PageLoader({ size = 48, text, fullScreen = false, className = '' }: PageLoaderProps) {
  const imgUrl = 'https://storage.helloreaddy.io/project_files/842d3b8a-5d73-416c-bead-c20132299a10/80bb77b9-7df2-4028-990a-247bc62d9a1c_compressed_1-04.webp';

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <img
        src={imgUrl}
        alt="Loading"
        width={size}
        height={size}
        className="animate-spin"
        style={{ animationDuration: '1.2s' }}
      />
      {text && (
        <span className="text-sm font-roboto text-primary/60">{text}</span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}