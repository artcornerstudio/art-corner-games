# Spread Out! — Soccer Smarts for Kids

**Product Requirements Document (PRD)**
Written in plain language so everyone on the team can read it.

---

## 1. What is this?

A web game that teaches kids ages **6–12** the three "invisible" soccer skills
that coaches wish every kid knew:

1. **Spread out** — don't chase the ball in a bee-swarm.
2. **Find open space** — move to a spot where a teammate can pass to you.
3. **Pass to the open teammate** — look before you kick; pick the teammate
   nobody is guarding.

It runs in any web browser (phone, tablet, laptop). No app store, no download,
no account, no ads.

## 2. Who is it for?

- **Players (6–12):** big buttons, almost no reading, instant fun feedback.
- **Parents & coaches:** a 5-minute brain-training tool for practice or home.

## 3. Why will it work?

Kids at this age mostly learn "bunch ball" habits. The two hardest ideas to
teach with words — *get open* and *see the open pass* — are exactly the ideas
a game can show visually, over and over, with cheering and points.

---

## 4. Core features

### The game (what kids see)

| Feature | What it does |
|---|---|
| **Get Open! mode** | You drag your player around a field. Defenders chase you. Find open grass where your teammate can pass to you — stay open and the pass comes to you. Points and confetti! |
| **Pick the Pass! mode** | You have the ball. Three teammates wave for a pass — but defenders guard some of them. Tap the OPEN teammate. Wrong pick = gentle lesson showing which lanes were blocked. |
| **Coach tips** | Short, friendly one-liners between rounds ("Spread out — a bunched-up team is easy to guard!"). |
| **Levels** | More defenders, faster defenders, as kids improve. |
| **Score + best score** | Simple points and a personal best, saved on the device. |
| **Sound + mute button** | Happy beeps and cheers, easy to turn off. |

### Under the hood (what parents care about)

- **Kid-safe by design:** no account, no chat, no camera, no personal data
  collected, nothing sent anywhere. The whole game is one file.
- **Works offline** once loaded.
- **Touch first:** built for little fingers on tablets and phones.

---

## 5. Roadmap — quick win today, then grow

### ✅ Phase 1 — TODAY (this build)
- Playable game with **both modes** (Get Open! and Pick the Pass!).
- Levels, score, best score, coach tips, sounds, mute.
- Works on phone, tablet, and computer.
- **Test:** page loads with no errors, all buttons work, gameplay works by
  touch, mouse, and arrow keys.

### ✅ Phase 2 — Make it stickier (DONE)
- ⭐ Star rewards: earn a star for every level you finish, and for **3 great
  passes in a row** in Pick the Pass. Stars are saved on the device.
- Defender personalities in Get Open!: dark-red **chasers (!)** hunt the
  player; orange **blockers (X)** guard the passing lane.
- New mode — **Where Do I Stand?**: the field lights up into striker ⚡,
  midfield 🔗, and defense 🛡️ zones. Kids run to their position; from
  level 2, they also learn to slide left/right with the ball, like a
  shifting team.
- Jersey customization: pick your color and number on the home screen —
  it appears in every mode.
- Bigger celebrations (more confetti, star bursts).

### ✅ Phase 3 — Mini match (DONE)
- **Mini Match! mode**: a real 3-vs-3 game (90 seconds). The kid plays with
  two AI teammates against a red team. Getting open earns real passes,
  covered passes get intercepted, touching the ball steals it, and tapping
  the goal shoots. Spacing and smart choices actually win the match.
- **Formation lesson**: every kickoff starts with a "team shape" card
  teaching the TRIANGLE (defender low, you in the middle, striker high —
  always two ways to pass).
- **Match journey**: win a match to unlock the next; each opponent team is
  a little faster and smarter. Wins are collected as 🏆 badges and shown
  on the kickoff card. Winning also earns a star.

### Phase 4 — Team & coach tools
- Player profiles for siblings/teammates (still no accounts — stored on device).
- Coach mode: pick which skills to drill; printable field diagrams.
- Share a link with the team.

---

## 6. Testing checklist (we repeat this every phase)

1. **Page loads with zero errors** (checked with an automated browser).
2. **Every button works** (menus, modes, mute, back).
3. **Real gameplay works** (drag, tap, keyboard; passes and scoring behave).
4. **Security & safety check:** no data leaves the device, no outside services,
   no personal info, safe for kids (COPPA-friendly by having nothing to collect).

## 7. How we measure success

- A 6-year-old can play without help within 30 seconds.
- A kid can explain "getting open" after playing (ask them!).
- Parents/coaches say they'd use it before practice.
