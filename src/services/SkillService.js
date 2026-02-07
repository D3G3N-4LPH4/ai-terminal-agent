/**
 * SkillService - Extensible skill system
 *
 * Three modes:
 * - prompt: Inject into AI context when trigger matches
 * - api: HTTP call with parameter substitution
 * - code: Sandboxed JS evaluation
 *
 * Skills can be built-in or user-created, stored in localStorage.
 * User skills override built-ins by name.
 */

import BrowserEventEmitter from '../utils/BrowserEventEmitter.js';
import { execute } from '../utils/skillExecutor.js';

const STORAGE_KEY = 'skills:user';

// Built-in skills
const BUILTIN_SKILLS = [
  {
    name: 'price_alert_format',
    description: 'Formats price alerts with clear visual indicators',
    triggers: ['price alert', 'set alert', 'alert when'],
    mode: 'prompt',
    content: `When formatting price alerts, use this structure:
🎯 PRICE ALERT
━━━━━━━━━━━━━━━━
Token: {{input}}
Alert Type: [Above/Below]
Target: $[price]
Current: $[price]
Distance: [%]
━━━━━━━━━━━━━━━━
Always include percentage distance from current price.`,
    parameters: [],
    enabled: true,
    builtin: true,
  },
  {
    name: 'risk_assessment',
    description: 'Adds structured risk assessment to AI analysis',
    triggers: ['risk', 'assess risk', 'how risky', 'should i buy'],
    mode: 'prompt',
    content: `Include a structured risk assessment in your response:

RISK ASSESSMENT for {{input}}:
1. Market Risk: [Low/Medium/High] - [reason]
2. Liquidity Risk: [Low/Medium/High] - [reason]
3. Smart Contract Risk: [Low/Medium/High] - [reason]
4. Volatility: [Low/Medium/High] - [reason]
5. Overall Score: [1-10] where 10 = highest risk

Provide actionable risk mitigation suggestions.`,
    parameters: [],
    enabled: true,
    builtin: true,
  },
  {
    name: 'degen_translator',
    description: 'Translates crypto analysis into degen speak',
    triggers: ['degen mode', 'translate degen', 'wen moon'],
    mode: 'prompt',
    content: `Translate the following into crypto degen speak with heavy use of slang:
- "going up" → "mooning" / "pumping" / "sending it"
- "going down" → "dumping" / "rugging" / "getting rekt"
- "buy" → "ape in" / "long" / "scoop"
- "sell" → "dump" / "take profit" / "exit"
- "good project" → "based" / "chad project"
- "bad project" → "ngmi" / "rug" / "jeet bait"

Keep the actual analysis accurate but make the language colorful.
Input: {{input}}`,
    parameters: [],
    enabled: true,
    builtin: true,
  },
];

class SkillService extends BrowserEventEmitter {
  constructor() {
    super();
    this.builtinSkills = new Map();
    this.userSkills = new Map();
    this.loaded = false;
  }

  /**
   * Initialize - load built-in and user skills
   */
  init() {
    if (this.loaded) return;

    // Load built-ins
    BUILTIN_SKILLS.forEach(skill => {
      this.builtinSkills.set(skill.name, { ...skill, created: Date.now() });
    });

    // Load user skills from localStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const skills = JSON.parse(raw);
        skills.forEach(skill => {
          this.userSkills.set(skill.name, skill);
        });
      }
    } catch (e) {
      console.error('[SkillService] Failed to load user skills:', e.message);
    }

    this.loaded = true;
    this.emit('loaded');
  }

  /**
   * Get all skills (user skills override built-ins by name)
   * @returns {Array<Object>}
   */
  listAll() {
    const merged = new Map(this.builtinSkills);
    for (const [name, skill] of this.userSkills) {
      merged.set(name, skill);
    }
    return Array.from(merged.values());
  }

  /**
   * Get a skill by name
   * @param {string} name
   * @returns {Object|null}
   */
  get(name) {
    return this.userSkills.get(name) || this.builtinSkills.get(name) || null;
  }

  /**
   * Match user input against skill triggers
   * Returns all matching enabled skills
   * @param {string} text - User input text
   * @returns {Array<Object>} Matching skills
   */
  match(text) {
    if (!text) return [];
    const lower = text.toLowerCase();
    const allSkills = this.listAll();

    return allSkills.filter(skill => {
      if (!skill.enabled) return false;
      return skill.triggers.some(trigger => lower.includes(trigger.toLowerCase()));
    });
  }

  /**
   * Execute a skill
   * @param {Object|string} skillOrName - Skill object or name
   * @param {string} input - User input
   * @returns {Promise<string>} Execution result
   */
  async execute(skillOrName, input) {
    const skill = typeof skillOrName === 'string' ? this.get(skillOrName) : skillOrName;
    if (!skill) throw new Error(`Skill not found: ${skillOrName}`);
    if (!skill.enabled) throw new Error(`Skill "${skill.name}" is disabled`);

    const result = await execute(skill, input);
    this.emit('skill_executed', { name: skill.name, mode: skill.mode });
    return result;
  }

  /**
   * Save or update a user skill
   * @param {Object} skill - Skill definition
   */
  save(skill) {
    if (!skill.name) throw new Error('Skill name is required');

    const existing = this.userSkills.get(skill.name);
    const updated = {
      ...(existing || {}),
      ...skill,
      builtin: false,
      updated: Date.now(),
      created: existing?.created || Date.now(),
    };

    this.userSkills.set(skill.name, updated);
    this._persist();
    this.emit('skill_saved', updated);
  }

  /**
   * Delete a user skill
   * @param {string} name
   * @returns {boolean}
   */
  delete(name) {
    const existed = this.userSkills.delete(name);
    if (existed) {
      this._persist();
      this.emit('skill_deleted', name);
    }
    return existed;
  }

  /**
   * Toggle a skill's enabled state
   * @param {string} name
   * @returns {boolean} New enabled state
   */
  toggle(name) {
    const skill = this.get(name);
    if (!skill) throw new Error(`Skill not found: ${name}`);

    // For built-in skills, create a user override
    if (skill.builtin && !this.userSkills.has(name)) {
      this.userSkills.set(name, { ...skill, builtin: false, enabled: !skill.enabled });
    } else if (this.userSkills.has(name)) {
      const userSkill = this.userSkills.get(name);
      userSkill.enabled = !userSkill.enabled;
    }

    this._persist();
    const current = this.get(name);
    this.emit('skill_toggled', { name, enabled: current.enabled });
    return current.enabled;
  }

  /**
   * Export a skill as JSON
   * @param {string} name
   * @returns {Object}
   */
  exportSkill(name) {
    const skill = this.get(name);
    if (!skill) throw new Error(`Skill not found: ${name}`);
    const { builtin, ...exportable } = skill;
    return exportable;
  }

  /**
   * Import a skill from JSON
   * @param {Object} data
   */
  importSkill(data) {
    if (!data || !data.name) throw new Error('Invalid skill data');
    this.save({
      ...data,
      builtin: false,
      enabled: data.enabled !== false,
    });
  }

  /**
   * Persist user skills to localStorage
   */
  _persist() {
    try {
      const skills = Array.from(this.userSkills.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
    } catch (e) {
      console.error('[SkillService] Persist error:', e.message);
    }
  }
}

// Singleton
const skillService = new SkillService();
export { SkillService };
export default skillService;
