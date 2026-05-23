// shared.jsx — theme builder + primitives shared by all variations.
// Adapted from the design system's mobile UI kit.

const BRAND_PALETTES = {
  orange: { soft:"#fff7ed", mid:"#ffedd5", brand:"#f97316", strong:"#ea580c", deep:"#c2410c" },
  red:    { soft:"#fef2f2", mid:"#fee2e2", brand:"#dc2626", strong:"#b91c1c", deep:"#991b1b" },
  blue:   { soft:"#eff6ff", mid:"#dbeafe", brand:"#2563eb", strong:"#1d4ed8", deep:"#1e40af" },
  green:  { soft:"#ecfdf5", mid:"#d1fae5", brand:"#059669", strong:"#047857", deep:"#065f46" },
  ink:    { soft:"#f4f4f5", mid:"#e4e4e7", brand:"#18181b", strong:"#000000", deep:"#000000" },
};

const CARD_STYLES = {
  compact:     { radius: 10, shadow: "none",                                imgAspect: "16 / 10", pad: 10, gap: 8 },
  spacious:    { radius: 14, shadow: "0 1px 2px rgb(0 0 0 / 0.04)",         imgAspect: "4 / 3",   pad: 12, gap: 12 },
  "image-heavy":{ radius: 18, shadow: "0 4px 12px rgb(0 0 0 / 0.08)",       imgAspect: "5 / 4",   pad: 14, gap: 14 },
};

function buildTheme(t) {
  const pal = BRAND_PALETTES[t.color] || BRAND_PALETTES.orange;
  const cs  = CARD_STYLES[t.cards]    || CARD_STYLES.spacious;
  return {
    "--brand-soft":   pal.soft,
    "--brand-mid":    pal.mid,
    "--brand":        pal.brand,
    "--brand-strong": pal.strong,
    "--brand-deep":   pal.deep,
    "--bg":           "#ffffff",
    "--bg-soft":      "#fafafa",
    "--bg-tint":      pal.soft,
    "--surface":      "#ffffff",
    "--fg":           "#171717",
    "--fg-2":         "#404040",
    "--fg-3":         "#737373",
    "--fg-4":         "#a3a3a3",
    "--bd":           "#e5e5e5",
    "--bd-2":         "#d4d4d4",
    "--danger":       "#ef4444",
    "--line-green":   "#06C755",
    "--font-family":  "'Sarabun', 'Noto Sans Thai', system-ui, sans-serif",
    "--card-radius":  `${cs.radius}px`,
    "--card-shadow":  cs.shadow,
    "--card-pad":     `${cs.pad}px`,
    "--card-gap":     `${cs.gap}px`,
    "--image-aspect": cs.imgAspect,
    "--safe-top":     "54px",
    "--safe-bottom":  "34px",
  };
}

// ── Screen shell ──────────────────────────────────────────────
function Screen({ theme, children, style = {} }) {
  return (
    <div style={{
      ...theme,
      height: "100%",
      background: "var(--bg)",
      color: "var(--fg)",
      fontFamily: "var(--font-family)",
      fontSize: 14,
      lineHeight: 1.45,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      paddingTop: "var(--safe-top)",
      paddingBottom: "var(--safe-bottom)",
      position: "relative",
      ...style,
    }}>
      {children}
    </div>
  );
}

function ScrollArea({ children, style = {} }) {
  return (
    <div style={{
      flex: 1, overflowY: "auto", overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      ...style,
    }}>{children}</div>
  );
}

// ── Wordmark ─────────────────────────────────────────────────
function Wordmark({ size = 20, dark = false }) {
  return (
    <span style={{
      fontWeight: 700, fontSize: size, letterSpacing: "-0.01em",
      color: dark ? "#fff" : "var(--fg)", lineHeight: 1,
    }}>
      เซ้งร้าน<span style={{ color: "var(--brand)" }}>.com</span>
    </span>
  );
}

// ── Type badge ───────────────────────────────────────────────
const TYPE_BADGES = window.SengranData.TYPE_BADGES;
function TypeBadge({ type, featured, size = "sm" }) {
  const b = TYPE_BADGES[type] || TYPE_BADGES.sale;
  const px = size === "sm" ? "2px 9px" : "3px 11px";
  const fs = size === "sm" ? 11 : 12;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: px, borderRadius: 9999,
      fontSize: fs, fontWeight: 500,
      background: b.bg, color: b.fg, border: `1px solid ${b.bd}`,
    }}>
      {featured && <span style={{ fontSize: 10 }}>⭐</span>}
      {b.label}
    </span>
  );
}

