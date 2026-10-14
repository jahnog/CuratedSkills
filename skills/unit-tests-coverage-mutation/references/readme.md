# Repository README

Use this file when you update the README of the project in scope.
The order in the skill file decides when that update runs.

## Which file

Edit the README that documents the project in scope.
Keep the current filename.
A generator is a project script or config whose output is that README.
When a generator writes that file, edit the generator source.
Leave the generated file.
When the project has no README, create `README.md` in that project.
In a repository of several projects, change only facts about the project in scope.
A similar sentence about another project stays.
Do not add a second README.

## Fact list

List the in-scope facts before you edit.
This list is not the test-case inventory.
List each section.
List what the project is.
List each advantage.
List each command.
List each build step.
List each warning.
List each limitation.

Keep that list for the final report.
Do not add that list to the repository.
A kept fact has one home.
A removed fact is a duplicate of a kept fact.

## Edit

Write the file in the language it already uses.
Keep the title.
Keep each badge that already resolves.
Keep each image that already resolves.
Keep a heading when a file in the repository links to that heading.
When you rename that heading, update the link in the same edit.

Use this order.

1. What the project is.
   The first screen answers this for a person who has not opened another file.
   State what a caller gets when an entry point or a project file shows that.
2. Further advantages.
   A further advantage is a benefit a project file already states, or a capability a public entry point already provides.
   A further advantage is a fact the opening does not already state.
   When every advantage repeats the opening, write no Advantages section.
   When no source exists, write no Advantages section.
3. Commands, in the order of the command topics below.
   Each topic is present, in the language of the README.
   When the project has no command for a topic, that subsection says that no command exists.
   When several real commands share a topic, list each command and when to use it.
4. Remaining material that is still true and is not already stated.
   That material is a build step, configuration, contributing, an API, a usage example, a warning, or a limitation.
   A usage example stays unless it is the same command as the run command.
   Do not rewrite a clear unique section for style.

A build instruction that still works stays.
The command topics do not replace a build instruction.
Deduplicate inside this README only.
A license line stays when a license file also exists.
Do not drop a warning to shorten the page.
Do not drop a limitation to shorten the page.

When the suite stopped, the README still describes the test command.
The README does not say that the suite passed.

## Commands

Copy a command from a manifest script, a task file, the help text of an installed tool, or a command this session ran.
Use a flag only when that help shows the flag.
Do not invent a runner.
Each command names the directory it runs from.
When the source or this session shows a short result, state that result.
Do not paste a coverage number.
Do not paste a mutation score.
Do not run an install command to check the prose.
Do not run an uninstall command to check the prose.
A read-only help check is enough when the manifest does not contain the command.

### Install

Use the one command the lockfile or the existing docs already use.
Include the runtime constraint the manifest already states.
A tool added as a development dependency is part of that install.

### Uninstall

State how to remove this project when the project already documents that.
This command does not remove a tool that this skill added.

### Run

State the command that starts the project for a caller.

### Test

State the unit-test command of the runner the project already uses.
A UI or end-to-end command stays in its existing section.
That command is not the unit-test command.

### Debug

State a debug command the project already has for the project or for its unit tests.
A debug flag qualifies when the installed help shows it and the project already uses it.
Do not run that command for the review.

### Mutation test

State the mutation command this session ran, or the mutation command the project already configures.
The rules in [mutation-testing.md](mutation-testing.md) decide which run is allowed.
The README names the command only.

### Reports

State the command or commands that write the Cobertura file and the HTML index.
The paths are the configured paths or the paths this session wrote.
The rules in [coverage-reports.md](coverage-reports.md) define those outputs.
The README names the command and the paths.
The README says that the files are build output.
Do not copy the coverage checks into the README.
Do not invent a path.
Do not add ignore rules in this step.

## License line

When a license file and the manifest field agree, the README names that license once.
When only one of them exists, the README names that license once.
When neither exists, the README does not add a license line.
When they disagree, the README says that they disagree.
Do not pick one.
On a publish request, the license check has already stopped a disagreement before this step.

## Credentials

Remove each credential from the README during this edit.
Tell the user the path that held it.
This edit is not a history scan.

## Review

Review the saved file.
Do not review from memory of the edit.
Read the README as a person who has not seen the repository.

Write a closed-book restatement from the README alone.
The restatement says what the project is.
The restatement says what each command topic in the edit section says.
Compare that restatement with the sources.
A mismatch fails the review.

In the final report, quote the README sentence and the source path for each further advantage.
In the final report, quote the README sentence and the source path for each command.

The syntactic checks are the checks below.

- Headings nest in order.
  Lists are valid.
  Code fences are closed.
- Each command is in a fence or in inline code.
  A reader can copy that command.
- A relative link points at a target that exists.
  A link to a heading in the project README is included.
  An external URL that was already in the README stays.
  Do not add a new external URL.
- The filename is unchanged, except that a new file uses the name `README.md`.
  The language is unchanged, except that a new file uses the language of the project docs.

The semantic checks are the checks below.

- The opening states what the project is and what a caller gets.
  The opening does not require another file.
- Every further advantage has a source.
  Every further advantage adds a fact the opening does not state.
- Each command topic in the edit section is present.
  Each command matches its source.
  Each command names its directory.
  A command does not claim a result this session did not observe.
- Every pre-edit fact is still present once, or it is a duplicate of a kept fact.
- A name is introduced before a later section relies on it.
- A build instruction that matched a real command is still present.

When the project already has a markdown check, run that check.
Do not add a markdown check.

When a check fails, fix the README and review once more.
When the same check fails again, stop and report that check.
