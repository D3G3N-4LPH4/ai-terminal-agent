/**
 * useSkillCommands - Skill system terminal commands
 *
 * Handles commands:
 * - skill list                - List all skills with status
 * - skill show <name>         - Show skill details
 * - skill run <name> [input]  - Execute a skill
 * - skill create <name>       - Create a new skill (interactive)
 * - skill delete <name>       - Delete a user skill
 * - skill enable <name>       - Enable a skill
 * - skill disable <name>      - Disable a skill
 * - skill export <name>       - Export skill as JSON
 * - skill import <json>       - Import skill from JSON
 */

import { useCallback, useRef } from 'react';
import skillService from '../services/SkillService.js';

export function useSkillCommands({ addOutput, showToast }) {

  // Track create wizard state
  const createWizard = useRef(null);

  const handleSkillList = useCallback(() => {
    const skills = skillService.listAll();

    if (skills.length === 0) {
      addOutput({
        type: 'info',
        content: "No skills available. Use 'skill create <name>' to create one.",
      });
      return true;
    }

    let output = 'SKILL SYSTEM\n';
    output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    const enabled = skills.filter(s => s.enabled);
    const disabled = skills.filter(s => !s.enabled);

    if (enabled.length > 0) {
      output += '  ACTIVE SKILLS:\n';
      enabled.forEach(s => {
        const modeIcon = { prompt: '💬', api: '🌐', code: '⚡' }[s.mode] || '?';
        const src = s.builtin ? '[built-in]' : '[custom]';
        output += `    ${modeIcon} ${s.name} ${src}\n`;
        output += `       ${s.description || 'No description'}\n`;
        output += `       Triggers: ${s.triggers.join(', ')}\n\n`;
      });
    }

    if (disabled.length > 0) {
      output += '  DISABLED SKILLS:\n';
      disabled.forEach(s => {
        output += `    ○ ${s.name} (${s.mode})\n`;
      });
      output += '\n';
    }

    output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    output += "  Use 'skill show <name>' for details\n";
    output += "  Use 'skill create <name>' to add new\n";

    addOutput({ type: 'info', content: output });
    return true;
  }, [addOutput]);

  const handleSkillShow = useCallback((name) => {
    if (!name) {
      addOutput({ type: 'error', content: "Usage: skill show <name>" });
      return true;
    }

    const skill = skillService.get(name);
    if (!skill) {
      addOutput({ type: 'error', content: `Skill not found: "${name}"` });
      return true;
    }

    const modeIcon = { prompt: '💬', api: '🌐', code: '⚡' }[skill.mode] || '?';
    let output = `\n${modeIcon} SKILL: ${skill.name}\n`;
    output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    output += `  Description : ${skill.description || 'None'}\n`;
    output += `  Mode        : ${skill.mode}\n`;
    output += `  Status      : ${skill.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    output += `  Source      : ${skill.builtin ? 'Built-in' : 'Custom'}\n`;
    output += `  Triggers    : ${skill.triggers.join(', ')}\n`;
    if (skill.parameters?.length > 0) {
      output += `  Parameters  : ${skill.parameters.map(p => p.name).join(', ')}\n`;
    }
    if (skill.created) {
      output += `  Created     : ${new Date(skill.created).toLocaleString()}\n`;
    }
    output += '\n  Content:\n';
    output += '  ─────────────────────────────────\n';
    const lines = (skill.content || '').split('\n');
    lines.forEach(line => {
      output += `  ${line}\n`;
    });
    output += '  ─────────────────────────────────\n';

    addOutput({ type: 'info', content: output });
    return true;
  }, [addOutput]);

  const handleSkillRun = useCallback(async (name, input) => {
    if (!name) {
      addOutput({ type: 'error', content: "Usage: skill run <name> [input]" });
      return true;
    }

    const skill = skillService.get(name);
    if (!skill) {
      addOutput({ type: 'error', content: `Skill not found: "${name}"` });
      return true;
    }

    addOutput({ type: 'info', content: `Running skill "${name}"...` });

    try {
      const result = await skillService.execute(skill, input || '');
      addOutput({ type: 'success', content: `[${skill.name}] ${result}` });
      showToast?.(`Skill "${name}" executed`, 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `Skill error: ${error.message}` });
    }
    return true;
  }, [addOutput, showToast]);

  const handleSkillCreate = useCallback((name) => {
    if (!name) {
      addOutput({ type: 'error', content: "Usage: skill create <name>" });
      return true;
    }

    // Check if already exists
    if (skillService.get(name)?.builtin) {
      addOutput({ type: 'error', content: `Cannot override built-in skill "${name}". Choose a different name.` });
      return true;
    }

    addOutput({
      type: 'info',
      content: `
CREATE SKILL: ${name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this format to define your skill:

  skill save ${name} mode=prompt triggers=word1,word2 description=My skill content=Your prompt text here with {{input}} placeholder

Modes:
  prompt - Injected into AI context when trigger matches
  api    - Makes HTTP request (content = URL with {{input}})
  code   - Runs sandboxed JavaScript (content = JS code)

Examples:
  skill save whale_alert mode=prompt triggers=whale,big_move description=Whale activity analyzer content=Analyze whale movements for {{input}}. Look for large transactions and wallet patterns.

  skill save sol_price mode=api triggers=sol_price description=Get SOL price content=https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd

  skill save calc mode=code triggers=calc,calculate description=Calculator content=return eval(input)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    });
    return true;
  }, [addOutput]);

  const handleSkillSave = useCallback((argsStr) => {
    if (!argsStr.trim()) {
      addOutput({ type: 'error', content: "Usage: skill save <name> mode=<mode> triggers=<t1,t2> description=<desc> content=<content>" });
      return true;
    }

    // Parse: first word is name, rest are key=value pairs
    const parts = argsStr.trim().split(/\s+/);
    const name = parts[0];
    const rest = argsStr.trim().substring(name.length).trim();

    // Parse key=value pairs (content can contain spaces)
    const params = {};
    const keyValRegex = /(\w+)=([^\s]+(?:\s+(?!\w+=)[^\s]*)*)/g;
    let match;
    while ((match = keyValRegex.exec(rest)) !== null) {
      params[match[1]] = match[2];
    }

    if (!params.mode || !['prompt', 'api', 'code'].includes(params.mode)) {
      addOutput({ type: 'error', content: "mode is required. Options: prompt, api, code" });
      return true;
    }

    if (!params.triggers) {
      addOutput({ type: 'error', content: "triggers are required. Example: triggers=word1,word2" });
      return true;
    }

    if (!params.content) {
      addOutput({ type: 'error', content: "content is required." });
      return true;
    }

    const skill = {
      name,
      mode: params.mode,
      triggers: params.triggers.split(',').map(t => t.trim()),
      description: params.description || '',
      content: params.content,
      parameters: [],
      enabled: true,
    };

    skillService.save(skill);
    addOutput({ type: 'success', content: `Skill "${name}" saved! Triggers: ${skill.triggers.join(', ')}` });
    showToast?.(`Skill "${name}" created`, 'success');
    return true;
  }, [addOutput, showToast]);

  const handleSkillDelete = useCallback((name) => {
    if (!name) {
      addOutput({ type: 'error', content: "Usage: skill delete <name>" });
      return true;
    }

    const skill = skillService.get(name);
    if (!skill) {
      addOutput({ type: 'error', content: `Skill not found: "${name}"` });
      return true;
    }

    if (skill.builtin && !skillService.userSkills?.has(name)) {
      addOutput({ type: 'error', content: `Cannot delete built-in skill "${name}". Use 'skill disable ${name}' instead.` });
      return true;
    }

    skillService.delete(name);
    addOutput({ type: 'success', content: `Skill "${name}" deleted.` });
    showToast?.(`Skill "${name}" deleted`, 'success');
    return true;
  }, [addOutput, showToast]);

  const handleSkillToggle = useCallback((name, enable) => {
    if (!name) {
      addOutput({ type: 'error', content: `Usage: skill ${enable ? 'enable' : 'disable'} <name>` });
      return true;
    }

    try {
      const newState = skillService.toggle(name);
      // If the user wanted enable but it's now disabled (or vice versa), toggle again
      if (newState !== enable) {
        skillService.toggle(name);
      }
      addOutput({
        type: 'success',
        content: `Skill "${name}" ${enable ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      addOutput({ type: 'error', content: error.message });
    }
    return true;
  }, [addOutput]);

  const handleSkillExport = useCallback((name) => {
    if (!name) {
      addOutput({ type: 'error', content: "Usage: skill export <name>" });
      return true;
    }

    try {
      const data = skillService.exportSkill(name);
      const json = JSON.stringify(data, null, 2);
      navigator.clipboard?.writeText(json).then(() => {
        showToast?.('Skill exported to clipboard', 'success');
      }).catch(() => {});
      addOutput({
        type: 'success',
        content: `Skill "${name}" exported (copied to clipboard):\n\n${json}`,
      });
    } catch (error) {
      addOutput({ type: 'error', content: error.message });
    }
    return true;
  }, [addOutput, showToast]);

  const handleSkillImport = useCallback((json) => {
    if (!json?.trim()) {
      addOutput({ type: 'error', content: "Usage: skill import <json>" });
      return true;
    }

    try {
      const data = JSON.parse(json);
      skillService.importSkill(data);
      addOutput({ type: 'success', content: `Skill "${data.name}" imported!` });
      showToast?.(`Skill "${data.name}" imported`, 'success');
    } catch (error) {
      addOutput({ type: 'error', content: `Import failed: ${error.message}` });
    }
    return true;
  }, [addOutput, showToast]);

  const handleCommand = useCallback(async (command, args) => {
    if (command !== 'skill') return false;

    const parts = (args || '').trim().split(/\s+/);
    const sub = parts[0]?.toLowerCase();
    const subArgs = parts.slice(1).join(' ');
    const firstName = parts[1]; // The name argument for most subcommands

    switch (sub) {
      case 'list': case undefined: case '':
        return handleSkillList();
      case 'show':
        return handleSkillShow(firstName);
      case 'run':
        return handleSkillRun(firstName, parts.slice(2).join(' '));
      case 'create':
        return handleSkillCreate(firstName);
      case 'save':
        return handleSkillSave(subArgs);
      case 'delete': case 'remove':
        return handleSkillDelete(firstName);
      case 'enable':
        return handleSkillToggle(firstName, true);
      case 'disable':
        return handleSkillToggle(firstName, false);
      case 'export':
        return handleSkillExport(firstName);
      case 'import':
        return handleSkillImport(parts.slice(1).join(' '));
      default:
        addOutput({
          type: 'error',
          content: `Unknown skill subcommand: ${sub}\nOptions: list, show, run, create, save, delete, enable, disable, export, import`,
        });
        return true;
    }
  }, [addOutput, handleSkillList, handleSkillShow, handleSkillRun, handleSkillCreate,
      handleSkillSave, handleSkillDelete, handleSkillToggle, handleSkillExport, handleSkillImport]);

  return { handleCommand };
}

export default useSkillCommands;
