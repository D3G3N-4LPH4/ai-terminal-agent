#!/usr/bin/env python3
"""
R-Loop: Autonomous AI Task Loop
================================
A self-running agent that works through tasks using Claude.

Features:
- Persistent task state across restarts
- Progress tracking with timestamps
- Configurable via command line or API
- Rate limit handling with exponential backoff
- Detailed logging for debugging

Usage:
  python rloop.py                    # Run with existing tasks
  python rloop.py --tasks "task1" "task2"  # Set new tasks
  python rloop.py --status           # Show current status
  python rloop.py --reset            # Reset all state
"""

import json
import os
import sys
import time
import argparse
from datetime import datetime
from pathlib import Path

try:
    from anthropic import Anthropic, APIError, RateLimitError
except ImportError:
    print("Error: anthropic package not installed. Run: pip install anthropic")
    sys.exit(1)

# Configuration
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "rloop_data"
TASKS_FILE = DATA_DIR / "tasks.json"
PROGRESS_FILE = DATA_DIR / "progress.txt"
STATUS_FILE = DATA_DIR / "status.json"

# Default settings
DEFAULT_MODEL = "claude-sonnet-4-20250514"
DEFAULT_MAX_TOKENS = 2048
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_ITERATIONS = 20

# Prompt template
PROMPT_TEMPLATE = """You are an autonomous AI agent working through a task list.

CURRENT TASK: {current_task}
TASK NUMBER: {task_number} of {total_tasks}

PREVIOUS PROGRESS:
{progress}

INSTRUCTIONS:
1. Work on the current task thoroughly
2. Provide detailed, actionable output
3. When the task is FULLY complete, end your response with the exact word: TASK_COMPLETE
4. If you need more iterations to complete, just provide your progress without TASK_COMPLETE

Begin working on the task now:
"""


