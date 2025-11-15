#!/usr/bin/env python3
"""
Remove component definitions from AITerminalAgent.jsx
Components: Toast (396-427), ThemeDropdown (431-516), APIKeyModal (520-829)
"""

import re

# Read the file
with open(r'c:\Users\pmorr\OneDrive\Desktop\ai-terminal-agent\src\AITerminalAgent.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove lines 396-427 (Toast), 431-516 (ThemeDropdown), 520-829 (APIKeyModal)
# Note: Line numbers in file are 1-indexed, but array is 0-indexed
# We also need to remove the OutputItem component definition later

# First, let's identify the sections to remove
toast_start = 396 - 1  # Convert to 0-index
toast_end = 427  # End is exclusive in Python slice

# After removing Toast (32 lines), ThemeDropdown line numbers shift down
theme_start = 431 - 1 - 32  # Adjust for removed Toast lines
theme_end = 516 - 32  # 431 to 516 is 86 lines

# After removing Theme (86 lines), APIKeyModal shifts down
api_start = 520 - 1 - 32 - 86  # Adjust for removed Toast and ThemeDropdown
api_end = 829 - 32 - 86  # 520 to 829 is 310 lines

# Remove in reverse order to maintain line numbers
# We'll do this differently - mark sections and filter

keep_lines = []
skip_ranges = [
    (395, 428),  # Toast (lines 396-427 in 1-indexed)
    (430, 517),  # ThemeDropdown (lines 431-516 in 1-indexed, with comment line 429)
    (519, 830),  # APIKeyModal (lines 520-829 in 1-indexed, with comment line 518)
]

for i, line in enumerate(lines, start=1):
    should_skip = False
    for start, end in skip_ranges:
        if start <= i < end:
            should_skip = True
            break
    if not should_skip:
        keep_lines.append(line)

# Write back
with open(r'c:\Users\pmorr\OneDrive\Desktop\ai-terminal-agent\src\AITerminalAgent.jsx', 'w', encoding='utf-8') as f:
    f.writelines(keep_lines)

print(f"Removed component definitions. New line count: {len(keep_lines)}")
