# Mutation testing

Choose the tool with the tool procedure.
Then obey the rules in this file.
This file names no product.

Wait until the user approves the design.
Do not install the tool before that approval.
Do not connect the tool before that approval.
Do not run the tool before that approval.

A tool meets the criteria only when the current documentation describes one of these modes.

## Verdict reuse

A later run skips a mutant only when both facts below are true.

- The code of the mutant is unchanged.
- The covering tests are unchanged.

A state file lets that later run skip the mutant.
The first run is a full analysis.
The first run writes the state file.
Tell the user that the first run is a full analysis before you start a baseline.
When the user asks you to score the whole project, start a baseline only after the user approves it.

## Change scope

The run mutates only the current diff or only the files that the user named.
Use this mode for a local change.
This mode does not make a later run of the full project cheaper.

## Modes that do not qualify

A resume after an interrupt is useful.
A resume is not the incremental mode that this skill requires.
A filter that only decreases the test count is not incremental.

## More criteria

The tool meets each rule below.

- The tool can limit the run to the unit tests of the project.
  A broader suite is not required.
- The tool runs the mutated code of the project.
  Run the tool only in the checkout that the user named.
  Do not run the tool on a dependency.
  Do not run the tool on a directory outside that checkout.
- The documentation says what a later incremental run will miss.
  Record that limitation in the report.
  Tell the user that an occasional full run is the way to check those misses.
  Do not start that full run unless the user approves it.

## When you do not run the tool

Do not run the tool when no candidate meets the criteria.
When no candidate meets the criteria, record the research.

Both facts below describe one case.

- The user asks you to score the whole project.
- The tool has no verdict reuse.

In that case, do not start a full run.
In that case, tell the user that change scope can cover the current change.

## Local scope

Use this section only when the user does not ask you to score the whole project.
Use change scope when the tool has change scope.
When both facts below are true, ask the user before the baseline.
When both facts below are true, tell the user that the first run is a full analysis.
When both facts below are true, do not start the baseline in the same turn.

- Verdict reuse is the only incremental mode.
- The tool has no stored results.

## State and survivors

Keep the state file in the location that the documentation gives.
Do not track the state file unless the documentation says to commit it.
Read the documentation of the installed version for the rule below.
Discard the state file when the documentation says that a toolchain change makes reuse wrong.
Discard the state file when the documentation says that a dependency change makes reuse wrong.
Discard the state file when the documentation says that a bytecode change makes reuse wrong.

A survivor is not a new test by default.
Add a case only when both facts below are true.

- A behavior from the test-case rules kills the mutant.
- The expected result has a source other than the mutant.

Record a survivor as an equivalent mutant, as dead code, or as a survivor that is not clear.
Do not exclude code to increase the score.

Do not add a scheduled job unless the user asks you to add that job.
Do not add a mutation step to continuous integration unless the user asks you to add that step.