def ensure_data_dir():
    """Create data directory if it doesn't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def init_state(tasks=None):
    """Initialize or reset state files."""
    ensure_data_dir()

    if tasks is None:
        tasks = [
            "Generate 5 unique AI agent ideas for crypto trading",
            "Evaluate the feasibility of each idea",
            "Create a brief implementation plan for the best idea"
        ]

    task_data = {
        "goals": tasks,
        "completed": [False] * len(tasks),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    with open(TASKS_FILE, "w") as f:
        json.dump(task_data, f, indent=2)

    with open(PROGRESS_FILE, "w") as f:
        f.write(f"=== R-Loop Progress Log ===\n")
        f.write(f"Started: {datetime.now().isoformat()}\n")
        f.write(f"Tasks: {len(tasks)}\n")
        f.write("=" * 40 + "\n\n")

    update_status("initialized", 0, len(tasks))

    return task_data


def load_state():
    """Load current state from files."""
    ensure_data_dir()

    if not TASKS_FILE.exists():
        return init_state()

    try:
        with open(TASKS_FILE, "r") as f:
            tasks = json.load(f)

        progress = ""
        if PROGRESS_FILE.exists():
            with open(PROGRESS_FILE, "r") as f:
                progress = f.read()

        return tasks, progress
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Error loading state: {e}")
        return init_state(), ""


def save_tasks(tasks):
    """Save tasks to file."""
    tasks["updated_at"] = datetime.now().isoformat()
    with open(TASKS_FILE, "w") as f:
        json.dump(tasks, f, indent=2)


def append_progress(text):
    """Append progress to log file."""
    ensure_data_dir()
    with open(PROGRESS_FILE, "a") as f:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        f.write(f"\n[{timestamp}]\n{text}\n")


def update_status(state, completed, total, current_task=None, error=None):
    """Update status file for external monitoring."""
    ensure_data_dir()
    status = {
        "state": state,  # initialized, running, paused, completed, error
        "completed": completed,
        "total": total,
        "current_task": current_task,
        "error": error,
        "updated_at": datetime.now().isoformat()
    }
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)


def get_status():
    """Get current status."""
    if not STATUS_FILE.exists():
        return {"state": "not_initialized", "completed": 0, "total": 0}

    with open(STATUS_FILE, "r") as f:
        return json.load(f)


def is_complete(tasks):
    """Check if all tasks are complete."""
    return all(tasks["completed"])


def get_next_task_index(tasks):
    """Get index of next incomplete task."""
    try:
        return tasks["completed"].index(False)
    except ValueError:
        return None


def run_ai_prompt(prompt, model=DEFAULT_MODEL, max_retries=3):
    """Run prompt through Claude with retry logic."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")

    client = Anthropic(api_key=api_key)

    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=DEFAULT_MAX_TOKENS,
                temperature=DEFAULT_TEMPERATURE,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text

        except RateLimitError as e:
            wait_time = (2 ** attempt) * 10  # 10s, 20s, 40s
            print(f"Rate limited. Waiting {wait_time}s before retry {attempt + 1}/{max_retries}...")
            time.sleep(wait_time)

        except APIError as e:
            print(f"API error (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt == max_retries - 1:
                raise
            time.sleep(5)

    return None


def run_loop(max_iterations=DEFAULT_MAX_ITERATIONS, model=DEFAULT_MODEL):
    """Main execution loop."""
    print("\n" + "=" * 50)
    print("R-LOOP: Autonomous AI Task Agent")
    print("=" * 50 + "\n")

    tasks, progress = load_state()

    if is_complete(tasks):
        print("All tasks already complete!")
        update_status("completed", len(tasks["completed"]), len(tasks["completed"]))
        return True

    total_tasks = len(tasks["goals"])
    completed_count = sum(tasks["completed"])

    print(f"Tasks: {completed_count}/{total_tasks} completed")
    print(f"Max iterations: {max_iterations}")
    print(f"Model: {model}")
    print("-" * 50 + "\n")

    iteration = 0

    while iteration < max_iterations:
        # Reload state (allows external modification)
        tasks, progress = load_state()

        if is_complete(tasks):
            print("\n" + "=" * 50)
            print("ALL TASKS COMPLETE!")
            print("=" * 50)
            update_status("completed", total_tasks, total_tasks)
            return True

        # Get next task
        next_idx = get_next_task_index(tasks)
        if next_idx is None:
            break

        current_task = tasks["goals"][next_idx]
        completed_count = sum(tasks["completed"])

        print(f"\n[Iteration {iteration + 1}/{max_iterations}]")
        print(f"Task {next_idx + 1}/{total_tasks}: {current_task[:50]}...")

        update_status("running", completed_count, total_tasks, current_task)

        # Build and run prompt
        # Get last 2000 chars of progress to avoid token limits
        recent_progress = progress[-2000:] if len(progress) > 2000 else progress

        prompt = PROMPT_TEMPLATE.format(
            current_task=current_task,
            task_number=next_idx + 1,
            total_tasks=total_tasks,
            progress=recent_progress or "(No previous progress)"
        )

        try:
            output = run_ai_prompt(prompt, model)

            if output is None:
                print("Failed to get AI response. Pausing...")
                update_status("error", completed_count, total_tasks, current_task, "API failure")
                return False

            print(f"\nOutput preview: {output[:200]}...")

            # Check for completion marker
            if "TASK_COMPLETE" in output:
                tasks["completed"][next_idx] = True
                save_tasks(tasks)

                progress_entry = f"COMPLETED Task {next_idx + 1}: {current_task}\n\nResult:\n{output}"
                append_progress(progress_entry)

                print(f"\n*** Task {next_idx + 1} COMPLETED ***")
            else:
                progress_entry = f"Progress on Task {next_idx + 1}: {current_task}\n\n{output}"
                append_progress(progress_entry)
                print("(Task in progress...)")

        except Exception as e:
            error_msg = str(e)
            print(f"\nError: {error_msg}")
            append_progress(f"ERROR: {error_msg}")
            update_status("error", completed_count, total_tasks, current_task, error_msg)
            return False

        iteration += 1

        # Small delay between iterations to be respectful to API
        if iteration < max_iterations:
            time.sleep(2)

    if iteration >= max_iterations:
        print(f"\nMax iterations ({max_iterations}) reached.")
        completed_count = sum(tasks["completed"])
        update_status("paused", completed_count, total_tasks,
                     tasks["goals"][get_next_task_index(tasks)] if not is_complete(tasks) else None)
        return False

    return True


def print_status():
    """Print current status."""
    status = get_status()

    print("\n" + "=" * 40)
    print("R-LOOP STATUS")
    print("=" * 40)
    print(f"State: {status.get('state', 'unknown')}")
    print(f"Progress: {status.get('completed', 0)}/{status.get('total', 0)} tasks")

    if status.get('current_task'):
        print(f"Current: {status['current_task'][:50]}...")
    if status.get('error'):
        print(f"Error: {status['error']}")
    if status.get('updated_at'):
        print(f"Updated: {status['updated_at']}")

    # Show tasks if available
    if TASKS_FILE.exists():
        with open(TASKS_FILE) as f:
            tasks = json.load(f)
        print("\nTasks:")
        for i, (goal, done) in enumerate(zip(tasks["goals"], tasks["completed"])):
            status_icon = "[X]" if done else "[ ]"
            print(f"  {status_icon} {i + 1}. {goal[:60]}{'...' if len(goal) > 60 else ''}")

    print("=" * 40 + "\n")


def main():
    parser = argparse.ArgumentParser(description="R-Loop Autonomous AI Task Agent")
    parser.add_argument("--tasks", nargs="+", help="Set new tasks to work on")
    parser.add_argument("--status", action="store_true", help="Show current status")
    parser.add_argument("--reset", action="store_true", help="Reset all state")
    parser.add_argument("--max-iterations", type=int, default=DEFAULT_MAX_ITERATIONS,
                       help=f"Maximum iterations (default: {DEFAULT_MAX_ITERATIONS})")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Claude model (default: {DEFAULT_MODEL})")
    parser.add_argument("--continue", dest="continue_run", action="store_true",
                       help="Continue from where we left off")

    args = parser.parse_args()

    if args.status:
        print_status()
        return

    if args.reset:
        print("Resetting R-Loop state...")
        init_state()
        print("Done. State has been reset.")
        return

    if args.tasks:
        print(f"Setting {len(args.tasks)} new tasks...")
        init_state(args.tasks)
        print("Tasks initialized. Starting loop...")

    # Run the main loop
    success = run_loop(max_iterations=args.max_iterations, model=args.model)

    if success:
        print("\nR-Loop completed successfully!")
    else:
        print("\nR-Loop paused. Run again to continue.")


if __name__ == "__main__":
    main()
