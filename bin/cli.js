#!/usr/bin/env node

import { fileURLToPath } from "url";
import { dirname, join, resolve, relative } from "path";
import {
  readFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
  symlinkSync,
  statSync,
  cpSync,
} from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, "..");

// One line per skill. Keep in sync with index.js and .claude-plugin/plugin.json.
const SKILLS = {
  convex: "Router for Convex work when no specific skill fits",
  "convex-best-practices": "Production patterns and the ESLint plugin rules",
  "convex-functions": "Queries, mutations, actions, internal functions",
  "convex-schema-validator": "Schema design, validators, indexes",
  "convex-realtime": "Reactive queries, optimistic updates, presence",
  "convex-http-actions": "HTTP endpoints, webhooks, CORS, auth headers",
  "convex-file-storage": "Upload, serve, and delete files",
  "convex-cron-jobs": "Cron jobs and scheduled functions",
  "convex-migrations": "Schema evolution and data backfills",
  "convex-agents": "AI agents with the Convex agent component",
  "convex-component-authoring": "Author and publish Convex components",
  "convex-security-check": "Ten minute security checklist",
  "convex-security-audit": "Deep security review before launch",
  "avoid-feature-creep": "Keep scope tight, ship what was asked",
  "project-workflow": "PRD first, task.md tracking, lessons loop",
  "project-docs": "Sync task.md, changelog.md, files.md from git evidence",
  "git-safety": "Block destructive git commands, diff before discard",
};

// Named install targets. Anything else is treated as a path.
const TARGET_ALIASES = new Map([
  ["claude", ".claude/skills"],
  ["codex", ".codex/skills"],
  ["agents", ".agents/skills"],
  ["cursor", ".cursor/skills"],
  ["opencode", ".agents/skills"],
]);

function printHelp() {
  console.log(`
builder-skills - Agent skills for builders shipping Convex apps

USAGE:
  builder-skills <command> [options]

COMMANDS:
  list                    List all available skills
  install <skill>         Install one skill (folder with SKILL.md and references)
  install-all             Install every skill
  install-templates       Install AGENTS.md, files.md, changelog.md, task.md, prds/ starters
  path <skill>            Print the path to a skill's SKILL.md
  show <skill>            Print a skill's SKILL.md

OPTIONS:
  --dir <path>            Project directory (default: current directory)
  --target <name|path>    Where skills go: claude (.claude/skills), codex (.codex/skills),
                          cursor (.cursor/skills), agents | opencode (.agents/skills), or a path
                          (default: .claude/skills)
  --link                  Symlink the skill folder instead of copying
  --help, -h              Show this help message

EXAMPLES:
  builder-skills list
  builder-skills install convex-functions
  builder-skills install-all --target agents
  builder-skills install project-workflow --target cursor
  builder-skills install convex-best-practices --target codex --link
  builder-skills install-templates
  builder-skills show git-safety

AVAILABLE SKILLS:
${Object.entries(SKILLS)
  .map(([name, desc]) => `  ${name.padEnd(28)} ${desc}`)
  .join("\n")}
`);
}

