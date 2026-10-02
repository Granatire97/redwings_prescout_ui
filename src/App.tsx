import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Download,
  Gauge,
  Goal,
  LayoutDashboard,
  Search,
  Shield,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HalfRink, NetFront } from "./components/Rinks";
import { mph, pct, rank, signed, toi } from "./lib/format";
import type {
  Confidence,
  GmPlayer,
  PrescoutData,
  Stat,
  SummaryData,
} from "./types/prescout";

type Mode = "coach" | "gm";
type CoachPage = "summary" | "specialTeams" | "faceoffs" | "goalie" | "gameState" | "playerTargets";
type GmPage = "gmSummary" | "players";
type Page = CoachPage | GmPage;

const coachNav: Array<{ id: CoachPage; label: string; icon: typeof Activity }> = [
  { id: "summary", label: "Game Summary", icon: LayoutDashboard },
  { id: "specialTeams", label: "Special Teams", icon: Shield },
  { id: "faceoffs", label: "Faceoffs", icon: CircleDot },
  { id: "goalie", label: "Goalie", icon: Goal },
  { id: "gameState", label: "Game State", icon: Activity },
  { id: "playerTargets", label: "Player Targets", icon: Target },
];

const gmNav: Array<{ id: GmPage; label: string; icon: typeof Activity }> = [
  { id: "gmSummary", label: "GM Summary", icon: BarChart3 },
  { id: "players", label: "Player Evaluation", icon: Users },
];

