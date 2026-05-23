// v1-classic.jsx — Classic variation
// Bottom 5-tab nav, icon-bubble categories, horizontal featured scroll,
// 2-col latest grid, list/map toggle in browse, sticky bottom contact bar in detail.

const {
  Screen, ScrollArea, TopBar, IconBtn, Wordmark, TypeBadge, HeartBtn, Photo,
  priceText, priceUnit, CategoryGrid, ContactSheet,
} = window.Shared;
const { CATS, LISTINGS, fmtTH, fmtCompact } = window.SengranData;

// ── Bottom 5-tab nav ─────────────────────────────────────────
function BottomTabs({ active, onChange }) {
  const tabs = [
    { id: "home",    name: "home",     label: "หน้าแรก" },
    { id: "browse",  name: "search",   label: "ค้นหา" },
    { id: "post",    name: "plus",     label: "ลงประกาศ", primary: true },
    { id: "saved",   name: "bookmark", label: "บันทึก" },
    { id: "profile", name: "user",     label: "โปรไฟล์" },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
      background: "#171717", borderTop: "1px solid #262626",
      paddingBottom: 6, paddingTop: 6, flexShrink: 0,
    }}>
      {tabs.map(t => {
        const on = active === t.id;
        if (t.primary) {
          return (
            <button key={t.id} onClick={() => onChange(t.id)} style={{
              background: "transparent", border: "none", display: "flex",
              flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer",
              color: "rgba(255,255,255,0.65)", fontFamily: "inherit",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 9999, background: "var(--brand)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginTop: -12, boxShadow: "0 6px 18px rgb(249 115 22 / 0.5)",
              }}>
                <Icon name="plus" size={22}/>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{t.label}</span>
            </button>
          );
        }
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            background: "transparent", border: "none", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer",
            color: on ? "var(--brand)" : "rgba(255,255,255,0.55)", fontFamily: "inherit",
          }}>
            <Icon name={t.name} size={22}/>
            <span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Listing vertical card (grid + horizontal scroll) ────────
function CardV(props) {
  const { listing, onOpen, faved, onFav } = props;
  return (
    <div onClick={onOpen} style={{
      display: "flex", flexDirection: "column",
      background: "var(--surface)", border: "1px solid var(--bd)",
      borderRadius: "var(--card-radius)", boxShadow: "var(--card-shadow)",
      overflow: "hidden", cursor: "pointer",
    }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "var(--image-aspect)" }}>
        <Photo kind={listing.img}/>
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <TypeBadge type={listing.type} featured={listing.featured}/>
        </div>
        <HeartBtn on={faved} onClick={onFav}/>
      </div>
      <div style={{ padding: "var(--card-pad)", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)" }}>{priceText(listing)}</span>
          {priceUnit(listing) && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{priceUnit(listing)}</span>}
        </div>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.35, color: "var(--fg-2)",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{listing.title}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--fg-3)", fontSize: 11 }}>
          <Icon name="mapPin" size={11}/>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {listing.area_label}, {listing.province}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Listing row card (browse list) ──────────────────────────
function CardRow({ listing, onOpen, faved, onFav }) {
  return (
    <div onClick={onOpen} style={{
      display: "flex", gap: 12, padding: 12,
      background: "var(--surface)", border: "1px solid var(--bd)",
      borderRadius: "var(--card-radius)", boxShadow: "var(--card-shadow)",
      cursor: "pointer", alignItems: "stretch",
    }}>
      <div style={{ position: "relative", width: 100, height: 100, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
        <Photo kind={listing.img}/>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TypeBadge type={listing.type} featured={listing.featured}/>
          <span style={{ fontSize: 10, color: "var(--fg-4)", marginLeft: "auto" }}>{listing.posted}</span>
        </div>
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: "var(--fg)",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{listing.title}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--fg-3)", fontSize: 11 }}>
          <Icon name="mapPin" size={11}/>
          <span>{listing.area_label}, {listing.province}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: "auto" }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--brand-strong)" }}>{priceText(listing)}</span>
          {priceUnit(listing) && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{priceUnit(listing)}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end" }}>
        <HeartBtn on={faved} onClick={onFav} floating={false}/>
        <Icon name="chevRight" size={16} stroke="var(--fg-4)"/>
      </div>
    </div>
  );
}

// ── HOME ─────────────────────────────────────────────────────
function HomeV1({ ctx, cats, catMode }) {
  return (
    <Screen theme={ctx.theme}>
      {/* Location header */}
      <div style={{ padding: "10px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--fg-3)" }}>ตำแหน่งปัจจุบัน</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Icon name="mapPin" size={16} stroke="var(--brand)"/>
            <span style={{ fontWeight: 700, fontSize: 16 }}>กรุงเทพมหานคร</span>
            <Icon name="chevDown" size={14} stroke="var(--fg-3)"/>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <IconBtn name="bell" badge={3}/>
          <IconBtn name="msgCircle" badge={1}/>
        </div>
      </div>

      <ScrollArea>
        {/* Search */}
        <div style={{ padding: "12px 16px 4px" }}>
          <div onClick={() => ctx.go("browse")} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--bg-soft)", borderRadius: 12,
            padding: "11px 14px", border: "1px solid var(--bd)", cursor: "pointer",
          }}>
            <Icon name="search" size={18} stroke="var(--fg-3)"/>
            <span style={{ flex: 1, color: "var(--fg-3)", fontSize: 14 }}>ค้นหาร้าน...</span>
            <Icon name="sliders" size={18} stroke="var(--fg-3)"/>
          </div>
        </div>

        {/* Type pills */}
        <div style={{ padding: "10px 16px 4px", display: "flex", gap: 8 }}>
          {[
            { k:"sale", l:"เซ้ง" },
            { k:"rent", l:"ให้เช่า" },
            { k:"both", l:"ทั้งคู่" },
          ].map(({k, l}, i) => (
            <button key={k} onClick={() => ctx.go("browse")} style={{
              flex: 1, padding: "10px 8px", borderRadius: 12,
              background: i === 0 ? "var(--brand-soft)" : "var(--bg-soft)",
              border: i === 0 ? "1px solid var(--brand-mid)" : "1px solid var(--bd)",
              color: i === 0 ? "var(--brand-deep)" : "var(--fg-2)",
              fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            }}>{l}</button>
          ))}
        </div>

        {/* Categories */}
        <Section title="หมวดหมู่" link="ดูทั้งหมด" onLink={() => ctx.go("browse")}>
          <CategoryGrid cats={cats.slice(0, 8)} mode={catMode} onTap={() => ctx.go("browse")}/>
        </Section>

        {/* Featured horizontal */}
        <Section title="ประกาศแนะนำ" link="ดูทั้งหมด" pad={0} onLink={() => ctx.go("browse")}>
          <div style={{
            display: "flex", gap: 12, overflowX: "auto",
            padding: "4px 16px 8px", scrollbarWidth: "none",
          }}>
            {LISTINGS.filter(l => l.featured).concat(LISTINGS.filter(l => !l.featured).slice(0, 2)).map(l => (
              <div key={l.id} style={{ width: 200, flexShrink: 0 }}>
                <CardV listing={l} onOpen={() => ctx.openDetail(l)}
                       faved={ctx.faves.has(l.id)} onFav={() => ctx.toggleFav(l.id)}/>
              </div>
            ))}
          </div>
        </Section>

        {/* Latest grid */}
        <Section title="🆕 ประกาศล่าสุด" link="ดูทั้งหมด" onLink={() => ctx.go("browse")}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
            gap: "var(--card-gap)", padding: "0 16px",
          }}>
            {LISTINGS.slice(0, 4).map(l => (
              <CardV key={l.id} listing={l} onOpen={() => ctx.openDetail(l)}
                     faved={ctx.faves.has(l.id)} onFav={() => ctx.toggleFav(l.id)}/>
            ))}
          </div>
        </Section>

        {/* Free listing banner */}
        <div style={{ padding: "16px 16px 24px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: 16,
            background: "var(--brand-soft)", border: "1px solid var(--brand-mid)", borderRadius: 14,
            cursor: "pointer",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 9999, background: "var(--brand)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon name="plus" size={22}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--brand-deep)" }}>ลงประกาศฟรี!</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 1 }}>เซ้ง / ให้เช่าร้านของคุณ ไม่มีค่าใช้จ่าย</div>
            </div>
            <Icon name="chevRight" size={18} stroke="var(--fg-3)"/>
          </div>
        </div>
      </ScrollArea>

      <BottomTabs active="home" onChange={ctx.go}/>
    </Screen>
  );
}