// ── Heart button ─────────────────────────────────────────────
function HeartBtn({ on, onClick, floating = true }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick?.(); }} style={{
      position: floating ? "absolute" : "relative",
      top: floating ? 10 : undefined, right: floating ? 10 : undefined,
      width: 32, height: 32, borderRadius: 9999,
      background: floating ? "rgba(255,255,255,0.92)" : "transparent",
      border: "none", color: on ? "#ef4444" : "#737373",
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      boxShadow: floating ? "0 1px 3px rgb(0 0 0 / 0.10)" : "none",
      backdropFilter: floating ? "saturate(180%) blur(2px)" : undefined,
    }}>
      <Icon name="heart" size={16}
            fill={on ? "currentColor" : "none"}
            stroke={on ? "currentColor" : "currentColor"}
            strokeWidth={on ? 0 : 2}/>
    </button>
  );
}

// ── Photo placeholder ───────────────────────────────────────
const PH_PALETTES = {
  "ph-coffee":     { from:"#d4a574", to:"#7c4a1f", icon:"coffee" },
  "ph-street":     { from:"#9ca3af", to:"#374151", icon:"store" },
  "ph-restaurant": { from:"#fdba74", to:"#c2410c", icon:"utensils" },
  "ph-salon":      { from:"#86efac", to:"#15803d", icon:"scissors" },
  "ph-mart":       { from:"#a5b4fc", to:"#4338ca", icon:"basket" },
  "ph-spa":        { from:"#fda4af", to:"#9f1239", icon:"sparkles" },
};
function Photo({ kind, glyph = true, style = {} }) {
  const p = PH_PALETTES[kind] || PH_PALETTES["ph-restaurant"];
  return (
    <div style={{
      width: "100%", height: "100%",
      background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.45)", position: "relative", overflow: "hidden",
      ...style,
    }}>
      {glyph && <Icon name={p.icon} size={48}/>}
    </div>
  );
}

// ── Price string helpers ────────────────────────────────────
const { fmtTH, fmtCompact } = window.SengranData;
function priceText(l) {
  if (l.type === "sale" && l.sale_price) return `฿${fmtTH(l.sale_price)}`;
  if (l.type === "rent" && l.rent_price) return `฿${fmtTH(l.rent_price)}`;
  if (l.type === "both") {
    const a = l.sale_price ? `฿${fmtTH(l.sale_price)}` : null;
    const b = l.rent_price ? `เช่า ฿${fmtTH(l.rent_price)}/ด.` : null;
    return [a, b].filter(Boolean).join(" · ");
  }
  return "ติดต่อสอบถาม";
}
function priceUnit(l) { return l.type === "rent" ? "/เดือน" : ""; }

// ── Generic top bar ─────────────────────────────────────────
function TopBar({ title, subtitle, left, right, style = {} }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 14px", minHeight: 52,
      background: "var(--bg)",
      borderBottom: "1px solid var(--bd)",
      ...style,
    }}>
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontWeight: 700, fontSize: 16, color: "var(--fg)", lineHeight: 1.2 }}>{title}</div>}
        {subtitle && <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

// ── Icon button (round) ─────────────────────────────────────
function IconBtn({ name, onClick, badge, size = 36, color = "var(--fg-2)", style = {} }) {
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 9999,
      background: "transparent", border: "none",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color, cursor: "pointer", position: "relative", flexShrink: 0,
      ...style,
    }}>
      <Icon name={name} size={20}/>
      {badge != null && (
        <span style={{
          position: "absolute", top: 4, right: 4, minWidth: 16, height: 16,
          padding: "0 4px", borderRadius: 9999, background: "#ef4444", color: "#fff",
          fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
        }}>{badge}</span>
      )}
    </button>
  );
}

