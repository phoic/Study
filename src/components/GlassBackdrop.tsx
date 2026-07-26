// The drifting color blobs behind every screen (공부 타이머 글래스.dc.html).
// Purely decorative: sits at z-index 0 with pointer-events off, so all real UI
// renders above it at z-index 1. The blur+animation is what gives the frosted
// panes something to refract.
export function GlassBackdrop() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          left: -120,
          top: -160,
          borderRadius: "50%",
          background: "radial-gradient(circle,oklch(0.8 0.13 280/.55),transparent 70%)",
          filter: "blur(20px)",
          animation: "glassdrift 18s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 480,
          height: 480,
          right: -120,
          top: 120,
          borderRadius: "50%",
          background: "radial-gradient(circle,oklch(0.82 0.12 200/.5),transparent 70%)",
          filter: "blur(20px)",
          animation: "glassdrift 22s ease-in-out infinite reverse",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 440,
          height: 440,
          left: 280,
          bottom: -180,
          borderRadius: "50%",
          background: "radial-gradient(circle,oklch(0.84 0.11 30/.42),transparent 70%)",
          filter: "blur(20px)",
          animation: "glassdrift 26s ease-in-out infinite",
        }}
      />
    </div>
  );
}