function Section({ title, link, onLink, children, pad }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        padding: "0 16px", marginBottom: 10,
      }}>
        <h2 style={{ margin: 0, fontWeight: 600, fontSize: 16, color: "var(--fg)" }}>{title}</h2>
        {link && (
          <span onClick={onLink} style={{
            fontSize: 12, color: "var(--brand-strong)", fontWeight: 500, cursor: "pointer",
          }}>{link} ›</span>
        )}
      </div>
      <div style={pad !== undefined ? { padding: pad } : undefined}>{children}</div>
    </div>
  );
}

// ── BROWSE (list + map toggle) ──────────────────────────────
function BrowseV1({ ctx }) {
  const [mapView, setMapView] = React.useState(false);
  return (
    <Screen theme={ctx.theme}>
      <TopBar
        title="ประกาศทั้งหมด"
        subtitle={`พบ ${fmtTH(2847)} รายการ`}
        left={<IconBtn name="chevLeft" onClick={() => ctx.go("home")}/>}
        right={
          <div style={{ display: "flex" }}>
            <IconBtn name={mapView ? "list" : "map"} onClick={() => setMapView(v => !v)}/>
            <IconBtn name="sliders" badge={2}/>
          </div>
        }
      />

      {/* Filter pills */}
      <div style={{
        display: "flex", gap: 6, padding: "10px 16px",
        overflowX: "auto", scrollbarWidth: "none",
        borderBottom: "1px solid var(--bd)", background: "var(--bg)",
        flexShrink: 0,
      }}>
        {[
          { l:"ทั้งหมด", active:true },
          { l:"เซ้ง" }, { l:"ให้เช่า" },
          { l:"กรุงเทพฯ", t:"chevDown" },
          { l:"ร้านอาหาร", t:"chevDown" },
          { l:"฿ ราคา", t:"chevDown" },
        ].map((p, i) => (
          <button key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 9999,
            background: p.active ? "var(--brand)" : "var(--surface)",
            color: p.active ? "#fff" : "var(--fg-2)",
            border: p.active ? "1px solid var(--brand)" : "1px solid var(--bd)",
            fontSize: 12.5, fontWeight: p.active ? 600 : 500,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
          }}>
            {p.l}
            {p.t && <Icon name={p.t} size={12}/>}
          </button>
        ))}
      </div>

      {mapView ? <MapPanel ctx={ctx}/> : (
        <ScrollArea style={{ background: "var(--bg-soft)" }}>
          <div style={{
            padding: "12px 16px 24px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {LISTINGS.map(l => (
              <CardRow key={l.id} listing={l} onOpen={() => ctx.openDetail(l)}
                       faved={ctx.faves.has(l.id)} onFav={() => ctx.toggleFav(l.id)}/>
            ))}
          </div>
        </ScrollArea>
      )}

      <BottomTabs active="browse" onChange={ctx.go}/>
    </Screen>
  );
}

