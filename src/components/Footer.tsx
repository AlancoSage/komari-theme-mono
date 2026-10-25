export function Footer({
  footerHtml,
  version,
}: {
  footerHtml: string;
  version: string;
}) {
  return (
    <footer className="relative z-10 mx-auto mt-10 max-w-[1360px] px-4 pb-10 sm:px-6">
      <div className="divider mb-6" />
      <div className="flex flex-col items-center gap-2 text-center text-[11px] t-muted">
        <p>
          Powered by{" "}
          <a
            className="underline decoration-dotted underline-offset-2"
            href="https://github.com/komari-monitor/komari"
            target="_blank"
            rel="noreferrer"
          >
            Komari Monitor
          </a>
          . · Mono {version}
        </p>
        {footerHtml ? (
          <div className="max-w-3xl [&_a]:underline" dangerouslySetInnerHTML={{ __html: footerHtml }} />
        ) : null}
      </div>
    </footer>
  );
}
