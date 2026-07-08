export default function Footer() {
  return (
    <footer
      className="text-center text-[10px] text-text-tertiary pb-4 pt-2 animate-fade-in-up"
      style={{ animationDelay: "400ms" }}
    >
      SysWatch Telemetry · Streaming from{" "}
      <span className="text-text-secondary">localhost:6767</span>· Built with
      C++ &amp; Next.js :D
    </footer>
  );
}