// ── Map panel (used inside Browse when toggle on) ───────────
function MapPanel({ ctx }) {
  const [selected, setSelected] = React.useState(LISTINGS[2]);
  const pins = [
    { ...LISTINGS[0], x: 30, y: 22 },
    { ...LISTINGS[1], x: 60, y: 18 },
    { ...LISTINGS[2], x: 72, y: 42, active: true },
    { ...LISTINGS[3], x: 40, y: 52 },
    { ...LISTINGS[5], x: 22, y: 70 },
    { __cluster: true, __count: 3, x: 82, y: 70 },
    { __cluster: true, __count: 5, x: 50, y: 36 },
  ];
  return (
    <div style={{ position: "relative", flex: 1, background: "#e8eef3", overflow: "hidden" }}>
      <FakeMap/>
      {pins.map((p, i) => (
        <div key={i} onClick={() => !p.__cluster && setSelected(p)} style={{
          position: "absolute", top: `${p.y}%`, left: `${p.x}%`, transform: "translate(-50%, -50%)",
          cursor: "pointer",
        }}>
          <MapPin pin={p} active={selected?.id === p.id}/>
        </div>
      ))}

      {/* Bottom preview card */}
      {selected && (
        <div onClick={() => ctx.openDetail(selected)} style={{
          position: "absolute", left: 12, right: 12, bottom: 14,
          background: "var(--bg)", borderRadius: 16, padding: 12,
          display: "flex", gap: 10, alignItems: "center",
          boxShadow: "0 8px 24px rgb(0 0 0 / 0.18)", cursor: "pointer",
        }}>
          <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
            <Photo kind={selected.img}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 4 }}><TypeBadge type={selected.type}/></div>
            <p style={{
              margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: "var(--fg)",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{selected.title}</p>
            <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: "var(--brand-strong)" }}>{priceText(selected)}</div>
          </div>
          <Icon name="chevRight" size={18} stroke="var(--fg-3)"/>
        </div>
      )}
    </div>
  );
}