function listSkills() {
  console.log("\nbuilder-skills\n");
  Object.entries(SKILLS).forEach(([name, desc]) => {
    console.log(`  ${name.padEnd(28)} ${desc}`);
  });
  console.log("");
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function resolveTargetSkillsDir(targetDir, target) {
  if (!target) {
    return join(targetDir, ".claude", "skills");
  }

  const alias = TARGET_ALIASES.get(target);
  if (alias) {
    return join(targetDir, alias);
  }

  const resolved = resolve(targetDir, target);
  return resolved.endsWith("skills") ? resolved : join(resolved, "skills");
}

function skillSourceDir(skillName) {
  return join(packageRoot, "skills", skillName);
}

function requireSkill(skillName) {
  const skillMd = join(skillSourceDir(skillName), "SKILL.md");
  if (!existsSync(skillMd)) {
    console.error(`Error: Skill not found: ${skillName}`);
    console.log("Run 'builder-skills list' to see available skills.");
    process.exit(1);
  }
  return skillMd;
}

// Copies the whole skill folder so references/ and agents/openai.yaml travel with SKILL.md.
function installSkill(skillName, targetSkillsDir, useSymlink) {
  requireSkill(skillName);

  const sourceDir = skillSourceDir(skillName);
  const targetSkillDir = join(targetSkillsDir, skillName);

  ensureDir(targetSkillsDir);

  if (useSymlink) {
    if (!existsSync(targetSkillDir)) {
      symlinkSync(sourceDir, targetSkillDir, "dir");
    }
    console.log(`Linked ${skillName} -> ${targetSkillDir}`);
    return;
  }

  cpSync(sourceDir, targetSkillDir, { recursive: true, force: true });
  console.log(`Installed ${skillName} -> ${targetSkillDir}`);
}

function installAllSkills(targetSkillsDir, useSymlink) {
  const skillsDir = join(packageRoot, "skills");
  const skills = readdirSync(skillsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  console.log(`Installing ${skills.length} skills...\n`);

  skills.forEach((skillName) => {
    installSkill(skillName, targetSkillsDir, useSymlink);
  });

  console.log(`\nDone. ${skills.length} skills in ${targetSkillsDir}`);
}

// Copies a file only if the destination does not exist yet.
function copyIfMissing(src, dest, label) {
  if (!existsSync(src)) return;
  if (existsSync(dest)) {
    console.log(`Skipping ${label} (already exists)`);
    return;
  }
  ensureDir(dirname(dest));
  copyFileSync(src, dest);
  console.log(`Installed ${label}`);
}

// Project starters: AGENTS.md plus the files.md / changelog.md / task.md / prds workflow.
function installTemplates(targetDir) {
  const templatesDir = join(packageRoot, "templates");

  const starters = [
    ["AGENTS.md", "AGENTS.md"],
    ["files.md", "files.md"],
    ["changelog.md", "changelog.md"],
    ["task.md", "task.md"],
    ["prds/lessons.md", "prds/lessons.md"],
  ];

  starters.forEach(([src, dest]) => {
    copyIfMissing(join(templatesDir, src), join(targetDir, dest), dest);
  });

  // CLAUDE.md as a symlink to AGENTS.md so both tools read one file.
  const claudePath = join(targetDir, "CLAUDE.md");
  if (!existsSync(claudePath)) {
    try {
      symlinkSync("AGENTS.md", claudePath);
      console.log("Linked CLAUDE.md -> AGENTS.md");
    } catch {
      copyIfMissing(join(templatesDir, "AGENTS.md"), claudePath, "CLAUDE.md");
    }
  } else {
    console.log("Skipping CLAUDE.md (already exists)");
  }

  // Editable skill starters (dev, help) go in as folders so Claude Code picks them up.
  const skillTemplatesDir = join(templatesDir, "skills");
  if (existsSync(skillTemplatesDir)) {
    const targetSkillsDir = join(targetDir, ".claude", "skills");
    readdirSync(skillTemplatesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .forEach((d) => {
        const dest = join(targetSkillsDir, d.name);
        if (existsSync(dest)) {
          console.log(`Skipping skill template ${d.name} (already exists)`);
          return;
        }
        cpSync(join(skillTemplatesDir, d.name), dest, { recursive: true });
        console.log(`Installed skill template ${d.name} -> ${dest}`);
      });
  }

  console.log(
    "\nDone. Next: builder-skills install project-workflow project-docs git-safety",
  );
}

function showSkill(skillName) {
  const skillMd = requireSkill(skillName);
  console.log(readFileSync(skillMd, "utf-8"));
}

function printSkillPath(skillName) {
  console.log(requireSkill(skillName));
}

// Parse arguments
const args = process.argv.slice(2);
let targetDir = process.cwd();
let target = null;
let useSymlink = false;

const dirIndex = args.indexOf("--dir");
if (dirIndex !== -1 && args[dirIndex + 1]) {
  targetDir = resolve(args[dirIndex + 1]);
  args.splice(dirIndex, 2);
}

const targetIndex = args.indexOf("--target");
if (targetIndex !== -1 && args[targetIndex + 1]) {
  target = args[targetIndex + 1];
  args.splice(targetIndex, 2);
}

const linkIndex = args.indexOf("--link");
if (linkIndex !== -1) {
  useSymlink = true;
  args.splice(linkIndex, 1);
}

const command = args[0];
const rest = args.slice(1);
const targetSkillsDir = resolveTargetSkillsDir(targetDir, target);

switch (command) {
  case "list":
    listSkills();
    break;
  case "install":
    if (rest.length === 0) {
      console.error("Error: Please specify at least one skill to install.");
      console.log("Run 'builder-skills list' to see available skills.");
      process.exit(1);
    }
    rest.forEach((name) => installSkill(name, targetSkillsDir, useSymlink));
    break;
  case "install-all":
    installAllSkills(targetSkillsDir, useSymlink);
    break;
  case "install-templates":
    installTemplates(targetDir);
    break;
  case "show":
    if (!rest[0]) {
      console.error("Error: Please specify a skill to show.");
      process.exit(1);
    }
    showSkill(rest[0]);
    break;
  case "path":
    if (!rest[0]) {
      console.error("Error: Please specify a skill.");
      process.exit(1);
    }
    printSkillPath(rest[0]);
    break;
  case "--help":
  case "-h":
  case "help":
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