// ── Category presentation primitives (driven by tweak) ─────
// "icons" — orange icon bubble + label
// "chips" — text-only pill chips
// "pills" — chip with small icon
// "illustrated" — colored card with bigger icon, varied bg
function CategoryGrid({ cats, mode = "icons", onTap, columns = 4 }) {
  if (mode === "chips") {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 16px" }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => onTap?.(c)} style={{
            padding: "8px 14px", borderRadius: 9999,
            background: "var(--bg-soft)", border: "1px solid var(--bd)",
            fontSize: 13, color: "var(--fg-2)", fontWeight: 500, cursor: "pointer",
            whiteSpace: "nowrap", fontFamily: "inherit",
          }}>{c.name}</button>
        ))}
      </div>
    );
  }
  if (mode === "pills") {
    return (
      <div style={{
        display: "flex", gap: 8, overflowX: "auto", padding: "4px 16px",
        scrollbarWidth: "none",
      }}>
        {cats.map(c => (
          <button key={c.id} onClick={() => onTap?.(c)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 9999,
            background: "var(--brand-soft)", border: "1px solid var(--brand-mid)",
            fontSize: 13, color: "var(--brand-deep)", fontWeight: 500, cursor: "pointer",
            whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
          }}>
            <Icon name={c.icon} size={14}/>
            {c.name}
          </button>
        ))}
      </div>
    );
  }
  if (mode === "illustrated") {
    const tints = [
      ["#fef3c7", "#92400e"], ["#dcfce7", "#15803d"], ["#dbeafe", "#1d4ed8"], ["#fce7f3", "#9d174d"],
      ["#f3e8ff", "#7e22ce"], ["#fef2f2", "#b91c1c"], ["#ecfeff", "#0e7490"], ["#fef3c7", "#92400e"],
    ];
    return (
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10, padding: "0 16px",
      }}>
        {cats.map((c, i) => {
          const [bg, fg] = tints[i % tints.length];
          return (
            <button key={c.id} onClick={() => onTap?.(c)} style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12,
              padding: 14, background: bg, color: fg, borderRadius: 14, border: "none",
              cursor: "pointer", aspectRatio: "1 / 1", justifyContent: "space-between",
              textAlign: "left", fontFamily: "inherit",
            }}>
              <Icon name={c.icon} size={26}/>
              <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{c.name}</span>
            </button>
          );
        })}
      </div>
    );
  }
  // default: icons (bubble)
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 8, padding: "0 16px",
    }}>
      {cats.map(c => (
        <button key={c.id} onClick={() => onTap?.(c)} style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          padding: "12px 4px", background: "var(--surface)",
          border: "1px solid var(--bd)", borderRadius: 12, cursor: "pointer",
          fontFamily: "inherit",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 9999,
            background: "var(--brand-mid)", color: "var(--brand-strong)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name={c.icon} size={20}/>
          </div>
          <span style={{ fontSize: 11, color: "var(--fg-2)", textAlign: "center", lineHeight: 1.15 }}>{c.name}</span>
        </button>
      ))}
    </div>
  );
}

// ── Contact modal (bottom sheet) — shared across variations ─
function ContactSheet({ listing, onClose, accent = "brand" }) {
  if (!listing) return null;
  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", background: "var(--bg)",
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: "10px 18px 26px",
        display: "flex", flexDirection: "column", gap: 14,
        animation: "slideUp .25s ease-out",
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 9999, background: "var(--bd-2)",
          margin: "0 auto 4px",
        }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 9999,
            background: "var(--brand-mid)", color: "var(--brand-deep)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 16,
          }}>{listing.seller.name.replace(/^คุณ/, "").charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>{listing.seller.name}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>ผู้ขาย · ตอบเร็ว</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 9999, border: "none",
            background: "var(--bg-soft)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="x" size={16}/></button>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 14,
          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9999, background: "var(--brand)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="phone" size={18}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--fg-3)" }}>โทร</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>{listing.seller.mobile}</div>
          </div>
          <Icon name="chevRight" size={16} stroke="var(--fg-4)"/>
        </button>
        <button style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 14,
          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9999, background: "#06C755",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          }}><LineIcon size={20} color="#fff"/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--fg-3)" }}>LINE</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>{listing.seller.line}</div>
          </div>
          <Icon name="chevRight" size={16} stroke="var(--fg-4)"/>
        </button>
        <button style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
          background: "var(--bg-soft)", border: "1px solid var(--bd)", borderRadius: 14,
          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9999, background: "var(--bd-2)",
            color: "var(--fg-2)", display: "flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="msgCircle" size={18}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "var(--fg-3)" }}>ส่งข้อความในแอป</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--fg)" }}>แชทกับ {listing.seller.name}</div>
          </div>
          <Icon name="chevRight" size={16} stroke="var(--fg-4)"/>
        </button>
      </div>
    </div>
  );
}

window.Shared = {
  BRAND_PALETTES, CARD_STYLES, buildTheme,
  Screen, ScrollArea, TopBar, IconBtn, Wordmark, TypeBadge, HeartBtn, Photo,
  priceText, priceUnit, CategoryGrid, ContactSheet,
};