function MapPin({ pin, active }) {
  if (pin.__cluster) {
    return (
      <div style={{
        background: "#3b82f6", color: "#fff", border: "2px solid #fff",
        width: 32, height: 32, borderRadius: 9999,
        fontWeight: 700, fontSize: 13,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 4px rgb(0 0 0 / 0.2)",
      }}>{pin.__count}</div>
    );
  }
  const price = pin.type === "rent" ? pin.rent_price : (pin.sale_price || pin.rent_price);
  return (
    <div style={{
      position: "relative", padding: "3px 10px",
      background: active ? "var(--brand-strong)" : "var(--brand)",
      color: "#fff", border: "1.5px solid #fff", borderRadius: 6,
      fontWeight: 700, fontSize: 12, whiteSpace: "nowrap",
      boxShadow: "0 2px 4px rgb(0 0 0 / 0.25)",
      transform: active ? "scale(1.15)" : "scale(1)", transition: "transform .15s",
    }}>
      ฿{fmtCompact(price)}
      <span style={{
        position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)",
        width: 8, height: 8, background: "inherit", border: "1.5px solid #fff", borderTop: 0, borderLeft: 0,
      }}/>
    </div>
  );
}

function FakeMap() {
  return (
    <svg viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice"
         style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <rect width="400" height="700" fill="#e8eef3"/>
      <rect x="40" y="60" width="120" height="80" rx="12" fill="#d4e8d0"/>
      <rect x="240" y="380" width="140" height="100" rx="14" fill="#d4e8d0"/>
      <path d="M 0 480 Q 80 460 160 490 T 320 470 L 400 460 L 400 700 L 0 700 Z" fill="#cfe2ef"/>
      <line x1="0" y1="200" x2="400" y2="220" stroke="#fff" strokeWidth="14"/>
      <line x1="0" y1="200" x2="400" y2="220" stroke="#f9d49a" strokeWidth="3"/>
      <line x1="120" y1="0" x2="160" y2="700" stroke="#fff" strokeWidth="12"/>
      <line x1="120" y1="0" x2="160" y2="700" stroke="#f9d49a" strokeWidth="2.5"/>
      <line x1="0" y1="380" x2="400" y2="360" stroke="#fff" strokeWidth="10"/>
      <g stroke="#fff" strokeWidth="5" opacity="0.9">
        <line x1="0" y1="100" x2="400" y2="120"/>
        <line x1="0" y1="280" x2="400" y2="300"/>
        <line x1="0" y1="560" x2="400" y2="540"/>
        <line x1="60" y1="0" x2="80" y2="700"/>
        <line x1="280" y1="0" x2="300" y2="700"/>
        <line x1="220" y1="0" x2="240" y2="700"/>
      </g>
      <text x="80" y="156" fontSize="11" fontWeight="600" fill="#7a8a99" fontFamily="Sarabun, sans-serif">สีลม</text>
      <text x="280" y="430" fontSize="11" fontWeight="600" fill="#7a8a99" fontFamily="Sarabun, sans-serif">ลุมพินี</text>
      <text x="180" y="600" fontSize="12" fontWeight="700" fill="#5b6b7a" fontFamily="Sarabun, sans-serif">แม่น้ำเจ้าพระยา</text>
    </svg>
  );
}

