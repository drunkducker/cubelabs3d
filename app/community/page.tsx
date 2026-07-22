import Link from "next/link";
import styles from "./community.module.css";

const leaderboard = [
  { rank: 1, name: "CubePilot", time: "0:41.82", moves: 58, avatar: "CP" },
  { rank: 2, name: "TwistTheory", time: "0:48.13", moves: 61, avatar: "TT" },
  { rank: 3, name: "Dustin", time: "0:52.40", moves: 67, avatar: "DS" },
];

const challenges = [
  {
    eyebrow: "BEAT MY TIME",
    title: "3×3 Midnight Scramble",
    message: "I solved this in 52.40 seconds. Think you can beat it?",
    detail: "67 moves · No hints · No undo",
    action: "Accept challenge",
  },
  {
    eyebrow: "I BET YOU CAN'T",
    title: "The 7×7 Wall",
    message: "I got stuck with two centers left. Finish what I couldn't.",
    detail: "Starts from an exact saved cube state",
    action: "Try to solve it",
  },
];

/**
 * First visual foundation for Cube Labs social play.
 *
 * This route is intentionally static while authentication, persistence, and
 * cube-state handoff are built. It establishes the information architecture
 * and can be connected to real server data without redesigning the page.
 */
export default function CommunityPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandCube} aria-hidden="true">◇</span>
          <span>Cube Labs 3D</span>
        </Link>
        <nav className={styles.nav} aria-label="Community navigation">
          <a href="#challenges">Challenges</a>
          <a href="#leaderboard">Leaderboard</a>
          <a href="#profile">Profile</a>
        </nav>
        <button className={styles.avatarButton} type="button" aria-label="Open profile">
          DS
        </button>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>PLAY TOGETHER, FROM ANYWHERE</p>
          <h1>Scramble it. Send it. Prove it.</h1>
          <p className={styles.heroText}>
            Build a cube challenge from the exact position on your screen. Solve it and dare a
            friend to beat your time—or send the position that stopped you and bet they cannot finish it.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/play/3x3">Create a challenge</Link>
            <a className={styles.secondaryButton} href="#challenges">View challenges</a>
          </div>
        </div>

        <aside className={styles.profileCard} id="profile">
          <div className={styles.profileTop}>
            <div className={styles.largeAvatar}>DS</div>
            <div>
              <p className={styles.profileLabel}>YOUR PROFILE</p>
              <h2>Dustin</h2>
              <p>@drunkducker · 3×3 favorite</p>
            </div>
          </div>
          <div className={styles.statGrid}>
            <div><strong>126</strong><span>Total solves</span></div>
            <div><strong>18</strong><span>Challenge wins</span></div>
            <div><strong>7</strong><span>Day streak</span></div>
            <div><strong>0:52</strong><span>Best 3×3</span></div>
          </div>
          <button className={styles.fullButton} type="button">Edit profile & avatar</button>
        </aside>
      </section>

      <section className={styles.section} id="challenges">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>FRIEND CHALLENGES</p>
            <h2>Your next cube battle</h2>
          </div>
          <button className={styles.textButton} type="button">See all</button>
        </div>

        <div className={styles.challengeGrid}>
          {challenges.map((challenge) => (
            <article className={styles.challengeCard} key={challenge.title}>
              <p className={styles.challengeEyebrow}>{challenge.eyebrow}</p>
              <div className={styles.miniCube} aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span /><span />
              </div>
              <h3>{challenge.title}</h3>
              <p>{challenge.message}</p>
              <small>{challenge.detail}</small>
              <button className={styles.cardButton} type="button">{challenge.action}</button>
            </article>
          ))}

          <article className={`${styles.challengeCard} ${styles.createCard}`}>
            <p className={styles.challengeEyebrow}>START SOMETHING</p>
            <div className={styles.plus} aria-hidden="true">+</div>
            <h3>Create your own challenge</h3>
            <p>Use a random scramble, your current cube, or the exact point where you got stuck.</p>
            <Link className={styles.cardButton} href="/play/3x3">Open the cube</Link>
          </article>
        </div>
      </section>

      <section className={styles.section} id="leaderboard">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>THIS WEEK</p>
            <h2>Friends leaderboard</h2>
          </div>
          <div className={styles.filters} aria-label="Leaderboard filters">
            <button className={styles.activeFilter} type="button">3×3</button>
            <button type="button">Fastest</button>
            <button type="button">Unassisted</button>
          </div>
        </div>

        <div className={styles.leaderboard}>
          {leaderboard.map((entry) => (
            <div className={styles.leaderRow} key={entry.rank}>
              <strong className={styles.rank}>#{entry.rank}</strong>
              <span className={styles.rowAvatar}>{entry.avatar}</span>
              <div className={styles.playerName}>
                <strong>{entry.name}</strong>
                <span>{entry.moves} moves</span>
              </div>
              <strong className={styles.time}>{entry.time}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.bottomCta}>
        <div>
          <p className={styles.kicker}>THE VIRAL LOOP</p>
          <h2>Every solved cube becomes the next invitation.</h2>
          <p>Challenge a friend, compare results, rematch, and climb a board built around your actual circle.</p>
        </div>
        <Link className={styles.primaryButton} href="/play/3x3">Start with a 3×3</Link>
      </section>
    </main>
  );
}