function Button({
  children,
  className = "",
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button type="button" className={className} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="search-input"
    />
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className={`confidence confidence-${confidence}`}>{confidence}</span>;
}

function StatMeta<T>({ stat }: { stat: Stat<T> }) {
  return (
    <span className="stat-meta">
      <span>n={stat.sampleSize}</span>
      <ConfidenceBadge confidence={stat.confidence} />
      {stat.isEstimate && <span className="estimate">Estimate</span>}
    </span>
  );
}

function StatValue<T>({
  stat,
  className = "",
  format,
}: {
  stat: Stat<T>;
  className?: string;
  format?: (value: T) => ReactNode;
}) {
  return (
    <span className={`stat-value ${className}`}>
      <span>{format ? format(stat.value) : String(stat.value)}</span>
      <StatMeta stat={stat} />
    </span>
  );
}

function FactValue({
  value,
  className = "",
  format,
  isEstimate,
}: {
  value: number | string | boolean;
  className?: string;
  format?: (value: number) => ReactNode;
  isEstimate?: boolean;
}) {
  return (
    <span className={`stat-value ${className}`}>
      <span>{format && typeof value === "number" ? format(value) : String(value)}</span>
      {isEstimate && <span className="stat-meta"><span className="estimate">Estimate</span></span>}
    </span>
  );
}

function Card({
  children,
  className = "",
  title,
  eyebrow,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || eyebrow || action) && (
        <div className="card-header">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <div className="card-title">{title}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow red">{eyebrow}</div>
        <div className="page-title">{title}</div>
        <div className="page-description">{description}</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <ClipboardList size={26} />
      <div className="empty-title">Data not available yet</div>
      <div className="empty-copy">This section will populate after the next data refresh.</div>
    </div>
  );
}

function VideoFooter({ items }: { items: string[] }) {
  return (
    <footer className="video-footer">
      <div className="video-label"><CircleDot size={14} /> Check video for:</div>
      {items.map((item) => <span key={item}>{item}</span>)}
    </footer>
  );
}

function TrendIcon({ value }: { value: "up" | "down" | "flat" }) {
  if (value === "up") return <ArrowUp className="trend-up" size={13} />;
  if (value === "down") return <ArrowDown className="trend-down" size={13} />;
  return <ArrowRight className="trend-flat" size={13} />;
}

function PlayerPill({ player }: { player: SummaryData["forwardLines"][number][number] }) {
  const difference = player.toiLast5 - player.toiSeason;
  const trend = difference > 30 ? "up" : difference < -30 ? "down" : "flat";
  return (
    <div className="lineup-player">
      <span className="position">{player.player.position}</span>
      <span className="player-name">{player.player.name}</span>
      <span className="toi">
        {toi(player.toiSeason)}
        <TrendIcon value={trend} />
      </span>
    </div>
  );
}

function CoachSummary({ data }: { data: PrescoutData["coach"]["summary"] }) {
  if (!data) return <EmptyState />;
  const quickStats = [
    { label: "Record", value: `${data.record.wins}–${data.record.losses}–${data.record.otLosses}` },
    { label: "Last 10", value: `${data.lastTen.wins}–${data.lastTen.losses}–${data.lastTen.otLosses}` },
    { label: "Rest", value: `${data.restDays} day` },
    { label: "Back-to-back", value: data.backToBack ? "Yes" : "No" },
  ];
  return (
    <div className="summary-screen">
      <div className="quick-strip">
        {quickStats.map((item) => (
          <div className="quick-stat" key={item.label}>
            <span className="quick-label">{item.label}</span>
            <FactValue value={item.value} className="quick-value" />
          </div>
        ))}
        <div className="quick-stat special">
          <span className="quick-label">Power play</span>
          <div className="rank-row"><StatValue stat={data.powerPlay} className="quick-value" format={pct} /><span>{rank(data.powerPlayRank)}</span></div>
        </div>
        <div className="quick-stat special">
          <span className="quick-label">Penalty kill</span>
          <div className="rank-row"><StatValue stat={data.penaltyKill} className="quick-value" format={pct} /><span>{rank(data.penaltyKillRank)}</span></div>
        </div>
      </div>

      <div className="summary-main">
        <Card title="Keys to the game" eyebrow="Two-minute brief" className="keys-card">
          <div className="keys-grid">
            {data.keys.map((key, index) => (
              <div className="key-item" key={key.title}>
                <span className="key-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="key-copy">
                  <div className="key-title">{key.title}</div>
                  <div className="key-insight">{key.insight}</div>
                </div>
                <StatValue stat={key.stat} className="key-stat" format={pct} />
              </div>
            ))}
          </div>
        </Card>

        <div className="summary-right">
          <Card title="Likely starter" eyebrow="In net">
            <div className="goalie-row">
              <div className="goalie-mark"><Goal size={23} /></div>
              <div>
                <div className="goalie-name">{data.goalie.player.name}</div>
                <FactValue value={data.goalie.startConfidence} className="starter-status" isEstimate={data.goalie.isEstimate} />
              </div>
            </div>
            <div className="goalie-stats">
              <div><span>Season SV%</span><StatValue stat={data.goalie.savePct} format={(value) => value.toFixed(3)} /></div>
              <div><span>Last 10 SV%</span><StatValue stat={data.goalie.lastTenSavePct} format={(value) => value.toFixed(3)} /></div>
            </div>
          </Card>
          <Card title="Projected lineup" eyebrow="Latest combinations" className="lineup-card">
            <div className="lineup-columns">
              <div>
                <div className="subheading">Forwards</div>
                {data.forwardLines.map((line, index) => (
                  <div className="line-row" key={`F${index}`}>
                    <span className="line-number">F{index + 1}</span>
                    {line.map((player) => <PlayerPill key={player.player.playerId} player={player} />)}
                  </div>
                ))}
              </div>
              <div>
                <div className="subheading">Defense</div>
                {data.defensePairs.map((pair, index) => (
                  <div className="line-row defense" key={`D${index}`}>
                    <span className="line-number">D{index + 1}</span>
                    {pair.map((player) => <PlayerPill key={player.player.playerId} player={player} />)}
                  </div>
                ))}
                <div className="trend-legend">
                  <span><ArrowUp size={12} /> TOI up</span>
                  <span><ArrowRight size={12} /> Flat</span>
                  <span><ArrowDown size={12} /> Down</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <VideoFooter items={data.videoChecks} />
    </div>
  );
}

function SpecialTeamsPage({ data }: { data: PrescoutData["coach"]["specialTeams"] }) {
  if (!data) return <EmptyState />;
  return (
    <>
      <PageHeader eyebrow="Coach report" title="Special Teams" description="Personnel, shot creation and penalty tendencies." />
      <div className="dashboard-grid two-one">
        <div className="stack">
          {data.powerPlayUnits.map((unit) => (
            <Card title={unit.name} eyebrow="Projected personnel" key={unit.name}>
              <div className="unit-row">
                {unit.players.map((player, index) => (
                  <div className="unit-player" key={player.playerId}><span>{index + 1}</span>{player.name}</div>
                ))}
              </div>
            </Card>
          ))}
          <Card title="Penalty profile" eyebrow="Taken vs drawn">
            <div className="data-table">
              <div className="table-row table-head"><span>Player</span><span>Taken</span><span>Drawn</span><span>Most likely</span></div>
              {data.penalties.map((row) => (
                <div className="table-row" key={row.player.playerId}>
                  <strong>{row.player.name}</strong>
                  <FactValue value={row.taken} />
                  <FactValue value={row.drawn} />
                  <FactValue value={Object.entries(row.byPeriod).sort((a, b) => b[1] - a[1])[0][0].toUpperCase()} />
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="stack">
          <Card title="Power-play shot map" eyebrow="Dot size = xG">
            <HalfRink points={data.shotMap} className="rink-chart" />
          </Card>
          <Card title="PK zone time" eyebrow="Average per opposition entry">
            <div className="comparison-stat">
              <div><span>Ottawa</span><StatValue stat={data.zoneTimePct} className="hero-stat" format={pct} /></div>
              <div><span>League</span><StatValue stat={data.leagueZoneTimePct} className="hero-stat muted" format={pct} /></div>
            </div>
          </Card>
        </div>
      </div>
      <VideoFooter items={data.videoChecks} />
    </>
  );
}

function FaceoffsPage({ data }: { data: PrescoutData["coach"]["faceoffs"] }) {
  if (!data) return <EmptyState />;
  const matrixRows = data.centers.map((center) => ({
    player: center.player,
    values: data.detroitCenters.map((detroit) =>
      data.matchupMatrix.find(
        (matchup) =>
          matchup.opponentPlayerId === center.player.playerId &&
          matchup.detroitPlayerId === detroit.playerId,
      ),
    ),
  }));
  return (
    <>
      <PageHeader eyebrow="Coach report" title="Faceoffs" description="Zone, strength and head-to-head matchup tendencies." />
      <div className="dashboard-grid">
        <Card title="Ottawa centers" eyebrow="Win percentage by situation" className="span-2">
          <div className="data-table centers">
            <div className="table-row table-head"><span>Center</span><span>Overall</span><span>OZ</span><span>NZ</span><span>DZ</span><span>5v5</span><span>PP</span><span>PK</span></div>
            {data.centers.map((center) => (
              <div className="table-row" key={center.player.playerId}>
                <strong>{center.player.name}</strong>
                {[center.overall, center.offensiveZone, center.neutralZone, center.defensiveZone, center.evenStrength, center.powerPlay, center.penaltyKill].map((stat, index) => <StatValue stat={stat} format={pct} key={index} />)}
              </div>
            ))}
          </div>
        </Card>
        <Card title="OZ win → shot attempt" eyebrow="Within 10 seconds">
          <StatValue stat={data.postWinShotAttempts} className="standalone-stat" format={pct} />
          <div className="callout-copy">Ottawa creates immediate offense on nearly one in three offensive-zone wins.</div>
        </Card>
        <Card title="Matchup matrix" eyebrow="Ottawa win percentage" className="span-3">
          <div className="matrix">
            <div className="matrix-row matrix-head"><span>Ottawa \\ Detroit</span>{data.detroitCenters.map((player) => <span key={player.playerId}>{player.name}</span>)}</div>
            {matrixRows.map((row) => (
              <div className="matrix-row" key={row.player.playerId}>
                <strong>{row.player.name}</strong>
                {row.values.map((matchup, index) => matchup ? <StatValue stat={matchup.winPct} format={pct} key={index} /> : <span key={index}>—</span>)}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <VideoFooter items={data.videoChecks} />
    </>
  );
}

function GoaliePage({ data }: { data: PrescoutData["coach"]["goalie"] }) {
  if (!data) return <EmptyState />;
  return (
    <>
      <PageHeader eyebrow="Coach report" title={data.player.name} description="Save profile, recent form and shot-type performance." />
      <div className="dashboard-grid goalie-grid">
        <Card title="Save percentage by zone" eyebrow="Season" className="net-card">
          <NetFront zones={data.zones.map((zone) => ({ zoneId: zone.zoneId, value: zone.savePct.value.toFixed(3) }))} className="net-chart" />
          <div className="zone-meta">{data.zones.map((zone) => <div key={zone.zoneId}><span>{zone.zoneId.replace(/_/g, " ")}</span><StatMeta stat={zone.savePct} /></div>)}</div>
        </Card>
        <Card title="Last 10 starts" eyebrow="Game-by-game save percentage" className="span-2">
          <div className="line-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.lastTen.map((point) => ({ label: point.label, value: point.value.value }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 0.01", "dataMax + 0.01"]} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--panel-strong)", border: "1px solid var(--line)", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="value" stroke="var(--red)" strokeWidth={3} dot={{ fill: "var(--red)", strokeWidth: 0, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Save percentage by shot type" eyebrow="Shot classification" className="span-3">
          <div className="shot-type-grid">
            {data.shotTypes.map((item) => <div key={item.type}><span>{item.type}</span><StatValue stat={item.savePct} format={(value) => value.toFixed(3)} /></div>)}
          </div>
        </Card>
      </div>
      <VideoFooter items={data.videoChecks} />
    </>
  );
}

function GameStatePage({ data }: { data: PrescoutData["coach"]["gameState"] }) {
  if (!data) return <EmptyState />;
  const shotChart = data.shotRates.map((item) => ({ state: item.state, for: item.for.value, against: item.against.value }));
  const goalChart = data.goalsByPeriod.map((item) => ({ period: item.period, for: item.for, against: item.against }));
  return (
    <>
      <PageHeader eyebrow="Coach report" title="Game State" description="How Ottawa's behavior changes with the score and clock." />
      <div className="dashboard-grid">
        <Card title="Shot rates by score state" eyebrow="Attempts per 60" className="span-2">
          <div className="bar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shotChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="state" tick={{ fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--panel-strong)", border: "1px solid var(--line)", borderRadius: "8px" }} />
                <Bar dataKey="for" fill="var(--red)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="against" fill="var(--slate)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-meta">{data.shotRates.map((row) => <span key={row.state}>{row.state}: <StatMeta stat={row.for} /> <StatMeta stat={row.against} /></span>)}</div>
        </Card>
        <Card title="Empty-net pull" eyebrow="Median trigger">
          <FactValue value={data.emptyNetPull} className="standalone-stat compact" format={toi} />
          <div className="benchmark"><span>League benchmark</span><FactValue value={data.leagueEmptyNetPull} format={toi} /></div>
        </Card>
        <Card title="Goals by period" eyebrow="For vs against" className="span-3">
          <div className="goals-layout">
            <div className="bar-chart short">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
                  <XAxis type="number" tick={{ fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="period" tick={{ fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Bar dataKey="for" fill="var(--red)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="against" fill="var(--slate)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="period-meta">{data.goalsByPeriod.map((row) => <div key={row.period}><strong>{row.period}</strong><FactValue value={row.for} /><FactValue value={row.against} /></div>)}</div>
          </div>
        </Card>
      </div>
      <VideoFooter items={data.videoChecks} />
    </>
  );
}

function PlayerTargetsPage({ data }: { data: PrescoutData["coach"]["playerTargets"] }) {
  if (!data) return <EmptyState />;
  return (
    <>
      <PageHeader eyebrow="Coach report" title="Player Targets" description="Clear, actionable matchups for the room." />
      <div className="target-columns">
        <Card title="Pressure these players" eyebrow="Turnover-prone defensemen">
          <div className="target-list">
            {data.pressure.map((player, index) => (
              <div className="target-row" key={player.player.playerId}>
                <div className="target-number">{index + 1}</div>
                <div className="target-copy"><div><strong>{player.player.name}</strong><span>{player.player.position}</span></div><p>{player.forecheckNote}</p></div>
                <div className="target-stat"><span>Giveaways</span><FactValue value={player.giveaways} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Watch these players" eyebrow="Speed and shooting threats">
          <div className="target-list">
            {data.watch.map((player, index) => (
              <div className="target-row" key={player.player.playerId}>
                <div className="target-number danger">{index + 1}</div>
                <div className="target-copy"><div><strong>{player.player.name}</strong><span>{player.player.position}</span></div><p>{player.threatNote}</p></div>
                <div className="dual-target-stat"><div><span>Top speed</span><FactValue value={player.topSpeed} format={mph} /></div><div><span>Shot speed</span><FactValue value={player.shotSpeed} format={mph} /></div></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <VideoFooter items={data.videoChecks} />
    </>
  );
}

function GmSummaryPage({ data }: { data: PrescoutData["gm"] }) {
  const summary = data.summary;
  if (!summary && !data.rosterChanges && !data.standings && !data.headToHead) return <EmptyState />;
  return (
    <>
      <PageHeader eyebrow="Front office report" title="GM Summary" description="Sustainability, roster context and the playoff picture." />
      <div className="gm-layout">
        <Card title="Is this team for real?" eyebrow="Performance vs expected" className="span-2">
          {summary ? (
            <div className="sustainability">
              <div className="sustain-pair"><span>Shooting</span><StatValue stat={summary.sustainability.shootingPct} className="hero-stat" format={pct} /><div>Expected <StatValue stat={summary.sustainability.expectedShootingPct} format={pct} /></div></div>
              <div className="sustain-pair"><span>Save percentage</span><StatValue stat={summary.sustainability.savePct} className="hero-stat" format={(value) => value.toFixed(3)} /><div>Expected <StatValue stat={summary.sustainability.expectedSavePct} format={(value) => value.toFixed(3)} /></div></div>
              <div className="sustain-pair"><span>PDO</span><StatValue stat={summary.sustainability.pdo} className="hero-stat" format={(value) => (value * 100).toFixed(1)} /><div>Expected <StatValue stat={summary.sustainability.expectedPdo} format={(value) => (value * 100).toFixed(1)} /></div></div>
              <div className="regression-box"><TrendingUp size={20} /><div><span>Regression outlook</span><FactValue value={summary.sustainability.regressionFlag} /></div></div>
            </div>
          ) : <EmptyState />}
        </Card>
        <Card title="Standings impact" eyebrow="Today">
          {data.standings ? (
            <><div className="standings-numbers"><div><span>Points pace</span><FactValue value={data.standings.pointsPace} className="standalone-stat compact" isEstimate={data.standings.pointsPaceIsEstimate} /></div><div><span>Playoff line</span><FactValue value={data.standings.playoffGap} className="standalone-stat compact" format={(value) => signed(value, " points")} /></div></div><div className="meaning"><strong>For Ottawa</strong><p>{data.standings.opponentMeaning}</p><strong>For Detroit</strong><p>{data.standings.detroitMeaning}</p></div></>
          ) : <EmptyState />}
        </Card>
        <Card title="Last five games: roster movement" eyebrow="Availability signals" className="span-2">
          {data.rosterChanges ? (
            <div className="timeline">{data.rosterChanges.changes.map((change) => <div className="timeline-row" key={`${change.date}-${change.player.playerId}`}><span className="timeline-date">{change.date}</span><span className="timeline-dot" /><div><strong>{change.player.name}</strong><span>{change.change}</span><p>{change.detail}</p></div><FactValue value={change.status} isEstimate={change.isEstimate} /></div>)}</div>
          ) : <EmptyState />}
        </Card>
        <Card title="Head-to-head" eyebrow="Recent meetings">
          {data.headToHead ? (
            <div className="meetings">{data.headToHead.meetings.map((meeting) => <div className="meeting" key={`${meeting.season}-${meeting.date}`}><div><span>{meeting.season} · {meeting.date}</span><strong>{meeting.result}</strong></div><div><span>Shots</span><FactValue value={`${meeting.shots.opponent}–${meeting.shots.detroit} OTT`} /></div><div><span>xG</span><FactValue value={`${meeting.expectedGoals.opponent.toFixed(1)}–${meeting.expectedGoals.detroit.toFixed(1)} OTT`} isEstimate={meeting.expectedGoals.isEstimate} /></div><div><span>Special teams</span><FactValue value={`OTT ${meeting.specialTeams.opponentGoals}/${meeting.specialTeams.opponentOpportunities} · DET ${meeting.specialTeams.detroitGoals}/${meeting.specialTeams.detroitOpportunities}`} /></div></div>)}</div>
          ) : <EmptyState />}
        </Card>
      </div>
      {summary && <VideoFooter items={summary.videoChecks} />}
    </>
  );
}

function PlayerEvaluationPage({ players }: { players: PrescoutData["gm"]["players"] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "position" | "age">("name");
  const [selectedId, setSelectedId] = useState<number | null>(players?.[0]?.player.playerId ?? null);
  const [watchList, setWatchList] = useState<number[]>([]);
  const filtered = useMemo(() => {
    if (!players) return [];
    return players
      .filter((item) => item.player.name.toLowerCase().includes(query.toLowerCase()) || item.player.position.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => sortKey === "age" ? a.age - b.age : a.player[sortKey].localeCompare(b.player[sortKey]));
  }, [players, query, sortKey]);
  const selected = players?.find((item) => item.player.playerId === selectedId) ?? filtered[0];

  if (!players) return <EmptyState />;
  return (
    <>
      <PageHeader eyebrow="Front office report" title="Player Evaluation" description="Opponent personnel profiles and live scouting notes." />
      <div className="player-eval">
        <Card className="player-list-card">
          <div className="search-box"><Search size={16} /><TextInput value={query} onChange={setQuery} placeholder="Search players" />{query && <Button ariaLabel="Clear search" onClick={() => setQuery("")}><X size={15} /></Button>}</div>
          <div className="sort-row"><span>Sort by</span>{(["name", "position", "age"] as const).map((key) => <Button key={key} onClick={() => setSortKey(key)} className={sortKey === key ? "active" : ""}>{key}</Button>)}</div>
          <div className="player-list">
            {filtered.map((player) => (
              <Button key={player.player.playerId} onClick={() => setSelectedId(player.player.playerId)} className={`player-list-item ${selected?.player.playerId === player.player.playerId ? "selected" : ""}`}>
                <div className="avatar">{player.player.name.split(" ").map((part) => part[0]).join("")}</div>
                <div><strong>{player.player.name}</strong><span>{player.player.position}</span></div>
                <ChevronRight size={16} />
              </Button>
            ))}
          </div>
        </Card>
        {selected && <PlayerProfile player={selected} saved={watchList.includes(selected.player.playerId)} onSave={() => setWatchList((current) => current.includes(selected.player.playerId) ? current.filter((id) => id !== selected.player.playerId) : [...current, selected.player.playerId])} />}
      </div>
    </>
  );
}

function PlayerProfile({ player, saved, onSave }: { player: GmPlayer; saved: boolean; onSave: () => void }) {
  return (
    <div className="profile-stack">
      <Card className="profile-hero">
        <div className="profile-title">
          <div className="avatar large">{player.player.name.split(" ").map((part) => part[0]).join("")}</div>
          <div><div className="eyebrow">Opponent profile</div><div className="profile-name">{player.player.name}</div><div className="profile-sub">{player.player.position} · Age <FactValue value={player.age} /></div></div>
        </div>
        <Button className={`watch-button ${saved ? "saved" : ""}`} onClick={onSave}><Star size={16} fill={saved ? "currentColor" : "none"} />{saved ? "Saved to watch list" : "Save to watch list"}</Button>
      </Card>
      <div className="profile-grid">
        <Card title="Usage" eyebrow="Time on ice by strength">
          <div className="usage-grid"><div><span>Even strength</span><FactValue value={player.toi.evenStrength} format={toi} /></div><div><span>Power play</span><FactValue value={player.toi.powerPlay} format={toi} /></div><div><span>Penalty kill</span><FactValue value={player.toi.penaltyKill} format={toi} /></div></div>
        </Card>
        <Card title="On-ice results" eyebrow="Season">
          <div className="results-grid"><div><span>Zone starts</span><StatValue stat={player.zoneStarts} format={pct} /></div><div><span>Goals share</span><StatValue stat={player.onIceGoalsPct} format={pct} /></div><div><span>Expected goals</span><StatValue stat={player.onIceExpectedGoalsPct} format={pct} /></div></div>
        </Card>
        <Card title="Tracking" eyebrow="Peak readings">
          <div className="tracking-grid"><div><Gauge size={18} /><span>Top speed</span><FactValue value={player.topSpeed} format={mph} /></div><div><Target size={18} /><span>Shot speed</span><FactValue value={player.shotSpeed} format={mph} /></div></div>
        </Card>
        <Card title="Shot locations" eyebrow="Season" className="shot-map-card">
          <HalfRink points={player.shotMap} className="rink-chart profile-rink" />
        </Card>
        <Card title="Scouting notes" eyebrow="Internal" className="notes-card"><p>{player.notes}</p></Card>
      </div>
    </div>
  );
}

function AppShell({ data }: { data: PrescoutData }) {
  const [mode, setMode] = useState<Mode>("coach");
  const [page, setPage] = useState<Page>("summary");
  const nav = mode === "coach" ? coachNav : gmNav;
  const gameDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(data.meta.gameDate));

  const switchMode = (next: Mode) => {
    setMode(next);
    setPage(next === "coach" ? "summary" : "gmSummary");
  };

  const content = () => {
    switch (page) {
      case "summary": return <CoachSummary data={data.coach.summary} />;
      case "specialTeams": return <SpecialTeamsPage data={data.coach.specialTeams} />;
      case "faceoffs": return <FaceoffsPage data={data.coach.faceoffs} />;
      case "goalie": return <GoaliePage data={data.coach.goalie} />;
      case "gameState": return <GameStatePage data={data.coach.gameState} />;
      case "playerTargets": return <PlayerTargetsPage data={data.coach.playerTargets} />;
      case "gmSummary": return <GmSummaryPage data={data.gm} />;
      case "players": return <PlayerEvaluationPage players={data.gm.players} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">PS</div><div><strong>Pre-Scout</strong><span>Hockey intelligence</span></div></div>
        <div className="mode-label">{mode === "coach" ? "Coaching staff" : "Front office"}</div>
        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            return <Button key={item.id} onClick={() => setPage(item.id)} className={`nav-item ${page === item.id ? "active" : ""}`}><Icon size={17} /><span>{item.label}</span>{page === item.id && <span className="nav-active-mark" />}</Button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="data-status"><span className="status-dot" /><div><strong>Report current</strong><span>Through {data.meta.dataThroughDate}</span></div></div>
          <div className="version">Schema v{data.meta.schemaVersion}</div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="opponent-block">
            <span>Next opponent</span>
            <div><strong>{data.meta.opponent.name}</strong><span className="game-chip">{data.meta.homeAway === "home" ? "Home" : "Away"}</span></div>
          </div>
          <div className="topbar-right">
            <div className="game-time"><span>{gameDate}</span><small>Report generated {new Date(data.meta.generatedAt).toLocaleDateString()}</small></div>
            <div className="mode-toggle">
              <Button className={mode === "coach" ? "active" : ""} onClick={() => switchMode("coach")}>Coach</Button>
              <Button className={mode === "gm" ? "active" : ""} onClick={() => switchMode("gm")}>GM</Button>
            </div>
            <Button className="export-button" onClick={() => window.print()}><Download size={15} />Export PDF</Button>
          </div>
        </header>
        <main className={`main-content ${page === "summary" ? "summary-content" : ""}`}>{content()}</main>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<PrescoutData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/data/latest.json")
      .then((response) => {
        if (!response.ok) throw new Error("Report request failed");
        return response.json() as Promise<PrescoutData>;
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return <div className="load-state"><X size={28} /><strong>Unable to load report</strong><span>Check the data file and refresh.</span></div>;
  if (!data) return <div className="load-state"><div className="loader" /><strong>Loading pre-scout</strong><span>Building the latest opponent report.</span></div>;
  return <AppShell data={data} />;
}