// ── DETAIL ───────────────────────────────────────────────────
function DetailV1({ ctx, listing }) {
  const sellerInit = listing.seller.name.replace(/^คุณ/, "").charAt(0);
  return (
    <Screen theme={ctx.theme}>
      <ScrollArea style={{ position: "relative" }}>
        {/* Hero */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#000" }}>
          <Photo kind={listing.img}/>
          <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => ctx.back()} style={floatRound()}><Icon name="chevLeft" size={20}/></button>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={floatRound()}><Icon name="share" size={18}/></button>
              <button onClick={() => ctx.toggleFav(listing.id)} style={{
                ...floatRound(), color: ctx.faves.has(listing.id) ? "#ef4444" : "#171717",
              }}>
                <Icon name="heart" size={18} fill={ctx.faves.has(listing.id) ? "currentColor" : "none"}
                      strokeWidth={ctx.faves.has(listing.id) ? 0 : 2}/>
              </button>
            </div>
          </div>
          <div style={{
            position: "absolute", bottom: 12, right: 12,
            padding: "3px 10px", borderRadius: 9999,
            background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 500,
          }}>1 / 8</div>
        </div>

        {/* Title + badges */}
        <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <TypeBadge type={listing.type}/>
            <span style={{
              padding: "2px 9px", borderRadius: 9999, fontSize: 11, fontWeight: 500,
              background: "var(--bg-soft)", color: "var(--fg-2)", border: "1px solid var(--bd)",
            }}>{listing.category}</span>
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: 19, fontWeight: 700, lineHeight: 1.3 }}>{listing.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--fg-3)", fontSize: 12.5 }}>
            <Icon name="mapPin" size={13}/>
            <span>{listing.district}, {listing.province}</span>
          </div>
        </div>

        {/* Price block */}
        <div style={{ padding: "0 16px", marginTop: 14 }}>
          <div style={{
            padding: 16, borderRadius: 14,
            background: "var(--brand-soft)", border: "1px solid var(--brand-mid)",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            {listing.sale_price && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="store" size={16} stroke="var(--brand)"/>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--brand-deep)" }}>
                  ราคาเซ้ง: {fmtTH(listing.sale_price)} บาท
                </span>
              </div>
            )}
            {listing.rent_price && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="layers" size={16} stroke="var(--brand)"/>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--brand-deep)" }}>
                  ค่าเช่า: {fmtTH(listing.rent_price)} บาท/เดือน
                </span>
              </div>
            )}
            {listing.deposit && (listing.type === "rent" || listing.type === "both") && (
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-2)" }}>มัดจำ {listing.deposit} เดือน</p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "flex", gap: 18, padding: "14px 16px", color: "var(--fg-3)", fontSize: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="eye" size={13}/> {fmtTH(listing.views)} ครั้ง
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="clock" size={13}/> {listing.posted}
          </span>
        </div>

        <div style={{ height: 1, background: "var(--bd)", margin: "0 16px" }}/>

        {/* Description */}
        <div style={{ padding: 16 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600 }}>รายละเอียด</h2>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "var(--fg-2)" }}>
            ทำเลทอง ใกล้ BTS คนเดินผ่านเฉลี่ย 8,000 คน/วัน อุปกรณ์ครบทั้งเครื่องชง 2 หัว เครื่องบด ตู้แช่ ที่นั่ง 14 ที่ ลูกค้าประจำเยอะ ยอดเฉลี่ย 3,500–4,500 บาท/วัน สัญญาเช่าเหลือ 4 ปี เจ้าของเซ้งเพราะย้ายต่างจังหวัด
          </p>
        </div>

        {/* Amenities */}
        <div style={{ padding: "0 16px 14px" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600 }}>สิ่งอำนวยความสะดวก</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {["มีแอร์", "ที่จอดรถ", "Wi-Fi", "ห้องน้ำในร้าน", "ใกล้ BTS", "ป้ายติดตั้งใหม่"].map(a => (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-2)" }}>
                <Icon name="check" size={14} stroke="var(--brand)"/>
                {a}
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "var(--bd)", margin: "0 16px" }}/>

        {/* Seller card */}
        <div style={{ padding: 16 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600 }}>ผู้ขาย</h2>
          <div style={{
            padding: 14, borderRadius: 14, background: "var(--surface)",
            border: "1px solid var(--bd)", display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 9999,
              background: "var(--brand-mid)", color: "var(--brand-deep)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 18,
            }}>{sellerInit}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{listing.seller.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 1 }}>LINE: {listing.seller.line}</div>
            </div>
            <Icon name="chevRight" size={18} stroke="var(--fg-3)"/>
          </div>
        </div>

        <div style={{ height: 110 }}/>
      </ScrollArea>

      {/* Sticky contact bar */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: "var(--safe-bottom)",
        borderTop: "1px solid var(--bd)", background: "var(--bg)",
        padding: "10px 14px 14px", display: "flex", gap: 8,
        boxShadow: "0 -4px 16px rgb(0 0 0 / 0.06)",
      }}>
        <button onClick={() => ctx.openContact(listing)} style={contactBtn("var(--brand)", "#fff")}>
          <Icon name="phone" size={16}/> โทร
        </button>
        <button onClick={() => ctx.openContact(listing)} style={contactBtn("#06C755", "#fff")}>
          <LineIcon size={16} color="#fff"/> LINE
        </button>
        <button onClick={() => ctx.openContact(listing)} style={contactBtn("var(--surface)", "var(--fg-2)", "1px solid var(--bd-2)")}>
          <Icon name="msgCircle" size={16}/> ข้อความ
        </button>
      </div>
    </Screen>
  );
}

function floatRound() {
  return {
    width: 36, height: 36, borderRadius: 9999,
    background: "rgba(255,255,255,0.92)", color: "#171717", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
    boxShadow: "0 2px 4px rgb(0 0 0 / 0.15)",
    backdropFilter: "saturate(180%) blur(2px)",
  };
}
function contactBtn(bg, color, border) {
  return {
    flex: 1, padding: "12px 8px", borderRadius: 12, background: bg, color,
    border: border || "none",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  };
}

// ── SAVED ───────────────────────────────────────────────────
function SavedV1({ ctx }) {
  const faved = LISTINGS.filter(l => ctx.faves.has(l.id));
  const list = faved.length ? faved : LISTINGS.slice(0, 3);
  return (
    <Screen theme={ctx.theme}>
      <TopBar title="ประกาศที่บันทึก" subtitle={`${list.length} รายการ`}/>
      <div style={{
        display: "flex", padding: "0 16px",
        borderBottom: "1px solid var(--bd)", gap: 24, background: "var(--bg)",
      }}>
        {[["ทั้งหมด", list.length, true], ["เซ้ง", 0, false], ["ให้เช่า", 0, false]].map(([l, n, on]) => (
          <button key={l} style={{
            background: "transparent", border: "none", padding: "12px 0",
            fontSize: 14, fontWeight: on ? 600 : 500,
            color: on ? "var(--brand-strong)" : "var(--fg-3)",
            borderBottom: on ? "2px solid var(--brand)" : "2px solid transparent",
            display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit",
          }}>{l}<span style={{ fontSize: 11, color: "var(--fg-4)" }}>{n}</span></button>
        ))}
      </div>
      <ScrollArea style={{ background: "var(--bg-soft)" }}>
        <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(l => (
            <CardRow key={l.id} listing={l} onOpen={() => ctx.openDetail(l)}
                     faved onFav={() => ctx.toggleFav(l.id)}/>
          ))}
        </div>
      </ScrollArea>
      <BottomTabs active="saved" onChange={ctx.go}/>
    </Screen>
  );
}

// ── PROFILE ─────────────────────────────────────────────────
function ProfileV1({ ctx }) {
  return (
    <Screen theme={ctx.theme}>
      <TopBar title="โปรไฟล์"/>
      <ScrollArea>
        <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 9999,
            background: "var(--brand-mid)", color: "var(--brand-deep)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 24,
          }}>ก</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>คุณกอล์ฟ ทดสอบ</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)" }}>สมาชิกตั้งแต่ 2566 · LINE: @golf-test</div>
          </div>
          <button style={{
            padding: "6px 12px", borderRadius: 9999,
            background: "var(--bg-soft)", border: "1px solid var(--bd)",
            fontSize: 12, color: "var(--fg-2)", cursor: "pointer", fontFamily: "inherit",
          }}>แก้ไข</button>
        </div>

        {/* Stat strip */}
        <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[["ประกาศ", 4], ["ดู", "1.2K"], ["บันทึก", ctx.faves.size]].map(([l, n]) => (
            <div key={l} style={{
              padding: 12, borderRadius: 12, background: "var(--bg-soft)",
              border: "1px solid var(--bd)", textAlign: "center",
            }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{n}</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)" }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "20px 16px 4px" }}>
          <div style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>บัญชี</div>
        </div>
        {[
          ["plus", "ประกาศของฉัน", "4 รายการ"],
          ["bookmark", "ที่บันทึกไว้", `${ctx.faves.size} รายการ`],
          ["bell", "การแจ้งเตือน", "เปิด"],
          ["settings", "ตั้งค่าบัญชี", null],
          ["logout", "ออกจากระบบ", null],
        ].map(([ic, t, sub], i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
            borderTop: "1px solid var(--bd)", cursor: "pointer",
          }}>
            <Icon name={ic} size={18} stroke="var(--fg-2)"/>
            <span style={{ flex: 1, fontSize: 14, color: "var(--fg)" }}>{t}</span>
            {sub && <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{sub}</span>}
            <Icon name="chevRight" size={16} stroke="var(--fg-4)"/>
          </div>
        ))}
        <div style={{ height: 40 }}/>
      </ScrollArea>
      <BottomTabs active="profile" onChange={ctx.go}/>
    </Screen>
  );
}

window.V1 = { HomeV1, BrowseV1, DetailV1, SavedV1, ProfileV1 };
